// ✅ Emoji Logic
const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");
const emojiInput = document.getElementById("msg");

// List of emojis to show (you can add more!)
const emojiList = ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😍","😘","😜","🤪","🤩","🤗","😎","😢","😭","😡","😤","👍","🙏","🔥","💯"];

// Populate the emoji panel
emojiList.forEach(emoji => {
  const btn = document.createElement("button");
  btn.textContent = emoji;
  btn.type = "button";
  btn.className = "emoji-btn";
  btn.addEventListener("click", () => {
    emojiInput.value += emoji;
    emojiInput.focus();
    emojiPanel.style.display = "none"; // auto-close panel
  });
  emojiPanel.appendChild(btn);
});

// Toggle emoji panel
emojiBtn.addEventListener("click", () => {
  emojiPanel.style.display = emojiPanel.style.display === "none" ? "block" : "none";
});

// Hide panel if clicked outside
document.addEventListener("click", (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.style.display = "none";
  }
});
