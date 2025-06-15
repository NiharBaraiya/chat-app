const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const PORT = process.env.PORT || 3000;

// ✅ Serve static files from /public but DON'T auto-serve index.html
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// ✅ Serve index.html on localhost, simple.html otherwise
app.get("/", (req, res) => {
  const host = req.headers.host;
  if (host.includes("localhost")) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.sendFile(path.join(__dirname, "public", "simple.html"));
  }
});

// Optional: fallback routes
app.get("/simple", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "simple.html"));
});

app.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ========== ✅ Socket.io logic ==========
const users = {};         // Track socket.id → user
const roomUsers = {};     // Track room → Set of usernames

io.on("connection", (socket) => {
  // ✅ Handle joinRoom event
  socket.on("joinRoom", ({ name, room }) => {
    const currentUser = { name, room };
    users[socket.id] = currentUser;
    socket.join(room);

    // ✅ Initialize Set for room if not present
    if (!roomUsers[room]) {
      roomUsers[room] = new Set();
    }

    // ✅ Notify new user about others already in room
    const existing = [...roomUsers[room]].filter((u) => u !== name);
    if (existing.length > 0) {
      socket.emit("message", formatMessage("System", `${existing.join(", ")} already joined this chat.`));
    }

    // ✅ Add new user to room set
    roomUsers[room].add(name);

    // ✅ Welcome new user
    socket.emit("message", formatMessage("System", `Welcome ${name}!`));

    // ✅ Notify others in the room
    socket.broadcast
      .to(room)
      .emit("message", formatMessage("System", `${name} joined the chat`));
  });

  // ✅ Handle incoming messages
  socket.on("chatMessage", (text) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("message", formatMessage(user.name, text));
    }
  });

  // ✅ Handle typing
  socket.on("typing", (status) => {
    const user = users[socket.id];
    if (user) {
      const text = status ? `${user.name} is typing...` : "";
      socket.to(user.room).emit("typing", text);
    }
  });

  // ✅ Handle disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit("message", formatMessage("System", `${user.name} left the chat.`));
      socket.to(user.room).emit("typing", "");
      
      // ✅ Remove from roomUsers
      if (roomUsers[user.room]) {
        roomUsers[user.room].delete(user.name);
        if (roomUsers[user.room].size === 0) {
          delete roomUsers[user.room]; // Cleanup room
        }
      }

      delete users[socket.id];
    }
  });
});

// ✅ Helper: format message with timestamp
function formatMessage(user, text) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return { user, text, time };
}

http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
