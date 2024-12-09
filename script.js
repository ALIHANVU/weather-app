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
const appContainer = document.querySelector('.app-container');
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
        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error(`Ошибка: ${weatherResponse.status} ${weatherResponse.statusText}`);
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        displayWeather(weatherData, city);
        displayForecast(forecastData);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        alert('Ошибка загрузки данных. Пожалуйста, попробуйте еще раз.');
    }
};

const displayWeather = (data, city) => {
    const { main, weather } = data;
    const temp = main.temp;
    const feelsLike = main.feels_like;
    const condition = weather[0].description;
    const icon = weather[0].icon;
    const weatherEmoji = weatherEmojiMap[icon] || "❓";

    updateElement(currentTempElement, `${Math.round(temp)}°C ${weatherEmoji}`);
    updateElement(currentFeelsLikeElement, `Ощущается как ${Math.round(feelsLike)}°C`);
    updateElement(currentConditionElement, capitalizeFirstLetter(condition));

    toggleDisplay('.input-container', false);
    updateElement(locationElement, city);
    toggleVisibility(returnBtn, true);

    // Показать скрытые элементы с анимацией
    document.querySelector('.current-weather').classList.remove('hidden');
    document.querySelector('.current-weather').classList.add('visible');
    document.querySelector('.farmer-tips').classList.remove('hidden');
    document.querySelector('.farmer-tips').classList.add('visible');
    document.querySelector('.daily-forecast').classList.remove('hidden');
    document.querySelector('.daily-forecast').classList.add('visible');
    document.querySelector('footer').classList.remove('hidden');
    document.querySelector('footer').classList.add('visible');

    updateFarmerTips(temp, condition, main.humidity, main.pressure, weather[0].main);
};
const displayForecast = (data) => {
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const forecastPerDay = {};

    // Заполняем контейнер значением по умолчанию
    dailyForecastContainer.innerHTML = '';

const displayForecast = (data) => {
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const forecastList = {};

    dailyForecastContainer.innerHTML = '';

    // Проходим по всему списку прогнозов и сохраняем прогноз для каждого дня недели
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayIndex = date.getDay();
        const day = days[dayIndex];
        const tempMin = item.main.temp_min;
        const tempMax = item.main.temp_max;
        const condition = item.weather[0].description;
        const icon = item.weather[0].icon;
        const weatherEmoji = weatherEmojiMap[icon] || "❓";

        forecastList[dayIndex] = `
            <div class="day">
                <p>${day}</p>
                <p>${Math.round(tempMax)}°C / ${Math.round(tempMin)}°C</p>
                <p>${weatherEmoji}</p>
                <p>${capitalizeFirstLetter(condition)}</p>
            </div>
        `;
    });

    const today = new Date().getDay(); // Получаем текущий день недели

    // Отображаем прогнозы, начиная с текущего дня и далее
    for (let i = 0; i < 7; i++) {
        const dayIndex = (today + i) % 7;
        dailyForecastContainer.innerHTML += forecastList[dayIndex] || `
            <div class="day">
                <p>${days[dayIndex]}</p>
                <p>Нет данных</p>
            </div>
        `;
    }
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

    updateElement(farmerTipsContainer, `<p class="tip">${tip}</p>`);
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

returnBtn.addEventListener('click', () => {
    toggleDisplay('.input-container', true);
    toggleVisibility(returnBtn, false);
    updateElement(locationElement, 'WeatherNow');
    updateElement(currentTempElement, '--°C');
    updateElement(currentFeelsLikeElement, 'Ощущается как --°C');
    updateElement(currentConditionElement, 'Погодные условия');
    dailyForecastContainer.innerHTML = '';
    farmerTipsContainer.innerHTML = '';
    cityInput.value = '';

    // Скрыть элементы обратно
    document.querySelector('.current-weather').classList.remove('visible');
    document.querySelector('.current-weather').classList.add('hidden');
    document.querySelector('.farmer-tips').classList.remove('visible');
    document.querySelector('.farmer-tips').classList.add('hidden');
    document.querySelector('.daily-forecast').classList.remove('visible');
    document.querySelector('.daily-forecast').classList.add('hidden');
    document.querySelector('footer').classList.remove('visible');
    document.querySelector('footer').classList.add('hidden');

    // Плавно изменить высоту контейнера
    appContainer.style.maxHeight = '200px';
});

const updateElement = (element, content) => {
    element.style.opacity = 0;
    setTimeout(() => {
        element.innerHTML = content;
        element.style.opacity = 1;
    }, 300);
};

const toggleDisplay = (selector, show) => {
    const element = document.querySelector(selector);
    element.style.display = show ? 'flex' : 'none';
};

const toggleVisibility = (element, visible) => {
    element.classList.toggle('hidden', !visible);
    element.classList.toggle('visible', visible);

    // Плавно изменить высоту контейнера
    if (visible) {
        appContainer.style.maxHeight = '1000px'; // Предполагаемая максимальная высота
    } else {
        appContainer.style.maxHeight = '200px';
    }
};

const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};
