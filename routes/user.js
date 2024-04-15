const express = require('express');
const session = require('express-session');
const app = express()
const path = require('path')
const usercontroller = require('../controller/usercontroller')
const cartcontroller = require('../controller/cartcontroller')
const ordercontroller = require('../controller/ordercontroller')
const wishcontroller = require('../controller/wishcontroller')
const couponcontroller = require('../controller/couponcontroller')
const reportcontroller = require('../controller/reportcontroller')
const { cookieJwtAuth, checkBlocked } = require("../controller/usercontroller");


const route = express.Router()

route.post('/registerfirst', usercontroller.registerfirst)
route.get('/registerfirst', usercontroller.registerfirsterror)
route.get('/resendotp', usercontroller.resendOtp)
route.post('/register',usercontroller.register)
route.get('/forgot',usercontroller.forgot)
route.post('/forgotpass',usercontroller.forgotpass)
route.post('/checkotp', usercontroller.checkotp)
route.get('/resetPassword', usercontroller.resetPage)
route.post('/resetPassword', usercontroller.resetPass)

route.get('/landing',checkBlocked, cookieJwtAuth, usercontroller.showLanding)

route.get('/logout',cookieJwtAuth, usercontroller.logout)

route.get('/products',checkBlocked ,cookieJwtAuth, usercontroller.products)
route.get('/check',checkBlocked, cookieJwtAuth, usercontroller.checkSearch)
route.get('/search',checkBlocked, cookieJwtAuth, usercontroller.searchProduct)
route.get('/actions',checkBlocked, cookieJwtAuth, usercontroller.actions)
route.get('/productview/:id',checkBlocked , cookieJwtAuth, usercontroller.productview)

route.post("/login",usercontroller.login)

route.get('/profile',checkBlocked, cookieJwtAuth, usercontroller.profile);

route.get('/wallet',checkBlocked, cookieJwtAuth, usercontroller.showWallet);

route.get('/address',checkBlocked, cookieJwtAuth, usercontroller.showAddress);
route.get('/addaddress',checkBlocked, cookieJwtAuth, usercontroller.showAddAddress);
route.post('/addaddress',checkBlocked, cookieJwtAuth, usercontroller.addAddress)
route.delete('/deleteaddress/:id',checkBlocked, cookieJwtAuth, usercontroller.deleteAddress)
route.get('/editaddress/:id',checkBlocked, cookieJwtAuth, usercontroller.showEditAddress)
route.post('/saveaddress/:id',checkBlocked, cookieJwtAuth, usercontroller.saveAddress)

route.get('/changepass',checkBlocked, cookieJwtAuth, usercontroller.showChangePass);
route.post('/checkpass', checkBlocked, cookieJwtAuth, usercontroller.checkPass);
route.post('/changepass',checkBlocked, cookieJwtAuth, usercontroller.changePass);

route.get('/changename', checkBlocked, cookieJwtAuth, usercontroller.showEditUsername);
route.post('/savename', checkBlocked, cookieJwtAuth, usercontroller.editUsername)

route.get('/cart',checkBlocked, cookieJwtAuth, cartcontroller.showCart);
route.get('/addtocart/:id',checkBlocked, cookieJwtAuth, cartcontroller.addToCart);
route.get('/removecart/:id',checkBlocked, cookieJwtAuth, cartcontroller.removeCart)
route.get('/updatequantity/:pid',checkBlocked, cookieJwtAuth, cartcontroller.updateQuantity);
route.get('/couponaction/:cid',checkBlocked, cookieJwtAuth, cartcontroller.couponAction)

route.get('/wishlist',checkBlocked, cookieJwtAuth, wishcontroller.showWishlist);
route.get('/addwishlist/:id', checkBlocked, cookieJwtAuth, wishcontroller.addToWishlist);  
route.get('/removewish/:id', checkBlocked, cookieJwtAuth, wishcontroller.removeWish);  

route.get('/orders',checkBlocked, cookieJwtAuth, ordercontroller.renderOrderPage);
route.get('/viewsingleorder',checkBlocked, cookieJwtAuth, ordercontroller.singleOrder);
route.get('/checkcoupon',checkBlocked, cookieJwtAuth, couponcontroller.checkCoupon);
route.post('/placeorder',checkBlocked, cookieJwtAuth, ordercontroller.placeOrder);
route.get('/vieworders',checkBlocked, cookieJwtAuth, ordercontroller.viewOrders);
route.post('/razorpay/:cid',checkBlocked, cookieJwtAuth, ordercontroller.razorPayOrder)
route.get('/cancelorder/:oid',checkBlocked, cookieJwtAuth, ordercontroller.cancelOrder);
route.get('/returnorder/:oid',checkBlocked, cookieJwtAuth, ordercontroller.returnOrder);
route.get('/generateinvoice/:oid',checkBlocked, cookieJwtAuth, reportcontroller.generateInvoice);

route.get("**",(req,res)=>{
     res.render('pagenotfound');
})

module.exports = route
