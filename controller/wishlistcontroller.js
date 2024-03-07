const WishlistDb = require('../model/ordermodel')

exports.showWishlist = async (req,res) => {
     const id = req.session.user._id;
     try{
       const wishlist  = await WishilstDb.find({user_id: id});
       res.render( 'user/address',{ads: address});
     }catch(e){
       res.redirect('/user/profile?msg=adserr');
     }
   }
   