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

io.on("connection", socket => {
  socket.on("joinRoom", ({ name, room }) => {
    socket.join(room);

    // Welcome message to the new user
    socket.emit("message", {
      user: "System",
      text: `Welcome ${name} to the chat`,
      time: new Date().toISOString()
    });

    // Broadcast to other users
    socket.broadcast.to(room).emit("message", {
      user: "System",
      text: `${name} joined the chat`,  // ✅ Corrected line
      time: new Date().toISOString()
    });
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
