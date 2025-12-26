const Notification = require("../models/Notification");
const { emitNotificationToUser } = require("../socket");

/**
 * Create and save a notification with real-time Socket.IO emission
 * @param {String} type - Type of notification (e.g., "request", "approval", "order", "payment")
 * @param {String} message - Notification message
 * @param {String} userId - User ID to send notification to
 * @param {String} checkoutId - Related checkout/order/request ID
 * @returns {Promise<Object>} - Saved notification
 */
const createNotification = async (
  type,
  message,
  userId,
  checkoutId = "N/A"
) => {
  try {
    const notification = new Notification({
      type,
      message,
      userId,
      checkoutId,
    });

    const savedNotification = await notification.save();

    // Emit real-time notification via Socket.IO
    emitNotificationToUser(userId, savedNotification);

    return { success: true, notification: savedNotification };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create multiple notifications at once with real-time Socket.IO emission
 * @param {Array} notifications - Array of notification objects
 * @returns {Promise<Object>} - Result with saved notifications and errors
 */
const createBulkNotifications = async (notifications) => {
  const saved = [];
  const errors = [];

  for (const notif of notifications) {
    try {
      const notification = new Notification({
        type: notif.type,
        message: notif.message,
        userId: notif.userId,
        checkoutId: notif.checkoutId || "N/A",
      });

      const savedNotif = await notification.save();

      // Emit real-time notification via Socket.IO
      emitNotificationToUser(notif.userId, savedNotif);

      saved.push(savedNotif);
    } catch (error) {
      console.error("Error saving notification:", error);
      errors.push({ notification: notif, error: error.message });
    }
  }

  return { saved, errors };
};

/**
 * Notification message templates organized by user type
 */
const NotificationMessages = {
  // User notifications
  user: {
    signup: (name) =>
      `Welcome ${name}! Your account has been created successfully.`,
    requestSent: (serviceName) =>
      `Your request for "${serviceName}" has been sent to service providers.`,
    requestAccepted: (shopName) =>
      `Your request has been accepted by ${shopName}!`,
    requestRejected: (shopName) =>
      `Your request has been declined by ${shopName}.`,
    orderAssigned: (workerName) =>
      `Your order has been assigned to ${workerName}.`,
    orderCompleted: (shopName) =>
      `Your order from ${shopName} has been completed!`,
    paymentSuccess: (amount) =>
      `Payment of Rs. ${amount} received successfully.`,
    cartItemAdded: (itemName) => `${itemName} has been added to your cart.`,
    cartCleared: () => `Your cart has been cleared successfully.`,
  },

  // Shopkeeper notifications
  shopkeeper: {
    signup: (name) =>
      `Welcome ${name}! Your shopkeeper account is pending verification.`,
    verified: () => `Congratulations! Your account has been verified by admin.`,
    rejected: () =>
      `Your verification request has been declined. Please contact support.`,
    newRequest: (userName, service) =>
      `New request from ${userName} for "${service}".`,
    orderCompleted: (orderId) =>
      `Order #${orderId} has been marked as completed.`,
    paymentReceived: (amount) =>
      `Payment of Rs. ${amount} received for completed order.`,
    workerAdded: (workerName) =>
      `New worker ${workerName} has been added to your team.`,
    reviewReceived: (userName, rating) =>
      `${userName} left you a ${rating} review!`,
    serviceUpdated: (serviceName) =>
      `Your service "${serviceName}" has been updated successfully.`,
  },

  // Worker notifications
  worker: {
    signup: (name, shopName) =>
      `Welcome ${name}! You have been added as a worker at ${shopName}.`,
    orderAssigned: (orderId) =>
      `New order #${orderId} has been assigned to you.`,
    orderCompleted: (orderId) =>
      `Order #${orderId} has been completed successfully.`,
    paymentReceived: (amount) =>
      `You received Rs. ${amount} for completed work.`,
  },

  // Admin notifications
  admin: {
    newShopkeeperRequest: (name) =>
      `New shopkeeper verification request from ${name}.`,
    newLocalShopRequest: (shopName) =>
      `New local shop verification request: ${shopName}.`,
    newUserSignup: (name) => `New user ${name} has signed up.`,
    orderCompleted: (shopName) => `Order completed by ${shopName}.`,
  },

  // Local Shop notifications
  localShop: {
    signup: (shopName) =>
      `Welcome! ${shopName} registration is pending verification.`,
    verified: (shopName) =>
      `Congratulations! ${shopName} has been verified by admin.`,
    rejected: (shopName) =>
      `${shopName} verification request has been declined.`,
  },

  // Legacy support - for backward compatibility
  USER_SIGNUP: (name) =>
    `Welcome ${name}! Your account has been created successfully.`,
  USER_REQUEST_SENT: (serviceName) =>
    `Your request for "${serviceName}" has been sent to service providers.`,
  USER_REQUEST_ACCEPTED: (shopName) =>
    `Your request has been accepted by ${shopName}!`,
  USER_REQUEST_REJECTED: (shopName) =>
    `Your request has been declined by ${shopName}.`,
  USER_ORDER_ASSIGNED: (workerName) =>
    `Your order has been assigned to ${workerName}.`,
  USER_ORDER_COMPLETED: (shopName) =>
    `Your order from ${shopName} has been completed!`,
  USER_PAYMENT_SUCCESS: (amount) =>
    `Payment of Rs. ${amount} received successfully.`,
  SHOPKEEPER_SIGNUP: (name) =>
    `Welcome ${name}! Your shopkeeper account is pending verification.`,
  SHOPKEEPER_VERIFIED: () =>
    `Congratulations! Your account has been verified by admin.`,
  SHOPKEEPER_REJECTED: () =>
    `Your verification request has been declined. Please contact support.`,
  SHOPKEEPER_NEW_REQUEST: (userName, service) =>
    `New request from ${userName} for "${service}".`,
  SHOPKEEPER_ORDER_COMPLETED: (orderId) =>
    `Order #${orderId} has been marked as completed.`,
  SHOPKEEPER_PAYMENT_RECEIVED: (amount) =>
    `Payment of Rs. ${amount} received for completed order.`,
  SHOPKEEPER_WORKER_ADDED: (workerName) =>
    `New worker ${workerName} has been added to your team.`,
  WORKER_SIGNUP: (name, shopName) =>
    `Welcome ${name}! You have been added as a worker at ${shopName}.`,
  WORKER_ORDER_ASSIGNED: (orderId) =>
    `New order #${orderId} has been assigned to you.`,
  WORKER_ORDER_COMPLETED: (orderId) =>
    `Order #${orderId} has been completed successfully.`,
  ADMIN_NEW_SHOPKEEPER_REQUEST: (name) =>
    `New shopkeeper verification request from ${name}.`,
  ADMIN_NEW_LOCALSHOP_REQUEST: (shopName) =>
    `New local shop verification request: ${shopName}.`,
  ADMIN_NEW_USER_SIGNUP: (name) => `New user ${name} has signed up.`,
  LOCALSHOP_SIGNUP: (shopName) =>
    `Welcome! ${shopName} registration is pending verification.`,
  LOCALSHOP_VERIFIED: (shopName) =>
    `Congratulations! ${shopName} has been verified by admin.`,
  LOCALSHOP_REJECTED: (shopName) =>
    `${shopName} verification request has been declined.`,
};

module.exports = {
  createNotification,
  createBulkNotifications,
  NotificationMessages,
};
