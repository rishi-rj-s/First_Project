const Address = require("../model/addressmodel");
const Order = require("../model/ordermodel");
const Category = require("../model/categorymodel");
const Cart = require("../model/cartmodel");
const Product = require("../model/productmodel");

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
    const usercart = await Cart.findOne({ user: userId });
    const addsId = req.body.address;
    console.log(addsId);
    const addressId = await Address.findById(addsId);
    const paymentMethod = "Cash On Delivery";

    if (!usercart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    if (!addressId) {
      return res.status(404).json({ message: "Address not found" });
    }
    // Create the order
    const order = new Order({
      user_id: userId,
      orderedItems: usercart.product,
      totalAmount: usercart.subtotal,
      shippingAddress: addressId,
      paymentMethod: paymentMethod,
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
  
    // Find the specific order that needs to be cancelled
    const userorder1 = await Order.findById(orderId);
    const cancelledOrder = userorder1.orderedItems.find(item => item.productId == productId);
    const cancelledQuantity = cancelledOrder.quantity;
  
    // Update the order by pulling the cancelled item
    let userorder = await Order.findOneAndUpdate(
      { _id: orderId, 'orderedItems.productId': productId },
      { $set: { 'orderedItems.$.status': 'Cancelled' } },
      { new: true }
    );
    if (!userorder) {
      throw new Error("No such order found");
    }
  
    // Retrieve the current stock of the product
    const product = await Product.findById(productId);
    const currentStock = product.stock;
  
    // Calculate the new stock after cancelling the order
    const newStock = currentStock + cancelledQuantity;
  
    // Update the product with the new stock value
    await Product.findByIdAndUpdate(productId, { stock: newStock });
  
    return res.status(200).json({ success: true, message: "Order has been cancelled." });

  } catch (e) {
    console.error(e);
    return res.redirect("/user/orders?msg=cancelerr");
  }
};
