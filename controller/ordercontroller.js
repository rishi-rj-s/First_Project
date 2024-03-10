const Address = require("../model/addressmodel");
const Order = require("../model/ordermodel");
const Category = require("../model/categorymodel");
const Cart = require("../model/cartmodel");
const Product = require("../model/productmodel");

exports.renderOrderPage = async (req, res) => {
  try {
    const id = req.session.user._id;
    const cart = await Cart.find({ user: id }).populate("product.productId");
    if (!cart) {
      return res.redirect("/?msg=cartemp");
    }
    let subtotalFromCart = 0;
    for (const cartItem of cart) {
      for (const product of cartItem.product) {
        // Check if the product is in stock
        if (product.productId.stock > product.quantity) {
          // Retrieve the latest price from the product document
          const updatedProduct = await Product.findById(product.productId._id);
          subtotalFromCart += updatedProduct.total_price * product.quantity;
        }
      }
    }
    const address = await Address.find({user_id: id});
    res.render("user/checkout", { cart, subtotal: subtotalFromCart, address });
  } catch (e) {
    console.log(e);
    res.redirect("/?msg=error");
  }
};

exports.showOrders = async (req, res) => {
  const id = req.session.user._id;
  try {
    const cart = await Cart.find({ user_id: id });
    res.render("user/orders", { cart: cart });
  } catch (e) {
    res.redirect("/user/profile?msg=carterr");
  }
};
