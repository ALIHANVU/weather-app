const API_KEY = 'c708426913319b328c4ff4719583d1c6';
const BASE_URL = 'https://api.openweathermap.org';

// DOM элементы
const elements = {
    citySearch: document.querySelector('#citySearch'),
    searchButton: document.querySelector('#searchButton'),
    weatherResult: document.querySelector('#weatherResult'),
    temperature: document.querySelector('#temperature'),
    cityName: document.querySelector('#cityName'),
    weatherDescription: document.querySelector('#weatherDescription'),
    feelsLike: document.querySelector('#feelsLike'),
    maxTemp: document.querySelector('#maxTemp'),
    minTemp: document.querySelector('#minTemp'),
    humidity: document.querySelector('#humidity'),
    windSpeed: document.querySelector('#windSpeed'),
    visibility: document.querySelector('#visibility'),
    forecastDays: document.querySelector('#forecastDays'),
    tipsContainer: document.querySelector('#tipsContainer')
};

// Иконки погоды
const weatherEmoji = {
    "01d": "☀️", "01n": "🌙",
    "02d": "⛅", "02n": "☁️",
    "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧️", "09n": "🌧️",
    "10d": "🌦️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️",
    "13d": "🌨️", "13n": "🌨️",
    "50d": "🌫️", "50n": "🌫️"
};

// Загрузка советов 
async function loadFarmerTips() {
    try {
        const response = await fetch('farmer-tips.json');
        return await response.json();
    } catch (error) {
        console.error('Ошибка загрузки советов:', error);
        return null;
    }
}

// Форматирование времени
function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// Получение координат города
async function getCoordinates(city) {
    const geoUrl = `${BASE_URL}/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
    const response = await fetch(geoUrl);
    const data = await response.json();
    
    if (!data.length) {
        throw new Error('Город не найден');
    }
    
    return data[0];
}

// Получение данных о погоде
async function fetchWeatherData(city) {
    try {
        const { lat, lon } = await getCoordinates(city);

        const [weather, forecast] = await Promise.all([
            fetch(`${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`),
            fetch(`${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`)
        ]).then(responses => Promise.all(responses.map(res => res.json())));

        return { weather, forecast };
    } catch (error) {
        showError(error.message);
        throw error;
    }
}

// Определение сезона
function getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
}

// Генерация советов
async function generateFarmerTips(weatherData) {
    const tips = await loadFarmerTips();
    if (!tips) return [];

    const result = [];
    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;

    // Температурные советы
    if (temp >= 25) result.push(...tips.temperature.hot.tips);
    else if (temp >= 15) result.push(...tips.temperature.moderate.tips);
    else result.push(...tips.temperature.cold.tips);

    // Советы по влажности
    if (humidity >= 70) result.push(...tips.humidity.high.tips);
    else if (humidity >= 40) result.push(...tips.humidity.normal.tips);
    else result.push(...tips.humidity.low.tips);

    // Советы по ветру
    if (windSpeed >= 10) result.push(...tips.wind.strong.tips);
    else if (windSpeed >= 5) result.push(...tips.wind.moderate.tips);
    else result.push(...tips.wind.light.tips);

    // Сезонные советы
    result.push(...tips.seasons[getCurrentSeason()].tips);

    // Возвращаем уникальные советы
    return [...new Set(result)].slice(0, 5);
}

// Обновление текущей погоды
function updateCurrentWeather(data) {
    const { main, weather, name, visibility, wind } = data;
    
    elements.cityName.textContent = name;
    elements.temperature.textContent = `${Math.round(main.temp)}°`;
    elements.weatherDescription.textContent = weather[0].description.charAt(0).toUpperCase() + 
                                            weather[0].description.slice(1);
    elements.feelsLike.textContent = `${Math.round(main.feels_like)}°`;
    elements.maxTemp.textContent = Math.round(main.temp_max);
    elements.minTemp.textContent = Math.round(main.temp_min);
    elements.humidity.textContent = `${main.humidity}%`;
    elements.windSpeed.textContent = `${wind.speed.toFixed(1)} м/с`;
    elements.visibility.textContent = `${(visibility / 1000).toFixed(1)} км`;
}

// Обновление почасового прогноза
function updateHourlyForecast(forecast) {
    elements.forecastDays.innerHTML = '';
    
    forecast.list.slice(0, 24).forEach((item, index) => {
        const hourlyDiv = document.createElement('div');
        hourlyDiv.className = 'forecast-hour';
        hourlyDiv.style.animationDelay = `${index * 0.1}s`;
        
        hourlyDiv.innerHTML = `
            <div class="forecast-time">${index === 0 ? 'Сейчас' : formatTime(item.dt)}</div>
            <div class="forecast-icon">${weatherEmoji[item.weather[0].icon]}</div>
            <div class="forecast-temp">${Math.round(item.main.temp)}°</div>
        `;
        
        elements.forecastDays.appendChild(hourlyDiv);
    });
}

// Обновление советов
async function updateFarmerTips(weatherData) {
    const tips = await generateFarmerTips(weatherData);
    elements.tipsContainer.innerHTML = '';
    
    tips.forEach((tip, index) => {
        const tipElement = document.createElement('div');
        tipElement.className = 'tip-item';
        tipElement.style.animationDelay = `${index * 0.1}s`;
        
        tipElement.innerHTML = `
            <span class="tip-icon">🌱</span>
            <span class="tip-text">${tip}</span>
        `;
        
        elements.tipsContainer.appendChild(tipElement);
    });
}

// Показ ошибок
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 3000);
}

// Основная функция обновления погоды
async function updateWeather(city) {
    try {
        elements.weatherResult.classList.add('loading');
        const data = await fetchWeatherData(city);
        
        updateCurrentWeather(data.weather);
        updateHourlyForecast(data.forecast);
        await updateFarmerTips(data.weather);
        
        elements.weatherResult.classList.remove('hidden');
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        elements.weatherResult.classList.remove('loading');
    }
}

// Определение местоположения
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `${BASE_URL}/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
                    );
                    const data = await response.json();
                    if (data.length > 0) {
                        updateWeather(data[0].name);
                    }
                } catch (error) {
                    console.error('Ошибка геолокации:', error);
                }
            },
            (error) => console.error('Ошибка:', error)
        );
    }
}

// Обработчики событий
let searchTimeout;

// Поиск по кнопке
elements.searchButton.addEventListener('click', () => {
    const searchValue = elements.citySearch.value.trim();
    if (searchValue) {
        updateWeather(searchValue);
    }
});

// Поиск по Enter
elements.citySearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const searchValue = e.target.value.trim();
        if (searchValue) {
            clearTimeout(searchTimeout);
            updateWeather(searchValue);
        }
    }
});

// Автопоиск при вводе
elements.citySearch.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchValue = e.target.value.trim();
        if (searchValue.length >= 2) {
            updateWeather(searchValue);
        }
    }, 500);
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    getUserLocation();
});