const CartDb = require("../model/cartmodel");
const CouponDb = require("../model/couponmodel");
const ProductDb = require("../model/productmodel");
const Userdb = require("../model/usermodel");
const WishDb = require("../model/wishlistmodel")

exports.showCart = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // Retrieve user's cart and populate product details
    const usercart = await CartDb.findOne({ user: userId }).populate(
      "product.productId"
    );
    // console.log(usercart)

    if (!usercart || usercart.product.length === 0) {
      // Cart is empty, redirect to /user/products/All
      return res.redirect('/user/landing?msg=nocart');
    }

    // Initialize total subtotal for the cart
    let subtotalFromCart = 0;

    // Check if usercart exists and has products
    if (usercart && usercart.product.length > 0) {
      // Filter out products with stock <= 0 or listing status "unlisted"
      usercart.product = usercart.product.filter((product) => {
        return product.productId.stock > 0 && product.productId.listing !== "Unlisted";
      });
      // Iterate through each product in the cart
      for (const product of usercart.product) {
        // Check if the product quantity exceeds stock
        if (product.quantity >= product.productId.stock) {
          product.quantity = product.productId.stock;
        }

        // Check if the product is in stock
        if (product.productId.stock >= product.quantity) {
          // Retrieve the latest price from the product document
          const updatedProduct = await ProductDb.findById(
            product.productId._id
          );
          subtotalFromCart += updatedProduct.total_price * product.quantity;
        }
      }

      // Update subtotal for the cart
      usercart.subtotal = subtotalFromCart;

      // Save the updated cart item
      await usercart.save();
    }

    res.render("user/cart", { usercart, subtotal: subtotalFromCart });
  } catch (error) {
    console.error(error);
    res.redirect("/user/profile?msg=carterr");
  }
};

exports.addToCart = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.session.user._id;
    const quantity = req.query.quantity;
    // console.log(quantity);

    // Fetch the product and check stock availability
    const [product, isInWishlist, cart] = await Promise.all([
      ProductDb.findById(id),
      WishDb.find({ user: userId, product: id }),
      CartDb.findOne({ user: userId })
    ]);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.stock <= 0) {
      return res.redirect("/user/cart?msg=nostock");
    }

    if (isInWishlist) {
      // Remove the product from the wishlist document
      const removedProduct = await WishDb.findOneAndDelete(
        { user: userId, product: id }
      );
    }

    if (!cart) {
      cart = new CartDb({ user: userId, product: [], subtotal: 0 });
    }

    const existingProductIndex = cart.product.findIndex((item) =>
      item.productId.equals(id)
    );

    if (existingProductIndex !== -1) {
      return res.redirect("/user/cart?msg=exists");
    }

    if (product.stock > 0) {
      cart.product.push({
        productId: product._id,
        quantity: quantity,
      });
      await cart.save();
    } else {
      return res.status(400).json({ message: "Product out of stock" });
    }
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

    // Create promises for each operation
    const pullOperation = CartDb.findOneAndUpdate(
      { user: userId },
      { $pull: { product: { productId: productId } } },
      { new: true } // Return the updated document
    );

    const unsetOperation = CartDb.findOneAndUpdate(
      { user: userId },
      { $unset: { coupon: "", couponCode: "" } },
      { new: true } // Return the updated document
    );

    // Combine the promises and wait for all to complete
    const [cartAfterPull, cartAfterUnset] = await Promise.all([
      pullOperation,
      unsetOperation,
    ]);

    if (cartAfterPull) {
      // Update couponApplied to false
      cartAfterPull.couponApplied = false;

      // Recalculate the subtotal if the cart still contains products
      let subtotal = 0;
      if (cartAfterPull.product.length > 0) {
        for (const product of cartAfterPull.product) {
          const updatedProduct = await ProductDb.findById(product.productId);
          if (
            updatedProduct &&
            updatedProduct.total_price &&
            !isNaN(updatedProduct.total_price) &&
            !isNaN(product.quantity)
          ) {
            subtotal += updatedProduct.total_price * product.quantity;
          }
        }
      }

      // Update the subtotal in the cart
      cartAfterPull.subtotal = subtotal;

      // Save the updated cart
      await cartAfterPull.save();

      res.status(204).end(); // Successfully removed from cart
    } else {
      res.status(404).json({ message: "Cart not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateQuantity = async (req, res) => {
  try {
    const productId = req.params.pid;
    const newQuantity = parseInt(req.query.quantity);
    // console.log(productId, newQuantity)

    // Find the cart item by product ID
    const updatedCartItem = await CartDb.findOne({
      "product.productId": productId,
    }).populate("product.productId");
    // console.log(updatedCartItem)

    if (!updatedCartItem) {
      return res
        .status(404)
        .json({ message: `Cart item with product ID ${productId} not found.` });
    }

    // Update the quantity of the matched product
    updatedCartItem.product.forEach((product) => {
      if (product.productId.equals(productId)) {
        // Set the limit of quantity to 5
        product.quantity = Math.min(newQuantity, 5);
        // Check if the new quantity exceeds the stock, replace with stock if necessary
        if (product.quantity >= product.productId.stock) {
          product.quantity = product.productId.stock;
        }
      }
    });

    // Recalculate the subtotal
    let subtotal = 0;
    updatedCartItem.product.forEach((item) => {
      subtotal += item.productId.total_price * item.quantity;
    });
    // console.log("Subtotal:", subtotal);

    // Update the subtotal field of the cart model
    updatedCartItem.subtotal = parseInt(subtotal);

    // console.log(subtotal);

    // Save the updated cart item to the database
    await updatedCartItem.save();

    // Respond with success message
    res
      .status(200)
      .json({ message: "Cart quantity updated successfully.", subtotal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const cartId = req.params.cid;
    const couponCode = req.query.code;
    // console.log(cartId, couponId);
    const [cart, coupon] = await Promise.all([
      CartDb.findById(cartId),
      CouponDb.findOne({ code: couponCode })
    ]);
    // console.log(cart, coupon)

    if (!cart || !coupon) {
      return res.status(404).json({ error: 'Cart or coupon not found' });
    }

    let subtotal = cart.subtotal;
    let discount = coupon.discountAmount;
    let minAmount = coupon.minimumPurchaseAmount;

    if (subtotal < minAmount) {
      return res.json({ valid: false, message: 'Subtotal does not meet minimum amount' });
    }
    const newSubtotal = subtotal - discount;

    await CartDb.findByIdAndUpdate(cartId, {
      subtotal: newSubtotal,
      couponApplied: true,
      coupon: coupon._id,
      couponCode: coupon.code,
    })
    return res.json({ valid: true, message: "Coupon applied successfully", newSubtotal })

  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
}

exports.removeCoupon = async (req, res) => {
  try {
    const cartId = req.params.cid;
    const couponCode = req.query.code;
  } catch (e) {
    console.log(e)
    return res.status(500).send("Internal Server Error");
  }
}