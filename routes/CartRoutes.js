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


module.exports = router;