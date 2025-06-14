const socket = io();

// Get name and room from URL (if available)
const urlParams = new URLSearchParams(window.location.search);
let name = urlParams.get("name");
let room = urlParams.get("room");

const isRoomChat = name && room;

const roomNameElem = document.getElementById("room-name");
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

// Room-based chat
if (isRoomChat) {
  socket.emit("joinRoom", { name, room });
  roomNameElem.innerText = `Room: ${room}`;
} else {
  roomNameElem.innerText = `Simple Chat`;
}

// Send message
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const message = input.value.trim();
  if (message) {
    socket.emit("chatMessage", message);
    input.value = "";
    input.focus();
  }
});

// Receive message
socket.on("message", (message) => {
  const isSystem = message.user === "System";
  const isSelf = isRoomChat && message.user === name;

  let html = "";

  if (isRoomChat) {
    // Room-based chat UI
    const className = isSystem ? "system" : isSelf ? "you" : "other";
    html = `
      <li class="${className}">
        [${message.time}] <strong>${message.user}</strong>: ${message.text}
      </li>
    `;
  } else {
    // Local chat UI (no name/room)
    html = `<li>${message.text}</li>`;
  }

  messages.innerHTML += html;
  messages.scrollTop = messages.scrollHeight;
});

// Typing indicator (only for room-based chat)
let typingTimeout;
input.addEventListener("input", () => {
  if (!isRoomChat) return;
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", false);
  }, 1000);
});

socket.on("typing", (text) => {
  typing.innerText = isRoomChat ? text || "" : "";
});
