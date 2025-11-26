const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinaryConfig");
const bcrypt = require("bcryptjs");
const LocalShop = require("../models/LocalShop"); // Your schema
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
        password,
        phone,
        services,
        location,
        description,
      } = req.body;

      // Validate required fields
      if (!shopName || !position || !shopAddress || !email || !password || !phone || !location) {
        return res.status(400).json({ message: "All required fields must be provided." });
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
          parsedServices = typeof services === "string" ? JSON.parse(services) : services;
        } catch (err) {
          return res.status(400).json({ message: "Invalid services format." });
        }
      }

      // Parse location
      let parsedLocation;
      try {
        parsedLocation = typeof location === "string" ? JSON.parse(location) : location;
      } catch (err) {
        return res.status(400).json({ message: "Invalid location format." });
      }

      if (!parsedLocation.coordinates || !Array.isArray(parsedLocation.coordinates)) {
        return res.status(400).json({ message: "Location coordinates are required." });
      }

      // Get uploaded files
      const shopPictureUrl = req.files?.shopPicture?.[0]?.path || "";
      const paymentPicUrl = req.files?.paymentPic?.[0]?.path || "";

      if (!paymentPicUrl) {
        return res.status(400).json({ message: "Payment screenshot is required." });
      }

      // Create LocalShop
      const newShop = new LocalShop({
        shopName,
        position,
        shopAddress,
        description,
        shopPicture: shopPictureUrl,
        paymentPic: paymentPicUrl,
        email,
        password: hashedPassword,
        phone,
        services: parsedServices,
        location: parsedLocation,
      });

      await newShop.save();

      return res.status(201).json({ message: "Shop saved successfully!", shop: newShop });
    } catch (error) {
      console.error("Save LocalShop error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

router.get("/getAllVerifiedLiveLocalShops", authMiddleWare, async (req, res) => {
  try {

    if (req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }
    // get the false data for just checking later on change
    const findLocalShops = await LocalShop.find({ isLive: false, isVerified: false })
      .select("-paymentPic -password");

    if (findLocalShops.length === 0) {
      return res.status(404).json({ success: false, message: "No shops found" });
    }

  
    res.status(200).json({ success: true, shops: findLocalShops , message: "Local Shops Found Successfully!"});
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


module.exports = router;
