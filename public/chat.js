const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name") || "Guest";
const room = urlParams.get("room") || "General";

document.getElementById("room-name").innerText = `💬 ${room} Room`;

socket.emit("joinRoom", { name, room });

const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

// ✅ Message receive
socket.on("message", (message) => {
  const div = document.createElement("div");
  div.classList.add("message");

  // ✅ Fix: avoid [object Object]
  const sender = message.user === name ? "You" : message.user;
  div.innerHTML = `
    <p><strong>${sender}:</strong> ${message.text}</p>
    <span class="time">${message.time}</span>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  // ✅ Send seen event if not self
  if (message.user !== name) {
    socket.emit("seenMessage", message.id);
  }
});

// ✅ Seen message
socket.on("messageSeen", (messageId) => {
  const msgDivs = messages.querySelectorAll(".message");
  msgDivs.forEach((div) => {
    if (div.dataset.id === messageId) {
      div.innerHTML += " <span class='seen'>✔</span>";
    }
  });
});

// ✅ Typing indicator
input.addEventListener("input", () => {
  socket.emit("typing", input.value.length > 0);
});

socket.on("typing", (text) => {
  typing.innerText = text;
});

// ✅ Send message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text) {
    socket.emit("chatMessage", text);
    input.value = "";
    input.focus();
  }
});

// ✅ Users in room
socket.on("roomUsers", ({ room, users }) => {
  const userList = document.getElementById("users");
  userList.innerHTML = users.map(u => `<li>${u.name}</li>`).join("");
});

// ✅ File sharing
socket.on("fileShared", ({ user, fileName, fileData, fileType, time }) => {
  const div = document.createElement("div");
  div.classList.add("message");

  const sender = user === name ? "You" : user;

  let fileHTML = "";
  if (fileType.startsWith("image/")) {
    fileHTML = `<img src="${fileData}" alt="${fileName}" style="max-width:200px;" />`;
  } else {
    fileHTML = `<a href="${fileData}" download="${fileName}">${fileName}</a>`;
  }

  div.innerHTML = `
    <p><strong>${sender}:</strong> shared a file:</p>
    ${fileHTML}
    <span class="time">${time}</span>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// ✅ Message edited
socket.on("messageEdited", ({ messageId, newText }) => {
  const msgDivs = messages.querySelectorAll(".message");
  msgDivs.forEach((div) => {
    if (div.dataset.id === messageId) {
      const content = div.querySelector("p");
      if (content) content.innerHTML = content.innerHTML.replace(/:(.*)/, `: ${newText} <em>(edited)</em>`);
    }
  });
});

// ✅ Message deleted
socket.on("messageDeleted", (messageId) => {
  const msgDivs = messages.querySelectorAll(".message");
  msgDivs.forEach((div) => {
    if (div.dataset.id === messageId) {
      div.remove();
    }
  });
});

// ✅ Message pinned
socket.on("messagePinned", (message) => {
  const pinBoard = document.getElementById("pinned");
  const div = document.createElement("div");
  div.innerHTML = `<strong>Pinned:</strong> ${message.text}`;
  pinBoard.innerHTML = ""; // Only one pin at a time
  pinBoard.appendChild(div);
});

// ✅ Reaction
socket.on("reactionAdded", ({ messageId, emoji }) => {
  const msgDivs = messages.querySelectorAll(".message");
  msgDivs.forEach((div) => {
    if (div.dataset.id === messageId) {
      div.innerHTML += ` <span>${emoji}</span>`;
    }
  });
});
