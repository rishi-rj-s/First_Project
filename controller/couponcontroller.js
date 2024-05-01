const express = require("express");
const path = require("path");
const CatDb = require("../model/categorymodel");
const ProductDb = require("../model/productmodel");
const AddressDb = require("../model/addressmodel");
const OrderDb = require("../model/ordermodel");
const CouponDb = require("../model/couponmodel");

exports.showCoupons = async (req, res) => {
  try {
    const coupons = await CouponDb.find();
    if (coupons) {
      res.render("admin/coupons", { coupons });
    } else {
      console.log(coupons);
      res.status(401).send({ message: "No Coupons Found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.showAddCoupon = (req, res) => {
  res.render("admin/addcoupon");
};

exports.addCoupon = async (req, res) => {
  try {
    const { code, discountAmount, minimumPurchaseAmount, expiryDate } = req.body;
    if (
      !code ||
      !discountAmount ||
      !minimumPurchaseAmount || 
      !expiryDate
    ) {
      return res.status(200).send("All fields are necessary");
    }
    if (parseFloat(discountAmount) > parseFloat(minimumPurchaseAmount)) {
      return res
        .status(200)
        .send("Discount Amount cannot be greater than Minimum Purchase Amount");
    }
    let coupon = await CouponDb.find({ code: code });
    if (coupon && coupon.length > 0) {
      return res.redirect("/admin/viewcoupons?msg=exists");
    }
    let new_coupon = new CouponDb({
      code: code.toUpperCase(),
      discountAmount: discountAmount,
      minimumPurchaseAmount: minimumPurchaseAmount,
      expiryDate: expiryDate
    });
    await new_coupon.save();
    return res.redirect("/admin/viewcoupons?msg=success");
  } catch (e) {
    console.log(e);
    return res.redirect("/admin/viewcoupons?msg=error");
  }
};

exports.couponActive = async (req, res) => {
  try {
    const cid = req.params.cid;
    const coupon = await CouponDb.findById(cid);
    if (!coupon) throw "Invalid Request";

    if (coupon.isActive == true) {
      // Make it Inactive
      coupon.isActive = false;
    } else {
      // Make it Active
      coupon.isActive = true;
    }
    await coupon.save();
    return res.status(200).json({
      success: true,
      isActive: coupon.isActive,
      message: "Coupon status updated.",
    });
  } catch (e) {
    console.log(e);
    return res.redirect("/admin/viewcoupons?msg=actinact");
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const cid = req.params.cid;
    const deletedCoupon = await CouponDb.findByIdAndDelete(cid);

    if (!deletedCoupon) {
      // If the coupon with the provided ID is not found
      return res.status(404).json({ error: "Coupon not found" });
    }

    // Coupon deleted successfully
    return res
      .status(200)
      .json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    // Redirect to the view coupons page with a message
    return res.redirect("/admin/viewcoupons?msg=delerr");
  }
};

exports.renderEdit = async (req, res) => {
  const cid = req.params.cid;
  try {
    const coupon = await CouponDb.findById(cid);
    if (!coupon) {
      return res.status(404).send("No coupon found!");
    }
    res.render("admin/editcoupon", { coupon });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal server error");
  }
};
exports.editCoupon = async (req, res) => {
  try {
    const cid = req.params.cid;
    const discountAmount = parseInt(req.body.discountAmount);
    const minimumPurchaseAmount = parseInt(req.body.minimumPurchaseAmount);
    const code = req.body.code.toUpperCase();
    const expiryDate = req.body.expiryDate;
    if (!code | !discountAmount || !minimumPurchaseAmount || !expiryDate) {
      return res.status(200).send("All fields are necessary");
    }

    // Check if discount amount is greater than minimum purchase amount
    if (discountAmount > minimumPurchaseAmount) {
      return res
        .status(200)
        .send("Discount Amount cannot be greater than Minimum Purchase Amount");
    }

    // Update coupon
    const updatedCoupon = await CouponDb.findByIdAndUpdate(cid, {
      code: code,
      minimumPurchaseAmount: minimumPurchaseAmount,
      discountAmount: discountAmount,
      expiryDate: expiryDate
    });

    if (!updatedCoupon) {
      return res.send("No Data Found!");
    }

    return res.redirect("/admin/viewcoupons?msg=editsucc");
  } catch (error) {
    console.error("Error:", error);
    return res.redirect("/admin/viewcoupons?msg=editerr");
  }
};

exports.checkCoupon = async (req, res) => {
  try {
    const code = req.query.code;

    const regex = new RegExp(`^${code}`, "i"); // Create a regex pattern to match coupons starting with the input

    //   console.log("Received code:", code); // Log the received code parameter
    let coupons = await CouponDb.find({
      code: { $regex: regex },
      isActive: true,
    }, ['code', 'discountAmount', 'minimumPurchaseAmount']); // Select only necessary fields

    if (coupons.length === 0) {
      return res.json({ valid: false, codes: [] }); // No matching coupons found
    } else {
      return res.json({ valid: true, codes: coupons }); // Send coupon codes with discountAmount and minimumPurchaseAmount
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error!");
  }
};
