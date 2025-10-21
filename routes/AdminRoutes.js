const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const ShopKepper = require("../models/ShopKeeper");
const Worker = require("../models/Worker")
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const authMiddleWare = require("../authMiddleWare");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinaryConfig");
const ShopDetails = require("../models/ShopDetails");
const axios = require("axios");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

const roleModelMap = {
  admin: { model: Admin, label: "Admin" },
  user: { model: User, label: "User" },
  shopKepper: { model: ShopKepper, label: "ShopKepper" },
  worker: { model: Worker, label: "Worker" },
};
router.post(
  "/saveUser",
  upload.fields([{ name: "profilePicture" }, { name: "verificationDocument" }]),
  async (req, res) => {
    try {
      const { name, email, password, phone, cnic, address, role } = req.body;

      const roleData = roleModelMap[role];
      if (!roleData) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid role provided" });
      }

      const alreadyExist = await roleData.model.findOne({ email });
      if (alreadyExist) {
        return res
          .status(400)
          .json({ success: false, message: "Email Already Registered" });
      }

      const genSalt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, genSalt);

      const account = new roleData.model({
        name,
        email,
        password: hashPassword,
        phone,
        address,
        profilePicture: req.files?.profilePicture?.[0]?.path || "",
        ...(role === "shopKepper" && {
          cnic,
          verificationDocument:
            req.files?.verificationDocument?.[0]?.path || "",
        }),
      });

      await account.save();

      res.status(200).json({
        success: true,
        message: `${roleData.label} Created Successfully`,
        user: { id: account._id },
      });
    } catch (error) {
      console.error("Error saving user:", error.message, error.stack);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post(
  "/shopInformation/:id",

  upload.single("shopPicture"),

  async (req, res) => {
    const id = req.params.id;
    let { shopName, shopAddress, license, coordinates, area, services } =
      req.body;

    if (typeof coordinates === "string") {
      try {
        coordinates = JSON.parse(coordinates);
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid coordinates format" });
      }
    }

    if (typeof services === "string") {
      try {
        services = JSON.parse(services);
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid services format" });
      }
    }
    const licenseExist = await ShopDetails.findOne({ license });
    if (licenseExist) {
      return res.status(400).json({
        success: false,
        message: "Already shop exist on this license",
      });
    }

    try {
      const shop = new ShopDetails({
        owner: id,
        shopName,
        shopAddress,
        license,
        shopPicture: req.file?.path || "",
        location: {
          type: "Point",
          coordinates: coordinates,
          area: area,
        },
        servicesOffered: services,
      });

      const savedShop = await shop.save();
      if (!savedShop) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to store shop" });
      }

      const shopKepper = await ShopKepper.findByIdAndUpdate(
        id,
        { isShop: true },
        { new: true }
      );

      if (!shopKepper) {
        return res
          .status(404)
          .json({ success: false, message: "Shopkeeper not found" });
      }

      res.status(200).json({
        success: true,
        message: "Shop information stored successfully",
        data: shop,
      });
    } catch (error) {
      console.error("Error storing shop info:", error);
      res.status(500).json({
        success: false,
        message: "Failed to store shop information",
        error: error.message,
      });
    }
  }
);

router.post("/", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const roleData = roleModelMap[role];

    if (!roleData) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid role provided" });
    }

    const { model, label } = roleData;
    const finalUser = role === "worker" ? "phone" : "email";

    const account = await model.findOne({ [finalUser]: email });

    if (!account) {
      return res
        .status(400)
        .json({ success: false, message: `${label} not found on this ${finalUser}` });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        id: account._id,
        email: account.email,
        role: account.role,
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    await model.updateOne({ email: account.email }, { $inc: { activityCount: 1 } });
    account.password = undefined;

    return res.status(200).json({
      success: true,
      message: `${label} logged in successfully!`,
      token,
      user: account,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.get("/reverse-geocode", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    console.log("Incoming coordinates:", lat, lon);

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    const nominatimUrl = "https://nominatim.openstreetmap.org/reverse";

    const result = await axios.get(nominatimUrl, {
      params: { lat, lon, format: "json" },
      headers: {
        "User-Agent": "HazirHayApp/1.0 (contact@hazirhay.com)",
        "Accept-Language": "en",
      },
      timeout: 5000,
    });

    if (!result.data.address) {
      return res
        .status(404)
        .json({ error: "No address found for given coordinates" });
    }

    res.json(result.data);
  } catch (err) {
    console.error(
      "Error calling Nominatim:",
      err.response?.data || err.message
    );

    if (err.response?.status === 429) {
      return res
        .status(429)
        .json({ error: "Rate limit reached. Try again later." });
    }

    res.status(500).json({
      error: "Failed to fetch location",
      details: err.response?.data || err.message,
    });
  }
});

// router.get("/getUserById", authMiddleWare, async (req, res) => {
//   try {
//     const{id} = req.user
//     const user = await User.findById(id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "No user found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "user fetched successfully",
//       data: user,
//     });
//   } catch (error) {
//     console.error("Error fetching user:", error.message);
//     res.status(500).json({
//       success: false,
//       message: "Server error while fetching user",
//       error: error.message,
//     });
//   }
// });

module.exports = router;
