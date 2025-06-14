// Connect to deployed backend
const socket = io("https://chat-app-dw0g.onrender.com");

// Get name and room from query string
const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name");
const room = urlParams.get("room");

// Set room name
document.getElementById("room-name").innerText = room;

// Emit joinRoom
socket.emit("joinRoom", { name, room });

// DOM elements
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

// Send message
form.addEventListener('submit', function(e) {
  e.preventDefault();
  const message = input.value.trim();
  if (message) {
    socket.emit('chatMessage', message);
    input.value = '';
    input.focus();
  }
});

// Receive message
socket.on("message", (message) => {
  const messagesContainer = document.getElementById("messages");
  let className = "message";

  if (message.user === "System") {
    className += " system";
  } else if (message.user === name) {
    className += " you";
  }

  const html = `
    <li class="${className}">
      <strong>${message.user}</strong>: ${message.text}
      <br/><small>${message.time || ''}</small>
    </li>
  `;

  messagesContainer.innerHTML += html;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
