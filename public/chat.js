const socket = io("https://chat-app-dw0g.onrender.com");

const urlParams = new URLSearchParams(window.location.search);
let name = urlParams.get("name");
let room = urlParams.get("room");

const roomNameElem = document.getElementById("room-name");
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

// Join room
function joinChat(name, room) {
  socket.emit("joinRoom", { name, room });
  roomNameElem.innerText = `${room} Room`;
}

joinChat(name, room);

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
  const className = message.user === name
    ? "you"
    : message.user === "System"
    ? "system"
    : "other";

  const html = `
    <li class="${className}">
      [${message.time}] <strong>${message.user}</strong>: ${message.text}
    </li>
  `;
  messages.innerHTML += html;
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
