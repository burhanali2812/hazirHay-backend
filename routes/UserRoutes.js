const axios = require("axios");
const authMiddleWare = require("../authMiddleWare");
const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.get("/getAllUser", authMiddleWare, async (req, res) => {
  try {
    const allUsers = await User.find();

    if (!allUsers || allUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found",
      });
    }

    res.status(200).json({
      success: true,
      message: "All users fetched successfully",
      data: allUsers,
    });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
      error: error.message,
    });
  }
});

router.post("/update-last-active", async (req, res) => {
  const { userID } = req.body;
  await User.findByIdAndUpdate(userID, { lastActive: new Date() });
  res.status(200).json({ success: true });
});

router.get("/get-live-users", authMiddleWare, async (req, res) => {
  const now = new Date();
  const activeThreshold = new Date(now.getTime() - 2 * 60 * 1000);
  try {
    const liveUsers = await User.find({
      lastActive: { $gte: activeThreshold },
    });
    res.status(200).json({ success: true, data: liveUsers });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/get-latest-users", authMiddleWare, async (req, res) => {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  try {
    const newUsers = await User.find({
      createdAt: { $gte: twoMinutesAgo },
    });
    res.status(200).json({ success: true, data: newUsers });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});


router.get("/get-frequent-users", authMiddleWare, async (req, res) => {
  try {
    const frequentUsers = await User.find()
      .sort({ activityCount: -1 }) 
      .limit(20); 

    res.status(200).json({ success: true, data: frequentUsers });
  } catch (error) {
    console.error("Error fetching frequent users:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


module.exports = router;
