const ShopDetails = require("../models/ShopDetails");
const axios = require("axios");
const authMiddleWare = require("../authMiddleWare");
const express = require("express");
const router = express.Router();

router.get("/getAllShops", authMiddleWare, async (req, res) => {
  try {
    const allShops = await ShopDetails.find();

    if (!allShops || allShops.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Shop found",
      });
    }

    res.status(200).json({
      success: true,
      message: "All Shops fetched successfully",
      data: allShops,
    });
  } catch (error) {
    console.error("Error fetching Shop:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching Shop",
      error: error.message,
    });
  }
});


module.exports = router;