const cityInput = document.getElementById('cityInput');
const getWeatherBtn = document.getElementById('getWeatherBtn');
const locationElement = document.getElementById('location');
const currentTempElement = document.getElementById('current-temp');
const currentFeelsLikeElement = document.getElementById('current-feels-like');
const currentConditionElement = document.getElementById('current-condition');
const themeToggle = document.getElementById('themeToggle');
const returnBtn = document.getElementById('returnBtn');
const dailyForecastContainer = document.querySelector('.daily');
const farmerTipsContainer = document.querySelector('#farmer-tips-content');
const errorMessage = document.createElement('p'); // Создаем элемент для сообщений об ошибках
errorMessage.classList.add('error-message');
const spinner = document.getElementById('spinner'); // Элемент спиннера
let isDarkTheme = false;
let farmerTips = {}; // Переменная для хранения кэшированных подсказок

const apiKey = 'c708426913319b328c4ff4719583d1c6';

const weatherEmojiMap = {
    "01d": "☀", 
    "01n": "🌕", 
    "02d": "⛅", 
    "02n": "🌥", 
    "03d": "☁", 
    "03n": "☁", 
    "04d": "☁", 
    "04n": "☁", 
    "09d": "🌦", 
    "09n": "🌦", 
    "10d": "🌧", 
    "10n": "🌧", 
    "11d": "⛈", 
    "11n": "⛈", 
    "13d": "❄", 
    "13n": "❄", 
    "50d": "🌫", 
    "50n": "🌫"
};

// Функции для переключения темы
themeToggle.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? '☀' : '🌙';
});

// Обработчики событий
getWeatherBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    fetchWeather(city);
});

returnBtn.addEventListener('click', () => {
    document.querySelector('.input-container').style.display = 'flex';
    returnBtn.classList.add('hidden');
    locationElement.textContent = 'WeatherNow';
    currentTempElement.textContent = '--°C';
    currentFeelsLikeElement.textContent = 'Ощущается как --°C';
    currentConditionElement.textContent = 'Погодные условия';
    dailyForecastContainer.innerHTML = '';
    farmerTipsContainer.innerHTML = '';
    cityInput.value = '';
    clearErrorMessage();
});

// Очистка сообщений об ошибках
const clearErrorMessage = () => {
    if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
    }
};

// Инициализация страницы и загрузка кэшированных подсказок
document.addEventListener('DOMContentLoaded', async () => {
    const logoContainer = document.getElementById('logo-container');
    const appContainer = document.querySelector('.app-container');

    try {
        const response = await fetch('farmer-tips.json');
        if (!response.ok) {
            throw new Error(Ошибка загрузки: ${response.status} ${response.statusText});
        }
        farmerTips = await response.json(); // Сохраняем подсказки в переменной для кэширования
        console.log('Подсказки для фермеров загружены', farmerTips);
    } catch (error) {
        console.error('Ошибка загрузки подсказок для фермеров:', error);
        displayErrorMessage('Не удалось загрузить подсказки для фермеров.');
    }

    console.log('Старт анимации логотипа');
    logoContainer.addEventListener('animationend', () => {
        console.log('Анимация логотипа завершена');
        setTimeout(() => {
            logoContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            appContainer.style.opacity = 1; // Обеспечение видимости контейнера
        }, 1000); // Задержка в 1 секунду перед скрытием логотипа
    });
});



