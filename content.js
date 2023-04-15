let button = document.createElement("button");
button.style.display = "none";
button.innerText = "W";
button.className = "writeItBetterButton";
document.body.appendChild(button);

let textarea = document.createElement("textarea");
textarea.style.display = "none";
textarea.className = "writeItBetterBox";
document.body.appendChild(textarea);

button.addEventListener("mouseup", async (event) => {
  const selection = window.getSelection();
  if (selection.type !== "Range") return;
  const selectedText = selection.toString();
  if (!selectedText) return;
  button.style.display = "none";
  event.stopPropagation();

  const openaiSecretKey = await getOpenAiSectretKey();
  const betterText = await getAnswer(
    openaiSecretKey,
    "Improve this text: " + selectedText
  );

  const selectionRange = selection.getRangeAt(0);
  const selectionRect = selectionRange.getBoundingClientRect();
  const x = selectionRect.left + window.pageXOffset;
  const y = selectionRect.bottom + window.pageYOffset;

  textarea.value = betterText;
  textarea.style.left = `${x}px`;
  textarea.style.top = `${y + 10}px`;
  textarea.style.width = `${selectionRect.width}px`;
  textarea.style.display = "block";
  textarea.style.height = `${textarea.scrollHeight}px`;
});

document.addEventListener("mousedown", (event) => {
  if (button && !button.contains(event.target)) {
    button.style.display = "none";
  }

  if (textarea && !textarea.contains(event.target)) {
    textarea.style.display = "none";
  }
});

document.addEventListener("mouseup", (event) => {
  const selection = window.getSelection();
  if (selection.type !== "Range") return;
  const selectedText = selection.toString();
  if (!selectedText) return;

  const mouseX = event.clientX + window.pageXOffset;
  const mouseY = event.clientY + window.pageYOffset;
  button.style.left = `${mouseX + 10}px`;
  button.style.top = `${mouseY + 10}px`;
  button.style.display = "block";
});

async function getOpenAiSectretKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("openaiSecretKey", function (data) {
      let openaiSecretKey = data.openaiSecretKey;
      if (!openaiSecretKey) {
        openaiSecretKey = prompt(
          "Please enter your OpenAI secret key. Enable paid plan here https://platform.openai.com/account/billing/overview and generate secret key here https://platform.openai.com/account/api-keys"
        );
        chrome.storage.sync.set({ openaiSecretKey }); //! store it only if success or it should be possible to reset
      }
      resolve(openaiSecretKey);
    });
  });
}

async function getAnswer(openaiSecretKey, text) {
  document.body.style.cursor = "wait";
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + openaiSecretKey,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: text }],
      max_tokens: 1000,
      temperature: 0,
      n: 1,
      stream: false,
    }),
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      document.body.style.cursor = "default";
      return data.choices[0].message.content;
    })
    .catch(() => {
      document.body.style.cursor = "default";
    });
}
