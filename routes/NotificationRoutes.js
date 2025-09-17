const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const authMiddleWare = require("../authMiddleWare");
const ShopDetails = require("../models/ShopDetails");

// Add a new notification
router.post("/addNotification", authMiddleWare, async (req, res) => {
  const { type, message, userId } = req.body;
  try {
    const notification = new Notification({
      type,
      message,
      userId,
    });

    await notification.save(); 

    res.status(201).json({
      success: true,
      message: "Notification saved successfully",
      data: notification,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
router.post("/sendBulkNotification", authMiddleWare, async (req, res) => {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No notifications provided",
      });
    }

    const saved = [];
    const errors = [];

    await Promise.all(
      notifications.map(async (notify) => {
        try {
          const shop = await ShopDetails.findById(notify.shopId);
          if (!shop) {
            errors.push({ shopId: notify.shopId, error: "Shop not found" });
            return;
          }

          const newRequest = new Requests({
            type: notify.type,
            message: notify.message,
            userId: shop.owner,
          });

          const savedRequest = await newRequest.save();
          saved.push(savedRequest);
        } catch (err) {
          errors.push({ notify, error: err.message });
        }
      })
    );

    res.status(200).json({
      success: true,
      message: "Notifications processed.",
      requests: saved,
      errors,
    });
  } catch (error) {
    console.error("Error sending notification to providers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});


// Get all notifications
router.get("/getAllNotification", authMiddleWare, async (req, res) => {
  try {
    const notifications = await Notification.find();

    if (notifications.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No notifications found" });
    }

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: notifications,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
