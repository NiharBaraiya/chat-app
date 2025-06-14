const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const cors = require("cors");
const moment = require("moment-timezone"); // ✅ use moment-timezone

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: "https://chat-app-dw0g.onrender.com",
  methods: ["GET", "POST"],
  credentials: true
}));

const io = socketio(server, {
  cors: {
    origin: "https://chat-app-dw0g.onrender.com",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

const users = {}; // Store users by socket.id

// ✅ Helper to get user by socket id
function getCurrentUser(id) {
  return users[id];
}

// ✅ Helper for current IST time
function getIndianTime() {
  return moment().tz("Asia/Kolkata").format("h:mm A");
}

// ✅ Socket.IO logic
io.on("connection", socket => {

  // When user joins a room
  socket.on("joinRoom", ({ name, room }) => {
    socket.join(room);

    // Save user
    users[socket.id] = { name, room };

    // Welcome to the user
    socket.emit("message", {
      user: "System",
      text: `Welcome ${name} to the chat`,
      time: getIndianTime()
    });

    // Notify others
    socket.broadcast.to(room).emit("message", {
      user: "System",
      text: `${name} joined the chat`,
      time: getIndianTime()
    });
  });

  // When user sends a chat message
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: user.name,
        text: msg,
        time: getIndianTime()
      });
    }
  });

  // Typing indicator
  socket.on("typing", (isTyping) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      socket.to(user.room).emit("typing", isTyping ? `${user.name} is typing...` : null);
    }
  });

  // Optional: Alternative message event
  socket.on("sendMessage", (message, callback) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: user.name,
        text: message,
        time: getIndianTime()
      });
    }
    if (callback) callback();
  });

  // User disconnect
  socket.on("disconnect", () => {
    const user = getCurrentUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: "System",
        text: `${user.name} left the chat`,
        time: getIndianTime()
      });
      delete users[socket.id];
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
