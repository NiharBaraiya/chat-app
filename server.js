const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const cors = require("cors");
const moment = require("moment"); // ✅ Import moment for timestamps

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

const users = {};

io.on("connection", (socket) => {
  // ✅ Join room
  socket.on("joinRoom", ({ name, room }) => {
    socket.join(room);
    users[socket.id] = { name, room };

    // ✅ Notify others
    socket.to(room).emit("message", {
      user: "system",
      text: ${name} joined the chat,
      time: moment().format("h:mm A")
    });
  });

  // ✅ On chat message
  socket.on("chatMessage", (msg) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("message", {
        user: user.name,
        text: msg,
        time: moment().format("h:mm A")
      });
    }
  });

  // ✅ Typing notification
  socket.on("typing", (isTyping) => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit("typing", isTyping ? ${user.name} is typing... : null);
    }
  });

  // ✅ Alternative sendMessage event (optional)
  socket.on("sendMessage", (message, callback) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("message", {
        user: user.name,
        text: message,
        time: moment().format("h:mm A")
      });
    }
    callback();
  });

  // ✅ Handle disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("message", {
        user: "system",
        text: ${user.name} left the chat,
        time: moment().format("h:mm A")
      });
      delete users[socket.id];
    }
  });
});

// ✅ Server listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(Server running on port ${PORT}));
