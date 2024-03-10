const CartDb = require("../model/cartmodel");
const ProductDb = require("../model/productmodel");
const Userdb = require("../model/usermodel");


exports.showCart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    // Retrieve user's cart and populate product details
    const usercart = await CartDb.find({ user: userId }).populate('product.productId');

    // Calculate subtotal from the cart database
    let subtotalFromCart = 0;

    // Iterate through each cart item and product
    for (const cartItem of usercart) {
      for (const product of cartItem.product) {
        // Check if the product is in stock
        if (product.productId.stock > product.quantity) {
          // Retrieve the latest price from the product document
          const updatedProduct = await ProductDb.findById(product.productId._id);
          subtotalFromCart += updatedProduct.total_price * product.quantity;
        }
      }
    }

    res.render('user/cart', { usercart, subtotal: subtotalFromCart });
  } catch (error) {
    console.error(error);
    res.redirect('/user/profile?msg=carterr');
  }
};


exports.addToCart = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.session.user._id;
    
    // Fetch the product
    const product = await ProductDb.findById(id);
    // console.log(product)

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.stock <= 0) {
      return res.redirect("/user/cart?msg=nostock");
    }

    // Get the quantity from the request body or use the default quantity from the model
    const quantity = parseInt(req.body.quantity) || product.quantity;
    // console.log(quantity)

    let cart = await CartDb.findOne({ user: userId });
    // console.log(cart)

    if (!cart) {
      cart = new CartDb({ user: userId, product: [], subtotal: 0 });
    }

    const existingProductIndex = cart.product.findIndex((item) =>
      item.productId.equals(id)
    );
    // console.log(existingProductIndex)

    if (existingProductIndex !== -1) {
      const totalQuantity = cart.product[existingProductIndex].quantity + quantity;

      if (totalQuantity > product.maxQuantityPerPerson) {
        return res.status(400).json({
          message: `Maximum ${product.maxQuantityPerPerson} quantity allowed per person`,
        });
      }

      cart.product[existingProductIndex].quantity += quantity;
    } else {
      if (product.stock > 0) {
        cart.product.push({
          productId: product._id,
          quantity: quantity,
        });
      } else {
        return res.status(400).json({ message: "Product out of stock" });
      }
    }

    // Recalculate the subtotal
    let subtotal = 0;
    cart.product.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    // Update the subtotal field of the cart model
    cart.subtotal = subtotal;

    await cart.save();

    res.redirect("/user/cart?msg=addcart");
  } catch (error) {
    console.error(error);
    res.redirect("/user/cart?msg=error");
  }
};


exports.removeCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.user._id;
    // console.log(productId, userId)

    // Remove the product from the cart
    const cart = await CartDb.findOneAndUpdate(
      { user: userId },
      { $pull: { product: { productId: productId } } },
      { new: true }
    );
    // console.log(cart)

    if (cart) {
      // Recalculate the subtotal if the cart still contains products
      let subtotal = 0;
      if (cart.product.length > 0) {
        for (const product of cart.product) {
          const updatedProduct = await ProductDb.findById(product.productId);
          if (updatedProduct && updatedProduct.sellingPrice && !isNaN(updatedProduct.sellingPrice) && !isNaN(product.quantity)) {
            subtotal += updatedProduct.sellingPrice * product.quantity;
          }
        }
      }

      // Update the subtotal in the cart
      cart.subtotal = subtotal;

      // Save the updated cart
      await cart.save();

      res.status(204).end();
    } else {
      res.status(404).json({ message: 'Cart not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};