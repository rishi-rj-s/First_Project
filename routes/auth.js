const express = require("express");
const path = require("path");
const usercontroller = require("../controller/usercontroller");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const route = express.Router();

route.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile","email"],
  })
);

route.get(
  "/redirect",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Generate JWT token for user
    const token = jwt.sign(req.user.toJSON(), process.env.MY_SECRET, {
      expiresIn: "4h",
    });
    // Set token as cookie
    res.cookie("access", token, {
      httpOnly: true,
    });
    req.session.user = req.user;
    res.redirect("/user/landing?msg=loggedin");
  }
);

module.exports = route;
