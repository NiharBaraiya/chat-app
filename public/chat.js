const socket = io("https://chat-app-dw0g.onrender.com");

// No need for name/room for local version
let name = "LocalUser";

// DOM
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

// Send message
form.addEventListener("submit", (e) => {
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
  const className =
    message.user === name
      ? "you"
      : message.user === "System"
      ? "system"
      : "other";

  const li = document.createElement("li");
  li.className = className;
  li.innerHTML = `[${message.time}] <strong>${message.user}</strong>: ${message.text}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// Typing indicator
let typingTimeout;
input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", false);
  }, 1000);
});

socket.on("typing", (text) => {
  typing.innerText = text || "";
});
