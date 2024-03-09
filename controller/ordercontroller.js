const Address = require("../model/addressmodel");
const Order = require("../model/ordermodel");
const Category = require("../model/categorymodel");
const Cart = require("../model/cartmodel");
const Product = require("../model/productmodel");


exports.renderOrderPage =  async(req, res) => {
  const id = req.session.user._id;
  const cart = await Cart.findOne({ user: id }).populate();
  if (!cart || !cart.items.length){
    return res.redirect("/?msg=cartemp");
  }

}

exports.showOrders = async (req, res) => {
  const id = req.session.user._id;
  try {
    const cart = await Cart.find({ user_id: id });
    res.render("user/orders", { cart: cart });
  } catch (e) {
    res.redirect("/user/profile?msg=carterr");
  }
};

