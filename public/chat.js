// Connect to deployed backend
const socket = io("https://chat-app-dw0g.onrender.com");

// Get name and room from query string
const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name") || "Guest";
const room = urlParams.get("room") || "General";

// Set room name in the UI
document.getElementById("room-name").innerText = room;

// Emit joinRoom event
socket.emit("joinRoom", { name, room });

// DOM elements
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const userList = document.getElementById("user-list"); // FIX: correct ID used in HTML

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

// Receive message from server
// Format time to [HH:MM AM/PM]
function formatTime(dateStr) {
  const date = new Date(dateStr);
  return `[${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]`;
}

socket.on("message", (message) => {
  const messagesContainer = document.getElementById("messages");
  let className = "";

  if (message.user === "System") {
    className = "system";
  } else if (message.user === name) {
    className = "you";
  }

  const html = `
    <li class="${className}">
      ${formatTime(message.time)} ${message.user}: ${message.text}
    </li>
  `;

  messagesContainer.innerHTML += html;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

// Update user list in sidebar
socket.on("roomUsers", (users) => {
  userList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    userList.appendChild(li);
  });
});

// Typing indicator
let typingTimeout;
input.addEventListener("input", () => {
  socket.emit("typing", `${name} is typing...`);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", "");
  }, 1000);
});

socket.on("typing", (text) => {
  typing.innerText = text || "";
});
