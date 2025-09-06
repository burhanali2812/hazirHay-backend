const ShopDetails = require("../models/ShopDetails");
const Cart = require("../models/Cart")
const authMiddleWare = require("../authMiddleWare");
const express = require("express");
const router = express.Router();

router.post("/saveCartData", authMiddleWare, async (req, res) => {
  const { category, subCategory, price, shopName, shopId } = req.body;
  const userId = req.user.id; 

  try {

    let cart = await Cart.findOne({ userId });

    if (!cart) {

      cart = new Cart({
        userId,
        items: [{ category, subCategory, price, shopName, shopId }]
      });
    } else {
      cart.items.push({ category, subCategory, price, shopName, shopId });
    }

    await cart.save();

    res.status(200).json({ success: true, message: "Item saved to cart successfully", cart:cart });
  } catch (error) {
    console.error("Error saving cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/getCartData", authMiddleWare, async (req, res) => {
  const userId = req.user.id;

  try {
    const cartItems = await Cart.find({ userId }); 

    if (!cartItems || cartItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Your cart is empty!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart data found",
      data: cartItems,
    });
  } catch (error) {
    console.error("Error fetching cart:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching cart",
    });
  }
});



module.exports = router;