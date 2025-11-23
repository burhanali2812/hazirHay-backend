
const LocalShop = require("../models/LocalShop"); // Make sure you require your schema
const authMiddleWare = require("../authMiddleWare");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinaryConfig");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });


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
      } = req.body;


      if (!shopName || !position || !shopAddress || !email || !password || !phone || !location) {
        return res.status(400).json({ message: "All required fields must be provided." });
      }


      const existingShop = await LocalShop.findOne({ email });
      if (existingShop) {
        return res.status(400).json({ message: "Email already registered." });
      }

  
      const hashedPassword = await bcrypt.hash(password, 10);


      let parsedServices = [];
      if (services) {
        try {
          parsedServices = typeof services === "string" ? JSON.parse(services) : services;
        } catch (err) {
          return res.status(400).json({ message: "Invalid services format." });
        }
      }

    
      const shopPictureUrl = req.files?.shopPicture?.[0]?.path || "";
      const paymentPicUrl = req.files?.paymentPic?.[0]?.path || "";

      if (!paymentPicUrl) {
        return res.status(400).json({ message: "Payment screenshot is required." });
      }

 
      const newShop = new LocalShop({
        shopName,
        position,
        shopAddress,
        shopPicture: shopPictureUrl,
        paymentPic: paymentPicUrl,
        email,
        password: hashedPassword,
        phone,
        services: parsedServices,
        location, 
      });

      await newShop.save();

      return res.status(201).json({ message: "Local shop saved successfully!", shop: newShop });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
