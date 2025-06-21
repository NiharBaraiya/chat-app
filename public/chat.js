// ✅ chat.js - Full Implementation with All Features

const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name");
const room = urlParams.get("room");

const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const roomNameElem = document.getElementById("room-name");
const userList = document.getElementById("user-list");
const clearButton = document.getElementById("clearChat");
const fileInput = document.getElementById("fileInput");
const uploadProgress = document.getElementById("uploadProgress");
const pinnedContainer = document.getElementById("pinned-messages");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const recordAudioBtn = document.getElementById("record-audio");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");

let mediaRecorder;
let audioChunks = [];

if (name && room) {
  socket.emit("joinRoom", { name, room });
  roomNameElem.innerText = `${room} Room`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    socket.emit("chatMessage", { text: input.value, id: messageId });
    input.value = "";
    input.focus();
  }
});

// Context menu for edit/delete/pin
messages.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const li = e.target.closest("li.chat-message.sender");
  if (!li) return;

  const messageId = li.dataset.id;
  const currentText = li.dataset.text;
  if (!messageId) return;

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.innerHTML = `
    <button class="edit-btn">✏️ Edit</button>
    <button class="delete-btn">🗑️ Delete</button>
    <button class="pin-btn">📌 Pin</button>
  `;
  document.body.appendChild(menu);
  menu.style.top = `${e.pageY}px`;
  menu.style.left = `${e.pageX}px`;

  const removeMenu = () => menu.remove();
  document.addEventListener("click", removeMenu, { once: true });

  menu.querySelector(".edit-btn").onclick = () => {
    const newText = prompt("Edit your message:", currentText);
    if (newText && newText !== currentText) {
      socket.emit("editMessage", { messageId, newText });
    }
  };

  menu.querySelector(".delete-btn").onclick = () => {
    if (confirm("Are you sure you want to delete this message?")) {
      socket.emit("deleteMessage", messageId);
    }
  };

  menu.querySelector(".pin-btn").onclick = () => {
    socket.emit("pinMessage", messageId);
  };
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

clearButton.addEventListener("click", () => {
  messages.innerHTML = "";
});

searchButton.addEventListener("click", () => {
  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) return;

  const allMessages = document.querySelectorAll("#messages .chat-message");
  let found = false;
  allMessages.forEach(msg => {
    msg.classList.remove("search-highlight");
    const rawText = msg.dataset.text || msg.textContent.toLowerCase();
    if (!found && rawText.includes(keyword)) {
      msg.scrollIntoView({ behavior: "smooth", block: "center" });
      msg.classList.add("search-highlight");
      found = true;
      setTimeout(() => msg.classList.remove("search-highlight"), 5000);
    }
  });
  if (!found) alert(`No message found containing: "${keyword}"`);
});

// Render emoji panel
const emojiList = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃"];
function renderEmojiPanel() {
  emojiPanel.innerHTML = "";
  emojiList.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.textContent = emoji;
    btn.className = "emoji-btn";
    btn.type = "button";
    btn.addEventListener("click", () => {
      input.value += emoji;
      input.focus();
      emojiPanel.style.display = "none";
    });
    emojiPanel.appendChild(btn);
  });
}
emojiBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  emojiPanel.style.display = emojiPanel.style.display === "block" ? "none" : "block";
  emojiPanel.style.overflowY = "auto";
});
document.addEventListener("click", (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.style.display = "none";
  }
});
renderEmojiPanel();

// File upload
fileInput?.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) return alert("File too large. Max 5MB allowed.");

  const reader = new FileReader();
  reader.onloadstart = () => uploadProgress.style.display = "block";
  reader.onprogress = (e) => uploadProgress.value = (e.loaded / e.total) * 100;
  reader.onload = () => {
    socket.emit("fileUpload", {
      fileName: file.name,
      fileData: reader.result,
      fileType: file.type,
    });
    uploadProgress.style.display = "none";
    fileInput.value = "";
  };
  reader.readAsDataURL(file);
});

