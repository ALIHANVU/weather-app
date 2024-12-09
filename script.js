const cityInput = document.getElementById('cityInput');
const getWeatherBtn = document.getElementById('getWeatherBtn');
const locationElement = document.getElementById('location');
const currentTempElement = document.getElementById('current-temp');
const currentFeelsLikeElement = document.getElementById('current-feels-like');
const currentConditionElement = document.getElementById('current-condition');
const themeToggle = document.getElementById('themeToggle');
const returnBtn = document.getElementById('returnBtn');
const dailyForecastContainer = document.querySelector('.daily');
const farmerTipsContainer = document.getElementById('farmer-tips-content');
let isDarkTheme = false;

const apiKey = 'c708426913319b328c4ff4719583d1c6';
const weatherEmojiMap = {
    "01d": "☀️", "01n": "🌕", "02d": "⛅", "02n": "🌥️",
    "03d": "☁️", "03n": "☁️", "04d": "☁️", "04n": "☁️",
    "09d": "🌦️", "09n": "🌦️", "10d": "🌧️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️", "13d": "❄️", "13n": "❄️",
    "50d": "🌫️", "50n": "🌫️"
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('weatherInfo').classList.add('hidden');
});

const fetchWeather = async (city) => {
    if (!city) {
        alert('Введите название города.');
        return;
    }

    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=ru&appid=${apiKey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=ru&appid=${apiKey}`;

        const weatherResponse = await fetch(weatherUrl);
        const forecastResponse = await fetch(forecastUrl);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error(`Ошибка: ${weatherResponse.status}`);
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        displayWeather(weatherData, city);
        displayForecast(forecastData);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
};

const displayWeather = (data, city) => {
    const { temp, feels_like: feelsLike } = data.main;
    const condition = data.weather[0].description;
    const icon = data.weather[0].icon;
    const weatherEmoji = weatherEmojiMap[icon] || "❓";

    currentTempElement.textContent = `${Math.round(temp)}°C ${weatherEmoji}`;
    currentFeelsLikeElement.textContent = `Ощущается как ${Math.round(feelsLike)}°C`;
    currentConditionElement.textContent = capitalize(condition);
    locationElement.textContent = city;

    document.querySelector('.input-container').classList.add('hidden');
    document.getElementById('weatherInfo').classList.remove('hidden');
    returnBtn.classList.remove('hidden');
};

const displayForecast = (data) => {
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const uniqueDays = {};

    const forecastList = data.list.filter((item) => {
        const date = new Date(item.dt * 1000);
        if (!uniqueDays[date.getDay()]) {
            uniqueDays[date.getDay()] = true;
            return true;
        }
        return false;
    });

    dailyForecastContainer.innerHTML = '';
    forecastList.forEach((item) => {
        const date = new Date(item.dt * 1000);
        const day = days[date.getDay()];
        const tempMax = item.main.temp_max;
        const tempMin = item.main.temp_min;
        const icon = item.weather[0].icon;
        const weatherEmoji = weatherEmojiMap[icon] || "❓";

        dailyForecastContainer.innerHTML += `
            <div class="day">
                <p>${day}</p>
                <p>${Math.round(tempMax)}°C / ${Math.round(tempMin)}°C</p>
                <p>${weatherEmoji}</p>
            </div>
        `;
    });
};

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

getWeatherBtn.addEventListener('click', () => {
    fetchWeather(cityInput.value.trim());
});

returnBtn.addEventListener('click', () => {
    document.querySelector('.input-container').classList.remove('hidden');
    document.getElementById('weatherInfo').classList.add('hidden');
    returnBtn.classList.add('hidden');
    cityInput.value = '';
    currentTempElement.textContent = '--°C';
    currentFeelsLikeElement.textContent = 'Ощущается как --°C';
    currentConditionElement.textContent = 'Погодные условия';
    dailyForecastContainer.innerHTML = '';
});

themeToggle.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? '☀️' : '🌙';
});
