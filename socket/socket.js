const { Server } = require("socket.io");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("⚡ User connected:", socket.id);

    socket.on("register", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined personal room`);
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });
};

module.exports = { initSocket, getIO: () => io };
