const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const PORT = process.env.PORT || 3000;

// Serve static files (CSS, JS, etc.)
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html only on localhost, simple.html on hosted URL
app.get("/", (req, res) => {
  const host = req.headers.host;

  if (host.includes("localhost")) {
    // 👨‍💻 Localhost: serve index.html (simple chat)
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    // 🌐 Hosted (like Render): serve simple.html (room + name required)
    res.sendFile(path.join(__dirname, "public", "simple.html"));
  }
});

// Socket.io logic (same as before)
io.on("connection", (socket) => {
  let username = "Anonymous";

  socket.on("joinRoom", ({ name, room }) => {
    username = name || "Anonymous";
    socket.join(room);
    socket.to(room).emit("message", {
      user: "System",
      text: `${username} joined the room`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  });

  socket.on("chatMessage", (msg) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const user = typeof msg === "object" ? msg.name : username;
    const text = typeof msg === "object" ? msg.msg : msg;

    io.to(socket.rooms.values().next().value).emit("message", {
      user,
      text,
      time
    });
  });

  socket.on("typing", (status) => {
    const text = status ? `${username} is typing...` : "";
    socket.broadcast.emit("typing", text);
  });

  socket.on("disconnect", () => {
    io.emit("typing", "");
  });
});

http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
