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

    if (!roomUsers[room]) {
      roomUsers[room] = new Set();
    }

    const existing = [...roomUsers[room]];
    if (existing.length > 0) {
      socket.emit("message", formatMessage("System", `${existing.join(", ")} already joined this chat.`));
    }

    roomUsers[room].add(name);

    socket.emit("message", formatMessage("System", `Welcome ${name}!`));

    socket.broadcast
      .to(room)
      .emit("message", formatMessage("System", `${name} joined the chat`));

    io.to(room).emit("roomUsers", {
      room,
      users: [...roomUsers[room]].map((name) => ({ name })),
    });
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

  // ✅ Handle file upload (image/file sharing)
  socket.on("fileUpload", ({ fileName, fileData, fileType }) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("fileShared", {
        user: user.name,
        fileName,
        fileData,
        fileType,
        time: getCurrentTime()
      });
    }
  });

  // ✅ Handle disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit("message", formatMessage("System", `${user.name} left the chat.`));
      socket.to(user.room).emit("typing", "");

      if (roomUsers[user.room]) {
        roomUsers[user.room].delete(user.name);

        if (roomUsers[user.room].size > 0) {
          io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: [...roomUsers[user.room]].map((name) => ({ name })),
          });
        } else {
          delete roomUsers[user.room];
        }
      }

      delete users[socket.id];
    }
  });
});

function formatMessage(user, text) {
  return {
    user,
    text,
    time: getCurrentTime()
  };
}

function getCurrentTime() {
  const now = new Date();
  const options = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  return now.toLocaleTimeString('en-IN', options);
}

http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
