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
  document.body.style.cursor = "wait";
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
      document.body.style.cursor = "default";
      return data.choices[0].message.content;
    })
    .catch(() => {
      document.body.style.cursor = "default";
    });
}

function createButton(left, top) {
  const b = document.createElement("button");
  b.innerText = "Write it better";
  b.className = "writeItBetterButton";
  b.style.left = `${left}px`;
  b.style.top = `${top}px`;
  document.body.appendChild(b);
  return b;
}

function createTextArea(left, top, width, text) {
  const ta = document.createElement("textarea");
  document.body.appendChild(ta);
  ta.value = text;
  ta.className = "writeItBetterBox";
  ta.style.left = `${left}px`;
  ta.style.top = `${top}px`;
  ta.style.width = `${width}px`;
  ta.style.height = `${ta.scrollHeight}px`;
  return ta;
}

document.addEventListener("mouseup", (event) => {
  const selection = window.getSelection();
  if (selection.type !== "Range") return;
  const selectedText = selection.toString();
  if (!selectedText) return;

  const selectionRange = selection.getRangeAt(0);
  const selectionRect = selectionRange.getBoundingClientRect();

  const mouseX = event.clientX + window.pageXOffset;
  const mouseY = event.clientY + window.pageYOffset;
  button = createButton(mouseX + 10, mouseY + 10);

  button.addEventListener("mouseup", async (event) => {
    event.stopPropagation();
    document.body.removeChild(button);
    button = null;

    const openaiSecretKey = await getOpenAiSectretKey();
    const betterText = await getBetterText(openaiSecretKey, selectedText);

    const x = selectionRect.left + window.pageXOffset;
    const y = selectionRect.bottom + window.pageYOffset;

    textarea = createTextArea(x, y + 10, selectionRect.width, betterText);

    // textarea.addEventListener("mousedown", () => {
    //   selectionRange.deleteContents();
    //   selectionRange.insertNode(document.createTextNode(textarea.value));
    //   document.body.removeChild(textarea);
    //   textarea = null;
    // });
  });
});
