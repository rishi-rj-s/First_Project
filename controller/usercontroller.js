const bcrypt = require("bcrypt");
let Userdb = require("../model/usermodel");
const ProductDb = require("../model/productmodel");
const CatDb = require("../model/categorymodel");
const AdminDb = require("../model/adminmodel");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const otpGenerator = require("otp-generator");

let uid = '';
exports.login = async (req, res) => {
  const { username, password } = req.body;
  const users = await Userdb.findOne({ email: username });

  if (users) {
    if (users.status == "blocked") {
      res.redirect("?error=blocked");
    }
    const passwordMatch = await bcrypt.compare(password, users.password);
    if (passwordMatch) {
      uid = users._id;
      req.session.id = users._id;
      const userObj = users.toObject();
      const access = jwt.sign(userObj, process.env.MY_SECRET, {
        expiresIn: "4h",
      });
      res.cookie("access", access, {
        httpOnly: true,
      });
      res.redirect("/user/landing?msg=loggedin");
    } else {
      // Password is incorrect, send error message
      res.redirect("/?error=password");
    }
  } else {
    // Password is incorrect, send error message
    res.redirect("/?error=email");
  }
};

// exports.checkBlocked = async (req, res, next) => {
//   const userid = req.session.id;
//   console.log(userid)
//   const user = await Userdb.findOne({_id: userid});
//   if(user.status==='active'){
//     next()
//   }else{
//     res.redirect('/user/logout')
//   }
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
  uid = '';
  res.redirect("/?error=logout");
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

let s = {};
let q = {};

exports.registerfirst = async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await Userdb.find({ email: email });
  const userExists2 = await AdminDb.find({ username: email });
  if (userExists.length > 0 || userExists2.length > 0) {
    return res.redirect("/user/register?error=email");
  }

  s = req.body;
  console.log(s);

  // Generate random OTP
  const otp = Math.floor(1000 + Math.random() * 9999);
  console.log(otp);

  // Send OTP via email
  try {
    await sendOtpEmail(email, otp);
    q = { code: otp, expiryTime: Date.now() + 60000 };
    res.render("user/otpverify", { msg: "send" });
  } catch (error) {
    console.error(error);
    res.redirect("/user/register?error=unable");
  }
};

exports.registerfirsterror = (req, res) => {
  res.render("user/otpverify");
};

exports.register = async (req, res) => {
  const { name, email, password } = s;
  const otp = req.body.otp;
  const storedOtp = q;

  //Check if expired
  if (!q || otp != q.code || Date.now() > q.expiryTime) {
    console.log("Expired");
    return res.redirect("/user/registerfirst?error=expired");
  }
  // Check for valid OTP
  if (!otp || otp != q.code) {
    return res.redirect("/user/registerfirst?error=otpwrong");
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
    s = {};
    q = {};
    console.log("Registration successful");
    res.redirect("/?error=success");
  } catch (error) {
    console.error(error);
    res.redirect("/user/register?error=error");
  }
};

exports.resendOtp = async (req, res) => {
  const email = s.email;

  // Generate random OTP
  const otp = Math.floor(1000 + Math.random() * 9999);
  console.log(otp);

  // Send OTP via email
  try {
    await sendOtpEmail(email, otp);
    q = { code: otp, expiryTime: Date.now() + 60000 };
    res.render("user/otpverify");
  } catch (error) {
    console.error(error);
    res.redirect("/user/registerfirst?error=unable");
  }
};

exports.forgot = (req, res) => {
  res.render("user/forgotpass");
};

let id = '';

exports.forgotpass = async (req, res) => {
  const email = req.body.email;
  s = req.body;

  // checks if a user exists with this email
  const userExists = await Userdb.find({ email: email });
  if (userExists.length === 0) {
    return res.redirect("/user/forgot?error=noexist");
  }
  id = userExists[0]._id

  // Generate random OTP
  const otp = Math.floor(1000 + Math.random() * 9999);
  console.log(otp);

  // Send OTP via email
  try {
    await sendOtpEmail(email, otp);
    q = { code: otp, expiryTime: Date.now() + 60000 };
    res.render("user/forgototpverify");
  } catch (error) {
    console.error(error);
    res.redirect("/user/forgot?error=unable");
  }
};

exports.checkotp = async (req, res) => {
  const otp = req.body.otp;
  const storedOtp = q;

  //Check if expired
  if (!q || otp != q.code || Date.now() > q.expiryTime) {
    console.log("Expired");
    id = null;
    return res.redirect("/user/forgot?error=expired");
  }
  // Check for valid OTP
  if (!otp || otp != q.code) {
    id=null;
    return res.redirect("/user/forgot?error=otpwrong");
  }

  q = {};

  res.redirect("/user/resetPassword");
};

exports.resetPage = (req, res) => {
  res.render("user/resetPassword");
};

exports.resetPass = async(req, res) => {
  const uid = id
  const pass = req.body.password;
  const hashedPassword = await bcrypt.hash(pass, 10);
  Userdb.findByIdAndUpdate(uid, { password: hashedPassword })
  .then((data) => {
    if (!data) {
      res.redirect('user/forgotpass?error=error');
    } else {
      res.redirect('/?error=reset');
    }
  })
  .catch((err) => {
    res.status(500).send({ message: "Error updating user information" });
  });

}