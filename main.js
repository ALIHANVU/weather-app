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
            '.current-weather', '.daily-forecast', '.farmer-tips'
        ], () => {
            resetInterface();
        });
    });
});

// Функция для плавного появления элементов
const showElementsWithFadeIn = (selectors) => {
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        element.style.display = 'block'; // Убедитесь, что элемент отображается
        requestAnimationFrame(() => {
            element.classList.remove('hidden');
            element.classList.add('fade-in');
        });
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
            element.classList.add('hidden'); // Добавляем скрытый класс обратно
        });
        callback();
    }, 500); // Длительность анимации 0.5s
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
    stopWeatherUpdate(); // Остановка периодического обновления
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
