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
    const cart = await Cart.findOne({ userId }); // use findOne instead of find
if (!cart) {
  return res.status(404).json({
    success: false,
    message: "Your cart is empty!",
  });
}

    res.status(200).json({
      success: true,
      message: "Cart data found",
      data: cart,
    });
  } catch (error) {
    console.error("Error fetching cart:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching cart",
    });
  }
});
router.delete("/deleteCartItem/:itemId", authMiddleWare, async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user.id;

  try {
    const updatedCart = await Cart.findOneAndUpdate(
      { userId },  // find cart by userId
      { $pull: { items: { _id: itemId } } }, 
      { new: true }
    );

    if (!updatedCart) {
      return res.status(404).json({
        success: false,
        message: "Cart or item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Item removed successfully",
      data: updatedCart,
    });
  } catch (error) {
    console.error("Error deleting item:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while deleting item",
    });
  }
});

router.delete("/deleteUserCart", authMiddleWare, async (req, res) => {
  const userId = req.user.id;

  try {
    // Find the user's cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Clear the items array instead of deleting entire document
    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart, // returns the cart object (items will be empty)
    });
  } catch (error) {
    console.error("Error clearing cart:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while clearing cart",
    });
  }
});

router.get("/getUserCart", authMiddleWare, async (req, res) => {
  const userId = req.user.id;

  try {
    const cartData = await Cart.find({ userId });

    if (!cartData || cartData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart Fetch successfully",
      data: deletedCart,
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