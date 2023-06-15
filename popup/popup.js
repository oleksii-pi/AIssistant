//! store templates
let popupAbortController = null;

window.addEventListener("load", async () => {
  const aiPromptTextArea = await registerInput("aiPromptTextArea");
  const input = await registerInput("inputTextArea");
  const aiSuggestionTextArea = await registerInput("aiSuggestionTextArea");
  const submitButton = document.getElementById("submitButton");
  submitButton.addEventListener("click", submitButtonClick);

  input.addEventListener("input", cleanupAiSuggestion);
  aiPromptTextArea.addEventListener("input", cleanupAiSuggestion);
  enableAutoComplete(aiPromptTextArea, getAIPromptHistory);

  const selectedText = await getSelectedTextInActiveTab();
  if (selectedText == "") {
    input.focus();
    input.select();
  } else {
    input.value = selectedText;
    await storeInputValue(input);
    await cleanupAiSuggestion();
    submitButton.focus();
  }
});

// window.addEventListener("beforeunload", async function (event) {
//   if (popupAbortController) {
//     popupAbortController.abort();
//     popupAbortController = null;
//   }
//   //event.returnValue = "";
//   await log("popup unloaded");
// });

async function cleanupAiSuggestion() {
  const aiSuggestionTextArea = document.getElementById("aiSuggestionTextArea");
  aiSuggestionTextArea.value = "";
  await storeInputValue(aiSuggestionTextArea);
}

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
  input.value = (await getStorage(inputKey)) ?? "";
  input.addEventListener("input", () => storeInputValue(input));
  return input;
}

async function storeInputValue(input) {
  const inputElementId = input.id;
  const inputKey = `popupState.${inputElementId}`;
  await setStorage(inputKey, input.value);
}

async function submitButtonClick(event) {
  const submitButton = event.target;
  if (popupAbortController !== null) {
    submitButton.textContent = "Submit";
    popupAbortController.abort();
    popupAbortController = null;
    return;
  }
  submitButton.textContent = "Cancel";

  const openaiSecretKey = await getOpenAiSecretKey();
  const aiPromptTextArea = document.getElementById("aiPromptTextArea");
  const inputTextArea = document.getElementById("inputTextArea");
  const aiSuggestionTextArea = document.getElementById("aiSuggestionTextArea");

  await storeInputValue(aiPromptTextArea);
  await storeAIPromptToMRU(aiPromptTextArea.value);
  await cleanupAiSuggestion();
  const aiQuery = `${aiPromptTextArea.value} ${inputTextArea.value}`;
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
  await storeInputValue(aiSuggestionTextArea);
  aiSuggestionTextArea.focus();
  aiSuggestionTextArea.select();
  popupAbortController = null;

  submitButton.textContent = "Submit";
}
