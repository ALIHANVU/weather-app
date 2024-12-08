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
const appContainer = document.querySelector('.app-container');
let isDarkTheme = false;

document.addEventListener('DOMContentLoaded', () => {
    themeToggle.addEventListener('click', toggleTheme);
    getWeatherBtn.addEventListener('click', handleWeatherRequest);
    returnBtn.addEventListener('click', handleReturn);
});

const handleWeatherRequest = () => {
    const city = cityInput.value.trim();
    if (city) {
        addPlaceholders();
        fetchWeather(city);
        requestAnimationFrame(() => {
            appContainer.classList.add('expanded');
        });
        showElementsWithFadeIn(['.current-weather', '.daily-forecast', '.farmer-tips']);
        startWeatherUpdate(city, 60000);
    } else {
        alert('Введите название города.');
    }
};

const handleReturn = () => {
    fadeOutElements(['.current-weather', '.daily-forecast', '.farmer-tips'], () => {
        requestAnimationFrame(() => {
            appContainer.classList.remove('expanded');
            resetInterface();
        });
    });
};

const addPlaceholders = () => {
    dailyForecastContainer.innerHTML = '<div class="placeholder"></div>'.repeat(5);
    farmerTipsContainer.innerHTML = '<div class="placeholder"></div>'.repeat(3);
};

// Убедимся, что функция `removePlaceholders` объявлена только один раз
const removePlaceholders = () => {
    dailyForecastContainer.innerHTML = '';
    farmerTipsContainer.innerHTML = '';
};

// Функция для плавного появления элементов
const showElementsWithFadeIn = (selectors) => {
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        element.classList.remove('hidden');
        element.classList.add('fade-in');
        element.style.display = 'block';
    });
};

// Функция для плавного исчезновения элементов
const fadeOutElements = (selectors, callback) => {
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        element.classList.add('fade-out');
    });

    setTimeout(() => {
        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            element.style.display = 'none';
            element.classList.remove('fade-out');
            element.classList.add('hidden');
        });
        callback();
    }, 500);
};

// Функция сброса интерфейса к начальному состоянию
const resetInterface = () => {
    document.querySelector('.input-container').style.display = 'flex';
    returnBtn.classList.add('hidden');
    locationElement.textContent = 'WeatherNow';
    currentTempElement.textContent = '--°C';
    currentFeelsLikeElement.textContent = 'Ощущается как --°C';
    currentConditionElement.textContent = 'Погодные условия';
    dailyForecastContainer.innerHTML = '';
    farmerTipsContainer.innerHTML = '';
    cityInput.value = '';
    stopWeatherUpdate();
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

const toggleTheme = () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    appContainer.classList.toggle('dark-theme', isDarkTheme);
    const themeIcon = themeToggle.querySelector('i');
    themeIcon.classList.toggle('fa-sun', !isDarkTheme);
    themeIcon.classList.toggle('fa-moon', isDarkTheme);
};
