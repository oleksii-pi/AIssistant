// idea: screen scraping
const userConfig = {
  defaultAIPrompt: "Improve this text",
  aiModel: "gpt-3.5-turbo",
};

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

async function requestAI() {
  promptInput.style.display = "none";
  const selectedText = promptInput.selectedText;
  if (!selectedText) return;

  const selectionRect = promptInput.selectionRect;
  const left = selectionRect.left + window.pageXOffset;
  const top = selectionRect.bottom + window.pageYOffset;

  answerTextarea.value = "";
  answerTextarea.style.left = `${left}px`;
  answerTextarea.style.top = `${top + 4}px`;
  answerTextarea.style.width = `${selectionRect.width}px`;
  answerTextarea.style.display = "block";
  answerTextarea.style.height = "auto";
  answerTextarea.style.height = `${answerTextarea.scrollHeight}px`;

  const openaiSecretKey = await getOpenAiSecretKey();
  const aiQuery = `${promptInput.value}: ${selectedText}`;
  console.log(aiQuery);
  await streamAnswer(
    openaiSecretKey,
    promptInput.config.aiModel,
    aiQuery,
    (partialResponse) => {
      answerTextarea.value += partialResponse;
      answerTextarea.style.height = "auto";
      answerTextarea.style.height = `${answerTextarea.scrollHeight}px`;
    }
  );
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

let abortController;
document.addEventListener("mousedown", (event) => {
  if (
    promptInput.contains(event.target) ||
    answerTextarea.contains(event.target)
  ) {
    return;
  }
  promptInput.style.display = "none";
  answerTextarea.style.display = "none";
  cleanUpTextHighlights();
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
});

function getTextNodesInRange(range) {
  const textNodes = [];
  const nodeIterator = document.createNodeIterator(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        return range.intersectsNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    }
  );

  let currentNode;
  while ((currentNode = nodeIterator.nextNode())) {
    textNodes.push(currentNode);
  }

  return textNodes;
}

function highlightSelectedText(range) {
  const textNodes = getTextNodesInRange(range);

  textNodes.forEach(function (node) {
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;

    let textWithinSelection;
    if (start > 0 || end < node.length) {
      textWithinSelection = node.splitText(start);
      textWithinSelection.splitText(end - start);
    } else {
      textWithinSelection = node;
    }

    const span = document.createElement("span");
    span.className = "selected-text-highlight";
    textWithinSelection.parentNode.replaceChild(span, textWithinSelection);
    span.appendChild(textWithinSelection);
  });
}

function cleanUpTextHighlights() {
  let highlightedSpans = document.querySelectorAll(
    "span.selected-text-highlight"
  );

  highlightedSpans.forEach(function (span) {
    let parent = span.parentNode;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  });
}

function showPromptInput() {
  const selection = window.getSelection();
  if (selection.type !== "Range") return;
  const selectedText = selection.toString();
  if (!selectedText) return;

  const selectionRange = selection.getRangeAt(0);
  const selectionRect = selectionRange.getBoundingClientRect();

  highlightSelectedText(selectionRange);

  const left = selectionRect.left + window.pageXOffset;
  const top = selectionRect.bottom + window.pageYOffset;
  promptInput.style.left = `${left}px`;
  promptInput.style.top = `${top + 4}px`;
  promptInput.style.display = "block";
  promptInput.selectedText = selectedText;
  promptInput.selectionRect = selectionRect;
  promptInput.select();
  promptInput.focus();
}

const promptInput = createPromptInput(userConfig);
const answerTextarea = createAnswerTextArea();

let lastShiftPressTime = 0;
let shiftPressCount = 0;
window.addEventListener("keydown", function (event) {
  if (event.key === "Shift") {
    let currentTime = new Date().getTime();
    if (currentTime - lastShiftPressTime <= 500) {
      shiftPressCount++;
      if (shiftPressCount === 2) {
        showPromptInput();
        shiftPressCount = 0;
      }
    } else {
      shiftPressCount = 1;
    }
    lastShiftPressTime = currentTime;
  } else {
    shiftPressCount = 0;
  }
});

document.addEventListener("mouseup", (event) => {
  if (event.shiftKey) {
    showPromptInput();
  }
});

function createPromptInput(config) {
  const input = document.createElement("input");
  input.style.display = "none";
  input.className = "ai-request-input";
  input.type = "text";
  input.value = config.defaultAIPrompt;
  input.config = config;
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent the default form submission
      requestAI();
    }
    if (event.key === "Escape") {
      promptInput.style.display = "none";
      cleanUpTextHighlights();
    }
  });
  document.body.appendChild(input);
  return input;
}

function createAnswerTextArea() {
  const textarea = document.createElement("textarea");
  textarea.style.display = "none";
  textarea.className = "ai-answer-box";
  document.body.appendChild(textarea);
  return textarea;
}
