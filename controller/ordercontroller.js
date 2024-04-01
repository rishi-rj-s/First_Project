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
    const [usercart, user, address] = await Promise.all([
      Cart.findOne({ user: id }).populate("product.productId"),
      User.findById(id),
      Address.find({ user_id: id })
    ]);
    const wallet = user.wallet
    if (!usercart) {
      return res.redirect("/cart?msg=cartemp");
    }
    res.render("user/checkout", { usercart, address, wallet });
  } catch (e) {
    console.log(e);
    res.redirect("/?msg=error");
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const addsId = req.body.address;
    const paymentMethod = req.body.paymentMethod;
    let couponApplied = null;
    let paymentStatus = "Pending";

    const [usercart, addressId, user] = await Promise.all([
      Cart.findOne({ user: userId }).populate("product.productId"),
      Address.findById(addsId),
      User.findById(userId)
    ])

    let totalAmountAfterDiscount = usercart.subtotal; // Initialize with subtotal
    // console.log(totalAmountAfterDiscount);

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
      paymentStatus: paymentStatus,
      couponApplied: couponApplied
    });

    if (paymentMethod == "RazorPay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100,
        currency: 'INR',
        payment_capture: 1
      });
      orders.paymentStatus = 'Failed';
      await order.save();
      return res.redirect(`/user/rayzorpaypage/${order._id}`); // Redirect to Razorpay page
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
    const orderId = req.params.oid;
    // console.log(id, orderId)

    // Find the order and check its payment status
    let userorder = await Order.findById(orderId);
    if (!userorder) {
      throw new Error("No such order found");
    }
    // console.log(userorder)

    // Check the current payment status and update accordingly
    const paymentStatus = userorder.paymentStatus;
    const newPaymentStatus = paymentStatus === "Completed" ? "Refunded" : "Cancelled";

    // Update the order item with the new payment status
    userorder.status = "Cancelled";
    userorder.paymentStatus = newPaymentStatus;

    // Save the updated order
    await userorder.save();

    if (userorder.paymentStatus == "Refunded") {
      const refund = userorder.totalAmount;
      await User.findByIdAndUpdate(id, { $inc: { wallet: refund } })
    }

    // Iterate through ordered items to restock the products
    for (const orderedItem of userorder.orderedItems) {
      const productId = orderedItem.productId;
      const cancelledQuantity = orderedItem.quantity;

      // Find the product and update its stock
      const product = await Product.findById(productId);
      if (product) {
        const currentStock = product.stock;
        const newStock = currentStock + cancelledQuantity;
        
        // Update the product's stock in the database
        await Product.findByIdAndUpdate(productId, { stock: newStock });
      }
    }

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
    const orderId = req.params.oid;
    // console.log(orderId)

    // Use async/await with findByIdAndUpdate to ensure proper error handling
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: "Processing" } },
      {
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

exports.singleOrder = async (req, res) => {
  try{
    const orderId = req.query.oid;
    const name = req.session.user.name
    const order = await Order.findById(orderId);
    if(!order || order.length == 0){
      res.status(404).send("No order found");
    }
    res.render('user/vieworder',{order, name})
  }catch(e){
    console.log(e.toString());
    res.status(500).send("Internal Server Error");
  }
}