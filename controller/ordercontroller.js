const Address = require("../model/addressmodel");
const Order = require("../model/ordermodel");
const User = require("../model/usermodel")
const Cart = require("../model/cartmodel");
const Product = require("../model/productmodel");
const CouponDb = require("../model/couponmodel");
const WalletHistory = require("../model/wallethistory");
const { KEY_ID, KEY_SECRET } = process.env;
const Razorpay = require("razorpay");
const PDFDocument = require('pdfkit');


const razorpaykeyId = KEY_ID;

// Initialize Razorpay with your API key and secret
const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

exports.renderOrderPage = async (req, res) => {
  try {
    const id = req.session.user._id;
    const username = req.session.user;
    const [usercart, user, address] = await Promise.all([
      Cart.findOne({ user: id }).populate("product.productId"),
      User.findById(id),
      Address.find({ user_id: id })
    ]);
    let subtotal = usercart.subtotal;
    let date = Date.now()
    let coupons = await CouponDb.find({ minimumPurchaseAmount: { $lte: subtotal }, expiryDate: {$gte: date} });

    const razorpayKeyId = process.env.KEY_ID;
    // console.log(razorpayKeyId);
    const wallet = user.wallet
    if (!usercart) {
      return res.redirect("/cart?msg=cartemp");
    }
    res.render("user/checkout", { usercart, address, username, wallet, coupons, razorpayKeyId });
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

    const [usercart, address, user] = await Promise.all([
      Cart.findOne({ user: userId }).populate("product.productId"),
      Address.findById(addsId),
      User.findById(userId),
    ])

    if (usercart.couponApplied === true) {
      couponApplied = usercart.coupon;
      console.log("True")
    }

    if (!usercart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Check if total amount is above 1000 for COD
    if (paymentMethod === 'COD' && usercart.subtotal > 1000) {
      return res.status(400).json({ message: 'Cash On Delivery is not allowed for orders above 1000' });
    }

    if (paymentMethod === 'RazorPay') {
      return res.status(400).json({ message: 'Cash On Delivery is not allowed for orders above 1000' });
    }

    if (paymentMethod == "Wallet") {
      if (usercart.subtotal > user.wallet) {
        return res.status(201).send("Insufficient Balance...!");
      }
      paymentStatus = 'Completed';
      user.wallet -= usercart.subtotal;
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
        offerDiscount: item.productId.offerDiscount * item.quantity
      };
    });
    // console.log(totalAmountAfterDiscount)

    // Calculate the sum of all offerDiscount values using reduce
    const offerDiscount = orderedItemsWithPrice.reduce((total, item) => {
      // Add the offerDiscount of the current item to the total
      return total + item.offerDiscount;
    }, 0); // Initialize total with 0



    // Create the order with calculated prices
    const order = new Order({
      user_id: userId,
      name: address.name,
      orderedItems: orderedItemsWithPrice,
      totalAmount: usercart.subtotal,
      shippingAddress: address._id,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      couponApplied: couponApplied,
      offerDisc: offerDiscount
    });

    const a = await order.save();

    if (paymentMethod === "Wallet") {
      const history = new WalletHistory({
        userId: userId,
        transactionType: "Debit",
        amount: usercart.subtotal,
        order: a._id
      })
      await history.save();
    }

    // Delete the cart
    await Cart.findOneAndDelete({ user: userId });

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

exports.razorPayOrder = async (req, res) => {
  try {
    const cartId = req.params.cid;
    const addId = req.body.addressId;
    const userId = req.session.user;
    const paymentStatus = req.body.paymentStatus || "Completed";
    // console.log(paymentStatus);
    let coupon;
    // console.log(cartId, addId);

    const [usercart, address, user] = await Promise.all([
      Cart.findOne({ user: userId }).populate("product.productId"),
      Address.findById(addId),
      User.findById(userId),
    ])

    if (!usercart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    if (usercart.couponApplied) {
      coupon = usercart.coupon;
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
        offerDiscount: item.productId.offerDiscount * item.quantity
      };
    });
    // console.log(totalAmountAfterDiscount)

    // Calculate the sum of all offerDiscount values using reduce
    const offerDiscount = orderedItemsWithPrice.reduce((total, item) => {
      // Add the offerDiscount of the current item to the total
      return total + item.offerDiscount;
    }, 0); 


    // Create the order with calculated prices
    const order = new Order({
      user_id: userId,
      name: address.name,
      orderedItems: orderedItemsWithPrice,
      totalAmount: usercart.subtotal,
      shippingAddress: address._id,
      paymentMethod: "RazorPay",
      paymentStatus: paymentStatus,
      couponApplied: coupon,
      offerDisc: offerDiscount
    });

    await order.save();


    // Delete the cart
    await Cart.findOneAndDelete({ user: userId });

    // Reduce the stock of ordered products
    usercart.product.forEach(async (product) => {
      await Product.findByIdAndUpdate(product.productId, {
        $inc: { stock: -product.quantity },
      });
    });

    // Redirect to order success page
    return res.render("user/orderplaced", { order: "Success" });

  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error")
  }
}

