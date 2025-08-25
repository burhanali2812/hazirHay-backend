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
router.get("/getUserById/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.post("/addUserLocation/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;
  const { name , coordinates , area } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.location.push({
       name,
      coordinates,
      area
    })
    await user.save();

    res.status(200).json({ success: true, message: "Location added successfully", user });
  } catch (error) {
    console.error("Error saving user location:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/deleteUserLocation/:id", authMiddleWare, async (req, res) => {
  const locationId = req.params.id;
  const userId = req.user.id; 

  try {

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Filter out the location to be deleted
    user.location = user.location.filter(
      (loc) => loc._id.toString() !== locationId
    );

    await user.save();

    res.status(200).json({ success: true, message: "Location deleted successfully", user });
  } catch (error) {
    console.error("Error deleting user location:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



module.exports = router;
