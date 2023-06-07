// idea: screen scraping
const userConfig = {
  defaultAIPrompt: "Improve this text",
  aiModel: "gpt-3.5-turbo",
};

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
  document.body.style.cursor = "wait";
  abortController = new AbortController();
  abortController.signal.addEventListener("abort", () => {
    document.body.style.cursor = "default";
  });
  await streamAnswer(
    abortController,
    openaiSecretKey,
    promptInput.config.aiModel,
    aiQuery,
    (partialResponse) => {
      answerTextarea.value += partialResponse;
      answerTextarea.style.height = "auto";
      answerTextarea.style.height = `${answerTextarea.scrollHeight}px`;
    },
    (error) => {
      abortController = null;
    }
  );
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
  restoreSelection();
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
});

function cleanUpTextHighlights() {
  document
    .querySelectorAll(`div.selection-text-overlay`)
    .forEach((element) => element.parentNode.removeChild(element));
}

function createOverlay(rect) {
  let div = document.createElement("div");
  div.style.left = `${rect.left + window.pageXOffset}px`;
  div.style.top = `${rect.top + window.pageYOffset}px`;
  div.style.width = `${rect.width}px`;
  div.style.height = `${rect.height}px`;
  div.className = "selection-text-overlay";
  document.body.appendChild(div);
}

function showPromptInput() {
  const selection = window.getSelection();
  if (selection.type !== "Range") return;
  const selectedText = selection.toString();
  if (!selectedText) return;

  const selectionRange = selection.getRangeAt(0);
  const selectionRect = selectionRange.getBoundingClientRect();
  createOverlay(selectionRect);

  const left = selectionRect.left + window.pageXOffset;
  const top = selectionRect.bottom + window.pageYOffset;
  promptInput.style.left = `${left}px`;
  promptInput.style.top = `${top + 4}px`;
  promptInput.style.display = "block";
  promptInput.selectionRange = selectionRange;
  promptInput.selectedText = selectedText;
  promptInput.selectionRect = selectionRect;
  promptInput.select();
  promptInput.focus();
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getSelectedText") {
    const selectedText = window.getSelection().toString();
    sendResponse({ selectedText });
  }
});

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

function restoreSelection() {
  if (promptInput.selectionRange) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(promptInput.selectionRange);
    promptInput.selectionRange = null;
  }
}

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
      restoreSelection();
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
