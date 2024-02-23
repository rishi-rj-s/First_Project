const bcrypt = require("bcrypt");
let Userdb = require("../model/usermodel");
const ProductDb = require("../model/productmodel");
const CatDb = require("../model/categorymodel");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const otpGenerator = require("otp-generator");

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const users = await Userdb.findOne({ email: username });
  if(users.status == "blocked"){
    res.redirect("/?error=blocked")
  }
  if (users) {
    const passwordMatch = await bcrypt.compare(password, users.password);
    if (passwordMatch) {
      req.session.id = users._id;
      const userObj = users.toObject();
      const access = jwt.sign(userObj, process.env.MY_SECRET, {
        expiresIn: "4h",
      });
      res.cookie("access", access, {
        httpOnly: true,
      });
      res.redirect("/user/landing");
    } else {
      // Password is incorrect, send error message
      res.redirect("/?error=password");
    }
  } else {
    // Password is incorrect, send error message
    res.redirect("/?error=password");
  }
};

// exports.isBlocked = async (req, res, next) => {
//   const id = req.session.id;
//   await Userdb.findById(id).then((user) => {
//     if (user && user.status === "blocked") {
//       res.redirect("/user/logout");
//     } else {
//       next();
//     }
//   });
// };

exports.cookieJwtAuth = (req, res, next) => {
  // Allow unauthenticated requests to access the logout route
  const url = req.originalUrl;
  if (url === "/user/logout") {
    return next();
  }

  const access = req.cookies.access;
  if (!access) {
    return res.redirect("/");
  }

  try {
    const user = jwt.verify(access, process.env.MY_SECRET);
    req.user = user;
    if (url === "/" || url === "") {
      res.redirect("/user/landing");
      return;
    }
    next();
  } catch (err) {
    res.clearCookie("access");
    return res.redirect("/");
  }
};

exports.logout = (req, res) => {
  res.cookie("access", "", { maxAge: 0 });
  res.redirect("/");
};

let cate;

exports.products = async (req, res) => {
  cate = req.params.cat;
  const cat = await CatDb.find({ category: cate });
  if (!cat) {
    res.status(404).send("Category not found!");
  }
  const pdt = await ProductDb.find({ category: cate });
  if (!pdt) {
    res.status(404).send("Products not found");
  }
  res.render("user/products", { category: cate, products: pdt });
};

exports.productview = async (req, res) => {
  const p_id = req.params.id;
  const product = await ProductDb.findById(p_id);
  const relatedProduct = await ProductDb.find({
    category: product.category,
  }).limit(4);
  if (!product) {
    res.status(404).send("No such product found!");
  }
  res.render("user/product_view", {
    product: product,
    similar: relatedProduct,
  });
};

// Function to send OTP email
const sendOtpEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: email,
    subject: "One-Time Password (OTP)",
    text: `Your Authentication OTP is: ${otp}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error:", error);
  }
};

exports.registerfirst = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      status: "failed",
      message: "All fields are required!",
    });
  } else if ((await Userdb.find({ email: email })) == null) {
    return res.status(409).json({
      status: "Conflict",
      message: "This account already exists.",
    });
  }

  req.session.body = req.body;

  // Generate random OTP
  const otp = Math.floor(1000 + Math.random() * 9999);

  // Send OTP via email
  try {
    await sendOtpEmail(email, otp);
    req.session.otp = { code: otp, expiryTime: Date.now() + 60000 };
    res.render("user/otpverify");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
};

exports.register = async (req, res) => {
  const { name, email, password } = req.session.body;
  console.log(name, email, password);
  const otp = req.body.otp;
  console.log(otp, req.session.otp.code);
  // Check for valid OTP
  if (!otp || otp != req.session.otp.code) {
    return res.status(400).json({
      status: "Invalid",
      message: "Wrong OTP.",
    });
  }

  if (!name || !email || !password || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const storedOtp = req.session.otp;

  if (
    !storedOtp ||
    otp != storedOtp.code ||
    Date.now() > storedOtp.expiryTime
  ) {
    console.log("Expired");
    return res.status(400).json({ success: false, message: "Invalid OTP." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const users = new Userdb({
      name: name,
      email: email,
      password: hashedPassword,
    });

    await users.save();
    // Clear session data after successful registration
    delete req.session.otp, req.session.body;
    console.log("Registration successful");
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
