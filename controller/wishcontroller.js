const WishlistDb = require("../model/wishlistmodel");

exports.showWishlist = async (req, res) => {
  try {
    const uid = req.session.user._id; 
    const items = await WishlistDb.find({ user: uid }).populate('product')
    console.log(items)
    res.render('user/wishlist',{items: items})
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const id = req.params.id;
    const uid = req.session.user._id;

    const existingItem = await WishlistDb.findOne({
      user: uid,
      product: id,
    });
    // console.log(id);
    // console.log(uid);
    // console.log(existingItem);
    if (existingItem) {
      return res.redirect('/user/wishlist?msg=exist');
    }

    // Create a new wishlist item
    const wishlistItem = new WishlistDb({
      user: uid,
      product: id,
    });

    // Save the wishlist item to the database
    await wishlistItem.save();

    res.redirect('/user/wishlist?msg=added');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.removeWish = async (req, res) => {
  try {
    const uid = req.session.user._id;
    const id = req.params.id;
   const wishlist= await WishlistDb.findOneAndDelete({ user: uid, product: id })
    res.redirect('/user/wishlist?msg=delete');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};