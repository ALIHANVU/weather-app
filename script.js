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
let isDarkTheme = false;

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
        alert('Введите название города.');
        return;
    }

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
        displayWeather(weatherData, city);
        displayForecast(forecastData);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
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

    // Скрытие поля ввода и кнопки "Узнать погоду" после нажатия и появление кнопки возврата
    document.querySelector('.input-container').style.display = 'none';
    locationElement.textContent = city;  // Отображение введенного названия города
    returnBtn.classList.remove('hidden');

    updateFarmerTips(temp, condition, main.humidity, main.pressure, weather[0].main);
};

const displayForecast = (data) => {
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const uniqueDays = {};

    const forecastList = data.list.filter((item) => {
        const date = new Date(item.dt * 1000);
        const dayIndex = date.getDay();
        if (!uniqueDays[dayIndex]) {
            uniqueDays[dayIndex] = true;
            return true;
        }
        return false;
    });

    dailyForecastContainer.innerHTML = '';

    forecastList.forEach((item, index) => {
        const date = new Date(item.dt * 1000);
        const dayIndex = date.getDay();
        const day = index === 0 ? 'Сегодня' : (index === 1 ? 'Завтра' : days[dayIndex]);
        const tempMin = item.main.temp_min;
        const tempMax = item.main.temp_max;
        const condition = item.weather[0].description;
        const icon = item.weather[0].icon;
        const weatherEmoji = weatherEmojiMap[icon] || "❓";

        dailyForecastContainer.innerHTML += `
            <div class="day">
                <p>${day}</p>
                <p>${Math.round(tempMax)}°C / ${Math.round(tempMin)}°C</p>
                <p>${weatherEmoji}</p>
                <p>${condition}</p>
            </div>
        `;
    });
};

// Обновление подсказок для фермеров из JSON
const updateFarmerTips = async (temp, condition, humidity, pressure, weatherMain) => {
    try {
        const response = await fetch('farmer-tips.json');
        const tipsData = await response.json();
        let tip = '';

        if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
            tip = tipsData.rain;
        } else if (weatherMain === 'Clear') {
            if (temp > 30) {
                tip = tipsData.clear_hot;
            } else if (temp < 10) {
                tip = tipsData.clear_cold;
            } else {
                tip = tipsData.clear_mild;
            }
        } else if (weatherMain === 'Clouds') {
            tip = tipsData.clouds;
        } else if (weatherMain === 'Snow') {
            tip = tipsData.snow;
        } else if (weatherMain === 'Thunderstorm') {
            tip = tipsData.thunderstorm;
        } else if (weatherMain === 'Mist' || weatherMain === 'Fog') {
            tip = tipsData.mist_fog;
        } else {
            tip = tipsData.stable;
        }

        if (humidity > 80) {
            tip += ' ' + tipsData.high_humidity;
        }

        if (pressure < 1000) {
            tip += ' ' + tipsData.low_pressure;
        }

        farmerTipsContainer.style.opacity = 0; // Начальная прозрачность
        setTimeout(() => {
            farmerTipsContainer.innerHTML = `<p class="tip">${tip}</p>`;
            farmerTipsContainer.style.opacity = 1; // Плавное появление
        }, 300);
    } catch (error) {
        console.error('Ошибка загрузки подсказок для фермеров:', error);
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
});

// Отладка начальной анимации
document.addEventListener('DOMContentLoaded', () => {
    const logoContainer = document.getElementById('logo-container');
    const appContainer = document.querySelector('.app-container');

    console.log('Старт анимации логотипа');
    logoContainer.addEventListener('animationend', () => {
        console.log('Анимация логотипа завершена');
        logoContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
    });
});

