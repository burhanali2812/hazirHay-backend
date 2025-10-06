const axios = require("axios");
const authMiddleWare = require("../authMiddleWare");
const express = require("express");
const router = express.Router();
const ShopKepper = require("../models/ShopKeeper");
const ShopDetails = require("../models/ShopDetails");


router.delete("/deleteShopKepper/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedShop = await ShopKepper.findByIdAndDelete(id);

    if (!deletedShop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    res.status(200).json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to delete" });
  }
});


router.put("/verifyShopKepper/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    let shopKepper;
    if (role === "accept") {
      shopKepper = await ShopKepper.findByIdAndUpdate(
        id,
        { isVerified: true },
        { new: true }
      );
    } else {
      shopKepper = await ShopKepper.findByIdAndUpdate(
        id,
        { isShop: false },
        { new: true }
      );
    }

    if (!shopKepper) {
      return res.status(404).json({
        success: false,
        message: "Shopkeeper not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Shopkeeper updated successfully",
      data: shopKepper,
    });
  } catch (error) {
    console.error("Error updating shopkeeper:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});


router.get("/allShopkepperWithShops", authMiddleWare, async (req, res) => {
  try {
    const shopKeppers = await ShopKepper.find({
      isShop: true,
      isVerified: false,
    })
      .lean()
      .sort({ createdAt: -1 });

    const shopWithShopKepper = await Promise.all(
      shopKeppers.map(async (kepper) => {
        const shop = await ShopDetails.findOne({ owner: kepper._id }).lean();
        if (!shop) return null;
        return { ...kepper, shop };
      })
    );
    res.status(200).json({
      success: true,
      message: "Shopkeepers with shops details fetched successfully",
      data: shopWithShopKepper,
    });
  } catch (error) {
    console.error("Error fetching shopkeepers:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});
router.get("/allVerifiedShopkepperWithShops", authMiddleWare, async (req, res) => {
  try {
    const shopKeppers = await ShopKepper.find({
      isShop: true,
      isVerified: true,
    })
      .lean()
      .sort({ createdAt: -1 });

    const shopWithShopKepper = await Promise.all(
      shopKeppers.map(async (kepper) => {
        const shop = await ShopDetails.findOne({ owner: kepper._id }).lean();
        if (!shop) return null;
        return { ...kepper, shop };
      })
    );
    res.status(200).json({
      success: true,
      message: "Shopkeepers with shops details fetched successfully",
      data: shopWithShopKepper,
    });
  } catch (error) {
    console.error("Error fetching shopkeepers:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});
router.get("/shopWithShopKepper/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const keeper = await ShopKepper.findById(id).lean();
    if (!keeper) {
      return res.status(404).json({ message: "ShopKeeper not found" });
    }

    const shop = await ShopDetails.findOne({ owner: id }).lean();

    const shopWithKepper = { ...keeper, shop };

    res.status(200).json({success : true , message : "Shop with shopkepper fetch successfully", data : shopWithKepper});
  } catch (error) {
    console.error("Error fetching shop with keeper:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/getAllShopKepper", authMiddleWare, async (req, res) => {
  try {
    const allShopkepper = await ShopKepper.find();

    if (!allShopkepper || allShopkepper.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Shopkepper found",
      });
    }

    res.status(200).json({
      success: true,
      message: "All Shopkepper fetched successfully",
      data: allShopkepper,
    });
  } catch (error) {
    console.error("Error fetching Shopkepper:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching Shopkepper",
      error: error.message,
    });
  }
});

router.put("/update-live", authMiddleWare, async (req, res) => {
  const { isLive } = req.body;
  const shopKepper = req.user;

  try {
    if (typeof isLive !== "boolean") {
      return res.status(400).json({ success: false, message: "Invalid isLive value" });
    }

    const findShopKepper = await ShopKepper.findOne({ email: shopKepper.email });
    if (!findShopKepper) {
      return res.status(404).json({ success: false, message: "No Shopkeeper Found" });
    }

    const shop = await ShopDetails.findOne({ owner: findShopKepper._id });
    if (!shop) {
      return res.status(404).json({ success: false, message: "No Shop Found For This Shopkeeper" });
    }

    await Promise.all([
      ShopKepper.findByIdAndUpdate(findShopKepper._id, { isLive }),
      ShopDetails.findByIdAndUpdate(shop._id, { isLive })
    ]);

    res.status(200).json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/getShopKepperStatus/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;

  try {
    const shopKepper = await ShopKepper.findById(id);

    if (!shopKepper) {
      return res.status(404).json({ success: false, message: "Shopkeeper not found" });
    }

    res.status(200).json({ success: true, data: shopKepper.isLive });
  } catch (error) {
    console.error("Error fetching shopkeeper status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.put("/updateBusy/:id", authMiddleWare, async (req, res) => {
  try {
    const { id } = req.params;
    await ShopKepper.findByIdAndUpdate(id, { isBusy: true });
    res.status(200).json({ success: true, message: "Shopkeeper is now busy" });
  } catch (error) {
    console.error("Error updating shopkeeper status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.get("/getBusyStatus/:id", authMiddleWare, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await ShopKepper.findById(id);
    res.status(200).json({ success: true, message: "Shopkeeper busy status get successfully" , data : user.isBusy });
  } catch (error) {
    console.error("Error getting shopkeeper status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});





module.exports = router;