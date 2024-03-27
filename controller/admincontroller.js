const Userdb = require("../model/usermodel");
const ProductDb = require("../model/productmodel");
const CatDb = require("../model/categorymodel");
const AdminDb = require("../model/adminmodel");
const AddressDb = require("../model/addressmodel");
const OrderDb = require("../model/ordermodel");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

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
    const [quantitySold, completedOrdersCount, overallDiscount] = await Promise.all([
      getTotalQuantitySold(),
      getCompletedOrdersCount(),
      getOverallDiscount()
    ]);

    // Render your dashboard with the retrieved data
    res.render('admin/dashboard', {
      totalQuantitySold: quantitySold, totalOrders: completedOrdersCount,
      overallDiscount: overallDiscount.toFixed(2) // Convert to 2 decimal places
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
        'orderedItems.paymentStatus': 'Completed', // Filter by paymentStatus Completed
        'orderedItems.returned': false // Filter by returned: false within orderedItems
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
  const count = await OrderDb.countDocuments({ 'orderedItems.paymentStatus': 'Completed' });
  return count;
}

// Function to calculate the overall discount from each order and sum it up
async function getOverallDiscount() {
  const result = await OrderDb.aggregate([
    {
      $match: {
        'orderedItems.paymentStatus': 'Completed', // Filter by paymentStatus Completed
        'orderedItems.returned': false // Filter by returned: false within orderedItems
      }
    },
    {
      $unwind: '$orderedItems' // Deconstruct the orderedItems array
    },
    {
      $group: {
        _id: '$_id', // Group by document _id to maintain document boundaries
        totalOriginalPrice: { $sum: '$orderedItems.originalPrice' }, // Sum originalPrice per document
        totalAmount: { $first: '$totalAmount' } // Take the totalAmount from the document
      }
    },
    {
      $group: {
        _id: null, // Group by null to calculate the total discount across all documents
        totalOriginalPrice: { $sum: '$totalOriginalPrice' }, // Sum all originalPrices
        totalAmount: { $sum: '$totalAmount' } // Sum all totalAmounts
      }
    },
    {
      $project: {
        overallDiscount: { $subtract: ['$totalOriginalPrice', '$totalAmount'] } // Calculate overall discount
      }
    }
  ]);

  return result.length > 0 ? result[0].overallDiscount : 0; // Return overall discount or 0 if no data found
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
    const products = await ProductDb.find({});
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
    const imagesArray = req.files.map((file) => file.path); // Assuming you're storing file paths

    if (imagesArray.length !== 4) {
      return res
        .status(400)
        .send({ message: "Exactly four images are required" });
    }

    // Trim and check for empty values
    const category = req.body.category.trim();
    const p_name = req.body.p_name.trim();
    const price = req.body.price.trim();
    const description = req.body.description.trim();
    const discount = req.body.discount.trim();
    const stock = req.body.stock.trim();

    // Check if any of the required fields are empty
    if (!category || !p_name || !price || !description || !discount || !stock) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Create a new instance of ProductDb with trimmed values
    const data = new ProductDb({
      category,
      p_name,
      price,
      description,
      discount,
      stock,
      images: imagesArray, // Save file paths in MongoDB
    });

    // Save the data to the collection
    await data.save();
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
  const p_id = req.params.pid;
  const product = await ProductDb.findById(p_id);
  const relatedProduct = await ProductDb.find({
    category: product.category,
  }).limit(4);
  if (!product) {
    res.status(404).send("No such product found!");
  }
  res.render("admin/productview", {
    product: product,
    similar: relatedProduct,
  });
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
    await CatDb.findByIdAndDelete(id);
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
      .populate("orderedItems.productId")
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
    const productId = req.params.pid;
    const orderId = req.query.oid;

    // Use async/await with findByIdAndUpdate to ensure proper error handling
    const updatedOrder = await OrderDb.findByIdAndUpdate(
      orderId,
      {
        $set: {
          "orderedItems.$[elem].status": "Delivered",
          "orderedItems.$[elem].returned": true,
        },
      },
      {
        arrayFilters: [{ "elem.productId": productId }],
        new: true, // Return the updated document
      }
    );

    // Check if updatedOrder is null (order not found) or if it's updated successfully
    if (!updatedOrder) {
      return res.status(404).json({ msg: "Order not found" });
    }

    // Handle the case where the order is updated successfully
    // console.log('Updated Order:', updatedOrder);
    return res.status(200).json({ success: true, message: "Return rejected!" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

exports.acceptReturn = async (req, res) => {
  try {
    const productId = req.params.pid;
    const orderId = req.query.oid;

    // Use async/await with findByIdAndUpdate to ensure proper error handling
    const updatedOrder = await OrderDb.findByIdAndUpdate(
      orderId,
      {
        $set: {
          "orderedItems.$[elem].status": "Returned",
          "orderedItems.$[elem].paymentStatus": "Refunded",
        }
      },
      {
        arrayFilters: [{ "elem.productId": productId }],
        new: true, // Return the updated document
      }
    );

    // Check if updatedOrder is null (order not found) or if it's updated successfully
    if (!updatedOrder) {
      return res.status(404).json({ msg: "Order not found" });
    }

    // Get the specific item from the updatedOrder
    const updatedItem = updatedOrder.orderedItems.find(item => item.productId.toString() === productId);

    // Calculate the price of the returned item
    const returnedItemPrice = updatedItem.price;

    // Get the user ID from the updatedOrder
    const userId = updatedOrder.user_id;

    // Update the user's wallet with the returnedItemPrice
    await Userdb.findByIdAndUpdate(userId, { $inc: { wallet: returnedItemPrice } });

    // Handle the case where the order is updated successfully and wallet is updated
    return res.status(200).json({ success: true, message: "Return accepted and wallet updated." });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

exports.statusShipped = async (req, res) => {
  try {
    const productId = req.params.pid;
    const orderId = req.query.oid;
    // console.log(productId, orderId);

    // Use async/await with findByIdAndUpdate to ensure proper error handling
    const updatedOrder = await OrderDb.findByIdAndUpdate(
      orderId,
      { $set: { "orderedItems.$[elem].status": "Shipped" } },
      {
        arrayFilters: [{ "elem.productId": productId }],
        new: true, // Return the updated document
      }
    );

    // Check if updatedOrder is null (order not found) or if it's updated successfully
    if (!updatedOrder) {
      return res.status(404).json({ msg: "Order not found" });
    }

    // Handle the case where the order is updated successfully
    // console.log('Updated Order:', updatedOrder);
    return res.status(200).json({ success: true, message: "Order Shipped." });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};

exports.statusDelivered = async (req, res) => {
  try {
    const productId = req.params.pid;
    const orderId = req.query.oid;
    // console.log(productId, orderId);

    // Use async/await with findByIdAndUpdate to ensure proper error handling
    const updatedOrder = await OrderDb.findByIdAndUpdate(
      orderId,
      {
        $set: {
          "orderedItems.$[elem].status": "Delivered",
          "orderedItems.$[elem].paymentStatus": "Completed", // Set paymentStatus to Completed
        },
      },
      {
        arrayFilters: [{ "elem.productId": productId }],
        new: true, // Return the updated document
      }
    );
    // console.log(updatedOrder);

    // Check if updatedOrder is null (order not found) or if it's updated successfully
    if (!updatedOrder) {
      return res.status(404).json({ msg: "Order not found" });
    }

    // Handle the case where the order is updated successfully
    // console.log('Updated Order:', updatedOrder);
    return res.status(200).json({ success: true, message: "Order Delivered." });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};
