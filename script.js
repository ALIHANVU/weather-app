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
    "01d": "☀️", 
    "01n": "🌕", 
    "02d": "⛅", 
    "02n": "🌥️", 
    "03d": "☁️", 
    "03n": "☁️", 
    "04d": "☁️", 
    "04n": "☁️", 
    "09d": "🌦️", 
    "09n": "🌦️", 
    "10d": "🌧️", 
    "10n": "🌧️", 
    "11d": "⛈️", 
    "11n": "⛈️", 
    "13d": "❄️", 
    "13n": "❄️", 
    "50d": "🌫️", 
    "50n": "🌫️"
};

const fetchWeather = async (city) => {
    if (!city) {
        displayErrorMessage('Пожалуйста, введите название города.');
        return;
    }

    spinner.classList.remove('hidden'); // Показать спиннер

    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=ru&appid=${apiKey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=ru&appid=${apiKey}`;
        const weatherResponse = await fetch(weatherUrl);
        const forecastResponse = await fetch(forecastUrl);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error(`Ошибка: ${weatherResponse.status} ${weatherResponse.statusText}`);
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        clearErrorMessage();
        displayWeather(weatherData, city);
        displayForecast(forecastData);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        displayErrorMessage('Не удалось загрузить данные. Пожалуйста, проверьте название города и попробуйте снова.');
        if (error.message.includes('Failed to fetch')) {
            displayErrorMessage('Ошибка сети. Проверьте соединение с интернетом и попробуйте снова.');
        }
    } finally {
        spinner.classList.add('hidden'); // Скрыть спиннер
    }
};

const displayWeather = (data, city) => {
    const { main, weather } = data;
    const temp = main.temp;
    const feelsLike = main.feels_like;
    const condition = weather[0].description;
    const icon = weather[0].icon;
    const weatherEmoji = weatherEmojiMap[icon] || "❓";

    currentTempElement.textContent = `${Math.round(temp)}°C ${weatherEmoji}`;
    currentFeelsLikeElement.textContent = `Ощущается как ${Math.round(feelsLike)}°C`;
    currentConditionElement.textContent = condition.charAt(0).toUpperCase() + condition.slice(1);
        if (temp > 30) {
            tip = farmerTips.clear_hot;
        } else if (temp < 10) {
            tip = farmerTips.clear_cold;
        } else {
            tip = farmerTips.clear_mild;
        }
    } else if (weatherMain === 'Clouds') {
        tip = farmerTips.clouds;
    } else if (weatherMain === 'Snow') {
        tip = farmerTips.snow;
    } else if (weatherMain === 'Thunderstorm') {
        tip = farmerTips.thunderstorm;
    } else if (weatherMain === 'Mist' || weatherMain === 'Fog') {
        tip = farmerTips.mist_fog;
    } else {
        tip = farmerTips.stable;
    }

    if (humidity > 80) {
        tip += ' ' + farmerTips.high_humidity;
    }

    if (pressure < 1000) {
        tip += ' ' + farmerTips.low_pressure;
    }

    farmerTipsContainer.style.opacity = 0; // Начальная прозрачность
    setTimeout(() => {
        farmerTipsContainer.innerHTML = `<p class="tip">${tip}</p>`;
        farmerTipsContainer.style.opacity = 1; // Плавное появление
    }, 300);
};

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

// Переключение темной и светлой темы
themeToggle.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? '☀️' : '🌙';
});

// Обработчик для кнопки "Узнать погоду"
getWeatherBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    fetchWeather(city);
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
    clearErrorMessage();
});
// Инициализация страницы и загрузка кэшированных подсказок
document.addEventListener('DOMContentLoaded', async () => {
    const logoContainer = document.getElementById('logo-container');
    const appContainer = document.querySelector('.app-container');

    try {
        const response = await fetch('farmer-tips.json');
        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
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









