const ProductDb = require("../model/productmodel");
const CatDb = require("../model/categorymodel");
const OfferDb = require('../model/offermodel');

exports.renderOffers = async (req, res) => {
  try {
    const offers = await OfferDb.find().populate('catId pdtId').limit(3).sort({ _id: -1 });
    if (!offers) {
      res.status(404).send("No offers");
    }
    let pages = await OfferDb.countDocuments();
    pages = Math.ceil(pages / 3)
    res.render('admin/offers', { offers, pages });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
}

exports.renderMoreOffers = async (req, res) => {
  try {
    const page = req.query.page
    let jump = (page - 1) * 3;
    console.log(page, jump, "Triggered!")

    // Fetch coupons details from the database
    const offers = await OfferDb.find().populate('catId pdtId').limit(3).skip(jump).sort({ _id: -1 });
    // console.log(offers)

    // return the order list page and pass the orders, categories, user, and cancelledProducts data to the view
    return res.status(200).json({ offers }); // Send JSON response with orders data
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error!");
  }
}


exports.renderAddPoffer = async (req, res) => {
  try {
    const product = await ProductDb.find({ listing: "Listed", offerActive: false });
    // console.log(product)
    res.render('admin/addpoffer', { product });
  } catch (e) {
    console.log(e.toString());
    res.status(500).send("Internal Server Error!");
  }
}

exports.addPOffer = async (req, res) => {
  try {
    const { productId, discount } = req.body;
    console.log(productId, discount)
    if (!productId || !discount) {
      return res.status(404).send('All fields are necessary')
    } else if (discount > 90 || discount < 10) {
      return res.status(404).send('Inappropriate Discount')
    }

    const pdt = await ProductDb.findById(productId);

    if (!pdt) {
      return res.status(404).send('Product not found');
    }

    const newOffer = new OfferDb({
      type: 'Product', // Assuming it's a product offer
      pdtId: productId, // Assuming product is the name of the product
      discount: discount,
    });

    // Save the new offer to the database
    const offer = await newOffer.save();

    pdt.offerActive = true;
    pdt.offerDiscount = Math.round((discount / 100) * pdt.total_price);
    pdt.offerId = offer._id;

    await pdt.save();
    res.redirect('/admin/offers?msg=pofs');
  } catch (e) {
    console.log(e.toString());
    res.redirect('/admin/offers?msg=offfail');
  }
}

exports.renderAddCoffer = async (req, res) => {
  try {
    const category = await CatDb.find({ listing: true, offerActive: false });
    res.render('admin/addcoffer', { category });
  } catch (e) {
    console.log(e.toString());
    res.status(500).send("Internal Server Error!");
  }
}

exports.addCOffer = async (req, res) => {
  try {
    const { categoryId, discount } = req.body;
    if (!categoryId || !discount) {
      return res.status(404).send('All fields are necessary')
    } else if (discount > 90 || discount < 10) {
      return res.status(404).send('Inappropriate Discount')
    }

    const category = await CatDb.findById(categoryId);

    if (!category) {
      return res.status(404).send('Category not found');
    }

    const newOffer = new OfferDb({
      type: 'Category', // Assuming it's a product offer
      catId: categoryId, // Assuming product is the name of the product
      discount: discount,
    });

    // Save the new offer to the database
    const offer = await newOffer.save();

    category.offerActive = true;
    category.offerDiscount = discount;
    category.offerId = offer._id;

    await category.save();

    const products = await ProductDb.find({ category: categoryId });

    for (const product of products) {
      if (product.offerActive) {
        let offerId = product.offerId;
        let offDisc = Math.round((discount / 100) * product.total_price);
        if (product.offerDiscount > offDisc) {
          continue;
        } else {
          await OfferDb.findByIdAndDelete(offerId);
        }
      } else {
        product.offerActive = true;
        product.offerDiscount = Math.round((discount / 100) * product.total_price);
        product.offerId = offer._id;

        await product.save();
      }
    }

    res.redirect('/admin/offers?msg=cofs');
  } catch (e) {
    console.log(e.toString());
    res.redirect('/admin/offers?msg=offfail');
  }
}

exports.renderEditOffer = async (req, res) => {
  try {
    const offerId = req.params.offId;
    const offer = await OfferDb.findById(offerId);
    if (!offer) {
      return res.status(404).send("No offer found with this id");
    }
    res.render('admin/editoffer', { offer });
  } catch (e) {
    console.log(e);
    return res.status(500).send("Internal Server Error");
  }
}

exports.editOffer = async (req, res) => {
  try {
    const offerId = req.body.offId;
    const discount = req.body.discount
    if (discount > 30 || discount < 10) {
      res.status(404).send("Discount either exceeds or is below the limit!")
    }
    await OfferDb.findByIdAndUpdate(offerId, {
      discount: discount
    });

    const offer = await OfferDb.findById(offerId);

    if (offer.type === "Category") {
      await CatDb.findByIdAndUpdate(offer.catId, {
        offerDiscount: discount,
      });
      const products = await ProductDb.find({ category: offer.catId });
      for (const product of products) {
        product.offerActive = true;
        product.offerDiscount = Math.round((discount / 100) * product.total_price);
        product.offerId = offer._id;
        await product.save();
      }
    } else {
      const product = await ProductDb.findById(offer.pdtId);
      product.offerDiscount = Math.round((discount / 100) * product.total_price);

      await product.save();
    }
    res.redirect("/admin/offers?msg=edits")
  } catch (e) {
    console.log(e);
    return res.status(500).send("Internal Server Error");
  }
}

exports.deleteOffer = async (req, res) => {
  try {
    const offerId = req.params.offId;
    // console.log(offerId)
    const offer = await OfferDb.findByIdAndDelete(offerId);

    if (!offer) {
      return res.status(404).send('Offer not found');
    }

    if (offer.type === "Category") {
      // Update category
      await CatDb.findByIdAndUpdate(offer.catId, {
        $set: {
          offerActive: false,
          offerDiscount: 0
        },
        $unset: {
          offerId: ''
        }
      });

      // Get all products with the category offer applied
      const productsToUpdate = await ProductDb.find({
        category: offer.catId,
        offerId: offerId
      });

      // Update offers only for products with the category offer applied
      for (const product of productsToUpdate) {
        await ProductDb.findByIdAndUpdate(product._id, {
          $set: {
            offerActive: false,
            offerDiscount: 0,
          },
          $unset: {
            offerId: ''
          }
        });
      }
    } else {
      // Update product
      await ProductDb.findByIdAndUpdate(offer.pdtId, {
        $set: {
          offerActive: false,
          offerDiscount: 0
        },
        $unset: {
          offerId: ''
        }
      });

      // Check if there's a category offer that can be applied
      const categoryOffer = await OfferDb.findOne({
        type: "Category",
        catId: product.category
      });

      if (categoryOffer) {
        // Apply category offer to product
        await ProductDb.findByIdAndUpdate(product._id, {
          $set: {
            offerActive: true,
            offerDiscount: categoryOffer.discount,
            offerId: categoryOffer._id
          }
        });
      }
    }

    res.redirect("/admin/offers?msg=delsu")
  } catch (e) {
    console.log(e);
    return res.status(500).send("Internal Server Error");
  }
}