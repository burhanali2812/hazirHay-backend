const express = require("express");
const router = express.Router();
const authMiddleWare = require("../authMiddleWare");

const Transaction = require("../models/Transactions");
const User = require("../models/User");
const ShopKepper = require("../models/ShopKeeper");
const Worker = require("../models/Worker");
const {
  createNotification,
  NotificationMessages,
} = require("../helpers/notificationHelper");

router.post("/createTransaction", authMiddleWare, async (req, res) => {
  try {
    const { transactionData } = req.body;

    if (
      !transactionData ||
      !Array.isArray(transactionData) ||
      transactionData.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing transaction data",
      });
    }

    const firstOrder = transactionData[0];
    const shopkeeperId = firstOrder.shopOwnerId;
    const workerId = firstOrder.orderAssignment.workerId;
    const customerId = firstOrder.userId._id;
    const deliveryCharge =
      Number(firstOrder.serviceCharges.distance) *
      Number(firstOrder.serviceCharges.rate);

    const orderIds = transactionData.map((order) => order._id);

    const totalAmount = transactionData.reduce(
      (sum, order) => sum + (order.cost || 0),
      0
    );
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

    // Notify all parties about transaction
    // Notify customer
    await createNotification(
      "payment",
      NotificationMessages.USER_PAYMENT_SUCCESS(totalPayable),
      customerId,
      savedTransaction._id
    );

    // Notify shopkeeper
    await createNotification(
      "payment",
      NotificationMessages.SHOPKEEPER_PAYMENT_RECEIVED(totalPayable),
      shopkeeperId,
      savedTransaction._id
    );

    // Notify worker
    await createNotification(
      "payment",
      `Payment received for completed order. Amount: Rs. ${totalPayable}`,
      workerId,
      savedTransaction._id
    );

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

router.get(
  "/getTransactionsByShopkeeper/:shopkeeperId",
  authMiddleWare,
  async (req, res) => {
    try {
      const { shopkeeperId } = req.params;
      const transactions = await Transaction.find({ shopkeeperId })
        .populate("workerId", "name phone")
        .populate("customerId", "name phone")
        .populate("orderIds", "orderId cost subCategory category")
        .sort({ date: -1 });
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
  }
);

module.exports = router;
