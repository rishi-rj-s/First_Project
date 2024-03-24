const Address = require("../model/addressmodel");
const Order = require("../model/ordermodel");
const Category = require("../model/categorymodel");
const Cart = require("../model/cartmodel");
const Product = require("../model/productmodel");
const { KEY_ID, KEY_SECRET } = process.env;
const Razorpay = require("razorpay");

const razorpaykeyId = KEY_ID;

// Initialize Razorpay with your API key and secret
const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

exports.renderOrderPage = async (req, res) => {
  try {
    const id = req.session.user._id;
    const usercart = await Cart.findOne({ user: id }).populate(
      "product.productId"
    );
    if (!usercart) {
      return res.redirect("/cart?msg=cartemp");
    }
    const address = await Address.find({ user_id: id });
    res.render("user/checkout", { usercart, address });
  } catch (e) {
    console.log(e);
    res.redirect("/?msg=error");
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const usercart = await Cart.findOne({ user: userId }).populate(
      "product.productId"
    );
    const addsId = req.body.address;
    // console.log(addsId);
    const addressId = await Address.findById(addsId);
    const paymentMethod = req.body.paymentMethod;

    if (!usercart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    if (!addressId) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Calculate individual prices for ordered items
    const orderedItemsWithPrice = usercart.product.map((item) => {
      const totalPrice = item.productId.total_price * item.quantity;
      return {
        productId: item.productId,
        price: totalPrice || 0, // Set default value if calculation results in NaN
        quantity: item.quantity,
        status: "Pending",
        returned: false,
      };
    });

    // Create the order with calculated prices
    const order = new Order({
      user_id: userId,
      orderedItems: orderedItemsWithPrice,
      totalAmount: usercart.subtotal,
      shippingAddress: addressId,
      paymentMethod: paymentMethod,
    });

    // Update payment status based on payment method
    if (paymentMethod === "COD") {
      order.paymentStatus = "Pending";
    } else if (paymentMethod === "RazorPay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100,
        currency: "INR",
        payment_capture: 1,
      });
      order.paymentStatus = "Failed";
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
      return res.redirect(`/razorpaypage/${order._id}`); // Redirect to Razorpay page
    }

    await order.save();

    // Remove ordered products from the cart
    await Cart.findOneAndUpdate(
      { user: userId },
      {
        $pull: {
          product: {
            productId: { $in: usercart.product.map((item) => item.productId) },
          },
        },
      },
      { new: true }
    );

    // Reduce the stock of ordered products
    usercart.product.forEach(async (product) => {
      await Product.findByIdAndUpdate(product.productId, {
        $inc: { stock: -product.quantity },
      });
    });

    // Redirect to order success page
    return res.render("user/orderplaced", { order: "Success" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.viewOrders = async (req, res) => {
  try {
    const id = req.session.user._id;
    // Fetch orders, categories, and user from the database
    const orders = await Order.find({ user_id: id })
      .populate("orderedItems.productId")
      .sort({ orderDate: -1 });
    // console.log(orders)
    // Render the order list page and pass the orders, categories, user, and cancelledProducts data to the view
    res.render("user/orders", { orders, username: req.session.user.name });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const id = req.session.user._id;
    const productId = req.params.pid;
    const orderId = req.query.oid;

    // Update the order by pulling the cancelled item
    let userorder = await Order.findOneAndUpdate(
      { _id: orderId, "orderedItems.productId": productId },
      { $set: { "orderedItems.$.status": "Cancelled" } },
      { new: true }
    );
    if (!userorder) {
      throw new Error("No such order found");
    }

    // Find the cancelled item within orderedItems array
    const cancelledItem = userorder.orderedItems.find(
      (item) => item.productId.toString() === productId
    );
    if (!cancelledItem) {
      throw new Error("Cancelled item not found");
    }

    // Get the quantity of the cancelled product
    const cancelledQuantity = cancelledItem.quantity;

    // Retrieve the current stock of the product
    const product = await Product.findById(productId);
    const currentStock = product.stock;

    // Update the product with the new stock value
    const newStock = currentStock + cancelledQuantity;
    await Product.findByIdAndUpdate(productId, { stock: newStock });

    return res
      .status(200)
      .json({ success: true, message: "Order has been cancelled." });
  } catch (e) {
    console.error(e);
    return res.redirect("/user/orders?msg=cancelerr");
  }
};

exports.returnOrder = async (req, res) => {
  try {
    const productId = req.params.pid;
    const orderId = req.query.oid;
    // console.log(productId, orderId)

    // Use async/await with findByIdAndUpdate to ensure proper error handling
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: { "orderedItems.$[elem].status": "Processing" } },
      {
        arrayFilters: [{ "elem.productId": productId }],
        new: true, // Return the updated document
      }
    );
    // console.log(updatedOrder)

    // Check if updatedOrder is null (order not found) or if it's updated successfully
    if (!updatedOrder) {
      return res.status(404).json({ msg: "Order not found" });
    }

    // Handle the case where the order is updated successfully
    // console.log('Updated Order:', updatedOrder);
    return res
      .status(200)
      .json({ success: true, message: "Return is being processed." });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};
