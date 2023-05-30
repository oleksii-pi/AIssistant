// idea: screen scraping

const userConfigs = [
  {
    buttonText: "Write it better",
    buttonHint: "Ask AI",
    buttonBackground: "#37447e",
    requestTemplate: "Improve this text: ",
    aiModel: "gpt-3.5-turbo",
  },
];

const buttonMouseUpHandler = async (event) => {
  const selection = window.getSelection();
  if (selection.type !== "Range") return;
  const selectedText = selection.toString();
  if (!selectedText) return;
  buttons.forEach((b) => (b.style.display = "none"));
  event.stopPropagation();
  const button = event.target;

  const selectionRange = selection.getRangeAt(0);
  const selectionRect = selectionRange.getBoundingClientRect();
  const x = selectionRect.left + window.pageXOffset;
  const y = selectionRect.bottom + window.pageYOffset;

  textarea.value = "";
  textarea.style.left = `${x}px`;
  textarea.style.top = `${y + 10}px`;
  textarea.style.width = `${selectionRect.width}px`;
  textarea.style.display = "block";
  textarea.style.height = `${textarea.scrollHeight}px`;

  const openaiSecretKey = await getOpenAiSectretKey();
  await streamAnswer(
    openaiSecretKey,
    button.config.aiModel,
    `${button.config.requestTemplate}"${selectedText.replace(`"`, `""`)}"`,
    (partialResponse) => {
      textarea.value += partialResponse;
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  );
};

const buttons = userConfigs.map((config) => {
  const b = document.createElement("button");
  b.style.display = "none";
  b.style.backgroundColor = config.buttonBackground;
  b.innerText = config.buttonText;
  b.title = config.buttonHint;
  b.className = "writeItBetterButton";
  b.config = config;
  document.body.appendChild(b);
  b.addEventListener("mouseup", buttonMouseUpHandler);
  b.addEventListener("mousedown", (event) => event.preventDefault());
  return b;
});

let textarea = document.createElement("textarea");
textarea.style.display = "none";
textarea.className = "writeItBetterBox";
document.body.appendChild(textarea);

let abortController;

document.addEventListener("mousedown", (event) => {
  if (buttons.filter((b) => b.contains(event.target)) == 0) {
    buttons.forEach((b) => (b.style.display = "none"));
  }

  if (!textarea.contains(event.target)) {
    textarea.style.display = "none";
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }
});

document.addEventListener("mouseup", (event) => {
  const selection = window.getSelection();
  if (selection.type !== "Range") return;
  const selectedText = selection.toString();
  if (!selectedText) return;

  const mouseX = event.clientX + window.pageXOffset;
  const mouseY = event.clientY + window.pageYOffset;
  buttons.forEach((button, i) => {
    button.style.left = `${mouseX + 20}px`;
    button.style.top = `${mouseY + 10 + 32 * i}px`;
    button.style.display = "block";
  });
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

async function streamAnswer(openaiSecretKey, aiModel, text, onPartialResponse) {
  document.body.style.cursor = "wait";
  abortController = new AbortController();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + openaiSecretKey,
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [{ role: "user", content: text }],
      max_tokens: 1000,
      temperature: 0.05,
      n: 1,
      stream: true,
    }),
    signal: abortController.signal,
  });
  abortController.signal.addEventListener("abort", () => {
    document.body.style.cursor = "default";
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value } = await reader.read();
      const sseString = decoder.decode(value);
      if (sseString.includes("data: [DONE]")) break;
      const sseArray = sseString
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => JSON.parse(line.substring(6).trim()));

      const partialTex = sseArray
        .map((x) => x.choices[0].delta.content)
        .filter((x) => x)
        .join("");
      onPartialResponse(partialTex);
    }
  } catch (error) {
    controller = null;
  }
  document.body.style.cursor = "default";
}
