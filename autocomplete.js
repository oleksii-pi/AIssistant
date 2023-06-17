function enableAutoComplete(textAreaInput, getDataAsync, deleteItemAsync) {
  let activeSuggestionIndex = -1;
  let suggestionsContainer;

  textAreaInput.isAutoCompleteVisible = false;

  function removeSuggestions() {
    textAreaInput.isAutoCompleteVisible = false;
    if (suggestionsContainer) {
      suggestionsContainer.remove();
      suggestionsContainer = null;
      activeSuggestionIndex = -1;
    }
  }

  async function createSuggestionsContainer() {
    const inputValue = textAreaInput.value;

    const matches = (await getDataAsync()).filter((str) =>
      str.toLowerCase().includes(inputValue.toLowerCase())
    );

    removeSuggestions();

    textAreaInput.isAutoCompleteVisible = matches.length !== 0;

    if (matches.length === 0) {
      return;
    }
    suggestionsContainer = document.createElement("div");
    suggestionsContainer.classList.add("autocomplete-suggestions");
    suggestionsContainer.style.top = `${
      textAreaInput.offsetTop + textAreaInput.offsetHeight
    }px`;
    suggestionsContainer.style.left = `${textAreaInput.offsetLeft}px`;

    textAreaInput.parentNode.appendChild(suggestionsContainer);

    matches.forEach((match) => {
      const item = document.createElement("div");
      item.innerText = match;
      item.suggestionText = match;
      item.classList.add("autocomplete-suggestion");

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

      item.appendChild(deleteButton);

      suggestionsContainer.appendChild(item);
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