exports.renderPendingPay = async (req, res) => {
  try {
    const orderId = req.params.oid;
    // Fetch orders, categories, and user from the database
    const order = await Order.findById(orderId)
      .populate("shippingAddress")

    const user = req.session.user;
    // console.log(orders)
    // Render the order list page and pass the orders, categories, user, and cancelledProducts data to the view
    res.render("user/razorpay", { order, user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
}

exports.pendingPay = async (req, res) => {
  try {
    console.log("Triggered!")
    const orderId = req.params.oid;
    // console.log(orderId)

    // Fetch orders, categories, and user from the database
    const orders = await Order.findById(orderId)

    if (!orders || orders.length < 1) {
      res.status(404).send("Order not found!");
    }

    if (orders.paymentStatus === "Pending" || orders.paymentStatus === "Failed") {
      orders.paymentStatus = "Completed";
    } else {
      res.status(404).send("Payment cannot be completed!")
    }

    await orders.save();

    // Render the order list page and pass the orders, categories, user, and cancelledProducts data to the view
    res.redirect("/user/vieworders?msg=paysuc");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
}

exports.viewOrders = async (req, res) => {
  try {
    const id = req.session.user._id;
    // Fetch orders, categories, and user from the database
    const orders = await Order.find({ user_id: id })
      .populate("orderedItems.productId").limit(5)
      .sort({ orderDate: -1 });

    let pages = await Order.countDocuments({ user_id: id });
    pages = Math.ceil(pages/5)
    // console.log(orders)
    // Render the order list page and pass the orders, categories, user, and cancelledProducts data to the view
    res.render("user/orders", { orders, username: req.session.user.name, pages });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.viewOrdersMore = async (req, res) => {
  try {
    const id = req.session.user._id;
    const page = req.query.page;
    let jump = (page-1) * 5;
    console.log(id, page, jump)

    // Fetch orders, categories, and user from the database
    const orders = await Order.find({ user_id: id })
      .populate("orderedItems.productId").limit(5).skip(jump)
      .sort({ orderDate: -1 });
    // console.log(orders)
    // return the order list page and pass the orders, categories, user, and cancelledProducts data to the view
    return res.status(200).json({ orders}); // Send JSON response with orders data
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
      await User.findByIdAndUpdate(id, { $inc: { wallet: refund } });
      const history = new WalletHistory({
        userId: id,
        transactionType: "Credit",
        amount: userorder.totalAmount,
        order: userorder._id
      })
      await history.save();
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

exports.cancelSingle = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const orderId = req.params.oid;
    const productId = req.query.pid;
    console.log(userId, orderId, productId);

    // Find the order and check its payment status
    const order = await Order.findById(orderId).populate('couponApplied');
    // Check if the order exists and belongs to the user
    if (!order || order.user_id.toString() !== userId) {
      return res.status(404).json({ message: 'Order not found or unauthorized' });
    }

    // Find the ordered item corresponding to the specified product ID
    const orderedItem = order.orderedItems.find(item => item.productId.toString() === productId);

    // Check if the ordered item exists
    if (!orderedItem) {
      return res.status(404).json({ message: 'Product not found in the order' });
    }

    // Update the status of the ordered item to Cancelled
    orderedItem.status = 'Cancelled';
    orderedItem.returned = true;
    let couponAmount = 0;
    let minimumAmount = 0;

    if (order.paymentStatus == "Completed") {
      if(order.couponApplied){
        couponAmount = order.couponApplied.discountAmount;
        minimumAmount = order.couponApplied.minimumPurchaseAmount;
        console.log(couponAmount, minimumAmount)
      }
      if((order.totalAmount - orderedItem.price) > minimumAmount){
        let refund = orderedItem.price - orderedItem.offerDiscount;
        await User.findByIdAndUpdate(userId, { $inc: { wallet: refund } });
        const history = new WalletHistory({
          userId: userId,
          transactionType: "Credit",
          amount: refund,
          order: order._id
        })
        await history.save();
      }else{
        let refund = ((orderedItem.price - orderedItem.offerDiscount) - couponAmount);
        await User.findByIdAndUpdate(userId, { $inc: { wallet: refund } });
        const history = new WalletHistory({
          userId: userId,
          transactionType: "Credit",
          amount: refund,
          order: order._id
        })
        await history.save();
      }
      
    } else if (order.paymentStatus === 'Failed' || order.paymentStatus === 'Pending') {
      if (order.couponApplied) {
        couponAmount = order.couponApplied.discountAmount;
        minimumAmount = order.couponApplied.minimumPurchaseAmount;
        console.log(couponAmount, minimumAmount)

        if ((order.totalAmount - (orderedItem.price - orderedItem.offerDiscount)) < minimumAmount) {
          // Remove the coupon and increase the order total amount
          order.totalAmount += (couponAmount - (orderedItem.price - orderedItem.offerDiscount));
          order.couponApplied = null; // Remove the coupon reference from the order
        }
      }
    }

    const allCancelled = order.orderedItems.every(pdt => pdt.status === "Cancelled");
    if(allCancelled){
      order.status = "Cancelled";
      if(order.paymentStatus === "Completed"){
        order.paymentStatus = "Refunded";
      }
    }

    // Save the updated order
    await order.save();

    // Restock the cancelled quantity of the product
    const product = await Product.findById(productId);
    if (product) {
      product.stock += orderedItem.quantity;
      await product.save();
    } else {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res
      .status(200)
      .json({ success: true, message: "Product has been cancelled." });
  } catch (e) {
    console.error(e);
    return res.redirect("/user/orders?msg=cancelerr");
  }
}

exports.returnOrder = async (req, res) => {
  try {
    const orderId = req.params.oid;
    const productId = req.query.pid;
    // console.log(orderId, productId)

    // Use async/await with findByIdAndUpdate to ensure proper error handling
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, "orderedItems.productId": productId }, // Find the order by ID and product ID
      { $set: { "orderedItems.$.status": "Processing" } }, // Update the status of the specified product
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
  try {
    const orderId = req.query.oid;
    const name = req.session.user.name
    const order = await Order.findById(orderId).populate('shippingAddress couponApplied');
    if (!order || order.length == 0) {
      res.status(404).send("No order found");
    }
    res.render('user/vieworder', { order, name })
  } catch (e) {
    console.log(e.toString());
    res.status(500).send("Internal Server Error");
  }
}
