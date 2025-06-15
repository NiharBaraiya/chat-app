const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const PORT = process.env.PORT || 3000;

// ✅ Serve static files from /public but DON'T auto-serve index.html
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// ✅ Force render URL (/) to load simple.html
app.get("/", (req, res) => {
  const host = req.headers.host;
  if (host.includes("localhost")) {
    // Localhost shows index.html
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    // Render or any deployed host shows simple.html
    res.sendFile(path.join(__dirname, "public", "simple.html"));
  }
});

// Optional: fallback for other URLs
app.get("/simple", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "simple.html"));
});

app.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================
// Socket.io logic (same)
// ======================
let username = "Anonymous";
let joinedRoom = "";

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ name, room }) => {
    username = name || "Anonymous";
    joinedRoom = room || "General";
    socket.join(joinedRoom);

    socket.to(joinedRoom).emit("message", {
      user: "System",
      text: `${username} joined the room`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  });

  socket.on("chatMessage", (msg) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const user = typeof msg === "object" ? msg.name : username;
    const text = typeof msg === "object" ? msg.msg : msg;

    io.to(joinedRoom || socket.id).emit("message", { user, text, time });
  });

  socket.on("typing", (status) => {
    const text = status ? `${username} is typing...` : "";
    socket.to(joinedRoom).emit("typing", text);
  });

  socket.on("disconnect", () => {
    socket.to(joinedRoom).emit("typing", "");
  });
});

http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
