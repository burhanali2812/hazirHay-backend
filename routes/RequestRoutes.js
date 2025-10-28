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
router.put("/progressRequest", authMiddleWare, async (req, res) => {
  const { requests } = req.body;

  try {
    if (!requests || requests.length === 0) {
      return res.status(400).json({ success: false, message: "No requests provided" });
    }

    const progressedOrders = [];

    for (const reqData of requests) {
      const updatedOrder = await Requests.findByIdAndUpdate(
        reqData._id,
        { status: "inProgress" },
        { new: true }
      );
      if (updatedOrder) progressedOrders.push(updatedOrder);
    }

    if (progressedOrders.length === 0) {
      return res.status(404).json({ success: false, message: "No matching orders found" });
    }

    res.status(200).json({
      success: true,
      message: "Orders set to in-progress successfully",
      updatedOrders: progressedOrders,
    });
  } catch (error) {
    console.error("Error in progressRequest:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.put("/markDeleteRequestByShopkeeper/:id", authMiddleWare, async (req, res) => {
  const { requests, type } = req.body;
  const { id } = req.params; 

  try {
    // 1️⃣ Validate requests
    if (!requests || requests.length === 0) {
      return res.status(400).json({ success: false, message: "No requests provided" });
    }

    // 2️⃣ Find the shop
    const shop = await ShopDetails.findOne({ owner: id });
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    // 3️⃣ Check if shop is already blocked
    if (shop.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your shop has been temporarily blocked for 7 days due to exceeding 5 cancellations.",
      });
    }

    if (type === "cancel") {
      // 4️⃣ Increment cancelRequest
      let updateData = { $inc: { cancelRequest: 1 } };

      // Block shop if limit reaches 5
      if (shop.cancelRequest + 1 >= 5) {
        updateData.isBlocked = true;
        updateData.cancelRequestDate = new Date();
      }

      const updatedShop = await ShopDetails.findByIdAndUpdate(shop._id, updateData, { new: true });

      // 5️⃣ Return warning at 4 cancellations
      if (updatedShop.cancelRequest === 4) {
        // delete orders as well
        await Promise.all(
          requests.map((r) => Requests.findByIdAndUpdate(r._id, { status: "deleted" }, { new: true }))
        );

        return res.status(200).json({
          success: true,
          warning: true,
          message: `Warning: You have cancelled ${updatedShop.cancelRequest} orders. After 5, your shop will be temporarily restricted for 7 days.`,
          currentCount: updatedShop.cancelRequest,
        });
      }

      // 6️⃣ Return blocked message if limit reached
      if (updatedShop.isBlocked) {
        return res.status(403).json({
          success: false,
          message: "Your shop has been temporarily blocked for 7 days due to exceeding 5 cancellations.",
        });
      }

      // 7️⃣ Delete orders if shop is not blocked
      await Promise.all(
        requests.map((r) => Requests.findByIdAndUpdate(r._id, { status: "deleted" }, { new: true }))
      );

      // 8️⃣ Return normal success
      return res.status(200).json({
        success: true,
        message: "Orders deleted successfully",
        currentCount: updatedShop.cancelRequest,
      });
    }

    // 9️⃣ Invalid type
    return res.status(400).json({ success: false, message: "Invalid request type" });

  } catch (error) {
    console.error("Error in deleting orders:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});





router.get("/getAllRequests", authMiddleWare, async (req, res) => {

  try {
    const request = await Requests.find({status : { $in: ["accepted", "rejected","completed","inProgress","deleted"] }});

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

router.put("/markDelete/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;


  try {
    const order = await Requests.findByIdAndUpdate( id ,{status : "deleted"}, {new :  true});

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
router.put("/assignMultiple", async (req, res) => {
  const { selectedWorkers } = req.body;

  try {
    const updates = Object.entries(selectedWorkers).map(([orderId, worker]) => {
      const workerId = worker._id; 

      return Requests.findByIdAndUpdate(
        orderId,
        {
          $set: {
            "orderAssignment.workerId": workerId,
            "orderAssignment.assignedAt": new Date(),
            "orderAssignment.status": "assigned",
            status: "assigned"
          },
        },
        { new: true }
      );
    });

    await Promise.all(updates);

    res.status(200).json({
      success: true,
      message: "All workers assigned successfully!",
    });
  } catch (error) {
    console.error("Bulk assignment failed:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/getAssignedOrder/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;

  try {
    const requests = await Requests.find({ "orderAssignment.workerId": id, status: { $in: ["assigned", "inProgress"] } })
      .populate("userId", "name phone email profilePicture")
      .sort({ createdAt: -1 })
      .lean();

    if (!requests || requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No requests found for this worker",
      });
    }

    res.status(200).json({ success: true, message: "requests found for this worker", data: requests });
  } catch (error) {
    console.error("Error fetching worker requests:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/unAssignOrder/:id", authMiddleWare, async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await Requests.findByIdAndUpdate(
      id,
      {
        $set: {
          "orderAssignment.workerId": null,
          "orderAssignment.assignedAt": null,
          "orderAssignment.status": "",
          status: "accepted",
        },
      },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order unassigned successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error unassigning order:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});




module.exports = router;
