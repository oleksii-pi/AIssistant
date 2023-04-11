const buttonId = "writeItBetterButton";
// only show button when element in focus
// destroy button after leaving element

document.addEventListener("click", function (event) {
  const input = event.target;
  const inputTag = input.tagName.toLowerCase();
  if (inputTag === "input") {
    let button = input.parentElement.querySelector(`button#${buttonId}`);
    if (!button) {
      button = document.createElement("button");
      button.innerText = "Write it better";
      button.setAttribute("id", buttonId);
      input.parentElement.insertBefore(button, input.nextSibling);

      button.addEventListener("click", function () {
        const selectedText = input.value.substring(
          input.selectionStart,
          input.selectionEnd
        );
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
              const betterText = data.choices[0].text;
              const beforeText = input.value.substring(0, input.selectionStart);
              const afterText = input.value.substring(input.selectionEnd);
              input.value = beforeText + betterText + afterText;
            });
        });
      });
    }
  }
});
