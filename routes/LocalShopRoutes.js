const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinaryConfig");
const bcrypt = require("bcryptjs");
const LocalShop = require("../models/LocalShop");
const authMiddleWare = require("../authMiddleWare");

// Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

// Save Local Shop
router.post(
  "/saveLocalShop",
  upload.fields([
    { name: "shopPicture", maxCount: 1 },
    { name: "paymentPic", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        shopName,
        position,
        shopAddress,
        email,
        category,
        password,
        phone,
        services,
        location,
        description,
      } = req.body;

      // Validate required fields
      if (
        !shopName ||
        !position ||
        !shopAddress ||
        !email ||
        !password ||
        !phone ||
        !location ||
        !category ||
        !description
      ) {
        return res
          .status(400)
          .json({ message: "All required fields must be provided." });
      }

      // Check if email exists
      const existingShop = await LocalShop.findOne({ email });
      if (existingShop) {
        return res.status(400).json({ message: "Email already registered." });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Parse services
      let parsedServices = [];
      if (services) {
        try {
          parsedServices =
            typeof services === "string" ? JSON.parse(services) : services;
        } catch (err) {
          return res.status(400).json({ message: "Invalid services format." });
        }
      }

      // Parse location
      let parsedLocation;
      try {
        parsedLocation =
          typeof location === "string" ? JSON.parse(location) : location;
      } catch (err) {
        return res.status(400).json({ message: "Invalid location format." });
      }

      if (
        !parsedLocation.coordinates ||
        !Array.isArray(parsedLocation.coordinates)
      ) {
        return res
          .status(400)
          .json({ message: "Location coordinates are required." });
      }

      // Get uploaded files
      const shopPictureUrl = req.files?.shopPicture?.[0]?.path || "";
      const paymentPicUrl = req.files?.paymentPic?.[0]?.path || "";

      if (!paymentPicUrl) {
        return res
          .status(400)
          .json({ message: "Payment screenshot is required." });
      }

      // Create LocalShop
      const newShop = new LocalShop({
        shopName,
        position,
        shopAddress,
        description,
        shopPicture: shopPictureUrl,
        paymentPic: paymentPicUrl,
        category,
        email,
        password: hashedPassword,
        phone,
        services: parsedServices,
        location: parsedLocation,
      });

      await newShop.save();

      return res
        .status(201)
        .json({ message: "Shop saved successfully!", shop: newShop });
    } catch (error) {
      console.error("Save LocalShop error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

router.get(
  "/getAllVerifiedLiveLocalShops/:category",
  authMiddleWare,
  async (req, res) => {
    try {
      const { category } = req.params;
      const { type, name } = req.query;

      if (req.user.role !== "user") {
        return res
          .status(403)
          .json({ success: false, message: "Access Denied" });
      }
      let query = {
        isVerified: false,
        category,
      };

      if (type === "shopName" && name) {
        query.shopName = name;
      } else if (type === "services" && name) {
        query["services.name"] = name;
      }

      const shops = await LocalShop.find(query).select("-paymentPic -password");

      if (shops.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "No shops found" });
      }

      res.status(200).json({
        success: true,
        shops,
        message: "Local Shops Found Successfully!",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
);

router.get("/unique-shopnames/:category", async (req, res) => {
  try {
    const { category } = req.params;

    const shopNames = await LocalShop.distinct("shopName", { category });

    res.status(200).json({
      success: true,
      shopNames,
    });
  } catch (error) {
    console.log("Error getting unique shop names:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/unique-services/:category", async (req, res) => {
  try {
    const { category } = req.params;

    const services = await LocalShop.distinct("services.name", { category });

    res.status(200).json({
      success: true,
      services,
    });
  } catch (error) {
    console.log("Error getting unique services:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get Shop Data for Dashboard
router.get("/getShopData", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const shop = await LocalShop.findOne({ email: req.user.email }).select(
      "-password"
    );

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    res.status(200).json({
      success: true,
      shop,
      message: "Shop data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching shop data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update Shop Information
router.put("/updateShopInfo", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { shopName, position, description, shopAddress, phone, email } =
      req.body;

    const shop = await LocalShop.findOne({ email: req.user.email });

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    if (shopName) shop.shopName = shopName;
    if (position) shop.position = position;
    if (description) shop.description = description;
    if (shopAddress) shop.shopAddress = shopAddress;
    if (phone) shop.phone = phone;
    if (email && email !== req.user.email) {
      const existingShop = await LocalShop.findOne({ email });
      if (existingShop) {
        return res
          .status(400)
          .json({ success: false, message: "Email already in use" });
      }
      shop.email = email;
    }

    await shop.save();

    res.status(200).json({
      success: true,
      message: "Shop information updated successfully",
      shop: await LocalShop.findById(shop._id).select("-password"),
    });
  } catch (error) {
    console.error("Error updating shop info:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update Services
router.put("/updateServices", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { services } = req.body;

    if (!Array.isArray(services)) {
      return res
        .status(400)
        .json({ success: false, message: "Services must be an array" });
    }

    const shop = await LocalShop.findOne({ email: req.user.email });

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    shop.services = services;
    await shop.save();

    res.status(200).json({
      success: true,
      message: "Services updated successfully",
      shop: await LocalShop.findById(shop._id).select("-password"),
    });
  } catch (error) {
    console.error("Error updating services:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update Location
router.put("/updateLocation", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { location } = req.body;

    if (
      !location ||
      !location.coordinates ||
      !Array.isArray(location.coordinates)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid location format" });
    }

    const shop = await LocalShop.findOne({ email: req.user.email });

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    shop.location = {
      type: "Point",
      coordinates: location.coordinates,
      area: location.area || shop.location.area,
    };

    await shop.save();

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      shop: await LocalShop.findById(shop._id).select("-password"),
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update Single Image (Shop Picture or Payment Picture)
router.put(
  "/updateImage",
  authMiddleWare,
  upload.single("image"),
  async (req, res) => {
    try {
      if (req.user.role !== "shop") {
        return res
          .status(403)
          .json({ success: false, message: "Access Denied" });
      }

      const { imageType } = req.body;

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No image uploaded" });
      }

      if (!["shopPicture", "paymentPic"].includes(imageType)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid image type" });
      }

      const shop = await LocalShop.findOne({ email: req.user.email });

      if (!shop) {
        return res
          .status(404)
          .json({ success: false, message: "Shop not found" });
      }

      // Delete old image from cloudinary if exists
      if (shop[imageType]) {
        try {
          const publicId = shop[imageType].split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
        } catch (err) {
          console.log("Error deleting old image:", err);
        }
      }

      shop[imageType] = req.file.path;
      await shop.save();

      res.status(200).json({
        success: true,
        message: `${imageType} updated successfully`,
        shop: await LocalShop.findById(shop._id).select("-password"),
      });
    } catch (error) {
      console.error("Error updating image:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Add Menu Card Images (Multiple)
router.post(
  "/addMenuCards",
  authMiddleWare,
  upload.array("menuCards", 10),
  async (req, res) => {
    try {
      if (req.user.role !== "shop") {
        return res
          .status(403)
          .json({ success: false, message: "Access Denied" });
      }

      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No images uploaded" });
      }

      const shop = await LocalShop.findOne({ email: req.user.email });

      if (!shop) {
        return res
          .status(404)
          .json({ success: false, message: "Shop not found" });
      }

      // Initialize menuCard array if it doesn't exist
      if (!shop.menuCard) {
        shop.menuCard = [];
      } else if (typeof shop.menuCard === "string") {
        // Convert old string format to array
        shop.menuCard = shop.menuCard ? [shop.menuCard] : [];
      }

      // Add new menu card URLs
      const newMenuCards = req.files.map((file) => file.path);
      shop.menuCard = [...shop.menuCard, ...newMenuCards];

      await shop.save();

      res.status(200).json({
        success: true,
        message: "Menu cards added successfully",
        shop: await LocalShop.findById(shop._id).select("-password"),
      });
    } catch (error) {
      console.error("Error adding menu cards:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Delete Specific Menu Card
router.delete("/deleteMenuCard", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { menuCardUrl } = req.body;

    if (!menuCardUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Menu card URL required" });
    }

    const shop = await LocalShop.findOne({ email: req.user.email });

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Remove menu card from array
    if (Array.isArray(shop.menuCard)) {
      shop.menuCard = shop.menuCard.filter((url) => url !== menuCardUrl);
    }

    // Delete from cloudinary
    try {
      const publicId = menuCardUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
    } catch (err) {
      console.log("Error deleting image from cloudinary:", err);
    }

    await shop.save();

    res.status(200).json({
      success: true,
      message: "Menu card deleted successfully",
      shop: await LocalShop.findById(shop._id).select("-password"),
    });
  } catch (error) {
    console.error("Error deleting menu card:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Increment Activity Count
router.put("/incrementActivity/:shopId", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { shopId } = req.params;

    const shop = await LocalShop.findByIdAndUpdate(
      shopId,
      { $inc: { activityCount: 1 } },
      { new: true }
    ).select("-password");

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    res.status(200).json({
      success: true,
      message: "Activity count updated",
      activityCount: shop.activityCount,
    });
  } catch (error) {
    console.error("Error incrementing activity:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Toggle Live Status
router.put("/toggleLiveStatus", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    // Find shop by ID instead of email
    const shop = await LocalShop.findById(req.user.id);

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    shop.isLive = !shop.isLive;
    await shop.save();

    res.status(200).json({
      success: true,
      message: `Shop is now ${shop.isLive ? "Live" : "Offline"}`,
      isLive: shop.isLive,
    });
  } catch (error) {
    console.error("Error toggling live status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;
