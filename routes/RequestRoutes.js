const ShopDetails = require("../models/ShopDetails");
const Requests = require("../models/Request");
const Worker = require("../models/Worker");
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
  const id = req.user.id;

  await Worker.findByIdAndUpdate(id, { isBusy: false }, { new: true });

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
  const id = req.user.id;

  try {
    if (!requests || requests.length === 0) {
      return res.status(400).json({ success: false, message: "No requests provided" });
    }
await Worker.findByIdAndUpdate(
  id,
  { 
    $inc: { orderCount: requests.length }, 
    $set: { isBusy: true } 
  },
  { new: true }
);
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
  const workerId = req.user.id;

  try {
    // Validate
    if (!requests || requests.length === 0) {
      return res.status(400).json({ success: false, message: "No requests provided" });
    }

    // Fetch shop
    const shop = await ShopDetails.findOne({ owner: id });
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    // Shop blocked?
    if (shop.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your shop is blocked for 7 days due to exceeding cancellation limit.",
      });
    }

    // Bulk operations array
    let bulkOps = [];

    if (type === "cancel") {
      // Free worker
      await Worker.findByIdAndUpdate(workerId, { $set: { isBusy: false },  });

      // Reset assignment + revert to assigned
      requests.forEach((r) => {
        bulkOps.push({
          updateOne: {
            filter: { _id: r._id },
            update: {
              $set: {
                "orderAssignment.workerId": null,
                "orderAssignment.assignedAt": null,
                "orderAssignment.status": "",
                status: "deleted",
              },
            },
          },
        });
      });

      // Apply updates
      await Requests.bulkWrite(bulkOps);

      // Update cancel count
      let updateShop = { $inc: { cancelRequest: 1 } };
      let newCancelCount = shop.cancelRequest + 1;

      // Block at >= 5
      if (newCancelCount >= 5) {
        updateShop.$set = {
          isBlocked: true,
          cancelRequestDate: new Date(),
        };
      }

      const updatedShop = await ShopDetails.findByIdAndUpdate(shop._id, updateShop, { new: true });

      // Warning at 4
      if (updatedShop.cancelRequest === 4) {
        return res.status(200).json({
          success: true,
          warning: true,
          message: "Warning: 4 orders cancelled. At 5 you will be blocked for 7 days.",
          currentCount: updatedShop.cancelRequest,
        });
      }

      // Blocked response
      if (updatedShop.isBlocked) {
        return res.status(403).json({
          success: false,
          message: "Your shop has been blocked for 7 days due to too many cancellations.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Orders ${type === "cancel" ? "cancelled" : "deleted"} successfully`,
      });
    }

    if (type === "delete") {
      await Requests.updateMany(
        { _id: { $in: requests.map((r) => r._id) }},
        { $set: { status: "deleted" }}
      );

      return res.status(200).json({
        success: true,
        message: `Orders ${type === "cancel" ? "cancelled" : "deleted"} successfully`,
      });
    }

    return res.status(400).json({ success: false, message: "Invalid request type" });

  } catch (error) {
    console.error("Error in marking orders:", error);
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
          "orderAssignment.status": "unAssigned",
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
