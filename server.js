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
const users = {}; // ✅ Must define this to track connected users

io.on("connection", (socket) => {
  // ✅ Handle joinRoom event
  socket.on("joinRoom", ({ name, room }) => {
    const currentUser = { name, room };
    users[socket.id] = currentUser;

    socket.join(room);
    socket.emit("message", formatMessage("System", `Welcome ${name}!`));
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
