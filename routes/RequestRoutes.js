const ShopDetails = require("../models/ShopDetails");
const Requests = require("../models/Request");
const authMiddleWare = require("../authMiddleWare");
const express = require("express");
const router = express.Router();


router.post("/sendBulkRequests", authMiddleWare, async (req, res) => {
  try {
    const {requests} = req.body;

    const saved =[];

    for(const reqData of requests){
      const newRequests = new Requests(reqData);
       await newRequests.save();
       saved.push(newRequests);
    }

    res.status(200).json({
      success: true,
      message: "Request sent toproviders.",
      requests : saved
    });
  } catch (error) {
    console.error("Error finding providers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/getRequests/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;

  try {


    const requests = await Requests.find({ shopOwnerId: id })
      .populate("userId", "name phone email profilePicture")
      .sort({ createdAt: -1 })
      .lean();
       if (!requests || requests.length === 0) {
      return res.status(404).json({ success: false, message: "No requests found for this shop owner" });
    }

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching Shopkeeper requests:", error);
     console.error("Error fetching Shopkeeper requests:", error.stack); 
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;
