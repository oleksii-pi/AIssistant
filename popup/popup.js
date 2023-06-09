let popupAbortController;

window.addEventListener("load", async () => {
  await registerInput("aiPromptTextArea");
  const input = await registerInput("inputTextArea");
  const aiSuggestionTextArea = await registerInput("aiSuggestionTextArea");

  const selectedText = await getSelectedTextInActiveTab();
  if (selectedText !== "") {
    input.value = selectedText;
    await storeInputValue(input);
    aiSuggestionTextArea.value = "";
    await storeInputValue(aiSuggestionTextArea);
  }

  const submitButton = document.getElementById("submitButton");
  submitButton.focus();
  submitButton.addEventListener("click", submitButtonClick);
});

// window.addEventListener("beforeunload", async function (event) {
//   if (popupAbortController) {
//     popupAbortController.abort();
//     popupAbortController = null;
//   }
//   //event.returnValue = "";
//   await log("popup unloaded");
// });

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
  const openaiSecretKey = await getOpenAiSecretKey();
  const aiPromptTextArea = document.getElementById("aiPromptTextArea");
  const inputTextArea = document.getElementById("inputTextArea");
  const aiSuggestionTextArea = document.getElementById("aiSuggestionTextArea");
  aiSuggestionTextArea.value = "";
  await storeInputValue(aiSuggestionTextArea);
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
  await storeInputValue(aiSuggestionTextArea);
  aiSuggestionTextArea.focus();
  aiSuggestionTextArea.select();
}

// storage:

function setStorage(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function getStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[key]);
      }
    });
  });
}
