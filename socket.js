const { Server } = require("socket.io");
const ShopKeeper = require("./models/ShopKeeper");
const ShopDetails = require("./models/ShopDetails");
const User = require("./models/User");
const Worker = require("./models/Worker");
const Admin = require("./models/Admin");
const LocalShop = require("./models/LocalShop");

let io;
const userSockets = new Map(); // Map to store userId -> socketId mappings

const initSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://hazir-hay-frontend.vercel.app",
    "https://hazir-hay-backend.vercel.app",
  ];

  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3001",
        "https://hazir-hay-frontend.vercel.app",
        "https://hazir-hay-backend.vercel.app",
      ],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("A New User Connected:", socket.id);
    socket.emit("requestStatus", {
      success: true,
      message: "Test message from server",
    });

    // Register user socket for notifications
    socket.on("registerUser", (userId) => {
      userSockets.set(userId, socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    // Handle when user sends a request
    socket.on("sendRequestData", async (data) => {
      console.log("Request Data:", data);

      try {
        const liveProviders = await ShopDetails.find({ isLive: true });

        if (liveProviders.length === 0) {
          console.log("No online providers found");
          io.to(socket.id).emit("requestStatus", {
            success: false,
            message: "No online providers found",
          });
          return;
        }
        const categoryProvider = liveProviders.filter(
          (provider) =>
            Array.isArray(provider.servicesOffered) &&
            provider.servicesOffered.some(
              (service) => service.category === data.category
            )
        );

        if (categoryProvider.length === 0) {
          console.log(`No providers found for category: ${data.category}`);
          io.to(socket.id).emit("requestStatus", {
            success: false,
            message: `No providers found for category: ${data.category}`,
          });
          return;
        }

        categoryProvider.forEach((provider) => {
          io.to(provider.socketId).emit("newRequest", data);
          console.log("Request ssend", data);
        });
        io.to(socket.id).emit("requestStatus", {
          success: true,
          message: "Request sent to matching providers.",
        });
      } catch (error) {
        console.error("Error finding providers:", error);
      }
    });

    // Handle when provider goes online
    socket.on("goOnline", async (providerId) => {
      try {
        await ShopDetails.findByIdAndUpdate(providerId, {
          socketId: socket.id,
        });
        console.log(`Provider ${providerId} is now online`);
      } catch (error) {
        console.error("Error setting provider online:", error);
      }
    });

    // Handle when provider disconnects
    socket.on("disconnect", async () => {
      console.log("User Disconnected:", socket.id);

      // Remove from userSockets map
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }

      try {
        await ShopDetails.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: null }
        );
      } catch (error) {
        console.error("Error setting provider offline:", error);
      }
    });
  });
};

const getIO = () => io;

// Function to emit notification to a specific user
const emitNotificationToUser = (userId, notification) => {
  const socketId = userSockets.get(userId);
  if (socketId && io) {
    io.to(socketId).emit("newNotification", notification);
    console.log(`Notification sent to user ${userId}`);
  }
};

module.exports = { initSocket, getIO, emitNotificationToUser };
