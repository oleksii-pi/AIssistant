let button;
let textarea;

document.addEventListener("mousedown", (event) => {
  if (button && !button.contains(event.target)) {
    document.body.removeChild(button);
    button = null;
  }

  if (textarea && !textarea.contains(event.target)) {
    document.body.removeChild(textarea);
    textarea = null;
  }
});

document.addEventListener("mouseup", (event) => {
  const selection = window.getSelection();
  if (selection.type !== "Range") return;
  const selectedText = selection.toString();
  if (!selectedText) return;

  const textRange = selection.getRangeAt(0);
  const textRect = textRange.getBoundingClientRect();

  const mouseX = event.clientX;
  const mouseY = event.clientY;

  button = document.createElement("button");
  button.innerText = "Write it better";
  button.className = "writeItBetterButton";
  button.style.position = "absolute";
  button.style.left = `${mouseX + 10}px`;
  button.style.top = `${mouseY + 10}px`;
  button.style.zIndex = 1;
  document.body.appendChild(button);

  button.addEventListener("mouseup", (event) => {
    event.stopPropagation();
    document.body.removeChild(button);
    button = null;

    chrome.storage.sync.get("openaiSecretKey", function (data) {
      let openaiSecretKey = data.openaiSecretKey;
      if (!openaiSecretKey) {
        openaiSecretKey = prompt(
          "Please enter your OpenAI secret key generated here https://platform.openai.com/account/api-keys:"
        );
        chrome.storage.sync.set({ openaiSecretKey: openaiSecretKey }); // we need to store it only if success
      }

      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + openaiSecretKey,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "user", content: "Improve this text: " + selectedText },
          ],
          max_tokens: 1000,
          temperature: 0,
          n: 1,
          stream: false,
        }),
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          const text = data.choices[0].message.content;

          const x = textRect.left;
          const y = textRect.bottom;

          textarea = document.createElement("textarea");
          document.body.appendChild(textarea);
          textarea.value = text;
          textarea.className = "writeItBetterBox";
          textarea.style.position = "absolute";
          textarea.style.left = `${x}px`;
          textarea.style.top = `${y + 10}px`;
          textarea.style.width = `${textRect.width}px`;
          textarea.style.height = `${textarea.scrollHeight}px`;
          textarea.style.overflowY = "hidden";
          textarea.style.zIndex = 1;
        });
    });
  });
});
