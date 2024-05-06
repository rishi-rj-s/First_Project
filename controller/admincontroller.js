const Userdb = require("../model/usermodel");
const ProductDb = require("../model/productmodel");
const CatDb = require("../model/categorymodel");
const AdminDb = require("../model/adminmodel");
const CouponDb = require("../model/couponmodel");
const OrderDb = require("../model/ordermodel");
const OfferDb = require('../model/offermodel');
const WalletHistory = require("../model/wallethistory");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const mongoose = require('mongoose')

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const admin = await AdminDb.findOne({ username: username });
  if (admin) {
    if (password === admin.password) {
      const adminObj = admin.toObject();
      const token = jwt.sign(adminObj, process.env.MY_SECRET, {
        expiresIn: "4h",
      });
      res.cookie("token", token, {
        httpOnly: true,
      });
      res.redirect("/admin/dashboard?msg=loggedin");
    } else {
      // Password is incorrect, send error message
      res.redirect("/admin/?error=password");
    }
  } else {
    // Email is incorrect, send error message
    res.redirect("/admin/?error=email");
  }
};

exports.dashboard = async (req, res) => {
  try {
    const [quantitySold, completedOrdersCount] = await Promise.all([
      getTotalQuantitySold(),
      getCompletedOrdersCount(),
      // getOverallDiscount()
    ]);
    const orders = await OrderDb.find().populate('orderedItems.productId');
    // Calculate top 10 products bought
    const productFrequency = {};
    orders.forEach(order => {
      order.orderedItems.forEach(item => {
        const productId = item.productId._id.toString();
        if (productFrequency[productId]) {
          productFrequency[productId]++;
        } else {
          productFrequency[productId] = 1;
        }
      });
    });
    const topProductsIds = Object.keys(productFrequency)
      .sort((a, b) => productFrequency[b] - productFrequency[a])
      .slice(0, 10);

    const topProducts = await Promise.all(topProductsIds.map(async productId => {
      const product = await ProductDb.findById(productId);
      return {
        id: productId,
        name: product.p_name,
        images: product.images,
        frequency: productFrequency[productId]
      };
    }));

    // Calculate top 10 categories
    const categoryFrequency = {};
    orders.forEach(order => {
      order.orderedItems.forEach(item => {
        const categoryId = item.productId.category.toString();
        if (categoryFrequency[categoryId]) {
          categoryFrequency[categoryId]++;
        } else {
          categoryFrequency[categoryId] = 1;
        }
      });
    });
    const topCategoriesIds = Object.keys(categoryFrequency)
      .sort((a, b) => categoryFrequency[b] - categoryFrequency[a])
      .slice(0, 10);

    const topCategories = await Promise.all(topCategoriesIds.map(async categoryId => {
      const category = await CatDb.findById(categoryId);
      return {
        id: categoryId,
        name: category.category,
        frequency: categoryFrequency[categoryId]
      };
    }));


    // Render your dashboard with the retrieved data
    res.render('admin/dashboard', {
      totalQuantitySold: quantitySold, totalOrders: completedOrdersCount,
      topProducts, topCategories
    });
  } catch (error) {
    console.error('Error in dashboard function:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Function to get the total quantity sold
async function getTotalQuantitySold() {
  const result = await OrderDb.aggregate([
    {
      $match: {
        'paymentStatus': 'Completed', // Filter by paymentStatus Completed
        'returned': false // Filter by returned: false within orderedItems
      }
    },
    {
      $unwind: '$orderedItems' // Deconstruct the orderedItems array
    },
    {
      $group: {
        _id: null, // Group by null to calculate the total across all documents
        totalQuantitySold: { $sum: '$orderedItems.quantity' } // Sum the quantities
      }
    }
  ]);

  return result.length > 0 ? result[0].totalQuantitySold : 0;
}

// Function to get the count of completed orders
async function getCompletedOrdersCount() {
  const count = await OrderDb.countDocuments({ 'paymentStatus': 'Completed' });
  return count;
}

exports.logout = (req, res) => {
  res.cookie("token", "", { maxAge: 0 });
  res.redirect("/?error=logout");
};

exports.cookieJwtAuth = (req, res, next) => {
  // Allow unauthenticated requests to access the logout route
  const url = req.originalUrl;
  if (url === "/admin/logout") {
    return next();
  }

  const token = req.cookies.token;
  if (!token) {
    return res.redirect("/admin/");
  }

  try {
    const admin = jwt.verify(token, process.env.MY_SECRET);
    req.admin = admin;
    if (url === "/admin/" || url === "") {
      res.redirect("/admin/dashboard");
      return;
    }
    next();
  } catch (err) {
    res.clearCookie("token");
    return res.redirect("/");
  }
};

exports.addproductpage = async (req, res) => {
  try {
    const cate = await CatDb.find();
    res.render("admin/addproduct", { category: cate });
  } catch (e) {
    console.log(e);
    res.redirect("/admin/dashboard");
  }
};

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
});

exports.category = async (req, res) => {
  try {
    const cate = await CatDb.find();
    res.render("admin/category", { category: cate });
  } catch (e) {
    console.log(e);
    res.redirect("/admin/dashboard");
  }
};

exports.viewproducts = async (req, res) => {
  try {
    const products = await ProductDb.find().populate('category');
    res.render("admin/viewproducts", { products });
  } catch (error) {
    console.log(error);
  }
};

exports.addproduct = async (req, res) => {
  try {
    if (!req.body) {
      return res
        .status(400)
        .send({ message: "Data to update cannot be empty" });
    }

    // Trim and check for empty values
    const category = req.body.category;
    const p_name = req.body.p_name;
    const price = req.body.price;
    const description = req.body.description;
    const discount = req.body.discount;
    const stock = req.body.stock;
    const images = req.body.croppedImages;
    // console.log(req.body)
    

    // Check if any of the required fields are empty
    if (!category || !p_name || !price || !description || !discount || !stock ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if(images.length>4 || images.length<3){
      return res.status(400).json({error: "The image count is wrong"})
    }

    // Create a new instance of ProductDb with trimmed values
    const data = new ProductDb({
      category,
      p_name,
      price,
      description,
      discount,
      stock,
      images,
    });

    // Save the data to the collection
    const newPdt = await data.save();
    const offer = await OfferDb.findOne({ catId: newPdt.category })
    if (offer) {
      newPdt.offerActive = true;
      newPdt.offerId = offer._id;
      newPdt.offerDiscount = Math.round((offer.discount / 100) * newPdt.total_price);
      await newPdt.save();
    }
    res.redirect("/admin/viewproducts?msg=success");
  } catch (e) {
    console.log(e);
    res.status(500).send("Error");
  }
};

exports.editproduct = async (req, res) => {
  try {
    if (!req.body) {
      return res
        .status(400)
        .send({ message: "Data to update cannot be empty" });
    }

    const pid = req.params.id;
    const editvalues = req.body;
    const images = req.files;

    const product = await ProductDb.findById(pid);
    if (!product) {
      return res.status(400).send("Product Not Found!");
    }
    const category = editvalues.category;
    const p_name = editvalues.p_name;
    const price = editvalues.price;
    const description = editvalues.description;
    const discount = editvalues.discount;
    const stock = editvalues.stock;

    // Check if any of the trimmed required fields are empty
    if (!category || !p_name || !price || !description || !discount || !stock) {
      return res.status(400).json({ error: "All fields are required" });
    }

    product.p_name = editvalues.p_name;
    product.price = editvalues.price;
    product.description = editvalues.description;
    product.category = editvalues.category;
    product.discount = editvalues.discount;
    product.stock = editvalues.stock;
    product.listing = editvalues.listing;

    // Check if new images are provided, then replace the old ones
    if (images.length === 4) {
      const imagesArray = images.map((file) => file.path);
      product.images = imagesArray;
    }

    product.total_price = Math.round(
      editvalues.price - editvalues.price * (editvalues.discount / 100)
    );

    await product.save();
    res.redirect("/admin/viewproducts?msg=updated");
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Error!");
  }
};

exports.editproductpage = async (req, res) => {
  try {
    let id = req.params.id;
    const product = await ProductDb.findById(id);
    const cate = await CatDb.find({});
    res.render("admin/editproduct", { product, cate });
  } catch (e) {
    console.log(e);
    res.redirect("/admin/dashboard");
  }
};

exports.viewSingleProduct = async (req, res) => {
  try {
    const p_id = req.params.pid;
    const product = await ProductDb.findById(p_id);

    if (!product) {
      return res.status(404).send('Product not found');
    }

    if (!product) {
      res.status(404).send("No such product found!");
    }
    res.render("admin/productview", {
      product: product,
    });
  } catch (e) {
    console.log(e);
    res.render('pagenotfound');
  }

}

exports.addcategory = async (req, res) => {
  const { category } = req.body;
  const cate = new CatDb({
    category: category,
  });
  //save category in the database
  cate
    .save()
    .then((data) => {
      res.redirect("/admin/category?msg=success");
    })
    .catch((err) => {
      res.redirect("/admin/category?msg=error");
    });
};

exports.categorystatus = async (req, res) => {
  try {
    const id = req.params.id;
    // console.log(id);
    const category = await CatDb.findById(id);
    if (category.listing === true) {
      category.listing = false;
    } else {
      category.listing = true;
    }
    await category.save();
    res.status(200).json({ status: category.listing });
  } catch (e) {
    console.log(e);
    res.send("Internal Error");
  }
};

exports.editcategory = async (req, res) => {
  const id = req.params.id;
  const category = await CatDb.findById(id);
  res.render("admin/editcategory", { cate: category });
};

exports.updatecategory = async (req, res) => {
  const id = req.params.id;
  const name = req.body.category;
  await CatDb.findByIdAndUpdate(id, { category: name })
    .then(() => {
      res.redirect("/admin/category?msg=upsucc");
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/admin/category?msg=upfail");
    });
};

exports.deletecategory = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the category to be deleted
    const deletedCategory = await CatDb.findById(id);
    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    await Promise.all([
      // Delete products with the same category as the deleted category
      ProductDb.deleteMany({ category: deletedCategory._id }),
      // Delete the category itself
      CatDb.findByIdAndDelete(id),
      // Delete offers in the category
      OfferDb.findOneAndDelete({ catId: id })
    ]);

    res.status(200).redirect("/admin/category");
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
};

exports.deleteproduct = (req, res) => {
  const id = req.params.id;
  ProductDb.findByIdAndDelete({ _id: id })
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete product with id ${id}. Maybe id is wrong!`,
        });
      } else {
        res.redirect("/admin/viewproducts?msg=deleted");
      }
    })
    .catch((err) => {
      res
        .status(500)
        .send({ message: `Could not delete product with id ${id}` });
    });
};

exports.viewusers = async (req, res) => {
  const users = await Userdb.find();
  res.render("admin/viewusers", { users });
};

exports.userstatus = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await Userdb.findById(id);
    if (user.status === "active") {
      user.status = "blocked";
    } else {
      user.status = "active";
    }
    await user.save();
    res.status(200).json({ status: user.status });
  } catch (e) {
    console.log(e);
    res.send("Internal Error");
  }
};

exports.viewOrders = async (req, res) => {
  try {
    // Fetch orders, categories, and user from the database
    const orders = await OrderDb.find()
      .sort({ orderDate: -1 });
    // console.log(orders)
    // Render the order list page and pass the orders, categories, user, and cancelledProducts data to the view
    res.render("admin/vieworders", { orders });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.rejectReturn = async (req, res) => {
  try {
    const orderId = req.params.oid;
    const productId = req.query.pid;

    // Check if orderId and productId are valid MongoDB ObjectIDs
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ msg: "Invalid order ID or product ID" });
    }

    // Use async/await with findByIdAndUpdate to ensure proper error handling
    const updatedOrder = await OrderDb.findByIdAndUpdate(
      orderId,
      {
        $set: {
          "orderedItems.$[item].status": "Delivered",
          "orderedItems.$[item].returned": true
        }
      },
      {
        new: true,
        arrayFilters: [{ "item._id": productId }]
      }
    );

    // Check if updatedOrder is null (order not found) or if it's updated successfully
    if (!updatedOrder) {
      return res.status(404).json({ msg: "Order not found or product not found in the order" });
    }

    // Handle the case where the order is updated successfully
    return res.status(200).json({ success: true, message: "Return rejected!" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

exports.acceptReturn = async (req, res) => {
  try {
    const orderId = req.params.oid;
    const productId = req.query.pid;

    // Use async/await with findByIdAndUpdate to ensure proper error handling
    const updatedOrder = await OrderDb.findOneAndUpdate(
      { _id: orderId },
      { $set: { "orderedItems.$[item].status": "Returned" } },
      { new: true, arrayFilters: [{ "item._id": productId }] }
    );

    // Check if updatedOrder is null (order not found) or if it's updated successfully
    if (!updatedOrder) {
      return res.status(404).json({ msg: "Order not found" });
    }

    // Calculate the total price of the returned items
    const returnedProducts = updatedOrder.orderedItems.filter(item => item._id.toString() === productId && item.status === "Returned");
    if (returnedProducts.length === 0) {
      return res.status(404).json({ msg: "Product not found in order" });
    }

    let returnedItemPrice = 0;
    for (const item of returnedProducts) {
      const itemPrice = item.price - item.offerDiscount;
      returnedItemPrice += itemPrice;
    }

    console.log(returnedItemPrice);

    let refund = returnedItemPrice;
    updatedOrder.totalAmount -= returnedItemPrice;
    console.log(refund, updatedOrder.totalAmount);

    // Adjust refund amount if coupon applied
    if (updatedOrder.couponApplied) {
      const coupon = await CouponDb.findById(updatedOrder.couponApplied);
      if (coupon && (updatedOrder.totalAmount - returnedItemPrice) < coupon.minimumPurchaseAmount) {
        // Reduce refund amount to meet coupon minimum purchase amount
        refund -= coupon.discountAmount;
        updatedOrder.totalAmount += coupon.discountAmount;
        console.log(refund, updatedOrder.totalAmount);
      }
    }

    // Update order with adjusted total amount and remove coupon
    await OrderDb.findByIdAndUpdate(orderId, {
      $set: { totalAmount: updatedOrder.totalAmount },
      $unset: { couponApplied: 1 } // Remove coupon from order
    });

    // Check if all products in the order are returned
    const allReturned = updatedOrder.orderedItems.every(item => item.status === "Returned");

    if (allReturned) {
      // Update order status and payment status
      await OrderDb.findByIdAndUpdate(orderId, {
        $set: { status: "Returned", paymentStatus: "Refunded", totalAmount: 0 }
      });
    }

    // Get the user ID from the updatedOrder
    const userId = updatedOrder.user_id;

    // Update the user's wallet with the refunded amount
    await Userdb.findByIdAndUpdate(userId, { $inc: { wallet: refund } });

    // Create wallet history entry
    const history = new WalletHistory({
      userId: updatedOrder.user_id,
      transactionType: "Credit",
      amount: refund,
      order: updatedOrder._id
    });
    await history.save();

    // Handle the case where the order is updated successfully and wallet is updated
    return res.status(200).json({ success: true, message: "Return accepted and wallet updated." });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

exports.singleOrder = async (req, res) => {
  try {
    const orderId = req.query.oid;
    const order = await OrderDb.findById(orderId);
    if (!order || order.length == 0) {
      res.status(404).send("No order found");
    }
    res.render('admin/order', { order })
  } catch (e) {
    console.log(e.toString());
    res.status(500).send("Internal Server Error");
  }
}

exports.statusShipped = async (req, res) => {
  try {
    const orderId = req.params.oid;
    console.log(orderId);

    // Use async/await with findByIdAndUpdate to ensure proper error handling
    const updatedOrder = await OrderDb.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: "Shipped",
          "orderedItems.$[item].status": "Shipped" // Update orderedItems.status if the condition is met
        }
      },
      {
        new: true,
        arrayFilters: [{ "item.status": { $in: ["Shipped", "Pending"] } }] // Filter to update only if status is Shipped or Pending
      } // Return the updated document
    );

    // Check if updatedOrder is null (order not found) or if it's updated successfully
    if (!updatedOrder) {
      return res.status(404).json({ msg: "Order not found" });
    }

    // Handle the case where the order is updated successfully
    return res.status(200).json({ success: true, message: "Order Shipped." });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

exports.statusDelivered = async (req, res) => {
  try {
    const orderId = req.params.oid;
    // console.log(orderId);

    const orderToUpdate = await OrderDb.findById(orderId);

    if (orderToUpdate && (orderToUpdate.status === 'Shipped' || orderToUpdate.status === 'Pending')) {
      const updatedOrder = await OrderDb.findByIdAndUpdate(
        orderId,
        {
          $set: {
            status: "Delivered",
            paymentStatus: "Completed",
            "orderedItems.$[item].status": "Delivered" // Update orderedItems.status if the condition is met
          },
        },
        {
          new: true,
          arrayFilters: [{ "item.status": { $in: ["Shipped", "Pending"] } }] // Filter to update only if status is Shipped or Pending
        }
      );
      // Check if updatedOrder is null (order not found) or if it's updated successfully
      if (!updatedOrder) {
        return res.status(404).json({ msg: "Order not found" });
      }
      console.log(updatedOrder);
    } else {
      console.log("Order not eligible for update.");
    }

    return res.status(200).json({ success: true, message: "Order Delivered." });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};