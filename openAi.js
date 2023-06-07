async function streamAnswer(
  abortController,
  openaiSecretKey,
  aiModel,
  text,
  onPartialResponse,
  onError
) {
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
    signal: abortController?.signal,
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
    onError(error);
  }
}

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
