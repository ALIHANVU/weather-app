// Отображение сообщений об ошибках
const displayErrorMessage = (message) => {
    errorMessage.textContent = message;
    cityInput.parentNode.appendChild(errorMessage);
};

// Очистка сообщений об ошибках
const clearErrorMessage = () => {
    if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
    }
};
