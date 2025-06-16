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
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const languageSelect = document.getElementById("language");

let selectedLang = "hi"; // default Hindi

// Load language options dynamically
languageSelect.innerHTML = `<option selected disabled>Loading…</option>`;
fetch("https://libretranslate.com/languages")
  .then(res => res.json())
  .then(langs => {
    languageSelect.innerHTML = "";
    langs.forEach(l => {
      const opt = document.createElement("option");
      opt.value = l.code;
      opt.textContent = l.name;
      languageSelect.appendChild(opt);
    });
    languageSelect.value = selectedLang;
    translateUI();
  })
  .catch(() => {
    languageSelect.innerHTML = `<option disabled>Failed to load</option>`;
  });

// Change UI language when user selects
languageSelect.addEventListener("change", () => {
  selectedLang = languageSelect.value;
  translateUI();
});

// Helper: call translation API
async function translateText(text, target) {
  if (!text || !target) return text;
  try {
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "auto", target, format: "text" })
    });
    const json = await res.json();
    return json.translatedText;
  } catch {
    return text;
  }
}

// Translate UI strings
function translateUI() {
  [
    { el: input, prop: "placeholder", text: "Your message..." },
    { el: sendBtn, prop: "textContent", text: "Send" },
    { el: clearBtn, prop: "textContent", text: "Clear Chat" },
    { el: roomNameElem, prop: "textContent", text: `${room} Room` },
  ].forEach(async item => {
    const tr = await translateText(item.text, selectedLang);
    item.el[item.prop] = tr;
  });
}

// Send user message (translated)
form.addEventListener("submit", async e => {
  e.preventDefault();
  const raw = input.value.trim();
  if (!raw) return;
  const translated = await translateText(raw, selectedLang);
  socket.emit("chatMessage", translated);
  input.value = "";
});

// Receive and display messages
socket.on("message", msg => {
  const li = document.createElement("li");
  li.className = msg.user === name ? "sender" : "receiver";
  li.innerHTML = `<span class="timestamp">${msg.time}</span> <strong>${msg.user === name ? "You" : msg.user}</strong>: ${msg.text}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// Typing indicator
let typingTimer;
input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit("typing", false), 1000);
});
socket.on("typing", txt => { typing.textContent = txt; });

// Clear chat
clearBtn.addEventListener("click", () => messages.innerHTML = "");

// Update user list
socket.on("roomUsers", ({ users }) => {
  userList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u.name;
    userList.appendChild(li);
  });
});

// Emit join event
if (name && room) {
  socket.emit("joinRoom", { name, room });
  roomNameElem.textContent = `${room} Room`;
}
