const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinaryConfig");
const bcrypt = require("bcryptjs");
const LocalShop = require("../models/LocalShop");
const Admin = require("../models/Admin");
const authMiddleWare = require("../authMiddleWare");
const {
  createNotification,
  createBulkNotifications,
  NotificationMessages,
} = require("../helpers/notificationHelper");

// Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

// Save Local Shop
router.post(
  "/saveLocalShop",
  upload.fields([
    { name: "shopPicture", maxCount: 1 },
    { name: "paymentPic", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        shopName,
        position,
        shopAddress,
        category,
        password,
        phone,
        services,
        location,
        description,
      } = req.body;

      // Validate required fields
      if (
        !shopName ||
        !position ||
        !shopAddress ||
        !password ||
        !phone ||
        !location ||
        !category ||
        !description
      ) {
        return res
          .status(400)
          .json({ message: "All required fields must be provided." });
      }

      // Check if phone exists
      const existingShop = await LocalShop.findOne({ phone });
      if (existingShop) {
        return res.status(400).json({ message: "Phone number already registered." });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Parse services
      let parsedServices = [];
      if (services) {
        try {
          parsedServices =
            typeof services === "string" ? JSON.parse(services) : services;
        } catch (err) {
          return res.status(400).json({ message: "Invalid services format." });
        }
      }

      // Parse location
      let parsedLocation;
      try {
        parsedLocation =
          typeof location === "string" ? JSON.parse(location) : location;
      } catch (err) {
        return res.status(400).json({ message: "Invalid location format." });
      }

      if (
        !parsedLocation.coordinates ||
        !Array.isArray(parsedLocation.coordinates)
      ) {
        return res
          .status(400)
          .json({ message: "Location coordinates are required." });
      }

      // Get uploaded files
      const shopPictureUrl = req.files?.shopPicture?.[0]?.path || "";
      const paymentPicUrl = req.files?.paymentPic?.[0]?.path || "";

      if (!paymentPicUrl) {
        return res
          .status(400)
          .json({ message: "Payment screenshot is required." });
      }

      // Create LocalShop
      const newShop = new LocalShop({
        shopName,
        position,
        shopAddress,
        description,
        shopPicture: shopPictureUrl,
        paymentPic: paymentPicUrl,
        category,
        email,
        password: hashedPassword,
        phone,
        services: parsedServices,
        location: parsedLocation,
      });

      await newShop.save();

      // Send notification to local shop owner
      await createNotification(
        "registration",
        NotificationMessages.LOCALSHOP_SIGNUP(shopName),
        newShop._id,
        newShop._id
      );

      // Notify all admins about new local shop request
      const admins = await Admin.find();
      const adminNotifications = admins.map((admin) => ({
        type: "new_request",
        message: NotificationMessages.ADMIN_NEW_LOCALSHOP_REQUEST(shopName),
        userId: admin._id,
        checkoutId: newShop._id,
      }));
      await createBulkNotifications(adminNotifications);

      return res
        .status(201)
        .json({ message: "Shop saved successfully!", shop: newShop });
    } catch (error) {
      console.error("Save LocalShop error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

router.get(
  "/getAllVerifiedLiveLocalShops",
  authMiddleWare,
  async (req, res) => {
    try {
      const { category, type, name } = req.query;

      if (req.user.role !== "user") {
        return res
          .status(403)
          .json({ success: false, message: "Access Denied" });
      }
      let query = {
        isVerified: true,
        category,
      };

      if (type === "shopName" && name) {
        query.shopName = name;
      } else if (type === "services" && name) {
        query["services.name"] = name;
      } else if(type === "Quick Access") {
        query.category = name;
      }
      console.log("Query:", query);

      const shops = await LocalShop.find(query).select("-paymentPic -password");

      if (shops.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "No shops found" });
      }

      res.status(200).json({
        success: true,
        shops,
        message: "Local Shops Found Successfully!",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
);

router.get("/getAllLocalShops", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const localShops = await LocalShop.find().select("-password");

    res.status(200).json({
      success: true,
      message: "All local shops fetched successfully",
      data: localShops,
    });
  } catch (error) {
    console.error("Error fetching all local shops:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching all local shops",
      error: error.message,
    });
  }
});

router.get("/getPendingLocalShops", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const pendingShops = await LocalShop.find({ isVerified: false })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Pending local shops fetched successfully",
      data: pendingShops,
    });
  } catch (error) {
    console.error("Error fetching pending local shops:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching pending local shops",
      error: error.message,
    });
  }
});

