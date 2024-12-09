const themeToggle = document.getElementById('themeToggle');
const returnBtn = document.getElementById('returnBtn');
const dailyForecastContainer = document.querySelector('.daily');
const farmerTipsContainer = document.querySelector('#farmer-tips-content');
const farmerTipsContainer = document.getElementById('farmer-tips-content');
let isDarkTheme = false;
const apiKey = 'c708426913319b328c4ff4719583d1c6';

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
    "01d": "☀️", "01n": "🌕", "02d": "⛅", "02n": "🌥️",
    "03d": "☁️", "03n": "☁️", "04d": "☁️", "04n": "☁️",
    "09d": "🌦️", "09n": "🌦️", "10d": "🌧️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️", "13d": "❄️", "13n": "❄️",
    "50d": "🌫️", "50n": "🌫️"
};

// Обработчики событий
themeToggle.addEventListener('click', toggleTheme);
getWeatherBtn.addEventListener('click', handleWeatherFetch);
returnBtn.addEventListener('click', resetApp);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleWeatherFetch();
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('weatherInfo').classList.add('hidden');
});

// Переключение темы
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? '☀️' : '🌙';
}
// Основная функция получения и отображения погоды
async function fetchWeather(city) {
const fetchWeather = async (city) => {
    if (!city) {
        alert('Введите название города.');
        return;
@@ -50,27 +33,23 @@ async function fetchWeather(city) {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=ru&appid=${apiKey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=ru&appid=${apiKey}`;

        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);
        const weatherResponse = await fetch(weatherUrl);
        const forecastResponse = await fetch(forecastUrl);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error(`Ошибка: ${weatherResponse.statusText || forecastResponse.statusText}`);
            throw new Error(`Ошибка: ${weatherResponse.status}`);
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        displayWeather(weatherData, city);
        displayForecast(forecastData);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error.message);
        alert('Не удалось загрузить данные о погоде. Попробуйте позже.');
        console.error('Ошибка загрузки данных:', error);
    }
}
};

function displayWeather(data, city) {
const displayWeather = (data, city) => {
    const { temp, feels_like: feelsLike } = data.main;
    const condition = data.weather[0].description;
    const icon = data.weather[0].icon;
@@ -81,79 +60,62 @@ function displayWeather(data, city) {
    currentConditionElement.textContent = capitalize(condition);
    locationElement.textContent = city;

    document.querySelector('.input-container').style.display = 'none';
    document.querySelector('.input-container').classList.add('hidden');
    document.getElementById('weatherInfo').classList.remove('hidden');
    returnBtn.classList.remove('hidden');
};

    updateFarmerTips(temp, condition, data.main.humidity, data.main.pressure, data.weather[0].main);
}
function displayForecast(data) {
const displayForecast = (data) => {
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const uniqueDays = {};
    dailyForecastContainer.innerHTML = '';

    data.list.forEach(item => {
    const forecastList = data.list.filter((item) => {
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
        if (!uniqueDays[date.getDay()]) {
            uniqueDays[date.getDay()] = true;
            return true;
        }
        return false;
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

    farmerTipsContainer.innerHTML = `<p class="tip">${tip}</p>`;
}
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function resetApp() {
    document.querySelector('.input-container').style.display = 'flex';
getWeatherBtn.addEventListener('click', () => {
    fetchWeather(cityInput.value.trim());
});
returnBtn.addEventListener('click', () => {
    document.querySelector('.input-container').classList.remove('hidden');
    document.getElementById('weatherInfo').classList.add('hidden');
    returnBtn.classList.add('hidden');
    locationElement.textContent = 'WeatherNow';
    cityInput.value = '';
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
});

function handleWeatherFetch() {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
}
themeToggle.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? '☀️' : '🌙';
});
