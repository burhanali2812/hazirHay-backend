const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken")
const ShopKeeper = require("../models/ShopKeeper");
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET 
const authMiddleWare = require("../authMiddleWare")
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinaryConfig");
const ShopDetails = require("../models/ShopDetails");

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
  shopKepper: { model: ShopKeeper, label: "ShopKepper" },
};
router.post("/saveUser",upload.single("profilePicture"), async (req, res) => {
  try {
    const { name, email, password, phone, address, role} = req.body;
    const roleData = roleModelMap[role]
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

    const account = new  roleData.model({
      name,
      email,
      password: hashPassword,
      phone,
      address,
      profilePicture: req.file?.path || ""
    });
    await account.save();
    res
      .status(200)
      .json({ success: true, message: `${roleData.label} Created Successfully`, user : {id: account._id} });
  }  catch (error) {
  console.error("Error saving user:", error.message, error.stack);
  res.status(500).json({ success: false, message: error.message });
}

});

router.post(
  "/shopInformation/:id",
  upload.single("shopPicture"),

  async (req, res) => {
    const id = req.params.id; 
    const { shopName, shopAddress, license } = req.body;
    const licenseExist = await ShopDetails.findOne({license});
    if(licenseExist){
       return res
        .status(400)
        .json({ success: false, message: "Already shop exist on this license" });
    }

    try {
      const shop = new ShopDetails({
        owner: id,
        shopName,
        shopAddress,
        license,
        shopPicture: req.file?.path || ""
      });

      await shop.save();

      res.status(201).json({
        success: true,
        message: "Shop information stored successfully",
        data: shop
      });
    } catch (error) {
      console.error("Error storing shop info:", error);
      res.status(500).json({
        success: false,
        message: "Failed to store shop information",
        error: error.message
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

    const account = await model.findOne({ email });
    if (!account) {
      return res
        .status(400)
        .json({ success: false, message: `${label} not found on this email` });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign({
        id: account._id,
        email : account.email,
        role: account.role
    }, JWT_SECRET, {expiresIn : "1d"})

    return res
      .status(200)
      .json({ success: true, message: `${label} logged in successfully!` , token , user :{id: account._id}});
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.get("/admin/reverse-geocode", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const result = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { lat, lon, format: "json" },
      headers: { 
        "User-Agent": "HazirHayApp/1.0 (syedburhanali2812@gmail.com)",
        "Accept-Language": "en" // optional
      }
    });

    res.json(result.data);
  } catch (err) {
    console.error("Error calling Nominatim:", err.response?.data || err.message);
    res.status(500).json({ 
      error: "Failed to fetch location",
      details: err.response?.data || err.message
    });
  }
});


module.exports = router;