router.put("/verifyLocalShop/:id", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { id } = req.params;
    const { action } = req.body;

    if (action === "accept") {
      const shop = await LocalShop.findByIdAndUpdate(
        id,
        { isVerified: true },
        { new: true }
      );

      if (!shop) {
        return res
          .status(404)
          .json({ success: false, message: "Shop not found" });
      }

      // Notify local shop about verification
      await createNotification(
        "verification",
        NotificationMessages.LOCALSHOP_VERIFIED(shop.shopName),
        shop._id,
        shop._id
      );

      res.status(200).json({
        success: true,
        message: "Local shop verified successfully",
        data: shop,
      });
    } else if (action === "decline") {
      const shop = await LocalShop.findById(id);

      if (!shop) {
        return res
          .status(404)
          .json({ success: false, message: "Shop not found" });
      }

      // Notify local shop about rejection before deletion
      await createNotification(
        "rejection",
        NotificationMessages.LOCALSHOP_REJECTED(shop.shopName),
        shop._id,
        shop._id
      );

      await LocalShop.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Local shop request declined and removed",
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid action" });
    }
  } catch (error) {
    console.error("Error verifying local shop:", error.message);
    res.status(500).json({
      success: false,
      message: "Error processing request",
      error: error.message,
    });
  }
});

