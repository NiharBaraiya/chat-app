const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const cors = require("cors");
const moment = require("moment-timezone");

const app = express();
const server = http.createServer(app);

// ✅ Enable CORS for deployed domain
app.use(cors({
  origin: "https://chat-app-dw0g.onrender.com", // Update to match your deployed frontend
  methods: ["GET", "POST"],
  credentials: true
}));

// ✅ Serve static files from "public" folder
app.use(express.static(path.join(__dirname, "public")));

const io = socketio(server, {
  cors: {
    origin: "https://chat-app-dw0g.onrender.com",
    methods: ["GET", "POST"]
  }
});

// ✅ In-memory store of users
const users = {}; // socket.id -> { name, room }

// ✅ Get Indian time
function getIndianTime() {
  return moment().tz("Asia/Kolkata").format("h:mm A");
}

// ✅ Get current user by socket ID
function getCurrentUser(id) {
  return users[id];
}

// ✅ Socket.io handling
io.on("connection", socket => {
  console.log(`🔌 New connection: ${socket.id}`);

  // ✅ Join room event
  socket.on("joinRoom", ({ name, room }) => {
    socket.join(room);
    users[socket.id] = { name, room };

    // Welcome the user
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

  // ✅ Receive chat message
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

  // ✅ Typing indicator
  socket.on("typing", (isTyping) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      socket.to(user.room).emit("typing", isTyping ? `${user.name} is typing...` : null);
    }
  });

  // ✅ Optional alternative sendMessage
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

  // ✅ On disconnect
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

// ✅ Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
