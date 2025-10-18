const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinaryConfig");
const path = require("path");
const Worker = require("../models/Worker");
const ShopDetails = require("../models/ShopDetails")
const authMiddleWare = require("../authMiddleWare");

// multer Setup for profile picture upload ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

// save Worker Route ---
router.post(
  "/saveWorker",
  authMiddleWare,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const shopOwnerId = req.user._id;
      const { name, phone } = req.body;
      const cleanPhone = phone.trim();

 
      const alreadyExist = await Worker.findOne({ phone: cleanPhone, shopOwnerId });
      if (alreadyExist) {
        return res.status(400).json({
          success: false,
          message: "Phone already registered for this shop.",
        });
      }


      const shop = await ShopDetails.findOne({ owner: shopOwnerId });
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: "Shop not found.",
        });
      }


      const genSalt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(cleanPhone, genSalt);

    
      const worker = new Worker({
        name,
        phone: cleanPhone,
        password: hashPassword,
        role: "worker",
        shopId: shop._id,
        shopOwnerId,
        profilePicture: req.file ? req.file.path : "",
      });

      await worker.save();

      res.status(200).json({
        success: true,
        message: "Worker created successfully",
        worker: {
          id: worker._id,
          name: worker.name,
          phone: worker.phone,
          profilePicture: worker.profilePicture,
          loginDetails: { phone: worker.phone, password: phone },
        },
      });
    } catch (error) {
      console.error("Error saving worker:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);


module.exports = router;
