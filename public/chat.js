const socket = io("https://chat-app-dw0g.onrender.com");

const urlParams = new URLSearchParams(window.location.search);
let name = urlParams.get("name");
let room = urlParams.get("room");

const joinContainer = document.getElementById("join-container");
const chatContainer = document.getElementById("chat-container");
const roomNameElem = document.getElementById("room-name");
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

function joinChat(username, chatroom) {
  name = username;
  room = chatroom;
  socket.emit("joinRoom", { name, room });
  roomNameElem.innerText = `💬 ${room} Room`;
  joinContainer.style.display = "none";
  chatContainer.style.display = "block";
}

// Show form if no name/room
if (!name || !room) {
  document.getElementById("join-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const inputName = document.getElementById("name").value.trim();
    const inputRoom = document.getElementById("room").value.trim();
    if (inputName && inputRoom) {
      joinChat(inputName, inputRoom);
    }
  });
} else {
  joinChat(name, room);
}

// Handle form submit
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const message = input.value.trim();
  if (message) {
    socket.emit("chatMessage", message);
    input.value = "";
    input.focus();
  }
});

// Display messages
socket.on("message", (message) => {
  const className = message.user === name ? "you" : message.user === "System" ? "system" : "other";
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
