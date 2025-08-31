const ShopDetails = require("../models/ShopDetails");
const Requests = require("../models/Request");
const authMiddleWare = require("../authMiddleWare");
const express = require("express");
const router = express.Router();


router.post("/sendRequestData", authMiddleWare, async (req, res) => {
  try {
    const {category,subCategory, location ,userId} = req.body;


    if (!userId || !category || subCategory || !location || !location.coordinates) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, category, subCategory, location)",
      });
    }

    const liveProviders = await ShopDetails.find({ isLive: true });
    if (!liveProviders.length) {
      return res.status(404).json({
        success: false,
        message: "No online providers found",
      });
    }

    const categoryProvider = liveProviders.filter(
      (provider) =>
        Array.isArray(provider.servicesOffered) &&
        provider.servicesOffered.some(
          (service) => service.category === category
        )
    );

    if (!categoryProvider.length) {
      return res.status(404).json({
        success: false,
        message: `No providers found for category: ${category}`,
      });
    }
    await Promise.all(
      categoryProvider.map((provider) =>
        new Requests({
          shopId: provider._id,
          userId,
          location: {
            coordinates: location.coordinates,
            area: location.area,
          },
          category,
          subCategory,
        }).save()
      )
    );

    res.status(200).json({
      success: true,
      message: "Request sent to matching providers.",
    });
  } catch (error) {
    console.error("Error finding providers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
