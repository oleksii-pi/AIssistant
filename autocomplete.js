function enableAutoComplete(textAreaInput, getDataAsync, deleteItemAsync) {
  let activeSuggestionIndex = -1;
  let suggestionsContainer;

  textAreaInput.isAutoCompleteActive = false;
  textAreaInput.hideAutoComplete = removeSuggestions;

  function removeSuggestions() {
    textAreaInput.isAutoCompleteActive = false;
    if (suggestionsContainer) {
      suggestionsContainer.remove();
      suggestionsContainer = null;
      activeSuggestionIndex = -1;
    }
  }

  async function createSuggestionsContainer() {
    const inputValue = textAreaInput.value;

    const filteredOptions = (await getDataAsync()).filter((str) =>
      str.toLowerCase().includes(inputValue.toLowerCase())
    );

    removeSuggestions();

    if (filteredOptions.length === 0) {
      return;
    }
    suggestionsContainer = document.createElement("div");
    suggestionsContainer.classList.add("autocomplete-suggestions");
    suggestionsContainer.style.top = `${
      textAreaInput.offsetTop + textAreaInput.offsetHeight
    }px`;
    suggestionsContainer.style.left = `${textAreaInput.offsetLeft}px`;

    textAreaInput.parentNode.appendChild(suggestionsContainer);

    filteredOptions.forEach((option) => {
      const optionElement = document.createElement("div");
      optionElement.innerText = option;
      optionElement.suggestionText = option;
      optionElement.classList.add("autocomplete-suggestion");
      optionElement.classList.add("notranslate");

      const deleteButton = document.createElement("button");
      deleteButton.innerHTML = "&times;";
      deleteButton.classList.add("delete-button");

      deleteButton.addEventListener("mousedown", async function (e) {
        e.stopPropagation();
        const activeSuggestionText = e.target.parentNode.suggestionText;
        await deleteItemAsync(activeSuggestionText);
        removeSuggestions();
        await createSuggestionsContainer();
      });

      optionElement.appendChild(deleteButton);

      suggestionsContainer.appendChild(optionElement);
    });
  }

  textAreaInput.addEventListener("input", async function () {
    await createSuggestionsContainer();
  });

  textAreaInput.addEventListener("keydown", async function (e) {
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
            suggestionsContainer.children[activeSuggestionIndex].suggestionText;
          removeSuggestions();
        }
      }

      textAreaInput.isAutoCompleteActive = activeSuggestionIndex >= 0;

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
