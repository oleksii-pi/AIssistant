const defaultAIModelName = "gpt-3.5-turbo";
const aiModelList = [
  "gpt-4-1106-preview",
  "gpt-4-vision-preview",
  "gpt-4",
  "gpt-4-32k",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k"
];

async function streamAnswer(
  abortController,
  openaiSecretKey,
  text,
  imageContentBase64,
  temperature,
  maxTokens,
  onPartialResponse,
  onError,
  aiModel
) {
  try {
    

    let messages;
    if (imageContentBase64) {
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: text,
            },
            {
              type: "image_url",
              image_url: {
                url: imageContentBase64,
              },
            },
          ],
        },
      ];
    } else {
      messages = [{ role: "user", content: text }];
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + openaiSecretKey,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
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

      const sseArray = sseString
        .split("\n")
        .filter(
          (line) => line.startsWith("data:") && !line.includes("data: [DONE]")
        )
        .map((line) => JSON.parse(line.substring(6).trim()));

      const partialTex = sseArray
        .map((x) => x.choices[0].delta.content)
        .filter((x) => x)
        .join("");
      onPartialResponse(partialTex);
      if (sseString.includes("data: [DONE]")) break;
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      onError(error);
    }
  }
}
