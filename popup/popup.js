window.addEventListener("load", () => {
  const inputTextArea = document.getElementById("inputTextArea");
  const suggestionTextArea = document.getElementById("suggestionTextArea");
  inputTextArea.addEventListener("input", storePopupState);
  suggestionTextArea.addEventListener("input", storePopupState);

  chrome.storage.local.get(["popupState"], function (x) {
    inputTextArea.value = x?.popupState?.input ?? "";
    suggestionTextArea.value = x?.popupState?.suggestion ?? "";
  });
});

function storePopupState() {
  const inputTextArea = document.getElementById("inputTextArea");
  const suggestionTextArea = document.getElementById("suggestionTextArea");
  chrome.storage.local.set({
    popupState: {
      input: inputTextArea.value,
      suggestion: suggestionTextArea.value,
    },
  });
}
