const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name") || "Guest";
const room = urlParams.get("room") || "General";

const messages = document.getElementById("messages");
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("emoji-picker");

socket.emit("joinRoom", { name, room });

socket.on("message", (message) => {
  const div = document.createElement("div");
  div.className = "message";
  div.innerHTML = `
    <span class="timestamp">${message.time}</span>
    <strong>${message.user === name ? "You" : message.user}</strong>: ${message.text}
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// Handle form submit
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg !== "") {
    socket.emit("chatMessage", msg);
    input.value = "";
  }
});

// Toggle emoji picker
emojiBtn.addEventListener("click", () => {
  const isVisible = emojiPicker.style.display === "flex";
  emojiPicker.style.display = isVisible ? "none" : "flex";
});

// Emoji list
const emojiList = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","😉","😍","😘","😋","😛","😜","🤪","😝","🤗","🤫","🤔","😐","😑","😶","😏","😒","🙄","😬","🥵","🥶","😎","🤓","🧐","😕","🙁","😮","😲","😳","🥺","😢","😭","😱","😖","😞","😓","😫","🥱","😤","😡","😠","🤬"];

emojiList.forEach((emoji) => {
  const span = document.createElement("span");
  span.textContent = emoji;
  span.addEventListener("click", () => {
    input.value += emoji;
    emojiPicker.style.display = "none"; // hide after click
    input.focus();
  });
  emojiPicker.appendChild(span);
});
