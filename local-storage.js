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

async function storeAIPromptToMRU(aiPromptText) {
  const currentPromptsHistory = (await getStorage("promptHistory")) ?? [];
  const newPromptHistory = currentPromptsHistory.filter(
    (x) => x !== aiPromptText
  );
  newPromptHistory.unshift(aiPromptText);
  await setStorage("promptHistory", newPromptHistory);
}

async function deleteMRUItem(itemText) {
  const currentPromptsHistory = (await getStorage("promptHistory")) ?? [];
  const newPromptHistory = currentPromptsHistory.filter(
    (x) => x.trim() !== itemText.trim()
  );
  await setStorage("promptHistory", newPromptHistory);
}

async function getAIPromptHistory() {
  return (await getStorage("promptHistory")) ?? [];
}
