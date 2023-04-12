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
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  button = document.createElement("button");
  button.innerText = "Write it better";
  button.style.position = "absolute";
  button.style.left = `${mouseX}px`;
  button.style.top = `${mouseY + 10}px`;
  document.body.appendChild(button);

  button.addEventListener("mouseup", (event) => {
    event.stopPropagation();
    document.body.removeChild(button);
    button = null;
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    chrome.storage.sync.get("openaiSecretKey", function (data) {
      let openaiSecretKey = data.openaiSecretKey;
      if (!openaiSecretKey) {
        openaiSecretKey = prompt(
          "Please enter your OpenAI secret key generated here https://platform.openai.com/account/api-keys:"
        );
        chrome.storage.sync.set({ openaiSecretKey: openaiSecretKey }); // we need to store it only if success
      }

      fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + openaiSecretKey,
        },
        body: JSON.stringify({
          model: "text-davinci-003",
          prompt: "Improve this text: " + selectedText,
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
          const text = data.choices[0].text;

          textarea = document.createElement("textarea");
          document.body.appendChild(textarea);
          textarea.style.position = "absolute";
          textarea.value = text;
          textarea.style.left = `${mouseX}px`;
          textarea.style.top = `${mouseY + 10}px`;
          textarea.style.width = "400px";
          textarea.style.height = `${textarea.scrollHeight}px`;
          textarea.style.overflowY = "hidden";
          textarea.style.zIndex = 1;

          textarea.select();
          document.execCommand("copy");
        });
    });
  });
});
