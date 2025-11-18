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
const axios = require("axios")

// multer Setup for profile picture upload ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });


router.post(
  "/saveWorker",
  authMiddleWare,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const shopOwnerId = req.user.id;
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

router.get("/getWorkersByShop", authMiddleWare, async (req, res) => {
  try {
    const shopOwnerId = req.user.id;

    
    const workers = await Worker.find({ shopOwnerId }).select("-password").sort({ createdAt: -1 });

    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No workers found for this shop",
      });
    }

    res.status(200).json({
      success: true,
      message: "Workers fetched successfully",
      workers,
    });
  } catch (error) {
    console.error("Error fetching workers:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching workers",
    });
  }
});
router.put("/updateLiveLocation/:workerId", authMiddleWare,async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const worker = await Worker.findByIdAndUpdate(
      req.params.workerId,
      {
        $set: {
          "location.coordinates": [lat, lng], 
        },
      },
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({ message: "worker not found" });
    }
res.json({
  success: true,
  message: "Coordinates updated successfully",
  coordinates: worker.location.coordinates,
});

  } catch (err) {
    console.error(err);
    res.status(500).json({success : false, message: "Server error" });
  }
});
router.get("/getLiveLocation/:workerId",authMiddleWare, async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.workerId).select("location.coordinates");
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    res.json({
      success : true,
      message: "live coordinates found", 
      coordinates: worker.location.coordinates, 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success : false,message: "Server error" });
  }
});

router.delete("/deleteWorker/:id", authMiddleWare, async (req, res) => {
  try {
    const { id } = req.params;

    const workers = await Worker.findByIdAndDelete(id);

    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No workers found for this shop",
      });
    }
    res.status(200).json({
      success: true,
      message: "Worker deleted successfully",
      workers,
    });
  } catch (error) {
    console.error("Error deleting workers:", error.message);
    res.status(500).json({
      success: false,
      message: "Error deleting workers",
    });
  }
});


router.post("/askAiWorker", async (req, res) => {
  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
      {
        contents: [{ parts: [{ text: req.body.prompt }] }]
      },
      {
        headers: {
          "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY
        }
      }
    );

    res.json({ answer: response.data });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ error: "Gemini request failed" });
  }
});


module.exports = router;
