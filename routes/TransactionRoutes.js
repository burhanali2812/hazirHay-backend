const express = require("express");
const router = express.Router();
const authMiddleWare = require("../authMiddleWare");

const Transaction = require("../models/Transaction");

router.post("/createTransaction", authMiddleWare, async (req, res) => {
  try {
    const { transactionData } = req.body;

    if (!transactionData || !Array.isArray(transactionData) || transactionData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing transaction data",
      });
    }

  
    const firstOrder = transactionData[0];
    const shopkeeperId = firstOrder.shopOwnerId;
    const workerId = firstOrder.orderAssignment.workerId;
    const customerId = firstOrder.userId._id;
    const deliveryCharge = Number(firstOrder.serviceCharges.distance) * Number(firstOrder.serviceCharges.perKmRate);

    const orderIds = transactionData.map((order) => order._id);

    const totalAmount = transactionData.reduce((sum, order) => sum + (order.cost || 0), 0);
    const totalPayable = Number(totalAmount) + Number(deliveryCharge);

    const newTransaction = new Transaction({
      shopkeeperId,
      workerId,
      customerId,
      orderIds,
      totalAmount,
      deliveryCharge,
      totalPayable,
    });

    const savedTransaction = await newTransaction.save();

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: savedTransaction,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create transaction",
      error: error.message,
    });
  }
});



router.get("/getTransactionsByShopkeeper/:shopkeeperId", authMiddleWare, async (req, res) => {
    try {
        const { shopkeeperId } = req.params;
        const transactions = await Transaction.find({ shopkeeperId })
            .populate("workerId", "name phone") // populate worker details
            .populate("orderId", " amount"); // populate order details
        res.status(200).json({
            success: true,
            message: "Transactions fetched successfully",
            data: transactions,
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch transactions",
            error: error.message,
        });
    }
});

module.exports = router;
