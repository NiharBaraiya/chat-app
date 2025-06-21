// chat.js (Fully Updated with Emoji Fix + All Features)
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
const capturePhotoBtn = document.getElementById("capture-photo");
const webcam = document.getElementById("webcam");
const canvas = document.getElementById("snapshot");
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
    <button class="delete-btn">🗑 Delete</button>
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

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const msgElem = entry.target;
      const msgId = msgElem.dataset.id;
      const isReceiver = msgElem.classList.contains("receiver");
      if (isReceiver && msgId) {
        socket.emit("seenMessage", msgId);
        observer.unobserve(msgElem);
      }
    }
  });
}, { threshold: 1.0 });

socket.on("message", (message) => {
  appendMessage(message);
});
socket.on("messageHistory", (history) => {
  history.forEach(appendMessage);
});
socket.on("messageSeen", (messageId) => {
  const span = document.getElementById(`seen-${messageId}`);
  if (span) {
    span.textContent = "✔✔";
    span.setAttribute("data-status", "seen");
    span.style.color = "blue";
    span.title = "Seen";
  }
});
socket.on("messageEdited", ({ messageId, newText }) => {
  const msgElem = document.getElementById(messageId);
  if (msgElem) {
    msgElem.dataset.text = newText.toLowerCase();
    const inner = msgElem.innerHTML.replace(/<strong>.*?:<\/strong>.*(?=<span|$)/, (match) => {
      return match.replace(/>.*(?=<\/)/, `> ${newText} (edited) `);
    });
    msgElem.innerHTML = inner;
  }
});
socket.on("messageDeleted", (messageId) => {
  const msgElem = document.getElementById(messageId);
  if (msgElem) msgElem.remove();
});
socket.on("messagePinned", (msg) => {
  const originalMsg = document.getElementById(msg.id);
  if (originalMsg && !originalMsg.classList.contains("pinned-highlight")) {
    const pinIcon = document.createElement("span");
    pinIcon.className = "pin-icon";
    pinIcon.textContent = " 📌";
    originalMsg.appendChild(pinIcon);
    originalMsg.classList.add("pinned-highlight");
  }
});
socket.on("typing", (text) => {
  typing.innerText = text || "";
});

socket.on("fileShared", ({ user, fileName, fileData, fileType }) => {
  appendFileMessage({ user, fileName, fileData, fileType });
});

socket.on("audioMessage", ({ user, fileData }) => {
  appendAudioMessage({ user, fileData });
});

clearButton.addEventListener("click", () => messages.innerHTML = "");

socket.on("roomUsers", ({ users }) => {
  userList.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u.name;
    userList.appendChild(li);
  });
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return alert("❌ File too large. Max 5MB.");
  const reader = new FileReader();
  reader.onloadstart = () => uploadProgress.style.display = "block";
  reader.onprogress = (e) => uploadProgress.value = (e.loaded / e.total) * 100;
  reader.onloadend = () => {
    socket.emit("fileUpload", {
      fileName: file.name,
      fileData: reader.result,
      fileType: file.type
    });
    uploadProgress.style.display = "none";
    fileInput.value = "";
  };
  reader.readAsDataURL(file);
});

searchButton.addEventListener("click", () => {
  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) return;
  let found = false;
  document.querySelectorAll("#messages .chat-message").forEach((msg) => {
    msg.classList.remove("search-highlight");
    const raw = msg.dataset.text || msg.textContent.toLowerCase();
    if (!found && raw.includes(keyword)) {
      msg.scrollIntoView({ behavior: "smooth", block: "center" });
      msg.classList.add("search-highlight");
      found = true;
      setTimeout(() => msg.classList.remove("search-highlight"), 5000);
    }
  });
  if (!found) alert(`❌ No message found containing: "${keyword}"`);
});

recordAudioBtn.addEventListener("click", async () => {
  if (!navigator.mediaDevices) return alert("Audio not supported.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];
  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit("audioMessage", { fileData: reader.result });
    };
    reader.readAsDataURL(blob);
    recordAudioBtn.textContent = "🎤";
  };
  mediaRecorder.start();
  recordAudioBtn.textContent = "⏹";
  setTimeout(() => {
    if (mediaRecorder.state === "recording") mediaRecorder.stop();
  }, 10000);
});

capturePhotoBtn?.addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getUserMedia) return alert("Camera not supported.");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  webcam.srcObject = stream;
  webcam.play();
  capturePhotoBtn.textContent = "📸 Snap";
  capturePhotoBtn.onclick = () => {
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    canvas.getContext("2d").drawImage(webcam, 0, 0);
    canvas.toBlob((b) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        socket.emit("fileUpload", {
          fileName: `photo_${Date.now()}.png`,
          fileType: "image/png",
          fileData: reader.result
        });
      };
      reader.readAsDataURL(b);
    });
    stream.getTracks().forEach((t) => t.stop());
    webcam.pause();
    capturePhotoBtn.textContent = "📷 Capture Photo";
  };
});

// Emoji panel
const emojiList = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","😘","😗","😙","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿"];
function renderEmojiPanel() {
  emojiPanel.innerHTML = "";
  emojiList.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-btn";
    btn.textContent = emoji;
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
});
document.addEventListener("click", (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.style.display = "none";
  }
});
renderEmojiPanel();

// Helpers
function appendMessage(message) {
  const li = document.createElement("li");
  li.classList.add("chat-message");
  li.id = message.id;
  li.dataset.id = message.id;
  li.dataset.text = (message.text || "").toLowerCase();

  if (message.user === "System") {
    li.classList.add("system-msg");
    li.innerText = message.text;
  } else {
    const isYou = message.user === name;
    li.classList.add(isYou ? "sender" : "receiver");
    if (message.text) {
      li.innerHTML = isYou
        ? `<strong>You:</strong> ${message.text} <span class="seen-check" id="seen-${message.id}" data-status="sent">✔</span>`
        : `<strong>${message.user}:</strong> ${message.text}`;
      if (!isYou) observer.observe(li);
    }
  }
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

function appendFileMessage({ user, fileName, fileData, fileType }) {
  const li = document.createElement("li");
  li.classList.add("chat-message", user === name ? "sender" : "receiver");
  const blob = new Blob([Uint8Array.from(atob(fileData.split(',')[1]), c => c.charCodeAt(0))], { type: fileType });
  const url = URL.createObjectURL(blob);
  let content = "";
  const ext = fileName.split('.').pop().toLowerCase();
  if (fileType.startsWith("image/")) {
    content = `<a href="${url}" download><img src="${url}" class="shared-img" /></a>`;
  } else {
    const icons = { pdf:"📄", doc:"📝", docx:"📝", txt:"📃", zip:"🗜", mp4:"🎥", mp3:"🎵" };
    const icon = icons[ext] || "📁";
    content = `<a href="${url}" download class="file-link">${icon} ${fileName}</a>`;
  }
  li.innerHTML = `<strong>${user===name?"You":user}:</strong> ${content}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

function appendAudioMessage({ user, fileData }) {
  const li = document.createElement("li");
  li.classList.add("chat-message", user === name ? "sender" : "receiver");
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = fileData;
  li.innerHTML = `<strong>${user===name?"You":user}:</strong> `;
  li.appendChild(audio);
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}
