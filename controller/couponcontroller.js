const express = require("express");
const path = require("path");
const CatDb = require("../model/categorymodel");
const ProductDb = require("../model/productmodel");
const AddressDb = require('../model/addressmodel');
const OrderDb = require('../model/ordermodel');


exports.showCoupons