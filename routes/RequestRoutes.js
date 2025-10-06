const ShopDetails = require("../models/ShopDetails");
const Requests = require("../models/Request");
const authMiddleWare = require("../authMiddleWare");
const express = require("express");
const router = express.Router();

router.post("/sendBulkRequests", authMiddleWare, async (req, res) => {
  try {
    const { requests } = req.body;

    const saved = [];

    for (const reqData of requests) {
      const shop = await ShopDetails.findById(reqData.shopId);
      if (!shop) throw new Error("Shop not found");
      const newRequest = new Requests({
        ...reqData,
        shopOwnerId: shop.owner,
      });
      await newRequest.save();
      saved.push(newRequest);
    }

    res.status(200).json({
      success: true,
      message: "Request sent toproviders.",
      requests: saved,
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
    const requests = await Requests.find({ shopOwnerId: id , status : { $in: ["pending", "accepted", "rejected"] } })
      .populate("userId", "name phone email profilePicture")
      .sort({ createdAt: -1 })
      .lean();
    if (!requests || requests.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No requests found for this shop owner",
        });
    }

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching Shopkeeper requests:", error);
    console.error("Error fetching Shopkeeper requests:", error.stack);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/getUserRequests", authMiddleWare, async (req, res) => {
  const id = req.user.id;

  try {
    const request = await Requests.find({ userId : id });

    if (!request || request.length === 0) {
      return res.status(404).json({
        success: false,
        message: "request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "request Fetch successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error fetching request:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching request",
    });
  }
});

router.delete("/deleteRequest/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Requests.findOneAndDelete({ orderId: id });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order Not Found" });
    }

    res.status(200).json({
      success: true,
      message: `Order ${id} cancelled successfully`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.put("/updateRequest/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;
  const {type} = req.body;
  const statusUpdated = type === "accept" ? "accepted" : "rejected";

  try {
    const order = await Requests.findByIdAndUpdate( id ,{status : statusUpdated}, {new :  true});

    if (!order) {
      return res.status(404).json({ success: false, message: "Order Not Found" });
    }

    res.status(200).json({
      success: true,
      message: `Order ${id} status updated successfully`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.put("/completeRequest", authMiddleWare, async (req, res) => {
  const{requests} = req.body;

  const completed = [];
  try {
    for (const reqData of requests) {
      const order = await Requests.findByIdAndUpdate( reqData._id ,{status : "completed"}, {new :  true});
      completed.push(order)
    }
    if (completed.length === 0) {
      return res.status(404).json({ success: false, message: "Order Not Found" });
    }

    res.status(200).json({
      success: true,
      message: "Order completed  successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.get("/getAllRequests", authMiddleWare, async (req, res) => {

  try {
    const request = await Requests.find();

    if (!request || request.length === 0) {
      return res.status(404).json({
        success: false,
        message: "request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "request Fetch successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error fetching request:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching request",
    });
  }
});

router.delete("/deleteRequests", async(req,res)=>{
  try {
    await Requests.deleteMany();
    res.json({message : "deleted all"})
  } catch (error) {
    res.json({message : "internal server error"})
  }
})
router.get("/getshopRequest/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;

  try {
    const requests = await Requests.find({ shopOwnerId: id })
      .populate("userId", "name phone email profilePicture")
      .sort({ createdAt: -1 })
      .lean();
    if (!requests || requests.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No requests found for this shop owner",
        });
    }

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching Shopkeeper requests:", error);
    console.error("Error fetching Shopkeeper requests:", error.stack);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;
