const { Server } = require("socket.io");
const ShopKeeper = require("./models/ShopKeeper");
const ShopDetails = require("./models/ShopDetails")


let io;

const initSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://hazir-hay-frontend.vercel.app",
  ];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("A New User Connected:", socket.id);

    // Handle when user sends a request
    socket.on("sendRequestData", async (data) => {
      console.log("Request Data:", data);

      try {
        const liveProviders = await ShopDetails.find({ isLive: true });

        if (liveProviders.length === 0) {
          console.log("No online providers found");
          return;
        }
           const categoryProvider = liveProviders.filter(provider =>
    Array.isArray(provider.servicesOffered) &&
    provider.servicesOffered.some(service => service.category === data.category)
  );

  if (categoryProvider.length === 0) {
    console.log(`No providers found for category: ${data.category}`);
    return;
  }

        categoryProvider.forEach((provider) => {
          io.to(provider.socketId).emit("newRequest", data);
          console.log("Request ssend", data);
        });
      } catch (error) {
        console.error("Error finding providers:", error);
      }
    });

    // Handle when provider goes online
    socket.on("goOnline", async (providerId) => {
      try {
        await ShopKeeper.findByIdAndUpdate(providerId, {
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
      try {
        await ShopKeeper.findOneAndUpdate(
          { socketId: socket.id },
          {  socketId: null }
        );
      } catch (error) {
        console.error("Error setting provider offline:", error);
      }
    });
  });
};

const getIO = () => io;

module.exports = { initSocket, getIO };
