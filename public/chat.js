const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name") || "Guest";
const room = urlParams.get("room") || "General";

// Display room name
document.getElementById("room-name").innerText = `💬 ${room} Room`;

// Join chat room
socket.emit("joinRoom", { name, room });

// DOM elements
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("emoji-picker");

// ========== ✅ Emoji Picker Setup ==========
const emojiList = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😍","😘","😋",
  "😜","🤪","😎","😭","😡","😱","😇","😉","😌","😔","😢","😤"
];

// Populate emoji picker
emojiList.forEach(emoji => {
  const span = document.createElement("span");
  span.textContent = emoji;
  span.style.cursor = "pointer";
  span.style.fontSize = "24px";
  span.style.margin = "4px";
  span.addEventListener("click", () => {
    input.value += emoji;
    emojiPicker.style.display = "none"; // hide after emoji selection
    input.focus();
  });
  emojiPicker.appendChild(span);
});

// Toggle emoji picker visibility
emojiBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // prevent body click from firing
  emojiPicker.style.display =
    emojiPicker.style.display === "flex" ? "none" : "flex";
});

// Close emoji picker when clicking outside
document.addEventListener("click", (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.style.display = "none";
  }
});

// ========== ✅ Message Sending ==========
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text) {
    socket.emit("chatMessage", text);
    input.value = "";
    input.focus();
  }
});

// ========== ✅ Show Incoming Messages ==========
socket.on("message", (data) => {
  const div = document.createElement("div");
  div.innerHTML = `<strong>${data.user}</strong> <span style="color:gray">${data.time}</span>: ${data.text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// ========== ✅ Typing Indicator ==========
input.addEventListener("input", () => {
  socket.emit("typing", input.value.trim().length > 0);
});

socket.on("typing", (text) => {
  typing.innerText = text;
});

// ========== ✅ Clear Chat ==========
document.getElementById("clear-btn").addEventListener("click", () => {
  messages.innerHTML = "";
  typing.innerText = "";
});
