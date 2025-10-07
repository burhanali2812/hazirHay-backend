const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const authMiddleWare = require("../authMiddleWare");
const ShopDetails = require("../models/ShopDetails");

// Add a new notification
router.post("/addNotification", authMiddleWare, async (req, res) => {
  const { type, message, userId , checkoutId} = req.body;
  try {
    const notification = new Notification({
      type,
      message,
      userId,
                  checkoutId,
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: "Notification saved successfully",
      data: notification,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
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

          const newNotification = new Notification({
            type: notify.type,
            message: notify.message,
            userId: shop.owner,
            checkoutId : notify.checkoutId
          });

          const savedRequest = await newNotification.save();
          saved.push(savedRequest);
        } catch (err) {
            console.error("Notification save error:", err); // 👈 full error details
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
router.get("/getAllNotification/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;
  try {
    const notifications = await Notification.find({ userId: id }).sort({createdAt: -1});

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
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.delete("/deleteNotification/:id", authMiddleWare, async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Notifications deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.put("/updateNotification", authMiddleWare, async (req, res) => {
  try {
    const { notifications } = req.body;

    // Wait for all updates
    await Promise.all(
      notifications.map(notify =>
        Notification.findByIdAndUpdate(
          notify._id,
          { isSeen: true },
          { new: true }
        )
      )
    );

    res.status(200).json({
      success: true,
      message: "Notifications Updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.delete("/clearAllNotifications/:userId", authMiddleWare, async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.deleteMany({ userId });
    res.status(200).json({
      success: true,
      message: "All notifications cleared successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } 
});

module.exports = router;
