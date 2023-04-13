let button;
let textarea;

document.addEventListener("mousedown", (event) => {
  if (button && !button.contains(event.target)) {
    document.body.removeChild(button);
    button = null;
  }

  if (textarea && !textarea.contains(event.target)) {
    document.body.removeChild(textarea);
    textarea = null;
  }
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

async function getBetterText(openaiSecretKey, text) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + openaiSecretKey,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Improve this text: " + text }],
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
      return data.choices[0].message.content;
    });
}

document.addEventListener("mouseup", (event) => {
  const selection = window.getSelection();
  if (selection.type !== "Range") return;
  const selectedText = selection.toString();
  if (!selectedText) return;

  const selectionRange = selection.getRangeAt(0);
  const selectionRect = selectionRange.getBoundingClientRect();

  const mouseX = event.clientX;
  const mouseY = event.clientY;

  button = document.createElement("button");
  button.innerText = "Write it better";
  button.className = "writeItBetterButton";
  button.style.position = "absolute";
  button.style.left = `${mouseX + 10}px`;
  button.style.top = `${mouseY + 10}px`;
  button.style.zIndex = 1;
  document.body.appendChild(button);

  button.addEventListener("mouseup", async (event) => {
    event.stopPropagation();
    document.body.removeChild(button);
    button = null;

    const openaiSecretKey = await getOpenAiSectretKey();
    const betterText = await getBetterText(openaiSecretKey, selectedText);

    const x = selectionRect.left;
    const y = selectionRect.bottom;

    textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.value = betterText;
    textarea.className = "writeItBetterBox";
    textarea.style.position = "absolute";
    textarea.style.left = `${x}px`;
    textarea.style.top = `${y + 10}px`;
    textarea.style.width = `${selectionRect.width}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
    textarea.style.overflowY = "hidden";
    textarea.style.zIndex = 1;

    textarea.addEventListener("mousedown", (event) => {
      selectionRange.deleteContents();
      selectionRange.insertNode(document.createTextNode(textarea.value));
      document.body.removeChild(textarea);
      textarea = null;
    });
  });
});
