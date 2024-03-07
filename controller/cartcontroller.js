const CartDb = require('../model/cartmodel');

exports.showCart = async (req,res) => {
     const id = req.session.user._id;
     try{
       const cart  = await CartDb.find({user_id: id});
       res.render( 'user/cart',{cart: cart});
     }catch(e){
       res.redirect('/user/profile?msg=carterr');
     }
   }
   