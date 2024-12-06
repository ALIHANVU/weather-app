const cityInput = document.getElementById('cityInput');
const getWeatherBtn = document.getElementById('getWeatherBtn');
const locationElement = document.getElementById('location');
const currentTempElement = document.getElementById('current-temp');
const currentConditionElement = document.getElementById('current-condition');
const weatherInfo = document.getElementById('weather-info');
const farmerTips = document.getElementById('farmer-tips');
const themeToggle = document.getElementById('themeToggle');
const forecastContainer = document.querySelector('.forecast');
const hourlyForecastContainer = document.querySelector('.hourly');
const dailyForecastContainer = document.querySelector('.daily');
let isDarkTheme = false;

const apiKey = 'c708426913319b328c4ff4719583d1c6'; // Замените на свой API-ключ от OpenWeatherMap

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
        displayWeather(weatherData);
        displayForecast(forecastData);
    } catch (error) {
        weatherInfo.innerHTML = `<p>Ошибка загрузки данных: ${error.message}</p>`;
        forecastContainer.innerHTML = '';
    }
};

const displayWeather = (data) => {
    const { main, weather, name } = data;
    const temp = main.temp;
    const condition = weather[0].description;
    const icon = weather[0].icon;

    const weatherEmoji = weatherEmojiMap[icon] || "❓";

    locationElement.textContent = name;
    currentTempElement.textContent = `${Math.round(temp)}°C`;
    currentConditionElement.textContent = condition.charAt(0).toUpperCase() + condition.slice(1);

    weatherInfo.style.opacity = 0;
    setTimeout(() => {
        weatherInfo.innerHTML = `
            <h2>Температура: ${temp}°C ${weatherEmoji}</h2>
            <p>Погодные условия: ${condition}</p>
        `;
        weatherInfo.style.opacity = 1;
    }, 300);

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

    forecastContainer.innerHTML = '';
    hourlyForecastContainer.innerHTML = '';
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

        const hourlyItem = `
            <div class="hour">
                <p>${date.getHours()}:00</p>
                <p>${Math.round(tempMax)}°C</p>
                <p>${weatherEmoji}</p>
            </div>
        `;

        const dailyItem = `
            <div class="day">
                <p>${day}</p>
                <p>${Math.round(tempMax)}°C / ${Math.round(tempMin)}°C</p>
                <p>${weatherEmoji}</p>
                <p>${condition}</p>
            </div>
        `;

        hourlyForecastContainer.innerHTML += hourlyItem;
        dailyForecastContainer.innerHTML += dailyItem;
    });
};

const updateFarmerTips = (temp, condition, humidity, pressure, weatherMain) => {
    let tip = '';

    if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
        tip = `Дождливо (${temp}°C). Проверьте состояние полей и убедитесь, что дренаж работает правильно.`;
    } else if (weatherMain === 'Clear') {
        if (temp > 30) {
            tip = `Солнечно и жарко (${temp}°C). Обеспечьте достаточный полив растений, чтобы избежать пересыхания.`;
        } else if (temp < 10) {
            tip = `Солнечно, но холодно (${temp}°C). Защитите молодые растения от возможных заморозков.`;
        } else {
            tip = `Солнечно (${temp}°C). Отличное время для всех видов полевых работ.`;
        }
    } else if (weatherMain === 'Clouds') {
        tip = `Облачно (${temp}°C). Отличное время для посадки и пересадки растений.`;
    } else if (weatherMain === 'Snow') {
        tip = `Снегопад (${temp}°C). Проверьте теплицы и укрытия для растений.`;
    } else if (weatherMain === 'Thunderstorm') {
        tip = `Гроза (${temp}°C). Опасно проводить работы на открытых полях.`;
    } else if (weatherMain === 'Mist' || weatherMain === 'Fog') {
        tip = `Туман (${temp}°C). Следите за влажностью почвы и воздуха.`;
    } else {
        tip = `Погодные условия стабильные (${temp}°C). Работы на полях могут продолжаться в обычном режиме.`;
    }

    if (humidity > 80) {
        tip += ' Высокая влажность может способствовать развитию грибковых заболеваний.';
    }

    if (pressure < 1000) {
        tip += ' Низкое давление. Возможны затруднения в опылении.';
    }

    farmerTips.style.opacity = 0;
    setTimeout(() => {
        farmerTips.innerHTML = `<p>${tip}</p>`;
        farmerTips.style.opacity = 1;
    }, 300);
};

themeToggle.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? '☀️' : '🌙';
});

getWeatherBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    fetchWeather(city);
});
