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
    tipsContainer: document.querySelector('#tipsContainer'),
    weeklyForecastContainer: document.querySelector('#weeklyForecastContainer')
};

// Иконки погоды (используются для почасового и недельного прогнозов)
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

// Функция debounce для оптимизации ввода
function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Получение геолокации
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Геолокация не поддерживается'));
            return;
        }
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `${BASE_URL}/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
                    );
                    const data = await response.json();
                    if (data.length > 0) {
                        resolve(data[0].name);
                    } else {
                        reject(new Error('Не удалось определить город'));
                    }
                } catch (error) {
                    reject(error);
                }
            },
            (error) => {
                let errorMessage;
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Доступ к геолокации запрещён";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Информация о местоположении недоступна";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Превышено время ожидания";
                        break;
                    default:
                        errorMessage = "Произошла неизвестная ошибка";
                }
                reject(new Error(errorMessage));
            },
            options
        );
    });
}

// Форматирование времени
function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// Определение дня недели
function getDayOfWeek(timestamp) {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[new Date(timestamp * 1000).getDay()];
}

// Определение сезона
function getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
}

// Загрузка JSON с советами с кэшированием (1 час)
async function loadFarmerTips() {
    const cacheKey = 'farmerTipsCache';
    const cacheExpiry = 3600000; // 1 час
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < cacheExpiry) {
            return parsed.data;
        }
    }
    try {
        const response = await fetch('https://alihanvu.github.io/weather-app/farmer-tips.json?' + new Date().getTime(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        return data;
    } catch (error) {
        try {
            const alternativeResponse = await fetch('./farmer-tips.json');
            if (alternativeResponse.ok) {
                const data = await alternativeResponse.json();
                localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
                return data;
            }
        } catch (altError) {
            console.error('Ошибка загрузки советов:', altError);
        }
        return null;
    }
}

// Получение данных о погоде
async function fetchWeatherData(city) {
    try {
        const geoUrl = `${BASE_URL}/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        if (!geoData.length) {
            throw new Error('Город не найден');
        }
        const { lat, lon } = geoData[0];
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

// Обновление текущей погоды
function updateCurrentWeather(data) {
    const { main, weather, name, visibility, wind } = data;
    elements.cityName.textContent = name;
    elements.temperature.textContent = `${Math.round(main.temp)}°`;
    elements.weatherDescription.textContent = weather[0].description.charAt(0).toUpperCase() + weather[0].description.slice(1);
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

// Обновление недельного прогноза
function updateWeeklyForecast(forecast) {
    elements.weeklyForecastContainer.innerHTML = '';
    const dailyForecasts = {};
    forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0];
        if (!dailyForecasts[day]) {
            const fullDayName = getDayOfWeek(item.dt);
            dailyForecasts[day] = { temps: [], weather: [], day: fullDayName };
        }
        dailyForecasts[day].temps.push(item.main.temp);
        dailyForecasts[day].weather.push(item.weather[0].icon);
    });
    const uniqueDays = Object.values(dailyForecasts).slice(0, 7);
    uniqueDays.forEach((dayData, index) => {
        const avgTemp = Math.round(dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length);
        const mostFrequentIcon = dayData.weather.reduce(
            (a, b) => dayData.weather.filter(v => v === a).length >= dayData.weather.filter(v => v === b).length ? a : b
        );
        const dayElement = document.createElement('div');
        dayElement.className = 'weekly-day';
        dayElement.style.animationDelay = `${index * 0.1}s`;
        dayElement.innerHTML = `
            <div class="weekly-day-name">${dayData.day}</div>
            <div class="weekly-day-icon">${weatherEmoji[mostFrequentIcon]}</div>
            <div class="weekly-day-temp">${avgTemp}°</div>
        `;
        elements.weeklyForecastContainer.appendChild(dayElement);
    });
}

// Генерация советов с использованием обновлённого JSON с SF Symbols
async function generateFarmerTips(weatherData) {
    const tipsData = await loadFarmerTips();
    if (!tipsData) return [];
    const result = { temperature: [], humidity: [], seasons: [] };
    const temp = weatherData.main.temp;
    const humidityValue = weatherData.main.humidity;
    // Советы по температуре
    if (temp >= tipsData.tips.temperature.hot.min) {
        result.temperature.push(...tipsData.tips.temperature.hot.tips);
    } else if (temp >= tipsData.tips.temperature.moderate.min && temp <= tipsData.tips.temperature.moderate.max) {
        result.temperature.push(...tipsData.tips.temperature.moderate.tips);
    } else {
        result.temperature.push(...tipsData.tips.temperature.cold.tips);
    }
    // Советы по влажности
    if (humidityValue >= tipsData.tips.humidity.high.min) {
        result.humidity.push(...tipsData.tips.humidity.high.tips);
    } else if (humidityValue >= tipsData.tips.humidity.normal.min && humidityValue <= tipsData.tips.humidity.normal.max) {
        result.humidity.push(...tipsData.tips.humidity.normal.tips);
    } else {
        result.humidity.push(...tipsData.tips.humidity.low.tips);
    }
    // Советы по сезону
    const currentSeason = getCurrentSeason();
    result.seasons.push(...tipsData.tips.seasons[currentSeason].tips);
    const allTips = [...result.temperature, ...result.humidity, ...result.seasons];
    // Убираем дубли по тексту
    const uniqueTips = [];
    allTips.forEach(tip => {
        if (!uniqueTips.find(t => t.text === tip.text)) {
            uniqueTips.push(tip);
        }
    });
    return uniqueTips;
}

