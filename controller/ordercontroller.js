const OrderDb = require('../model/ordermodel')

exports.showOrders = async (req,res) => {
     const id = req.session.user._id;
     try{
       const cart  = await OrderDb.find({user_id: id});
       res.render( 'user/orders',{cart: cart});
     }catch(e){
       res.redirect('/user/profile?msg=carterr');
     }
   }
   