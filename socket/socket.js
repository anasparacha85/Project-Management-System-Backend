const { Server } = require("socket.io");
const { verifyAccessToken } = require("../utils/jwtutils");

let io;
const onlineUsers = {}; // { userId: socketId }

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Authenticate socket connections using token in handshake.auth
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Unauthorized: No token provided"));
    try {
      const decoded = verifyAccessToken(token);
      // decoded should contain user id field (adapt if your jwt payload differs)
      socket.userId = decoded._id || decoded.id || decoded.userId;
      return next();
    } catch (err) {
      return next(new Error("Unauthorized: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.userId);
    onlineUsers[userId] = socket.id;
    console.log(`✅ User ${userId} connected: ${socket.id}`);

    // Join personal room
    socket.join(userId);

    // Broadcast online users (optional)
    io.emit("onlineUsers", Object.keys(onlineUsers));

    socket.on("disconnect", () => {
      delete onlineUsers[userId];
      console.log(`❌ User ${userId} disconnected`);
      io.emit("onlineUsers", Object.keys(onlineUsers));
    });
  });

  return io;
};

module.exports = { initSocket, getIO: () => io, onlineUsers };
