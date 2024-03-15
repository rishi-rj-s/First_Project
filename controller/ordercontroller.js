const Address = require("../model/addressmodel");
const Order = require("../model/ordermodel");
const Category = require("../model/categorymodel");
const Cart = require("../model/cartmodel");
const Product = require("../model/productmodel");

exports.renderOrderPage = async (req, res) => {
  try {
    const id = req.session.user._id;
    const cart = await Cart.findOne({ user: id }).populate("product.productId");
    if (!cart) {
      return res.redirect("/cart?msg=cartemp");
    }
    const address = await Address.find({user_id: id});
    res.render("user/checkout", { cart, address });
  } catch (e) {
    console.log(e);
    res.redirect("/?msg=error");
  }
};

exports.placeOrder = async (req, res) => {
  try {
      const userId = req.session.user._id;
      const usercart = await Cart.findOne({user : userId});
      const addsId = req.query.addrs;
      const addressId = await Address.findById({_id : addsId});
      const paymentMethod = "COD"
      

      if (!usercart) {
          return res.status(404).json({ message: 'Cart not found' });
      }
      if (!addressId) {
        return res.status(404).json({ message: 'Address not found' });
    }
      // Create the order
      const order = new Order({
          userId: userId,
          orderedItems: usercart.product,
          totalAmount: usercart.subtotal,
          shippingAddress: addressId,
          paymentMethod: paymentMethod 
      });


      await order.save();

      // Remove ordered products from the cart
      await Cart.findOneAndUpdate(
          { user: userId },
          { $pull: { product: { productId: { $in: usercart.product.map(item => item.productId) } } } },
          { new: true }
      );

      // Reduce the stock of ordered products
      usercart.product.forEach(async (product) => {
          await Product.findByIdAndUpdate(product.productId, { $inc: { stock: -product.quantity } });
      });

      // Handle wallet payment
      if (paymentMethod === 'Wallet') {
          let wallet = await Wallet.findOne({ userId });
          if (!wallet) {
              return res.status(400).json({ message: 'Wallet not found' });
          } else if (wallet.balance < totalAmount) {
              return res.status(400).json({ message: 'Insufficient wallet balance' });
          } else {
              wallet.balance -= totalAmount;
              await wallet.save();
          }
      }

      // Redirect to order success page
      return res.redirect('/orderpage');
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};
