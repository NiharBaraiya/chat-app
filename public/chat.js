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
const clearBtn = document.getElementById("clearChat");
const fileInput = document.getElementById("fileInput");
const uploadProgress = document.getElementById("uploadProgress");
const languageSelect = document.getElementById("language");

let selectedLang = "hi";

// Initial "Loading..." dropdown
languageSelect.innerHTML = `<option selected disabled>🌐 Loading...</option>`;

// Load dynamic language list from LibreTranslate
fetch("https://libretranslate.com/languages")
  .then(res => res.json())
  .then(languages => {
    languageSelect.innerHTML = ""; // Clear old loading option
    languages.forEach(lang => {
      const option = document.createElement("option");
      option.value = lang.code;
      option.textContent = lang.name;
      languageSelect.appendChild(option);
    });
    languageSelect.value = selectedLang;
    translateUI();
  })
  .catch(() => {
    languageSelect.innerHTML = `<option disabled selected>❌ Failed to load</option>`;
  });

// Change language on select
languageSelect.addEventListener("change", () => {
  selectedLang = languageSelect.value;
  translateUI();
});

async function translateText(q, target) {
  if (!q || !target) return q;
  try {
    const response = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, source: "auto", target, format: "text" }),
    });
    const data = await response.json();
    return data.translatedText;
  } catch {
    return q;
  }
}

// UI translations
function translateUI() {
  const items = [
    { selector: "#msg", attr: "placeholder", text: "Your message..." },
    { selector: "#sendBtn", attr: "text", text: "Send" },
    { selector: "#clearChat", attr: "text", text: "Clear Chat" },
    { selector: "#fileLabel", attr: "text", text: "Send File:" },
    { selector: "#room-name", attr: "text", text: `${room} Room` },
    { selector: ".users-title", attr: "text", text: "Users List" },
  ];

  items.forEach(async item => {
    const translated = await translateText(item.text, selectedLang);
    const el = document.querySelector(item.selector);
    if (!el) return;
    if (item.attr === "text") el.textContent = translated;
    else if (item.attr === "placeholder") el.placeholder = translated;
  });
}

// Send Message
form.addEventListener("submit", async e => {
  e.preventDefault();
  const msg = input.value.trim();
  if (!msg) return;
  const translated = await translateText(msg, selectedLang);
  socket.emit("chatMessage", translated);
  input.value = "";
});

// Display Message
socket.on("message", m => {
  const li = document.createElement("li");
  li.className = "message";
  const isYou = m.user === name;
  li.classList.add(isYou ? "sender" : "receiver");

  li.innerHTML = `<span class="timestamp">${m.time}</span> <strong>${isYou ? "You" : m.user}</strong>: ${m.text}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// Typing indicator
let typingTimeout;
input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("typing", false), 1000);
});
socket.on("typing", txt => typing.innerText = txt);

// Clear Chat
clearBtn.addEventListener("click", () => messages.innerHTML = "");

// File Upload
fileInput?.addEventListener("change", () => {
  const f = fileInput.files[0];
  if (!f || f.size > 5 * 1024 * 1024) return alert("Max 5MB");

  const reader = new FileReader();
  reader.onloadstart = () => { uploadProgress.style.display = "block"; uploadProgress.value = 0; };
  reader.onprogress = e => { if (e.lengthComputable) uploadProgress.value = e.loaded / e.total * 100; };
  reader.onload = () => {
    socket.emit("fileUpload", {
      fileName: f.name,
      fileData: reader.result,
      fileType: f.type,
    });
    uploadProgress.style.display = "none";
    fileInput.value = "";
  };
  reader.readAsDataURL(f);
});

// Display uploaded file
socket.on("fileShared", data => {
  const { user, fileName, fileData, fileType, time } = data;
  const li = document.createElement("li");
  const isYou = user === name;
  li.className = "message " + (isYou ? "sender" : "receiver");

  const blob = new Blob([Uint8Array.from(atob(fileData.split(',')[1]), c => c.charCodeAt(0))], { type: fileType });
  const url = URL.createObjectURL(blob);

  if (fileType.startsWith("image/")) {
    li.innerHTML = `<span class="timestamp">${time}</span> <strong>${isYou ? "You" : user}</strong>: <a href="${url}" download="${fileName}"><img src="${url}" class="shared-img"></a>`;
  } else {
    li.innerHTML = `<span class="timestamp">${time}</span> <strong>${isYou ? "You" : user}</strong>: <a href="${url}" download="${fileName}">📎 ${fileName}</a>`;
  }

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// User list
socket.on("roomUsers", ({ users }) => {
  userList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u.name;
    userList.appendChild(li);
  });
});

// Join Room
if (name && room) {
  socket.emit("joinRoom", { name, room });
  roomNameElem.innerText = `${room} Room`;
}
