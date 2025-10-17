const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinaryConfig");
const path = require("path");
const Worker = require("../models/Worker");
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
  "/saveWorker/:shopId",
  authMiddleWare,
  upload.single("profilePicture"), 
  async (req, res) => {
    try {
      const { shopId } = req.params; 
      const shopOwnerId = req.user._id; 
      const { name, email, phone, role } = req.body;

   
      const alreadyExist = await Worker.findOne({ email, shopOwnerId });
      if (alreadyExist) {
        return res.status(400).json({
          success: false,
          message: "Email already registered for this shop.",
        });
      }


      const genSalt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(phone, genSalt);

 
      const worker = new Worker({
        name,
        email,
        phone,
        password: hashPassword,
        role: role || "worker",
        shopId,
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
          email: worker.email,
          phone: worker.phone,
        },
      });
    } catch (error) {
      console.error("Error saving worker:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
