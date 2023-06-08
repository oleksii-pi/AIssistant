let popupAbortController;

window.addEventListener("load", async () => {
  await registerInput("aiPromptTextArea");
  const input = await registerInput("inputTextArea");
  const aiSuggestionTextArea = await registerInput("aiSuggestionTextArea");

  const selectedText = await getSelectedTextInActiveTab();
  if (selectedText !== "") {
    input.value = selectedText;
    aiSuggestionTextArea.value = "";
    triggerInputEvent(input);
  }

  const submitButton = document.getElementById("submitButton");
  submitButton.focus();
  submitButton.addEventListener("click", submitButtonClick);
});

window.addEventListener("beforeunload", async function (event) {
  if (popupAbortController) {
    popupAbortController.abort();
    popupAbortController = null;
  }
  event.returnValue = "";
});

async function getSelectedTextInActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const response = await new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { action: "getSelectedText" }, resolve);
  });
  return response?.selectedText ?? "";
}

async function log(message) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  await new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "log", payload: message },
      resolve
    );
  });
}

async function registerInput(inputElementId) {
  const input = document.getElementById(inputElementId);
  const inputKey = `popupState.${inputElementId}`;

  const storageData = await new Promise((resolve) => {
    chrome.storage.local.get([inputKey], resolve);
  });
  input.value = storageData[inputKey] ?? "";

  input.addEventListener("input", () =>
    chrome.storage.local.set({ [inputKey]: input.value })
  );

  return input;
}

function triggerInputEvent(element) {
  const inputEvent = new Event("input", {
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(inputEvent);
}

async function submitButtonClick(event) {
  const openaiSecretKey = await getOpenAiSecretKey();
  const aiPromptTextArea = document.getElementById("aiPromptTextArea");
  const inputTextArea = document.getElementById("inputTextArea");
  const aiSuggestionTextArea = document.getElementById("aiSuggestionTextArea");
  aiSuggestionTextArea.value = "";
  const aiQuery = `${aiPromptTextArea.value}: ${inputTextArea.value}`;
  await log(aiQuery);
  popupAbortController = new AbortController();
  await streamAnswer(
    popupAbortController,
    openaiSecretKey,
    aiQuery,
    (partialResponse) => {
      aiSuggestionTextArea.value += partialResponse;
    },
    async (error) => {
      await log(error);
      popupAbortController = null;
    }
  );
  triggerInputEvent(aiSuggestionTextArea);
  aiSuggestionTextArea.focus();
  aiSuggestionTextArea.select();
}
