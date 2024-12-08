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
const loadingSpinner = document.getElementById('loadingSpinner');
let isDarkTheme = false;

document.addEventListener('DOMContentLoaded', () => {
    themeToggle.addEventListener('click', toggleTheme);
    getWeatherBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        fetchWeather(city);
        showElementsWithFadeIn([
            '.current-weather', '.daily-forecast', '.farmer-tips'
        ]);
        startWeatherUpdate(city, 60000); // Начало периодического обновления каждые 60 секунд
    });

    returnBtn.addEventListener('click', () => {
        fadeOutElements([
            '.input-container', '#location', '.current-weather', '.daily-forecast', '.farmer-tips'
        ], () => {
            document.querySelector('.input-container').style.display = 'flex';
            document.querySelector('.current-weather').classList.add('hidden');
            document.querySelector('.daily-forecast').classList.add('hidden');
            document.querySelector('.farmer-tips').classList.add('hidden');
            returnBtn.classList.add('hidden');
            locationElement.textContent = 'WeatherNow';
            currentTempElement.textContent = '--°C';
            currentFeelsLikeElement.textContent = 'Ощущается как --°C';
            currentConditionElement.textContent = 'Погодные условия';
            dailyForecastContainer.innerHTML = '';
            farmerTipsContainer.innerHTML = '';
            cityInput.value = '';
            stopWeatherUpdate(); // Остановка периодического обновления
        });
    });
});

// Функция для плавного появления элементов
const showElementsWithFadeIn = (selectors) => {
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        element.classList.remove('hidden');
        element.classList.add('fade-in');
    });
};

// Функция для плавного исчезновения элементов
const fadeOutElements = (selectors, callback) => {
    selectors.forEach(selector => {
        document.querySelector(selector).classList.add('fade-out');
    });

    setTimeout(() => {
        selectors.forEach(selector => {
            document.querySelector(selector).classList.remove('fade-out');
        });
        callback();
    }, 500); // Длительность анимации 0.5s
};

// Функция для периодического обновления данных о погоде
let weatherUpdateInterval;

const startWeatherUpdate = (city, interval) => {
    weatherUpdateInterval = setInterval(() => {
        fetchWeather(city);
    }, interval);
};

const stopWeatherUpdate = () => {
    clearInterval(weatherUpdateInterval);
};
