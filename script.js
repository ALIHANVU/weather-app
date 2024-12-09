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
    "01d": "☀️", "01n": "🌕", 
    "02d": "⛅", "02n": "🌥️",
    "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌦️", "09n": "🌦️",
    "10d": "🌧️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️",
    "13d": "❄️", "13n": "❄️",
    "50d": "🌫️", "50n": "🌫️"
};

// Обработчики событий
themeToggle.addEventListener('click', toggleTheme);
getWeatherBtn.addEventListener('click', handleWeatherFetch);
returnBtn.addEventListener('click', resetApp);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleWeatherFetch();
});

// Переключение темы
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? '☀️' : '🌙';
}

// Основная функция получения и отображения погоды
async function fetchWeather(city) {
    if (!city) {
        alert('Введите название города.');
        return;
    }

    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=ru&appid=${apiKey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=ru&appid=${apiKey}`;

        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error(`Ошибка: ${weatherResponse.statusText || forecastResponse.statusText}`);
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();

        displayWeather(weatherData, city);
        displayForecast(forecastData);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error.message);
        alert('Не удалось загрузить данные о погоде. Попробуйте позже.');
    }
}

function displayWeather(data, city) {
    const { temp, feels_like: feelsLike } = data.main;
    const condition = data.weather[0].description;
    const icon = data.weather[0].icon;
    const weatherEmoji = weatherEmojiMap[icon] || "❓";

    currentTempElement.textContent = `${Math.round(temp)}°C ${weatherEmoji}`;
    currentFeelsLikeElement.textContent = `Ощущается как ${Math.round(feelsLike)}°C`;
    currentConditionElement.textContent = capitalize(condition);
    locationElement.textContent = city;

    document.querySelector('.input-container').style.display = 'none';
    returnBtn.classList.remove('hidden');

    updateFarmerTips(temp, condition, data.main.humidity, data.main.pressure, data.weather[0].main);
}

function displayForecast(data) {
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const uniqueDays = {};
    dailyForecastContainer.innerHTML = '';

    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayIndex = date.getDay();

        if (!uniqueDays[dayIndex]) {
            uniqueDays[dayIndex] = true;
            const day = days[dayIndex];
            const { temp_min: tempMin, temp_max: tempMax } = item.main;
            const condition = item.weather[0].description;
            const icon = item.weather[0].icon;
            const weatherEmoji = weatherEmojiMap[icon] || "❓";

            dailyForecastContainer.innerHTML += `
                <div class="day">
                    <p>${day}</p>
                    <p>${Math.round(tempMax)}°C / ${Math.round(tempMin)}°C</p>
                    <p>${weatherEmoji}</p>
                    <p>${capitalize(condition)}</p>
                </div>
            `;
        }
    });
}

function updateFarmerTips(temp, condition, humidity, pressure, weatherMain) {
    let tip = '';

    if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
        tip = `Дождливо (${temp}°C). Проверьте состояние полей.`;
    } else if (weatherMain === 'Clear') {
        tip = temp > 30
            ? `Солнечно и жарко (${temp}°C). Поливайте растения.`
            : `Солнечно (${temp}°C). Отличное время для работы.`;
    } else if (weatherMain === 'Snow') {
        tip = `Снегопад (${temp}°C). Проверьте укрытия.`;
    } else {
        tip = `Условия стабильные (${temp}°C). Работы продолжаются.`;
    }

    if (humidity > 80) tip += ' Высокая влажность: риск грибков.';
    if (pressure < 1000) tip += ' Низкое давление: возможны проблемы с опылением.';

    farmerTipsContainer.innerHTML = `<p class="tip">${tip}</p>`;
}

function resetApp() {
    document.querySelector('.input-container').style.display = 'flex';
    returnBtn.classList.add('hidden');
    locationElement.textContent = 'WeatherNow';
    currentTempElement.textContent = '--°C';
    currentFeelsLikeElement.textContent = 'Ощущается как --°C';
    currentConditionElement.textContent = 'Погодные условия';
    dailyForecastContainer.innerHTML = '';
    farmerTipsContainer.innerHTML = '';
    cityInput.value = '';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function handleWeatherFetch() {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
}
