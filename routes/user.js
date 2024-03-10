const express = require('express');
const session = require('express-session');
const app = express()
const path = require('path')
const usercontroller = require('../controller/usercontroller')
const cartcontroller = require('../controller/cartcontroller')
const ordercontroller = require('../controller/ordercontroller')
const wishcontroller = require('../controller/wishcontroller')
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

route.get('/products/:cat',checkBlocked ,cookieJwtAuth, usercontroller.products)
route.get('/productview/:id',checkBlocked , cookieJwtAuth, usercontroller.productview)

route.post("/login",usercontroller.login)

route.get('/register',(req,res)=>{
     res.render('user/register')
})

route.get('/profile',checkBlocked, cookieJwtAuth, usercontroller.profile);

route.get('/address',checkBlocked, cookieJwtAuth, usercontroller.showAddress);
route.get('/addaddress',checkBlocked, cookieJwtAuth, usercontroller.showAddAddress);
route.post('/addaddress',checkBlocked, cookieJwtAuth, usercontroller.addAddress)
route.delete('/deleteaddress/:id',checkBlocked, cookieJwtAuth, usercontroller.deleteAddress)
route.get('/editaddress/:id',checkBlocked, cookieJwtAuth, usercontroller.showEditAddress)
route.post('/saveaddress/:id',checkBlocked, cookieJwtAuth, usercontroller.saveAddress)

route.get('/changepass',checkBlocked, cookieJwtAuth, usercontroller.showChangePass);
route.post('/checkpass', checkBlocked, cookieJwtAuth, usercontroller.checkPass);
route.post('/changepass',checkBlocked, cookieJwtAuth, usercontroller.changePass);

route.get('/cart',checkBlocked, cookieJwtAuth, cartcontroller.showCart);
route.get('/addtocart/:id',checkBlocked, cookieJwtAuth, cartcontroller.addToCart);
route.get('/removecart/:id',checkBlocked, cookieJwtAuth, cartcontroller.removeCart)

route.get('/wishlist',checkBlocked, cookieJwtAuth, wishcontroller.showWishlist);
route.get('/addwishlist/:id', checkBlocked, cookieJwtAuth, wishcontroller.addToWishlist);  
route.get('/removewish/:id', checkBlocked, cookieJwtAuth, wishcontroller.removeWish);  

route.get('/orders',checkBlocked, cookieJwtAuth, ordercontroller.renderOrderPage)
route.get('/showOrders',checkBlocked, cookieJwtAuth, ordercontroller.showOrders);


route.get("**",(req,res)=>{
     res.render('pagenotfound');
})

module.exports = route
