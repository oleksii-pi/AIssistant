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

async function getAiModelName() {
  return (await getStorage("AiModelName")) ?? "gpt-3.5-turbo";
}

async function setAiModelName(value) {
  await setStorage("AiModelName", value);
}

async function getOpenAiSecretKey() {
  let openaiSecretKey = await getStorage("openaiSecretKey");
  if (!openaiSecretKey) {
    openaiSecretKey = prompt(
      "Please enter your OpenAI secret key. Enable paid plan here https://platform.openai.com/account/billing/overview and generate secret key here https://platform.openai.com/account/api-keys"
    );
    await setOpenAiSecretKey(openaiSecretKey);
  }
  return openaiSecretKey;
}

async function setOpenAiSecretKey(value) {
  await setStorage("openaiSecretKey", value);
}
