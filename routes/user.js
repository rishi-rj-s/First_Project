const express = require('express');
const session = require('express-session');
const app = express()
const path = require('path')
const usercontroller = require('../controller/usercontroller')
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

route.get('/landing',checkBlocked, cookieJwtAuth,(req,res)=>{
     res.render('user/landing')
})

route.get('/logout',cookieJwtAuth, usercontroller.logout)

route.get('/products/:cat',checkBlocked ,cookieJwtAuth, usercontroller.products)
route.get('/productview/:id',checkBlocked , cookieJwtAuth, usercontroller.productview)

route.post("/login",usercontroller.login)

route.get('/register',(req,res)=>{
     res.render('user/register')
})

route.get('/profile',checkBlocked, cookieJwtAuth, usercontroller.profile);
route.get('/address',checkBlocked, cookieJwtAuth, usercontroller.showAddress);
route.get('/addaddress',checkBlocked, cookieJwtAuth, usercontroller.showAddressPage);
route.get('/cart',checkBlocked, cookieJwtAuth, usercontroller.showCart);
// route.get('/wishlist',checkBlocked, cookieJwtAuth, usercontroller.showWishlist);
route.get('/orders',checkBlocked, cookieJwtAuth, usercontroller.showOrders);




route.get("**",(req,res)=>{
     res.render('pagenotfound');
})

module.exports = route