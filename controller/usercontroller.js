const bcrypt = require("bcrypt");
const Userdb = require("../model/usermodel");
const ProductDb = require("../model/productmodel");
const CatDb = require("../model/categorymodel");
const AdminDb = require("../model/adminmodel");
const AddressDb = require("../model/addressmodel");
const CartDb = require("../model/cartmodel");
const WalletHistory = require("../model/wallethistory");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const otpGenerator = require("otp-generator");
const OrderDb = require("../model/ordermodel");
const PDFDocument = require('pdfkit-table');


let uid = "";
exports.login = async (req, res) => {
  const { username, password } = req.body;
  const users = await Userdb.findOne({ email: username });

  if (users) {
    if (users.status == "blocked") {
      res.redirect("?error=blocked");
    }
    const passwordMatch = await bcrypt.compare(password, users.password);
    if (passwordMatch) {
      // console.log(users)
      req.session.user = users;
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

exports.checkBlocked = async (req, res, next) => {
  if (req.session.user && req.session.user.email) {
    const email = req.session.user.email;
    await Userdb.findOne({ email: email }).then((user) => {
      if (user && user.status === "active") {
        next();
      } else {
        res.cookie("access", "", { maxAge: 0 });
        delete req.session;
        res.redirect("/?error=blocked");
      }
    });
  } else {
    res.cookie("access", "", { maxAge: 0 });
    delete req.session;
    res.redirect("/?error=bad");
  }
};

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
  uid = "";
  res.redirect("/?error=logout");
};

exports.showLanding = async (req, res) => {
  let category = await CatDb.find({ listing: true });
  res.render("user/landing", { cate: category });
};

exports.products = async (req, res) => {
  try {
    const categoriesToInclude = await CatDb.find({ listing: true });
    const categoryNames = categoriesToInclude.map((cat) => cat._id);

    // Find products including categories with listing: true, paginated and sorted
    const products = await ProductDb.find({ category: { $in: categoryNames } })
      .limit(3)

    const totalCount = await ProductDb.countDocuments({ category: { $in: categoryNames } });
    const totalPages = Math.ceil(totalCount / 3);

    let currentPage = 1;

    res.render("user/products", {
      products,
      category: categoriesToInclude,
      totalPages,
      currentPage
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error!");
  }
};

exports.actions = async (req, res) => {
  try {
    const page = req.query.page;
    const filter = req.query.filter;
    const sortBy = (req.query.sort);
    console.log(sortBy);
    const sort = JSON.parse(sortBy);
    console.log(sort);

    // Find categories with listing: true to include in products query
    const categoriesToInclude = await CatDb.find({ listing: true }).select(
      "category"
    );
    const categoryIds = categoriesToInclude.map(cat => cat._id.toString());

    const skip = (page - 1) * 3;

    const categories = filter.split(',');
    let totalPages = 0

    // Check if all categories in the filter are included in categoriesToInclude
    const hasMatchingId = categories.some(category => categoryIds.includes(category));

    if (hasMatchingId) {
      console.log("True")
      const products = await ProductDb.find({ category: { $in: categories } }).sort(sort).limit(3).skip(skip);
      console.log(products);
      totalPages = await ProductDb.countDocuments({ category: { $in: categories } });

      res.status(200).json({ products, totalPages }); // Send JSON response with products data
    } else {
      return res.status(404).json({ error: 'Categories in filter not included in allowed categories' }); // Send error response
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send("Internal Server Error!");
  }
}

exports.checkSearch = async (req, res) => {
  try {
    const searchQuery = req.query.check;

    if (!searchQuery) {
      return res.status(400).json({ message: 'Missing search query.' });
    }

    const regex = new RegExp(`^${searchQuery}`, 'i');
    const searchResults = await ProductDb.find({
      p_name: { $regex: regex }
    }).select('p_name'); // Select only the product name for the dropdown

    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ message: 'No products found based on the search query.' });
    }

    return res.json(searchResults);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.searchProduct = async (req, res) => {
  try {
    const search = req.query.search;
    // console.log(search);
    const categoriesToExclude = await CatDb.find({ listing: false }).select(
      "category"
    );
    const categoryNames = categoriesToExclude.map((cat) => cat.category);
    const products = await ProductDb.find({ p_name: search, category: { $nin: categoryNames } }).sort({ p_name: 1 });
    if (!products) {
      res.status(404).json({ message: "No product found." });
      return;
    }
    res.render("user/search", { products });
  } catch (e) {
    console.log(e);
    return res.status(500).send("Internal Server Error!");
  }
}

exports.productview = async (req, res) => {
  try {
    const p_id = req.query.id;
    console.log(p_id)
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
  } catch (e) {
    console.log(e);
    res.render('pagenotfound');
  }

};

exports.search = async (req, res) => {
  try {
    const check = req.query.check;
    console.log(check);

    const regex = new RegExp(`^${check}`, 'i'); // Create a regex pattern for case-insensitive search that starts with check

    const products = await ProductDb.find({ p_name: { $regex: regex } }, { p_name: 1 }); // Only return the product name

    if (products.length === 0) {
      return res.status(404).json([]); // Return an empty array if no products are found
    }

    return res.json(products.map(product => ({ pname: product.p_name }))); // Map the products to match the expected structure
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
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
    return res.redirect("/user/login?msg=email");
  }

  s = req.body;
  // console.log(s);

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
    res.redirect("/user/login?msg=unable");
  }
};

exports.registerfirsterror = (req, res) => {
  res.render("user/otpverify");
};

exports.register = async (req, res) => {
  const { name, email, newpassword } = s;
  const otp = req.body.otp;
  const storedOtp = q;
  let referralBonus = 0;

  //Check if expired
  if (!q || otp != q.code || Date.now() > q.expiryTime) {
    console.log("Expired");
    return res.redirect("/user/registerfirst?error=expired");
  }
  // Check for valid OTP
  if (!otp || otp != q.code) {
    return res.redirect("/user/registerfirst?error=otpwrong");
  }

  // Check if there is a referral code in the session
  if (s.referral) {
    try {
      // Check if the referral code exists in the UserDb
      const referredUser = await Userdb.findOne({ refCode: s.referral });
      if (referredUser) {
        // Add 50 to the referral bonus
        referralBonus = 50;

        // Create a wallet history entry for the referred user
        const referredUserWalletHistory = new WalletHistory({
          userId: referredUser._id,
          transactionType: 'Credit',
          amount: referralBonus,
          order: null // Assuming no specific order associated with the referral bonus
        });
        await referredUserWalletHistory.save();

        // Update the referred user's wallet
        referredUser.wallet += referralBonus;
        await referredUser.save();
      }
    } catch (error) {
      console.error('Error checking referral code:', error);
    }
  }

  async function generateRefCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if the generated code already exists in the database
    const existingUser = await Userdb.findOne({ refCode: code });
    if (existingUser) {
      // If the code exists, recursively call the function to generate a new one
      return generateRefCode();
    }

    // Return the unique generated code
    return code.toUpperCase();
  }


  try {
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    const refCode = await generateRefCode(); // Generate the refCode
    const users = new Userdb({
      name: name,
      email: email,
      password: hashedPassword,
      refCode: refCode,
      wallet: referralBonus // Add referral bonus to the new user's wallet
    });

    await users.save();

    // Create a wallet history entry for the new user
    const newUserWalletHistory = new WalletHistory({
      userId: users._id,
      transactionType: 'Credit',
      amount: referralBonus, // Add referral bonus to the wallet history
    });
    await newUserWalletHistory.save();

    // Clear session data after successful registration
    s = {};
    q = {};
    console.log("Registration successful");
    res.redirect("/?error=success");
  } catch (error) {
    console.error(error);
    res.redirect("/user/login?msg=error");
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

let id = "";

exports.forgotpass = async (req, res) => {
  const email = req.body.email;
  s = req.body;

  // checks if a user exists with this email
  const userExists = await Userdb.findOne({ email: email });
  if (userExists.length === 0) {
    return res.redirect("/user/forgot?error=noexist");
  }
  // console.log(userExists.password)
  if (!userExists.password) {
    return res.redirect("/user/forgot?error=gaccnt");
  }
  id = userExists._id;

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
    id = null;
    return res.redirect("/user/forgot?error=otpwrong");
  }

  q = {};

  res.redirect("/user/resetPassword");
};

exports.resetPage = (req, res) => {
  res.render("user/resetPassword");
};

exports.resetPass = async (req, res) => {
  const uid = id;
  const pass = req.body.password;
  const hashedPassword = await bcrypt.hash(pass, 10);
  Userdb.findByIdAndUpdate(uid, { password: hashedPassword })
    .then((data) => {
      if (!data) {
        res.redirect("user/forgotpass?error=error");
      } else {
        res.redirect("/?error=reset");
      }
    })
    .catch((err) => {
      res.status(500).send({ message: "Error updating user information" });
    });
};

exports.profile = async (req, res) => {
  let id = req.session.user._id;
  const user = await Userdb.findById(id);
  if (!user) {
    res.redirect("/user/logout");
  }
  res.render("user/userprofile", { user });
};

exports.showWallet = async (req, res) => {
  const userId = req.session.user;
  try {
    const user = await Userdb.findById(userId);
    const walletHistory = await WalletHistory.find({ userId: userId._id }).sort({ timestamp: -1 });
    // console.log(walletHistory);
    const wallet = user.wallet;
    const name = user.name;
    res.render('user/wallet', { wallet, name, history: walletHistory });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Error!");
  }
}

exports.showAddress = async (req, res) => {
  const user = req.session.user;
  try {
    const address = await AddressDb.find({ user_id: user._id });
    res.render("user/address", { ads: address, name: user.name });
  } catch (e) {
    res.redirect("/user/profile?msg=adserr");
  }
};

exports.showAddAddress = (req, res) => {
  let user = req.session.user;
  res.render("user/addaddress", { user });
};

exports.addAddress = async (req, res) => {
  const id = req.session.user._id;
  try {
    const name = req.body.name;
    const phone = req.body.phone;
    const pincode = req.body.pincode;
    const locality = req.body.locality;
    const address = req.body.address;
    const city = req.body.city;
    const state = req.body.state;
    const addressType = req.body.addressType;
    if (!name || !phone || !pincode || !locality || !address || !city || !state || !addressType) {
      res.status(401).send("Please fill all fields");
    }
    const checkExists = await AddressDb.find({
      name: name.trim(),
      phone: phone.trim(),
      pincode: pincode.trim(),
      locality: locality.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      addressType: addressType.trim()
    });

    // Check if the address already exists
    if (checkExists.length > 0) {
      return res.redirect('/user/address?msg=exists');
    }
    const newAddress = new AddressDb({
      user_id: id,
      name: name,
      phone: phone,
      pincode: pincode,
      locality: locality,
      address: address,
      city: city,
      state: state,
      addressType: addressType
    });
    await newAddress.save();
    res.redirect("/user/address?msg=succ");
  } catch (e) {
    console.log(e);
    res.redirect("/user/address?msg=err");
  }
};

exports.deleteAddress = async (req, res) => {
  let addId = req.params.id;
  try {
    await AddressDb.findByIdAndDelete(addId);
    res
      .status(200)
      .json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the address",
    });
  }
};

exports.showDeleteAddress = async (req, res) => {
  let id = req.params.id;
};

exports.deleteAddress = async (req, res) => {
  let id = req.params.id;
  await AddressDb.findByIdAndDelete(id)
    .then(() => {
      res.json(true);
    })
    .catch((err) => {
      console.log(err);
      res.json(false);
    });
};

exports.showChangePass = async (req, res) => {
  try {
    const id = req.session.user._id;
    const user = await Userdb.findById(id);
    if (!user.password) {
      return res.redirect("/user/profile?msg=cannotp");
    }
    res.render("user/changepass", { user });
  } catch (error) {
    console.error("Error in showChangePass:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.checkPass = async (req, res) => {
  try {
    const pass = req.body.password;
    const id = req.session.user._id;
    const user = await Userdb.findById(id);
    if (user.password) {
      const passwordMatch = await bcrypt.compare(pass, user.password);
      res.status(passwordMatch ? 200 : 401).send(passwordMatch);
    } else {
      res.status(401).send(false);
    }
  } catch (error) {
    console.error("Error in checkPass:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.changePass = async (req, res) => {
  try {
    const id = req.session.user._id;
    const newPassword = req.body.newpassword;
    // console.log(newPassword);

    const user = await Userdb.findById(id);

    // Corrected part
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.redirect("/user/profile?msg=chpasu");
  } catch (error) {
    console.error("Error in changePass:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.showEditAddress = async (req, res) => {
  const id = req.params.id;
  const name = req.session.user.name;
  const address = await AddressDb.findById(id);
  res.render("user/editaddress", { addr: address, name });
};

exports.saveAddress = async (req, res) => {
  const id = req.params.id;
  try {
    await AddressDb.findByIdAndUpdate(id, req.body)
      .then((data) => {
        if (!data) {
          res.redirect("/user/address?msg=erredit");
        } else {
          res.redirect("/user/address?msg=editsucc");
        }
      })
      .catch((err) => {
        res.status(500).send({ message: "Error updating user information" });
      });
  } catch (error) {
    console.error("Error saving address:", error);
    res.redirect("/user/address?msg=erredit");
  }
};

exports.showEditUsername = (req, res) => {
  const { name, email } = req.session.user;
  res.render("user/editusername", { name, email });
};

exports.editUsername = async (req, res) => {
  try {
    const id = req.session.user._id;
    const username = await Userdb.findById(id);
    // console.log(username);
    let editName = req.body.name;
    // console.log(editName);
    if (username.name === editName) {
      return res.redirect("/user/profile?msg=nochange");
    }
    username.name = editName;
    await username.save();
    req.session.user.name = editName;
    res.redirect("/user/profile?msg=namesuc");
  } catch (e) {
    console.log(e);
    res.redirect("/user/profile?msg=nameerr");
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.oid;
    const order = await OrderDb.findOne({
      '_id': orderId,
      'orderedItems.status': 'Delivered',
    }).populate('couponApplied shippingAddress');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const filteredItems = order.orderedItems.filter(item =>
      item.status === 'Delivered' && item.status !== 'Returned' && item.status !== 'Cancelled'
    );

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=order_invoice.pdf');
    doc.pipe(res);

    // Header Section
    doc.image('public/img/landing/dp.png', { width: 50, align: 'right' }).moveDown(0.5);
    doc.fontSize(20).text('RISHI STUDIO', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text('Invoice', { align: 'center' });
    doc.moveDown();

    // Company Information
    doc.fontSize(12).text('Address: 123 Studio Lane, City, State, ZIP');
    doc.text('Phone: (123) 456-7890');
    doc.text('Email: rishistudio@gmail.com');
    doc.text('Website: www.rishistudio.shop');
    doc.moveDown();

    // Invoice Details
    doc.fontSize(12).text(`Invoice Number: ${generateInvoiceNumber(order)}`);
    doc.text(`Invoice Date: ${formatDate(order.orderDate)}`);
    doc.moveDown();

    // Customer Information
    doc.fontSize(14).text('Customer Information:', { underline: true });
    doc.fontSize(12).text(`Name: ${order.name}`);
    doc.text(`Shipping Address: ${order.shippingAddress.address},`);
    doc.text(` ${order.shippingAddress.city}, ${order.shippingAddress.state}`);
    doc.text(` ${order.shippingAddress.pincode}`);
    doc.moveDown();

    // Ordered Items Table
    generateTable(doc, filteredItems);
    doc.moveDown();

    // Payment Information
    doc.fontSize(12).text(`Payment Method: ${order.paymentMethod}`);
    doc.text(`Payment Status: ${order.paymentStatus}`);
    if (order.couponApplied) {
      doc.text(`Coupon: (-)$${order.couponApplied.discountAmount}/-`, { align: 'right' });
    }
    doc.text(`Total Amount: $${order.totalAmount}/-`, { align: 'right' });
    doc.moveDown();

    // Footer Section
    doc.fontSize(10).text('Thank you for your purchase!', { align: 'center' });
    doc.text('For any inquiries, please contact us at rishistudio@gmail.com or (123) 456-7890.', { align: 'center' });
    doc.text('Return Policy: Items can be returned within 30 days of receipt. Please visit our website for more details.', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

function generateTable(doc, orderedItems) {
  const tableHeaders = ['Product Name', 'Description', 'Quantity', 'Unit Price', 'Total'];
  const tableData = orderedItems.map(item => [
    item.pname,
    item.description,
    item.quantity,
    `$${item.price}/-`,
    `$${item.price * item.quantity}/-`
  ]);

  doc.table({
    headers: tableHeaders,
    rows: tableData
  });
}

function generateInvoiceNumber(order) {
  // Generate a unique invoice number based on order details
  return `INV-${order._id}`;
}

function formatDate(date) {
  // Format date in a readable format
  return new Date(date).toLocaleDateString();
}
