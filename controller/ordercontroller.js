const Address = require("../model/addressmodel");
const Order = require("../model/ordermodel");
const Category = require("../model/categorymodel");
const Cart = require("../model/cartmodel");
const Product = require("../model/productmodel");
const User = require("../model/usermodel");

exports.showOrders = async (req, res) => {
  const id = req.session.user._id;
  try {
    const cart = await Order.find({ user_id: id });
    res.render("user/orders", { cart: cart });
  } catch (e) {
    res.redirect("/user/profile?msg=carterr");
  }
};

// exports.renderorderPage = async (req, res) => {
//   try {
//     const userId = req.userId;

//     const categories = await Category.find({ isDeleted: false }).populate(
//       "products"
//     );
//     const token = req.cookies.token;
//     const orders = await Order.find({ userId: userId }).sort({ orderDate: -1 });
//     res.render("ordersuccess", { orders: orders, token, categories });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
//   }
// };

// exports.placeOrder = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const usercart = JSON.parse(req.body.usercart);
//     const addressId = req.body.addressId;
//     const paymentMethod = req.body.paymentMethod;

//     // Find the user's cart
//     let cart = await Cart.findOne({ user: userId });

//     if (!cart) {
//       return res.status(404).json({ message: "Cart not found" });
//     }

//     // Calculate total amount
//     let totalAmount = 0;
//     usercart.product.forEach((product) => {
//       totalAmount += product.productId.sellingPrice * product.quantity;
//     });

//     // Create the order
//     const order = new Order({
//       userId: userId,
//       orderedItems: usercart.product,
//       totalAmount: totalAmount,
//       shippingAddress: addressId,
//       paymentMethod: paymentMethod,
//     });

//     await order.save();

//     // Remove ordered products from the cart
//     await Cart.findOneAndUpdate(
//       { user: userId },
//       {
//         $pull: {
//           product: {
//             productId: { $in: usercart.product.map((item) => item.productId) },
//           },
//         },
//       },
//       { new: true }
//     );

//     // Reduce the stock of ordered products
//     usercart.product.forEach(async (product) => {
//       await Product.findByIdAndUpdate(product.productId, {
//         $inc: { stock: -product.quantity },
//       });
//     });
//     if (paymentMethod === "Wallet") {
//       let wallet = await Wallet.findOne({ userId });
//       if (!wallet) {
//         return res.status(400).json({ message: "Wallet not found" });
//       } else if (wallet.balance < totalAmount) {
//         return res.status(400).json({ message: "Insufficient wallet balance" });
//       } else {
//         wallet.balance -= totalAmount;
//         await wallet.save();
//       }
//     }

//     res.redirect("/orderpage");
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// exports.renderOrderList = async (req, res) => {
//   try {
//     // Fetch orders, categories, and user from the database
//     const orders = await Order.find({ userId: req.userId })
//       .populate("orderedItems.productId")
//       .sort({ orderDate: -1 });
//     const categories = await Category.find({ isDeleted: false }).populate(
//       "products"
//     );
//     const user = await User.findById(req.userId);

//     // Render the order list page and pass the orders, categories, user, and cancelledProducts data to the view
//     res.render("orderlist", { orders, categories, user });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
//   }
// };

// exports.listUserOrders = async (req, res) => {
//   try {
//     const userId = req.userId; // Assuming you have implemented user authentication and obtained the userId

//     // Find orders for the current user
//     const orders = await Order.find({ userId: userId }).sort({ orderDate: -1 }); // Assuming you want to sort orders by orderDate in descending order

//     // Render the orders page and pass the orders data to the view
//     res.render("orderlist", { orders: orders });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
//   }
// };

// exports.cancelOrder = async (req, res) => {
//   try {
//     const orderId = req.body.orderId;
//     console.log(orderId);
//     const order = await Order.findById(orderId);
//     console.log(order, "dkjd");

//     // Check if order exists
//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // Add the price of cancelled products to the user's wallet
//     const totalPrice = order.totalAmount;
//     const userId = order.userId;

//     // Find the wallet associated with the user
//     let wallet = await Wallet.findOne({ userId });

//     // If wallet does not exist, create a new wallet
//     if (!wallet) {
//       wallet = new Wallet({ userId, balance: totalPrice });
//       await wallet.save();
//     } else {
//       // Update wallet balance
//       wallet.balance += totalPrice;
//       await wallet.save();
//     }

//     // Update order status
//     order.orderStatus = "Cancelled";
//     await order.save();

//     res.status(200).json({ message: "Order cancelled successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// //admin orders
// exports.adminOrders = async (req, res) => {
//   try {
//     // Fetch orders from the database
//     const orders = await Order.find()
//       .populate([
//         { path: "userId", select: "name" }, // Populate with 'name' field instead of 'username'
//         { path: "orderedItems.productId", select: "name category price" },
//         { path: "shippingAddress" },
//       ])
//       .sort({ orderDate: -1 });

//     // Render the adminorderlist.ejs view and pass the orders data to it
//     res.render("adminorderlist", { orders: orders });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
//   }
// };

// exports.updateOrderStatus = async (req, res) => {
//   try {
//     const orderId = req.params.orderId;
//     const { orderStatus } = req.body;

//     // Update the order status in the database
//     const updatedOrder = await Order.findByIdAndUpdate(
//       orderId,
//       { orderStatus },
//       { new: true }
//     );

//     if (!updatedOrder) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     res
//       .status(200)
//       .json({
//         message: "Order status updated successfully",
//         order: updatedOrder,
//       });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// exports.orderdetails = async (req, res) => {
//   try {
//     const { orderId, productId } = req.params;
//     const userId = req.userId;
//     const categories = await Category.find({ isDeleted: false }).populate(
//       "products"
//     );
//     const token = req.cookies.token;

//     // Fetch order details including the address information
//     const order = await Order.findById(orderId).populate("shippingAddress");

//     // Fetch product details
//     const product = await Product.findById(productId); // Assuming you have a Product model

//     res.render("orderdetails", {
//       orderId,
//       productId,
//       categories,
//       token,
//       order,
//       product,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// exports.getCancelledProducts = async (req, res) => {
//   try {
//     // Find orders with the orderStatus set to 'Cancelled'
//     const cancelledOrders = await Order.find({
//       orderStatus: "Cancelled",
//     }).populate("orderedItems.productId");

//     // Extract cancelled products from cancelled orders
//     const cancelledProducts = cancelledOrders.flatMap(
//       (order) => order.orderedItems
//     );

//     res.json(cancelledProducts);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
