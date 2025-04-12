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

// Новая переменная для хранения всех полученных данных прогноза
let fullForecastData = null;

// Загрузка советов
async function loadFarmerTips() {
    try {
        console.log('Начинаем загрузку советов...');
        const response = await fetch('https://alihanvu.github.io/weather-app/farmer-tips.json?' + new Date().getTime(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('Ответ от сервера:', response);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Советы успешно загружены:', data);
        return data;
    } catch (error) {
        console.error('Подробная ошибка загрузки советов:', error);
        
        try {
            const alternativeResponse = await fetch('./farmer-tips.json');
            if (alternativeResponse.ok) {
                const data = await alternativeResponse.json();
                console.log('Советы загружены через альтернативный путь:', data);
                return data;
            }
        } catch (altError) {
            console.error('Ошибка при попытке загрузить через альтернативный путь:', altError);
        }
        
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

    // Сезонные советы
    result.push(...tips.seasons[getCurrentSeason()].tips);

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

// Обновление недельного прогноза
function updateWeeklyForecast(forecast) {
    elements.weeklyForecastContainer.innerHTML = '';
    
    // Сохраняем полные данные для доступа позже
    fullForecastData = forecast;
    
    // Группировка прогноза по дням
    const dailyForecasts = {};
    forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0];
        
        if (!dailyForecasts[day]) {
            const fullDayName = getDayOfWeek(item.dt);
            const shortDayName = fullDayName.substring(0, 3);
            
            dailyForecasts[day] = {
                temps: [],
                weather: [],
                day: fullDayName,
                shortDay: shortDayName,
                date: day,  // Сохраняем дату для идентификации
                forecasts: [] // Сохраняем все прогнозы для этого дня
            };
        }
        
        dailyForecasts[day].temps.push(item.main.temp);
        dailyForecasts[day].weather.push(item.weather[0].icon);
        dailyForecasts[day].forecasts.push(item); // Сохраняем полные данные прогноза
    });
    
    // Выбираем уникальные дни и создаем карточки
    const uniqueDays = Object.values(dailyForecasts).slice(0, 7);
    
    uniqueDays.forEach((dayData, index) => {
        const avgTemp = Math.round(
            dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length
        );
        
        const mostFrequentIcon = dayData.weather.reduce(
            (a, b) => dayData.weather.filter(v => v === a).length >= dayData.weather.filter(v => v === b).length ? a : b
        );
        
        const dayElement = document.createElement('div');
        dayElement.className = 'weekly-day';
        dayElement.style.animationDelay = `${index * 0.1}s`;
        dayElement.dataset.date = dayData.date; // Сохраняем дату как атрибут
        
        dayElement.innerHTML = `
            <div class="weekly-day-name">${dayData.day}</div>
            <div class="weekly-day-icon">${weatherEmoji[mostFrequentIcon]}</div>
            <div class="weekly-day-temp">${avgTemp}°</div>
        `;
        
        // Добавляем обработчик события клика
        dayElement.addEventListener('click', () => showDayDetails(dayData.date));
        
        elements.weeklyForecastContainer.appendChild(dayElement);
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

// Новая функция для показа подробностей дня
async function showDayDetails(selectedDate) {
    try {
        // Добавляем визуальное подтверждение выбора
        const allDays = document.querySelectorAll('.weekly-day');
        allDays.forEach(day => {
            day.classList.remove('selected-day');
            if (day.dataset.date === selectedDate) {
                day.classList.add('selected-day');
            }
        });
        
        // Показываем индикатор загрузки
        elements.weatherResult.classList.add('loading');
        
        // Фильтруем прогнозы только для выбранного дня
        const dayForecasts = fullForecastData.list.filter(item => {
            const date = new Date(item.dt * 1000);
            const day = date.toISOString().split('T')[0];
            return day === selectedDate;
        });
        
        if (dayForecasts.length === 0) {
            showError('Нет доступных данных для этого дня');
            return;
        }
        
        // Берем первый прогноз дня как текущую погоду
        const selectedDayData = dayForecasts[0];
        
        // Создаем объект, похожий на объект текущей погоды для совместимости с существующими функциями
        const dayWeatherData = {
            main: selectedDayData.main,
            weather: selectedDayData.weather,
            name: fullForecastData.city.name + ` (${formatDate(selectedDayData.dt)})`,
            visibility: selectedDayData.visibility,
            wind: selectedDayData.wind
        };
        
        // Создаем объект с прогнозами только для этого дня
        const dayForecastData = {
            city: fullForecastData.city,
            list: dayForecasts
        };
        
        // Обновляем UI выбранного дня
        updateCurrentWeather(dayWeatherData);
        updateHourlyForecast(dayForecastData);
        await updateFarmerTips(dayWeatherData);
        
        // Прокручиваем к верху страницы для лучшего UX
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Ошибка при загрузке подробностей дня:', error);
        showError('Не удалось загрузить данные');
    } finally {
        elements.weatherResult.classList.remove('loading');
    }
}

// Показ ошибок
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 3000);
}

// Индикация загрузки
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
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Добавляем функцию форматирования даты
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
    });
}

// Создание эффекта ripple
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

// Основная функция обновления погоды
async function updateWeather(city) {
    try {
        elements.weatherResult.classList.add('loading');
        elements.cityName.classList.add('loading');
        elements.temperature.classList.add('loading');
        elements.weatherDescription.classList.add('loading');
        
        const data = await fetchWeatherData(city);
        
        // Сохраняем данные прогноза глобально
        fullForecastData = data.forecast;
        
        updateCurrentWeather(data.weather);
        updateHourlyForecast(data.forecast);
        updateWeeklyForecast(data.forecast);
        await updateFarmerTips(data.weather);
        
        elements.weatherResult.classList.remove('hidden');
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        elements.weatherResult.classList.remove('loading');
        elements.cityName.classList.remove('loading');
        elements.temperature.classList.remove('loading');
        elements.weatherDescription.classList.remove('loading');
    }
}

// Обработчики событий
let searchTimeout;

elements.searchButton.addEventListener('click', () => {
    const searchValue = elements.citySearch.value.trim();
    if (searchValue) {
        updateWeather(searchValue);
    }
});

elements.citySearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const searchValue = e.target.value.trim();
        if (searchValue) {
            clearTimeout(searchTimeout);
            updateWeather(searchValue);
        }
    }
});

elements.citySearch.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchValue = e.target.value.trim();
        if (searchValue.length >= 2) {
            updateWeather(searchValue);
        }
    }, 500);
});

// Добавляем CSS стиль для выделения выбранного дня
const styleElement = document.createElement('style');
styleElement.textContent = `
    .selected-day {
        background-color: rgba(0, 122, 255, 0.15) !important;
        border: 1px solid rgba(0, 122, 255, 0.3) !important;
        transform: scale(1.02);
    }
    
    @media (prefers-color-scheme: dark) {
        .selected-day {
            background-color: rgba(10, 132, 255, 0.25) !important;
            border: 1px solid rgba(10, 132, 255, 0.4) !important;
        }
    }
`;
document.head.appendChild(styleElement);

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        const city = await getUserLocation();
        await updateWeather(city);
    } catch (error) {
        console.log('Ошибка определения местоположения:', error.message);
        await updateWeather('Москва');
    } finally {
        hideLoading();
    }
});

const rippleElements = document.querySelectorAll('.search-button, .tip-item');
rippleElements.forEach(element => {
    element.addEventListener('click', createRipple);
});
