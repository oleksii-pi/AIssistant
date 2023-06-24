const defaultAIModelName = "gpt-3.5-turbo";

async function streamAnswer(
  abortController,
  openaiSecretKey,
  text,
  onPartialResponse,
  onError
) {
  try {
    const aiModel = (await getAiModelName()) ?? defaultAIModelName;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + openaiSecretKey,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: "user", content: text }],
        max_tokens: 2000,
        temperature: 0.05,
        n: 1,
        stream: true,
      }),
      signal: abortController?.signal,
    });

    if (!response.ok) {
      switch (response.status) {
        case 429:
          onError(
            "Rate limit exceeded. Please wait before making another request."
          );
          break;
        case 401:
          const responseBody = await response.json();
          onError(responseBody.error.message);
          break;
        default:
          onError(`Fetch failed. Status code: ${response.status}`);
      }
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

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
