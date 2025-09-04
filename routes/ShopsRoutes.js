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

router.get("/shopData/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const shop = await ShopDetails.findOne({ owner: id });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Shop fetched successfully",
      shop,
    });
  } catch (error) {
    console.error("Error fetching shop:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching shop data",
    });
  }
});
router.get("/shopsDataByCategory", authMiddleWare, async (req, res) => {
  const { category, subCategory } = req.query;

  try {
    const providers = await ShopDetails.find({
      isLive: true,
      servicesOffered: {
        $elemMatch: {
          category: category,
          "subCategory.name": subCategory,
        },
      },
    })
      .populate({
        path: "owner",
        match: { isVerified: true }, // filter by isVerified directly in populate
        select: "isVerified",        // only fetch the isVerified field
      });

    // Remove shops where owner is null after populate filter
    const verifiedProviders = providers.filter(shop => shop.owner);

    if (!verifiedProviders.length) {
      return res.status(404).json({
        success: false,
        message: "No verified providers found",
      });
    }

    res.status(200).json({
      success: true,
      data: verifiedProviders,
    });
  } catch (error) {
    console.error("Error fetching shop by category:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching shop by category",
    });
  }
});

router.post("/addReview", async (req, res) => {
  const { shopId, name, msg, rate } = req.body;
  try {
    const shop = await ShopDetails.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }
    const newReview = { name, msg, rate };
    shop.reviews.push(newReview);
    await shop.save();
    res.status(200).json({
      success: true,
      message: "Review added successfully",
      review: newReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while adding review",
      error: error.message,
    });
    console.error("Error adding review:", error.message);
  }
});










module.exports = router;