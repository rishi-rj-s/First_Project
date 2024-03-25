const express = require("express");
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");
const admincontroller = require("../controller/admincontroller");
const ordercontroller = require('../controller/ordercontroller');
const { cookieJwtAuth } = require("../controller/admincontroller");
const couponcontroller = require('../controller/couponcontroller');
const CatDb = require("../model/categorymodel");
const ProductDb = require("../model/productmodel");
const AddressDb = require('../model/addressmodel');
const OrderDb = require('../model/ordermodel');
const upload = require("../multer/multer");

const axios = require("axios");

const route = express.Router();

const port = process.env.PORT;

route.get("/", (req, res) => {
  if (req.cookies.token) {
    res.redirect("admin/dashboard");
  } else if (req.cookies.access) {
    res.redirect("user/landing");
  } else {
    res.render("admin/login");
  }
});

route.get("/dashboard", cookieJwtAuth, (req, res) => {
  res.render("admin/dashboard");
});

// route.get('/profile',(req,res)=>{
//      res.render('admin/profile')
// })

route.get("/logout", cookieJwtAuth, admincontroller.logout);
route.post("/login", admincontroller.login);

route.get("/addproduct", cookieJwtAuth, admincontroller.addproductpage);
route.post("/addproduct", cookieJwtAuth, upload.array("images", 4), admincontroller.addproduct);
route.get("/viewproducts", cookieJwtAuth, admincontroller.viewproducts);
route.get("/editproduct/:id", cookieJwtAuth, admincontroller.editproductpage);
route.post("/editproduct/:id", cookieJwtAuth, upload.array("images", 4), admincontroller.editproduct);
route.get("/deleteproduct/:id", cookieJwtAuth, admincontroller.deleteproduct);

route.get("/addcategory", cookieJwtAuth, (req, res) => {
  res.render("admin/addcategory");
});
route.get("/category", cookieJwtAuth, admincontroller.category);
route.post("/addcategory", cookieJwtAuth, admincontroller.addcategory);
route.put('/categorystatus/:id',cookieJwtAuth, admincontroller.categorystatus);
route.get('/editcategory/:id', cookieJwtAuth, admincontroller.editcategory)
route.post('/editcategory/:id', cookieJwtAuth, admincontroller.updatecategory)
route.get("/deletecategory/:id", cookieJwtAuth, admincontroller.deletecategory);

route.get("/viewusers", cookieJwtAuth, admincontroller.viewusers);
route.put("/userstatus/:id", cookieJwtAuth, admincontroller.userstatus);

route.get('/vieworders', cookieJwtAuth, admincontroller.viewOrders);
route.get('/acceptreturn/:pid', cookieJwtAuth, admincontroller.acceptReturn);
route.get('/rejectreturn/:pid', cookieJwtAuth, admincontroller.rejectReturn);
route.get('/statusshipped/:pid', cookieJwtAuth, admincontroller.statusShipped);
route.get('/statusdelivered/:pid', cookieJwtAuth, admincontroller.statusDelivered);

route.get('/viewcoupons', cookieJwtAuth, couponcontroller.showCoupons);
route.get('/addcoupon', cookieJwtAuth, couponcontroller.showAddCoupon);
route.post('/addcoupon', cookieJwtAuth, couponcontroller.addCoupon);
route.put('/couponactive/:cid', cookieJwtAuth, couponcontroller.couponActive);
route.delete('/deletecoupon/:cid', cookieJwtAuth, couponcontroller.deleteCoupon);
route.get('/editcoupon/:cid', cookieJwtAuth, couponcontroller.renderEdit);
route.post('/editcoupon/:cid', cookieJwtAuth, couponcontroller.editCoupon);


route.get("**", (req, res) => {
  res.render("pagenotfound");
});

module.exports = route;