router.get("/unique-shopnames", async (req, res) => {
  try {
    const { category } = req.query;

    const shopNames = await LocalShop.distinct("shopName", { category });

    res.status(200).json({
      success: true,
      shopNames,
    });
  } catch (error) {
    console.log("Error getting unique shop names:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/unique-services", async (req, res) => {
  try {
    const { category } = req.query;

    const services = await LocalShop.distinct("services.name", { category });

    res.status(200).json({
      success: true,
      services,
    });
  } catch (error) {
    console.log("Error getting unique services:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get Shop Data for Dashboard
router.get("/getShopData", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    // Fetch by ID instead of email
    const shop = await LocalShop.findById(req.user.id).select(
      "-password -paymentPic"
    );

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    res.status(200).json({
      success: true,
      shop,
      message: "Shop data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching shop data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update Shop Information
router.put("/updateShopInfo", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { shopName, position, description, shopAddress, phone, email } =
      req.body;

    // Fetch by ID (correct)
    const shop = await LocalShop.findById(req.user.id);

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Email change → must check uniqueness
    if (email && email !== shop.email) {
      const existingShop = await LocalShop.findOne({ email });
      if (existingShop) {
        return res
          .status(400)
          .json({ success: false, message: "Email already in use" });
      }
    }

    // Build update object
    const updateData = {};
    if (shopName) updateData.shopName = shopName;
    if (position) updateData.position = position;
    if (description) updateData.description = description;
    if (shopAddress) updateData.shopAddress = shopAddress;
    if (phone) updateData.phone = phone;
    if (email && email !== shop.email) updateData.email = email;

    // Update WITHOUT validation
    const updatedShop = await LocalShop.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: false, // ⬅ prevents required-field validation
      }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Shop information updated successfully",
      shop: updatedShop,
    });
  } catch (error) {
    console.error("Error updating shop info:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update Services
router.put("/updateServices", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { services } = req.body;

    if (!Array.isArray(services)) {
      return res
        .status(400)
        .json({ success: false, message: "Services must be an array" });
    }

    // Fetch by ID
    const shop = await LocalShop.findById(req.user.id);

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Update without validation
    const updatedShop = await LocalShop.findByIdAndUpdate(
      req.user.id,
      { services },
      {
        new: true,
        runValidators: false,
      }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Services updated successfully",
      shop: updatedShop,
    });
  } catch (error) {
    console.error("Error updating services:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update Location
router.put("/updateLocation", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { location } = req.body;

    if (
      !location ||
      !location.coordinates ||
      !Array.isArray(location.coordinates)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid location format" });
    }

    // Fetch by ID
    const shop = await LocalShop.findById(req.user.id);

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    const updateData = {
      location: {
        type: "Point",
        coordinates: location.coordinates,
        area: location.area || shop.location?.area || "",
      },
    };

    // Update without validation
    const updatedShop = await LocalShop.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: false,
      }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      shop: updatedShop,
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update Single Image (Shop Picture or Payment Picture)
router.put(
  "/updateImage",
  authMiddleWare,
  upload.single("image"),
  async (req, res) => {
    try {
      if (req.user.role !== "shop") {
        return res
          .status(403)
          .json({ success: false, message: "Access Denied" });
      }

      const { imageType } = req.body;

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No image uploaded" });
      }

      // Only shopPicture allowed now
      if (imageType !== "shopPicture") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid image type" });
      }

      // Fetch shop by ID
      const shop = await LocalShop.findById(req.user.id);

      if (!shop) {
        return res
          .status(404)
          .json({ success: false, message: "Shop not found" });
      }

      // Delete old shop picture (if exists)
      if (shop.shopPicture) {
        try {
          const publicId = shop.shopPicture.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
        } catch (err) {
          console.log("Error deleting old image:", err);
        }
      }

      // Update shop picture
      const updatedShop = await LocalShop.findByIdAndUpdate(
        req.user.id,
        { shopPicture: req.file.path },
        { new: true, runValidators: false }
      ).select("-password");

      res.status(200).json({
        success: true,
        message: `Shop picture updated successfully`,
        shop: updatedShop,
      });
    } catch (error) {
      console.error("Error updating image:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Add Menu Card Images (Multiple)
router.post(
  "/addMenuCards",
  authMiddleWare,
  upload.array("menuCards", 10),
  async (req, res) => {
    try {
      if (req.user.role !== "shop") {
        return res
          .status(403)
          .json({ success: false, message: "Access Denied" });
      }

      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No images uploaded" });
      }

      // Get shop by ID (correct for new login tokens)
      const shop = await LocalShop.findById(req.user.id);

      if (!shop) {
        return res
          .status(404)
          .json({ success: false, message: "Shop not found" });
      }

      const newMenuCards = req.files.map((file) => file.path);

      // Update without triggering full validation
      const updatedShop = await LocalShop.findByIdAndUpdate(
        req.user.id,
        {
          $push: { menuCard: { $each: newMenuCards } },
        },
        {
          new: true,
          runValidators: false, // ⬅ disables schema validation
        }
      ).select("-password -paymentPic");

      res.status(200).json({
        success: true,
        message: "Menu cards added successfully",
        shop: updatedShop,
      });
    } catch (error) {
      console.error("Error adding menu cards:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Delete Specific Menu Card
router.delete("/deleteMenuCard", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { menuCardUrl } = req.body;

    if (!menuCardUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Menu card URL required" });
    }

    // Fetch shop by ID
    const shop = await LocalShop.findById(req.user.id);

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    if (!Array.isArray(shop.menuCard) || shop.menuCard.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No menu cards to delete" });
    }

    // Remove the menu card from array
    const updatedMenuCards = shop.menuCard.filter((url) => url !== menuCardUrl);

    // Delete image from Cloudinary
    try {
      const publicId = menuCardUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
    } catch (err) {
      console.log("Error deleting image from cloudinary:", err);
    }

    // Update shop without validation
    const updatedShop = await LocalShop.findByIdAndUpdate(
      req.user.id,
      { menuCard: updatedMenuCards },
      { new: true, runValidators: false }
    ).select("-password -paymentPic");

    res.status(200).json({
      success: true,
      message: "Menu card deleted successfully",
      shop: updatedShop,
    });
  } catch (error) {
    console.error("Error deleting menu card:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Increment Activity Count
router.put("/incrementActivity/:shopId", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { shopId } = req.params;

    const shop = await LocalShop.findByIdAndUpdate(
      shopId,
      { $inc: { activityCount: 1 } },
      { new: true }
    ).select("-password");

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    res.status(200).json({
      success: true,
      message: "Activity count updated",
      activityCount: shop.activityCount,
    });
  } catch (error) {
    console.error("Error incrementing activity:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Toggle Live Status
router.put("/toggleLiveStatus", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "shop") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const shop = await LocalShop.findById(req.user.id);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    const updatedShop = await LocalShop.findByIdAndUpdate(
      req.user.id,
      { isLive: !shop.isLive },
      { new: true, runValidators: false } // ⬅ disable full validation
    );

    res.status(200).json({
      success: true,
      message: `Shop is now ${updatedShop.isLive ? "Live" : "Offline"}`,
      isLive: updatedShop.isLive,
    });
  } catch (error) {
    console.error("Error toggling live status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
