const express = require("express");
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");
const admincontroller = require("../controller/admincontroller");
const { cookieJwtAuth } = require("../controller/admincontroller");
const CatDb = require("../model/categorymodel");
const ProductDb = require("../model/productmodel");
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

route.get("/viewproducts", cookieJwtAuth, admincontroller.viewproducts);

route.get("/viewusers", cookieJwtAuth, admincontroller.viewusers);

route.get("/logout", cookieJwtAuth, admincontroller.logout);

route.post("/login", admincontroller.login);

route.post("/addproduct", cookieJwtAuth, upload.array("images", 4), admincontroller.addproduct);

route.get("/addproduct", cookieJwtAuth, admincontroller.addproductpage);

route.get("/category", cookieJwtAuth, admincontroller.category);

route.get("/editproduct/:id", cookieJwtAuth, admincontroller.editproductpage);

route.get("/addcategory", cookieJwtAuth, (req, res) => {
  res.render("admin/addcategory");
});
route.post("/addcategory", cookieJwtAuth, admincontroller.addcategory);

route.get("/deletecategory/:id", cookieJwtAuth, admincontroller.deletecategory);

route.post("/editproduct/:id", cookieJwtAuth, upload.array("images", 4), admincontroller.editproduct);
route.get("/deleteproduct/:id", cookieJwtAuth, admincontroller.deleteproduct);

route.put("/userstatus/:id", cookieJwtAuth, admincontroller.userstatus);

// route.get('/admin/fetchproducts',admincontroller.findproducts)
// route.get('/admin/users',admincontroller.findusers)

route.get("**", (req, res) => {
  res.render("pagenotfound");
});

module.exports = route;
