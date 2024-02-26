const express = require('express');
const session = require('express-session');
const app = express()
const path = require('path')
const usercontroller = require('../controller/usercontroller')
const { cookieJwtAuth, isBlocked } = require("../controller/usercontroller");


const route = express.Router()

route.get('/register',(req,res)=>{
     res.render('user/register')
})

route.get('/landing', cookieJwtAuth,(req,res)=>{
     res.render('user/landing')
})

route.get('/logout',cookieJwtAuth, usercontroller.logout)

route.get('/products/:cat',cookieJwtAuth, usercontroller.products)

route.get('/productview/:id', cookieJwtAuth, usercontroller.productview)

route.post("/login",usercontroller.login)

route.post('/registerfirst', usercontroller.registerfirst)
route.get('/registerfirst', usercontroller.registerfirsterror)

route.get('/resendotp', usercontroller.resendOtp)

route.post('/register',usercontroller.register)

route.get("**",(req,res)=>{
     res.render('pagenotfound');
})


module.exports = route