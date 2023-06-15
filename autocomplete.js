function enableAutoComplete(textAreaInput, getDataCallback) {
  let activeSuggestionIndex = -1;
  let suggestionsContainer;

  function removeSuggestions() {
    if (suggestionsContainer) {
      suggestionsContainer.remove();
      suggestionsContainer = null;
      activeSuggestionIndex = -1;
    }
  }

  function createSuggestionsContainer() {
    removeSuggestions();
    suggestionsContainer = document.createElement("div");
    suggestionsContainer.classList.add("autocomplete-suggestions");
    textAreaInput.parentNode.style.position = "relative";
    suggestionsContainer.style.top = `${textAreaInput.offsetHeight}px`;
    textAreaInput.parentNode.appendChild(suggestionsContainer);
  }

  textAreaInput.addEventListener("input", async function () {
    const val = this.value;
    if (!val) {
      removeSuggestions();
      return;
    }

    const matches = (await getDataCallback()).filter((str) =>
      str.toLowerCase().includes(val.toLowerCase())
    );

    if (matches.length === 0) {
      removeSuggestions();
      return;
    }

    createSuggestionsContainer();

    matches.forEach((match) => {
      const item = document.createElement("div");
      item.innerText = match;
      item.classList.add("autocomplete-suggestion");

      item.addEventListener("click", function () {
        textAreaInput.value = this.innerText;
        removeSuggestions();
      });

      suggestionsContainer.appendChild(item);
    });
  });

  textAreaInput.addEventListener("keydown", function (e) {
    if (suggestionsContainer && suggestionsContainer.children.length) {
      if (e.key === "ArrowDown") {
        activeSuggestionIndex =
          (activeSuggestionIndex + 1) % suggestionsContainer.children.length;
      } else if (e.key === "ArrowUp") {
        if (activeSuggestionIndex < 0) {
          activeSuggestionIndex = suggestionsContainer.children.length - 1;
        } else {
          activeSuggestionIndex =
            (activeSuggestionIndex - 1 + suggestionsContainer.children.length) %
            suggestionsContainer.children.length;
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeSuggestionIndex >= 0) {
          textAreaInput.value =
            suggestionsContainer.children[activeSuggestionIndex].innerText;
          removeSuggestions();
        }
      }

      if (suggestionsContainer) {
        Array.from(suggestionsContainer.children).forEach((child, i) => {
          child.classList.remove("active");
          if (i === activeSuggestionIndex) {
            child.classList.add("active");
          }
        });
      }
    }
  });

  textAreaInput.addEventListener("blur", removeSuggestions);
}
