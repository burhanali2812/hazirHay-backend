const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const ShopKepper = require("../models/ShopKeeper");
const Worker = require("../models/Worker");
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const authMiddleWare = require("../authMiddleWare");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinaryConfig");
const ShopDetails = require("../models/ShopDetails");
const axios = require("axios");
const LocalShop = require("../models/LocalShop");
const { createNotification, createBulkNotifications, NotificationMessages } = require("../helpers/notificationHelper");


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
  shop: { model: LocalShop, label: "shop" },
};
router.post(
  "/saveUser",
  upload.fields([{ name: "profilePicture" }]),
  async (req, res) => {
    try {
      const { name, email, password, phone, cnic, address, role } = req.body;

      const roleData = roleModelMap[role];
      if (!roleData) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid role provided" });
      }

      const alreadyExist = await roleData.model.findOne({ email , role , phone });
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
         
          cnic
        }),
      });

      await account.save();

      // Send notification to the created account
      if (role === "user") {
        await createNotification(
          "signup",
          NotificationMessages.USER_SIGNUP(name),
          account._id,
          account._id
        );
      } else if (role === "shopKepper") {
        await createNotification(
          "signup",
          NotificationMessages.SHOPKEEPER_SIGNUP(name),
          account._id,
          account._id
        );

        // Notify all admins about new shopkeeper
        const admins = await Admin.find();
        const adminNotifications = admins.map(admin => ({
          type: "new_request",
          message: NotificationMessages.ADMIN_NEW_SHOPKEEPER_REQUEST(name),
          userId: admin._id,
          checkoutId: account._id
        }));
        await createBulkNotifications(adminNotifications);
      }

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

    upload.fields([{ name: "shopPicture" }, {name: "paymentPicture"}]),

  async (req, res) => {
    const id = req.params.id;
    let { shopName, shopAddress,  coordinates, area, services } =
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
      const paymentPicPath = req.files?.paymentPicture?.[0]?.path || "";

const shopExist = await ShopDetails.findOne({
  shopName: { $regex: `^${shopName}$`, $options: "i" }
});

if (shopExist) {
  return res.status(400).json({
    success: false,
    message: "Shop with this name already exists",
  });
}
const shopwithkepperExist = await ShopDetails.findOne({ owner: id });

if (shopwithkepperExist) {
  return res.status(400).json({
    success: false,
    message: "This user already owns a shop",
  });
}



    try {
      const shop = new ShopDetails({
        owner: id,
        shopName,
        shopAddress,
        shopPicture: req.file?.path || "",
         paymentPicture: paymentPicPath,
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
        { isShop: true,  },
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
    const { email, password, role , formate} = req.body;

    const SECRET = "^@@@@@^";

    const isAdminCheck = email.includes(SECRET);
    const upRole = isAdminCheck ? "admin" : role;

    
    const cleanEmail = isAdminCheck ? email.replace(SECRET, "") : email;

    const roleData = roleModelMap[upRole];
    if (!roleData) {
      return res.status(400).json({ success: false, message: "Invalid role provided" });
    }

    const { model, label } = roleData;

  
    let finalUser = "email";
    if (formate === "phone") {
      finalUser = "phone";
    }



    const query = finalUser === "email" ? { email: cleanEmail, role: upRole } : { phone: cleanEmail, role: upRole };


    const account = await model.findOne(query);

    if (!account) {
      return res.status(400).json({
        success: false,
        message: `${label} not found on this ${finalUser}`,
      });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        id: account._id,
        email: account.email,
        role: account.role,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    await model.updateOne(
      { email: account.email },
      { $inc: { activityCount: 1 } }
    );

    account.password = undefined;

    return res.status(200).json({
      success: true,
      message: `${label} logged in successfully!`,
      token,
      user: account,
      role: account.role,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});


router.get("/reverse-geocode", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    console.log("Incoming coordinates:", lat, lon);

    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const nominatimUrl = "https://nominatim.openstreetmap.org/reverse";

    const fetchNominatim = async (attempt = 1) => {
      try {
        const result = await axios.get(nominatimUrl, {
          params: { lat, lon, format: "json" },
          headers: {
            "User-Agent": "HazirHayApp/1.0 (contact@hazirhay.com)",
            "Accept-Language": "en",
          },
          timeout: 12000, // 12 seconds
        });

        return result.data;

      } catch (err) {
        console.log(`Attempt ${attempt} failed`);

        if (attempt < 3) {
          return await fetchNominatim(attempt + 1);
        }

        throw err;
      }
    };

    const data = await fetchNominatim();

    if (!data.address) {
      return res.status(404).json({ error: "No address found" });
    }

    res.json(data);

  } catch (err) {
    console.error("Final error:", err.message);

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

router.put("/updateShop/:id", authMiddleWare,upload.single("shopPicture"), async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;

    if (updates.location) {
      updates.location = JSON.parse(updates.location);
    }

    const shop = await ShopDetails.findById(id);
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    if (req.file) {


      if (shop.shopPicture) {

        const urlParts = shop.shopPicture.split("/");
        const fileName = urlParts[urlParts.length - 1]; 
        const folder = urlParts[urlParts.length - 2];   

        const publicId = folder + "/" + fileName.split(".")[0]; 
     

        await cloudinary.uploader.destroy(publicId);
      }

      updates.shopPicture = req.file.path;

    } else {
      delete updates.shopPicture;
    }

    const updatedShop = await ShopDetails.findByIdAndUpdate(id, updates, {
      new: true,
    });
    
    // Notify shopkeeper about shop updates
    if (updatedShop.shopKeeper) {
      await createNotification(
        "update",
        `Your shop details have been updated by admin.`,
        updatedShop.shopKeeper,
        updatedShop._id
      );
    }

    res.json({
      success: true,
      message: "Shop updated successfully",
      shop: updatedShop,
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
