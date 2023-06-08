window.addEventListener("load", async () => {
  await registerInput("aiPromptTextArea");
  const input = await registerInput("inputTextArea");
  await registerInput("aiSuggestionTextArea");

  const selectedText = await getSelectedTextInActiveTab();
  if (selectedText !== "") {
    input.value = selectedText;
    triggerInputEvent(input);
  }

  const submitButton = document.getElementById("submitButton");
  submitButton.focus();
  submitButton.addEventListener("click", submitButtonClick);

  await log("load");
});

window.addEventListener("beforeunload", function (event) {
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
  const aiQuery = `${promptInput.value}: ${selectedText}`;
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
