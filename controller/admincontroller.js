const Userdb = require("../model/usermodel");
const ProductDb = require("../model/productmodel");
const CatDb = require("../model/categorymodel");
const AdminDb = require("../model/adminmodel");
const jwt = require("jsonwebtoken");
const multer = require('multer')
const path = require('path')


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
      res.redirect("/admin/dashboard");
    } else {
      // Password is incorrect, send error message
      res.redirect("/admin/?error=password");
    }
  } else {
    // Email is incorrect, send error message
    res.redirect("/admin/?error=email");
  }
};

exports.logout = (req, res) => {
  res.cookie("token", "", { maxAge: 0 });
  res.redirect("/");
};

exports.cookieJwtAuth = (req, res, next) => {
 // Allow unauthenticated requests to access the logout route     
  const url = req.originalUrl;
  if (url === '/admin/logout') {
     return next();
  }
      
  const token = req.cookies.token;
  if (!(token)) {
     return res.redirect("/admin/");
   }
 
  try {
    const admin = jwt.verify(token, process.env.MY_SECRET);
    req.admin = admin;
    if (url === '/admin/' || url === '') {
     res.redirect('/admin/dashboard');
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
}

const upload = multer({
  limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
          cb(null, true);
      } else {
          cb(new Error('Only images are allowed'));
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
}

exports.viewproducts = async (req, res) => {
  try {
    const products = await ProductDb.find({})
    res.render('admin/viewproducts', { products })
  } catch (error) {
    console.log(error);
  }
}
   
exports.addproduct = async(req,res) => {
  try {
      if (!req.body) {
        return res.status(400).send({ message: "Data to update cannot be empty" });
      }
      const imagesArray = req.files.map(file => file.path); // Assuming you're storing file paths

      if (imagesArray.length !== 4) {
        return res.status(400).send({ message: "Exactly four images are required" });
      }
      
      const data = new ProductDb({
        category: req.body.category,
        p_name: req.body.p_name,
        price: req.body.price,
        description: req.body.description,
        discount: req.body.discount,
        stock: req.body.stock,
        images: imagesArray // Save file paths in MongoDB
      });  

      await data.save();
      res.redirect('/admin/viewproducts');  
  }
  catch(e) {
    console.log(e);
    res.status(500).send("Error");
  }
}

exports.editproduct = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send({ message: "Data to update cannot be empty" });
    }

    const pid = req.params.id;
    const editvalues = req.body;
    const images = req.files;


    const product = await ProductDb.findById(pid);
    if (!product) {
      return res.status(400).send("Product Not Found!");
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
      const imagesArray = images.map(file => file.path);
      product.images = imagesArray;
    }

    product.total_price = Math.round(editvalues.price - (editvalues.price * (editvalues.discount / 100)));

    await product.save();
    res.redirect('/admin/viewproducts');
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Error!");
  }
}

exports.editproductpage = async (req,res)=>{
  try {
    let id = req.params.id
    const product = await ProductDb.findById(id)
    const cate = await CatDb.find({})
    res.render("admin/editproduct", { product, cate});
  } catch (e) {
    console.log(e);
    res.redirect("/admin/dashboard");
  }
}

exports.addcategory = async(req,res) => {
    //validate request
    if (!req.body) {
      res.status(400).send("Message content cannot be empty");
      return;
    }
    const {category} = req.body
    const cate = new CatDb({
      category: category
    });
    //save category in the database
    cate
      .save()
      .then((data) => {
        res.redirect('/admin/category');
      })
      .catch((err) => {
        res.status(500).send({
          message: err.message || "Some error occured",
        });
      });
}

exports.deletecategory = async (req, res) => {
  const id = req.params.id;
  try {
    await CatDb.findByIdAndDelete(id);
    res.status(200).redirect("/admin/category");
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
}

exports.deleteproduct = (req, res) => {
  const id = req.params.id;
  ProductDb.findByIdAndDelete({ _id: id })
    .then((data) => {
      if (!data) {
        res
          .status(404)
          .send({ message: `Cannot delete product with id ${id}. Maybe id is wrong!` });
      } else {
        res.redirect("/admin/viewproducts");
      }
    })
    .catch((err) => {
      res.status(500).send({ message: `Could not delete product with id ${id}` });
    });
};

exports.viewusers = async (req, res) => {
  const users = await Userdb.find();
  res.render("admin/viewusers",{users});
}

exports.userstatus = async (req, res) => {
  try{
    const id = req.params.id;
    console.log(id)
    const user = await Userdb.findById(id)
    console.log(user.status)
    if(user.status === "active"){
      user.status = "blocked";
    }else{
      user.status = "active";
    }
    await user.save();
    res.status(200).json({ status: user.status }); 
  }catch(e){
    console.log(e);
    res.send("Internal Error");
  }
}