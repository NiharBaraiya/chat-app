const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name") || "Guest";
const room = urlParams.get("room") || "General";

const messages = document.getElementById("messages");
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("emoji-picker");
const reactionPicker = document.getElementById("reaction-picker");
const clearBtn = document.getElementById("clear-btn");

document.getElementById("msg").focus();

socket.emit("joinRoom", { name, room });

socket.on("message", (message) => {
  const li = document.createElement("div");
  li.className = "message";
  li.setAttribute("data-id", message.id);

  li.innerHTML = `
    <span class="timestamp">${message.time}</span>
    <strong>${message.user === name ? "You" : message.user}</strong>: ${message.text}
    <button class="react-btn" data-id="${message.id}">😊</button>
    <div class="reactions" id="reactions-${message.id}"></div>
  `;

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg !== "") {
    socket.emit("chatMessage", msg);
    input.value = "";
  }
});

clearBtn.addEventListener("click", () => {
  messages.innerHTML = "";
});

emojiBtn.addEventListener("click", () => {
  // Show emoji picker for input box
  emojiPicker.style.display = emojiPicker.style.display === "block" ? "none" : "block";
  reactionPicker.style.display = "none";
});

messages.addEventListener("click", (e) => {
  if (e.target.classList.contains("react-btn")) {
    const msgId = e.target.dataset.id;
    reactionPicker.setAttribute("data-msg-id", msgId);
    reactionPicker.style.display = "block";
    emojiPicker.style.display = "none";
    reactionPicker.scrollIntoView({ behavior: "smooth" });
  }
});

// Emoji list
const emojiList = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","😉","😍","😘","😋","😛","😜","🤪","😝","🤗","🤫","🤔","😐","😑","😶","😏","😒","🙄","😬","🥵","🥶","😎","🤓","🧐","😕","🙁","😮","😲","😳","🥺","😢","😭","😱","😖","😞","😓","😫","🥱","😤","😡","😠","🤬"];

// Populate emoji picker for input
emojiList.forEach((emoji) => {
  const span = document.createElement("span");
  span.textContent = emoji;
  span.addEventListener("click", () => {
    input.value += emoji;
    emojiPicker.style.display = "none";
    input.focus();
  });
  emojiPicker.appendChild(span);
});

// Populate emoji picker for reactions
emojiList.forEach((emoji) => {
  const span = document.createElement("span");
  span.textContent = emoji;
  span.addEventListener("click", () => {
    const msgId = reactionPicker.getAttribute("data-msg-id");
    if (msgId) {
      socket.emit("addReaction", { messageId: msgId, emoji });
      reactionPicker.style.display = "none";
    }
  });
  reactionPicker.appendChild(span);
});

socket.on("reactionAdded", ({ messageId, emoji }) => {
  const target = document.getElementById(`reactions-${messageId}`);
  if (target) {
    target.innerHTML += `${emoji} `;
  }
});
