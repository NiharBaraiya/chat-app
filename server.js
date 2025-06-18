const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const crypto = require("crypto"); // ✅ Needed for message IDs
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public"), { index: false }));

app.get("/", (req, res) => {
  const host = req.headers.host;
  if (host.includes("localhost")) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.sendFile(path.join(__dirname, "public", "simple.html"));
  }
});

app.get("/simple", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "simple.html"));
});

app.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ========== ✅ Socket.io logic ==========
const users = {};               // socket.id → user info
const roomUsers = {};           // room → Set of usernames
const roomMessages = {};        // room → Array of { id, user, text, time }

io.on("connection", (socket) => {
  // ✅ Join Room
  socket.on("joinRoom", ({ name, room }) => {
    const currentUser = { name, room };
    users[socket.id] = currentUser;
    socket.join(room);

    if (!roomUsers[room]) roomUsers[room] = new Set();
    if (!roomMessages[room]) roomMessages[room] = [];

    const existingUsers = [...roomUsers[room]];
    if (existingUsers.length > 0) {
      socket.emit("message", formatMessage("System", `${existingUsers.join(", ")} already joined this chat.`));
    }

    roomUsers[room].add(name);
    socket.emit("message", formatMessage("System", `Welcome ${name}!`));
    socket.broadcast.to(room).emit("message", formatMessage("System", `${name} joined the chat.`));

    io.to(room).emit("roomUsers", {
      room,
      users: [...roomUsers[room]].map(name => ({ name }))
    });
  });

  // ✅ Chat Message
  socket.on("chatMessage", (text) => {
    const user = users[socket.id];
    if (user) {
      const message = formatMessage(user.name, text);
      roomMessages[user.room].push(message); // ✅ Store for edit/delete
      io.to(user.room).emit("message", message);
    }
  });

  // ✅ Typing
  socket.on("typing", (status) => {
    const user = users[socket.id];
    if (user) {
      const typingText = status ? `${user.name} is typing...` : "";
      socket.to(user.room).emit("typing", typingText);
    }
  });

  // ✅ File Upload
  socket.on("fileUpload", ({ fileName, fileData, fileType }) => {
    const user = users[socket.id];
    if (user) {
      const time = getCurrentTime();
      io.to(user.room).emit("fileShared", {
        user: user.name,
        fileName,
        fileData,
        fileType,
        time,
      });
    }
  });

  // ✅ Add Emoji Reaction
  socket.on("addReaction", ({ messageId, emoji }) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("reactionAdded", { messageId, emoji });
    }
  });

  // ✅ Edit Message
  socket.on("editMessage", ({ messageId, newText }) => {
    const user = users[socket.id];
    if (!user || !roomMessages[user.room]) return;

    const message = roomMessages[user.room].find(msg => msg.id === messageId && msg.user === user.name);
    if (message) {
      message.text = newText;
      io.to(user.room).emit("messageEdited", { messageId, newText });
    }
  });

  // ✅ Delete Message
  socket.on("deleteMessage", (messageId) => {
    const user = users[socket.id];
    if (!user || !roomMessages[user.room]) return;

    const index = roomMessages[user.room].findIndex(msg => msg.id === messageId && msg.user === user.name);
    if (index !== -1) {
      roomMessages[user.room].splice(index, 1);
      io.to(user.room).emit("messageDeleted", messageId);
    }
  });

  // ✅ Disconnect
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
            users: [...roomUsers[user.room]].map(name => ({ name }))
          });
        } else {
          delete roomUsers[user.room];
          delete roomMessages[user.room];
        }
      }

      delete users[socket.id];
    }
  });
});

// ✅ Format Message with unique ID and timestamp
function formatMessage(user, text) {
  return {
    id: crypto.randomUUID(),
    user,
    text,
    time: getCurrentTime()
  };
}

// ✅ Get current IST time
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ✅ Start server
http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
