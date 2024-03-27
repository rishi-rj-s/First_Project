const Address = require("../model/addressmodel");
const Order = require("../model/ordermodel");
const Category = require("../model/categorymodel");
const User = require("../model/usermodel")
const Cart = require("../model/cartmodel");
const Product = require("../model/productmodel");
const CouponDb = require("../model/couponmodel")
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
    const user = await User.findById(id);
    const wallet = user.wallet
    if (!usercart) {
      return res.redirect("/cart?msg=cartemp");
    }
    const address = await Address.find({ user_id: id });
    res.render("user/checkout", { usercart, address, wallet });
  } catch (e) {
    console.log(e);
    res.redirect("/?msg=error");
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const usercart = await Cart.findOne({ user: userId }).populate("product.productId");
    const addsId = req.body.address;
    const addressId = await Address.findById(addsId);
    const paymentMethod = req.body.paymentMethod;
    let totalAmountAfterDiscount = usercart.subtotal; // Initialize with subtotal
    // console.log(totalAmountAfterDiscount);
    let couponApplied = null;
    let paymentStatus = "Pending";

    let user = await User.findById(userId);

    if (req.body.coupon) {
      const couponCode = req.body.coupon;
      const coupon = await CouponDb.findOne({ code: couponCode });
      console.log(coupon)

      if (coupon && coupon != null && usercart.subtotal >= coupon.minimumPurchaseAmount) {
        totalAmountAfterDiscount = usercart.subtotal - coupon.discountAmount;
        couponApplied = coupon._id; // Assign the couponId if a coupon is applied
      }
    }

    if (!usercart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    if (!addressId) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Check if total amount is above 1000 for COD
    if (paymentMethod === 'COD' && totalAmountAfterDiscount > 1000) {
      return res.status(400).json({ message: 'Cash On Delivery is not allowed for orders above 1000' });
    }

    if (paymentMethod == "Wallet") {
      if (totalAmountAfterDiscount > user.wallet) {
        return res.status(201).send("Insufficient Balance...!");
      }
      paymentStatus = 'Completed';
      user.wallet -= totalAmountAfterDiscount;
      await user.save();
    }

    // Calculate individual prices for ordered items
    const orderedItemsWithPrice = usercart.product.map((item) => {
      const totalPrice = item.productId.total_price * item.quantity;
      return {
        productId: item.productId,
        pname: item.productId.p_name,
        pimages: item.productId.images,
        originalPrice: item.productId.price * item.quantity,
        price: totalPrice || 0, // Set default value if calculation results in NaN
        quantity: item.quantity,
        status: "Pending",
        paymentStatus: paymentStatus,
        returned: false,
      };
    });
    // console.log(totalAmountAfterDiscount)

    // Create the order with calculated prices
    const order = new Order({
      user_id: userId,
      orderedItems: orderedItemsWithPrice,
      totalAmount: totalAmountAfterDiscount,
      shippingAddress: addressId,
      paymentMethod: paymentMethod,
      couponApplied: couponApplied
    });

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

    // Find the order and check its payment status
    let userorder = await Order.findById(orderId);
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

    // Check the current payment status and update accordingly
    const paymentStatus = cancelledItem.paymentStatus;
    const newPaymentStatus = paymentStatus === "Completed" ? "Refunded" : "Cancelled";

    // Update the order item with the new payment status
    cancelledItem.status = "Cancelled";
    cancelledItem.paymentStatus = newPaymentStatus;

    // Save the updated order
    await userorder.save();
    
    if (cancelledItem.paymentStatus == "Refunded") {
      const refund = cancelledItem.price;
      await User.findByIdAndUpdate(id, { $inc: { wallet: refund } })
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
