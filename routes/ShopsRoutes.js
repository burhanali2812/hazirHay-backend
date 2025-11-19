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
      servicesOffered: {
        $elemMatch: {
          category: category,
          "subCategory.name": subCategory,
        },
      },
    })
      .populate({
        path: "owner",
        match: { isVerified: true }, 
        select: "isVerified",        
      });

  
    const verifiedProviders = providers.filter(shop => shop.owner);

    if (!verifiedProviders.length) {
      return res.status(404).json({
        success: false,
        message: "No verified providers found",
        notFound : true,
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

router.post("/getPriceEstimate", async (req, res) => {
  const { category, subCategory } = req.body;
  try {
    let prices = [];
    const findShop = await ShopDetails.find();

    findShop.forEach(shop => {
      shop.servicesOffered.forEach(service => {
        if (
          service.category === category &&
          service.subCategory.name === subCategory
        ) {
          prices.push(service.subCategory.price);
        }
      });
    });
        if (prices.length === 0) {
      return res.status(404).json({
        success: false,
      });
    }

    const total = prices.reduce((acc, price) => acc + price, 0);
    const avgPrice = total / prices.length;

    const percentage10 = avgPrice * 0.1;
    const percentage5 = avgPrice * 0.05;
    const max5 = avgPrice + percentage5;
    const min5 = avgPrice - percentage5;
    const min10 = avgPrice - percentage10;
    const max10 = avgPrice + percentage10;
    const random = avgPrice + percentage10 * (Math.random() * 2 - 1);

    const finalPrices = [min10.toFixed(0), min5.toFixed(0), avgPrice.toFixed(0), max5.toFixed(0), max10.toFixed(0), random.toFixed(0)];

    res.status(200).json({
      success: true,
      message: "Average price fetched successfully",
      averagePrices: finalPrices,
      totalServices: prices.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});





router.get("/checkShopStatus", authMiddleWare, async (req, res) => {
  try {
    const { id } = req.user;
    const shop = await ShopDetails.findOne({owner: id});
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

    if (shop.isBlocked && shop.blockedRequestDate) {
      const now = new Date();
      const blockEnd = new Date(shop.blockedRequestDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (now < blockEnd) {
        const remainingDays = Math.ceil((blockEnd - now) / (1000 * 60 * 60 * 24));
        return res.status(200).json({
          success: true,
          status: shop.isBlocked,
          remainingDays,
          message: `Your shop is temporarily blocked. ${remainingDays} day(s) remaining.`,
        });
      } else {
        // Auto-unblock
        shop.isBlocked = false;
        shop.cancelRequest = 0;
        shop.blockedRequestDate = null;
        await shop.save();
      }
    }

    res.status(200).json({
      success: true,
      status: shop.isBlocked,
      cancelCount: shop.cancelRequest,
      message: "Your shop is active.",
    });
  } catch (error) {
    console.error("Error checking shop status:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.put("/resetCancelCount/:id",  async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await ShopDetails.findById(id);
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }
    shop.cancelRequest = 0;
    shop.isBlocked = false;
    shop.blockedRequestDate = null;
    await shop.save();
    res.status(200).json({ success: true, message: "Cancel count reset and shop unblocked if it was blocked." });
  } catch (error) {
    console.error("Error resetting cancel count:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

);

router.put("/updateService/:shopId", authMiddleWare, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { mode, serviceId, category, subCategory } = req.body;


    if (mode === "add") {
      const updatedShop = await ShopDetails.findByIdAndUpdate(
        shopId,
        {
          $push: {
            servicesOffered: { category, subCategory }
          }
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "New service added successfully",
        shop: updatedShop
      });
    }

    if (mode === "edit") {
      if (!serviceId) {
        return res.status(400).json({
          success: false,
          message: "Service ID is required for editing"
        });
      }

      const updatedShop = await ShopDetails.findOneAndUpdate(
        { _id: shopId, "servicesOffered._id": serviceId },
        {
          $set: {
            "servicesOffered.$.category": category,
            "servicesOffered.$.subCategory": subCategory
          }
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Service updated successfully",
        shop: updatedShop
      });
    }

    if (mode === "delete") {
      if (!serviceId) {
        return res.status(400).json({
          success: false,
          message: "Service ID is required for deleting"
        });
      }

      const updatedShop = await ShopDetails.findByIdAndUpdate(
        shopId,
        {
          $pull: {
            servicesOffered: { _id: serviceId }
          }
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Service deleted successfully",
        shop: updatedShop
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid mode. Use add, edit, or delete."
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});













module.exports = router;