// Отображение советов с фильтром по категории и функцией "Показать еще"
async function updateFarmerTips(weatherData, filterCategory = 'all') {
    let tipsArray = await generateFarmerTips(weatherData);
    if (filterCategory !== 'all') {
        const mapping = {
            temperature: ["thermometer.sun", "sun.max.fill", "drop.fill", "flame.fill", "snowflake"],
            humidity: ["drop.fill", "wind", "leaf.fill", "water"],
            seasons: ["leaf.arrow.circlepath", "sunrise.fill", "snowflake", "cloud.drizzle.fill"]
        };
        tipsArray = tipsArray.filter(tip => mapping[filterCategory].includes(tip.icon));
    }
    const container = document.getElementById("tipsContainer");
    container.innerHTML = '';
    const initialCount = 3;
    // Функция для создания элемента совета
    function createTipElement(tip, index) {
        const tipElement = document.createElement('div');
        tipElement.className = 'tip-item';
        tipElement.style.animationDelay = `${index * 0.1}s`;
        tipElement.innerHTML = `
            <span class="tip-icon" aria-hidden="true">${tip.icon}</span>
            <span class="tip-text">${tip.text}</span>
        `;
        return tipElement;
    }
    // Отображаем первые initialCount советов
    tipsArray.slice(0, initialCount).forEach((tip, index) => {
        container.appendChild(createTipElement(tip, index));
    });
    // Если советов больше, добавляем кнопку "Показать еще"
    if (tipsArray.length > initialCount) {
        const showMoreBtn = document.createElement('button');
        showMoreBtn.className = 'show-more-btn';
        showMoreBtn.textContent = 'Показать еще';
        showMoreBtn.addEventListener('click', () => {
            tipsArray.slice(initialCount).forEach((tip, index) => {
                container.appendChild(createTipElement(tip, index + initialCount));
            });
            showMoreBtn.remove();
        });
        container.appendChild(showMoreBtn);
    }
}

// Показ ошибок с ARIA-атрибутами
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// Показ и скрытие загрузки
function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = `
        <div class="loading-spinner">
            <div class="loading-text">Определяем ваше местоположение...</div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.querySelector('.loading-overlay');
    if (loadingDiv) loadingDiv.remove();
}

// Эффект ripple
function createRipple(event) {
    const target = event.currentTarget;
    const ripple = document.createElement('span');
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - target.offsetLeft - radius}px`;
    ripple.style.top = `${event.clientY - target.offsetTop - radius}px`;
    ripple.classList.add('ripple');
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Обновление погоды и советов
async function updateWeather(city) {
    try {
        elements.weatherResult.classList.add('loading');
        elements.cityName.classList.add('loading');
        elements.temperature.classList.add('loading');
        elements.weatherDescription.classList.add('loading');
        const data = await fetchWeatherData(city);
        updateCurrentWeather(data.weather);
        updateHourlyForecast(data.forecast);
        updateWeeklyForecast(data.forecast);
        window.currentWeatherData = data.weather;
        const activeCategory = document.querySelector('.tip-category.active').getAttribute('data-category');
        await updateFarmerTips(data.weather, activeCategory);
        elements.weatherResult.classList.remove('hidden');
    } catch (error) {
        showError(error.message);
    } finally {
        elements.weatherResult.classList.remove('loading');
        elements.cityName.classList.remove('loading');
        elements.temperature.classList.remove('loading');
        elements.weatherDescription.classList.remove('loading');
    }
}

// Инициализация приложения
function initApp() {
    // Обработчики для поиска
    elements.searchButton.addEventListener('click', () => {
        const searchValue = elements.citySearch.value.trim();
        if (searchValue) updateWeather(searchValue);
    });
    elements.citySearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchValue = e.target.value.trim();
            if (searchValue) updateWeather(searchValue);
        }
    });
    elements.citySearch.addEventListener('input', debounce((e) => {
        const searchValue = e.target.value.trim();
        if (searchValue.length >= 2) updateWeather(searchValue);
    }, 500));
    // Переключение категорий советов
    document.querySelectorAll('.tip-category').forEach(button => {
        button.addEventListener('click', async (e) => {
            document.querySelectorAll('.tip-category').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            e.currentTarget.classList.add('active');
            e.currentTarget.setAttribute('aria-selected', 'true');
            const category = e.currentTarget.getAttribute('data-category');
            if (window.currentWeatherData) {
                await updateFarmerTips(window.currentWeatherData, category);
            }
        });
    });
    // Эффект ripple
    document.querySelectorAll('.search-button, .tip-item').forEach(element => {
        element.addEventListener('click', createRipple);
    });
    // Определение местоположения и обновление погоды
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            showLoading();
            const city = await getUserLocation();
            await updateWeather(city);
        } catch (error) {
            await updateWeather('Москва');
        } finally {
            hideLoading();
        }
    });
}

// Запуск приложения
initApp();