// Audio recording
recordAudioBtn.addEventListener("click", async () => {
  if (!navigator.mediaDevices) return alert("Audio not supported.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.start();
  recordAudioBtn.textContent = "⏹️";
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit("audioMessage", {
        fileData: reader.result,
        fileName: `voice_${Date.now()}.webm`,
        fileType: "audio/webm",
      });
    };
    reader.readAsDataURL(blob);
    audioChunks = [];
    recordAudioBtn.textContent = "🎤";
  };
  setTimeout(() => {
    if (mediaRecorder.state === "recording") mediaRecorder.stop();
  }, 10000);
});

// Receiving messages (text/file/audio)
socket.on("message", (message) => {
  renderMessage(message);
});

socket.on("fileShared", (file) => {
  renderMessage(file);
});

socket.on("audioMessage", (audio) => {
  renderMessage(audio);
});

function renderMessage(msg) {
  const li = document.createElement("li");
  li.classList.add("chat-message");
  li.dataset.id = msg.id;
  li.dataset.text = (msg.text || "").toLowerCase();
  li.id = msg.id;
  const isYou = msg.user === name;

  if (msg.user === "System") {
    li.classList.add("system-msg");
    li.innerText = msg.text;
  } else if (msg.fileType?.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = msg.fileData;
    img.className = "shared-img";
    li.classList.add(isYou ? "sender" : "receiver");
    li.innerHTML = `<strong>${isYou ? "You" : msg.user}:</strong> `;
    li.appendChild(img);
  } else if (msg.fileType?.startsWith("audio/")) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = msg.fileData;
    li.classList.add(isYou ? "sender" : "receiver");
    li.innerHTML = `<strong>${isYou ? "You" : msg.user}:</strong> `;
    li.appendChild(audio);
  } else if (msg.fileType) {
    const blob = new Blob([Uint8Array.from(atob(msg.fileData.split(',')[1]), c => c.charCodeAt(0))], { type: msg.fileType });
    const downloadUrl = URL.createObjectURL(blob);
    const ext = msg.fileName?.split(".").pop()?.toLowerCase();
    const icon = {
      pdf: "📄", doc: "📝", docx: "📝", txt: "📃",
      jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️",
      zip: "🗜️", mp4: "🎥", mp3: "🎵", default: "📁"
    }[ext] || "📁";
    li.classList.add(isYou ? "sender" : "receiver");
    li.innerHTML = `<strong>${isYou ? "You" : msg.user}:</strong> <a href="${downloadUrl}" download>${icon} ${msg.fileName}</a>`;
  } else {
    li.classList.add(isYou ? "sender" : "receiver");
    li.innerHTML = isYou ? `<strong>You:</strong> ${msg.text}` : `<strong>${msg.user}:</strong> ${msg.text}`;
  }

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// Seen, edit, delete, pin
socket.on("messageSeen", (id) => {
  const span = document.getElementById(`seen-${id}`);
  if (span) {
    span.textContent = "✔✔";
    span.style.color = "blue";
  }
});

socket.on("messageEdited", ({ messageId, newText }) => {
  const msgElem = document.getElementById(messageId);
  if (msgElem) msgElem.innerHTML = msgElem.innerHTML.replace(/>.*</, `> ${newText} (edited) <`);
});

socket.on("messageDeleted", (messageId) => {
  const msgElem = document.getElementById(messageId);
  if (msgElem) msgElem.remove();
});

socket.on("messagePinned", (msg) => {
  const original = document.getElementById(msg.id);
  if (original && !original.classList.contains("pinned-highlight")) {
    const pin = document.createElement("span");
    pin.className = "pin-icon";
    pin.textContent = " 📌";
    original.appendChild(pin);
    original.classList.add("pinned-highlight");
  }
});

socket.on("roomUsers", ({ users }) => {
  userList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user.name;
    userList.appendChild(li);
  });
});
