const errorMessage = document.createElement('p');
errorMessage.classList.add('error-message');

const displayErrorMessage = (message) => {
    clearErrorMessage();
    errorMessage.textContent = message;
    cityInput.parentNode.appendChild(errorMessage);
};

const clearErrorMessage = () => {
    if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
    }
};
