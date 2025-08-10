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
const cloudinary = require("../cloudinaryConfig")

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
      .json({ success: true, message: `${roleData.label} Created Successfully` });
  }  catch (error) {
  console.error("Error saving user:", error.message, error.stack);
  res.status(500).json({ success: false, message: error.message });
}

});



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

module.exports = router;
