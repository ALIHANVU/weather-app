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
const spinner = document.getElementById('spinner'); // Элемент спиннера
let isDarkTheme = false;
let farmerTips = {}; // Переменная для хранения кэшированных подсказок

// Обработчик для кнопки "Узнать погоду"
getWeatherBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    fetchWeather(city); // функция из weather.js
});

// Обработчик для кнопки возврата
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
    clearErrorMessage(); // функция из utils.js
});

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
        displayErrorMessage('Не удалось загрузить подсказки для фермеров.'); // функция из utils.js
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
}); // Здесь закрывающая скобка для document.addEventListener

// Переключение темной и светлой темы
themeToggle.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? '☀' : '🌙';
});


