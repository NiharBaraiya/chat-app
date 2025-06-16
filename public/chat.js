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

let selectedLang = "hi"; // Default translation language

// Add and clear temporary Loading option
const loadingOption = document.createElement("option");
loadingOption.textContent = "🌐 Loading languages...";
languageSelect.append(loadingOption);

fetch("https://libretranslate.com/languages")
  .then(r => r.json())
  .then(langs => {
    languageSelect.innerHTML = "";
    langs.forEach(l => {
      const o = document.createElement("option");
      o.value = l.code;
      o.textContent = l.name;
      languageSelect.append(o);
    });
    languageSelect.value = selectedLang;
    translateUI();
  })
  .catch(() => {
    languageSelect.innerHTML = "";
    const o = document.createElement("option");
    o.textContent = "❌ Failed to load languages";
    languageSelect.append(o);
  });

languageSelect.addEventListener("change", () => {
  selectedLang = languageSelect.value;
  translateUI();
});

function translateUI() {
  const mapping = {
    sendBtn: "Send",
    clearChat: "Clear Chat",
    msg: "Type your message...",
  };
  Object.entries(mapping).forEach(([id, text]) => {
    translateText(text, selectedLang).then(trans => {
      if (id === "msg") input.placeholder = trans;
      else if (id === "sendBtn") form.querySelector("button[type=submit]").textContent = trans;
      else if (id === "clearChat") clearBtn.textContent = trans;
    });
  });
}

async function translateText(q, target) {
  if (!target) return q;
  try {
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, source: "auto", target, format: "text" })
    });
    const d = await res.json();
    return d.translatedText;
  } catch {
    return q;
  }
}

if (name && room) {
  socket.emit("joinRoom", { name, room });
  roomNameElem.innerText = `${room} Room`;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  const translated = await translateText(text, selectedLang);
  socket.emit("chatMessage", translated);
  input.value = "";
});

// Handle incoming chat messages
socket.on("message", m => {
  const li = document.createElement("li");
  li.className = "message";
  if (m.user === "System") {
    li.classList.add("system");
    li.innerText = m.text;
  } else {
    const side = m.user === name ? "sender" : "receiver";
    li.classList.add(side);
    li.innerHTML = `<span class="timestamp">${m.time}</span> <strong>${side==='sender'?'You':m.user}</strong>: ${m.text}`;
  }
  messages.append(li);
  messages.scrollTop = messages.scrollHeight;
});

// Typing indicator
let typingTimeout;
input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("typing", false), 1000);
});
socket.on("typing", text => typing.innerText = text);

// Clear chat
clearBtn.addEventListener("click", () => messages.innerHTML = "");

// User list updates
socket.on("roomUsers", ({ users }) => {
  userList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u.name;
    userList.append(li);
  });
});

// File upload and sharing
fileInput?.addEventListener("change", () => {
  const f = fileInput.files[0];
  if (!f || f.size > 5*1024*1024) return alert("Max size 5MB");
  const reader = new FileReader();
  reader.onloadstart = () => { uploadProgress.style.display = "block"; uploadProgress.value = 0; };
  reader.onprogress = e => { if (e.lengthComputable) uploadProgress.value = e.loaded/e.total*100; };
  reader.onload = () => {
    socket.emit("fileUpload", { fileName: f.name, fileData: reader.result, fileType: f.type });
    uploadProgress.style.display = "none";
    fileInput.value = "";
  };
  reader.readAsDataURL(f);
});

// Receiving shared files
socket.on("fileShared", data => {
  const { user, fileName, fileData, fileType, time } = data;
  const li = document.createElement("li");
  li.className = "message " + (user === name ? "sender":"receiver");

  const blob = new Blob([Uint8Array.from(atob(fileData.split(',')[1]), c => c.charCodeAt(0))], { type: fileType });
  const url = URL.createObjectURL(blob);
  const ext = fileName.split('.').pop().toLowerCase();
  const icons = { pdf:"📄", doc:"📝", docx:"📝", txt:"📃", jpg:"🖼️", jpeg:"🖼️", png:"🖼️", gif:"🖼️", default:"📁" };
  const icon = icons[ext] || icons.default;

  let html;
  if (fileType.startsWith("image/")) {
    html = `<a href="${url}" download="${fileName}"><img src="${url}" class="shared-img"></a>`;
  } else {
    html = `<a href="${url}" download="${fileName}">${icon} ${fileName}</a>`;
  }

  li.innerHTML = `<span class="timestamp">${time}</span> <strong>${user===name?'You':user}</strong>: ${html}`;
  messages.append(li);
  messages.scrollTop = messages.scrollHeight;
});
