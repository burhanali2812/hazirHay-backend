const express = require("express");
const bcrypt = require("bcryptjs");

const Admin = require("../models/Admin")
const router = express.Router();

router.post("/saveAdmin", async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;
        const alreadyExist = await Admin.findOne({ email });
        if (alreadyExist) {
            return res.status(400).json({ success: false, message: "Email Already Registered" });
        }    
        const genSalt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, genSalt);

        const admin = new Admin({
            name,
            email,
            password: hashPassword,
            phone,
            address
        });
      await admin.save();       
        res.status(200).json({ success: true, message: "Admin Created Successfully" });
    } catch (error) {
        console.error("Error saving admin:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});


module.exports = router;