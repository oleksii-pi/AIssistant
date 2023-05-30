// idea: screen scraping

const userConfigs = [
  {
    aiPromt: "Improve this text",
    buttonHint: "Ask AI",
    buttonBackground: "#37447e",
    aiModel: "gpt-3.5-turbo",
  },
];

const requestAI = async (button) => {
  buttons.forEach((b) => (b.style.display = "none"));
  const selectedText = button.selectedText;
  if (!selectedText) return;

  const selectionRect = button.selectionRect;
  const x = selectionRect.left + window.pageXOffset;
  const y = selectionRect.bottom + window.pageYOffset;

  textarea.value = "";
  textarea.style.left = `${x}px`;
  textarea.style.top = `${y + 10}px`;
  textarea.style.width = `${selectionRect.width}px`;
  textarea.style.display = "block";
  textarea.style.height = `${textarea.scrollHeight}px`;

  const openaiSecretKey = await getOpenAiSecretKey();
  const aiQuery = `${button.input.value}: ${selectedText}`;
  console.log(aiQuery);
  await streamAnswer(
    openaiSecretKey,
    button.config.aiModel,
    aiQuery,
    (partialResponse) => {
      textarea.value += partialResponse;
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  );
};

const buttons = userConfigs.map((config) => {
  const aiRequestButton = document.createElement("button");
  aiRequestButton.style.display = "none";
  aiRequestButton.style.backgroundColor = config.buttonBackground;
  aiRequestButton.title = config.buttonHint;
  aiRequestButton.className = "aiRequestButton";
  aiRequestButton.config = config;
  document.body.appendChild(aiRequestButton);

  const input = document.createElement("input");
  input.type = "text";
  input.value = config.aiPromt;
  input.className = "aiRequestInput";
  input.addEventListener("click", function () {
    this.select();
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent the default form submission
      requestAI(aiRequestButton);
    }
  });

  aiRequestButton.appendChild(input);
  aiRequestButton.input = input;
  aiRequestButton.selected;

  return aiRequestButton;
});

let textarea = document.createElement("textarea");
textarea.style.display = "none";
textarea.className = "aiAnswerBox";
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

  const selectionRange = selection.getRangeAt(0);
  const selectionRect = selectionRange.getBoundingClientRect();

  const mouseX = event.clientX + window.pageXOffset;
  const mouseY = event.clientY + window.pageYOffset;
  buttons.forEach((button, i) => {
    button.style.left = `${mouseX + 20}px`;
    button.style.top = `${mouseY + 10 + 32 * i}px`;
    button.style.display = "block";
    button.selectedText = selectedText;
    button.selectionRect = selectionRect;
  });
});

async function getOpenAiSecretKey() {
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
