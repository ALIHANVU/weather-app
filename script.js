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
            // Резервные советы, если сервер недоступен
            const defaultTips = {
                "temperature": {
                    "hot": {
                        "tips": ["Поливайте растения рано утром или вечером", "Используйте мульчу для удержания влаги"]
                    },
                    "moderate": {
                        "tips": ["Идеальное время для обрезки растений", "Проверьте наличие вредителей на растениях"]
                    },
                    "cold": {
                        "tips": ["Защитите растения от заморозков", "Ограничьте полив в холодную погоду"]
                    }
                },
                "humidity": {
                    "high": {
                        "tips": ["Следите за появлением грибковых заболеваний", "Обеспечьте хорошую вентиляцию растений"]
                    },
                    "normal": {
                        "tips": ["Поддерживайте регулярный полив", "Проверьте влажность почвы перед поливом"]
                    },
                    "low": {
                        "tips": ["Увеличьте частоту полива", "Используйте системы капельного орошения"]
                    }
                },
                "seasons": {
                    "spring": {
                        "tips": ["Подготовьте грядки к посадке", "Начните высаживать холодостойкие культуры"]
                    },
                    "summer": {
                        "tips": ["Защитите растения от перегрева", "Собирайте урожай регулярно"]
                    },
                    "autumn": {
                        "tips": ["Подготовьте сад к зиме", "Время для посадки озимых культур"]
                    },
                    "winter": {
                        "tips": ["Защитите многолетние растения от мороза", "Планируйте посадки на следующий сезон"]
                    }
                }
            };
            console.log('Используем резервные советы');
            return defaultTips;
        } catch (altError) {
            console.error('Ошибка при попытке использовать резервные советы:', altError);
            return null;
        }
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

// Улучшенная функция для получения местоположения по IP
async function getLocationByIP() {
    return new Promise((resolve, reject) => {
        // Создаем таймаут для запроса
        const timeoutId = setTimeout(() => {
            console.error('Таймаут IP геолокации');
            resolve('Москва'); // Резервный город при таймауте
        }, 5000); // 5 секунд на ответ

        fetch('https://ipapi.co/json/')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ошибка! статус: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                clearTimeout(timeoutId); // Очищаем таймаут при успешном получении
                resolve(data.city || 'Москва');
            })
            .catch(error => {
                clearTimeout(timeoutId); // Очищаем таймаут при ошибке
                console.error('Ошибка IP-геолокации:', error);
                resolve('Москва'); // Возвращаем город по умолчанию
            });
    });
}

// Получение геолокации с улучшенной обработкой ошибок
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
                    try {
                        const response = await fetch(
                            `${BASE_URL}/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
                        );
                        if (!response.ok) {
                            throw new Error(`HTTP ошибка! статус: ${response.status}`);
                        }
                        const data = await response.json();
                        if (data.length > 0) {
                            resolve(data[0].name);
                        } else {
                            reject(new Error('Не удалось определить город'));
                        }
                    } catch (fetchError) {
                        console.error('Ошибка запроса к API:', fetchError);
                        reject(new Error('Ошибка запроса к серверу: ' + fetchError.message));
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

// Кеширование данных о погоде
function cacheWeatherData(city, data) {
    localStorage.setItem('weatherData', JSON.stringify({
        city,
        data,
        timestamp: Date.now()
    }));
}

function getCachedWeatherData() {
    const cached = localStorage.getItem('weatherData');
    if (!cached) return null;
    
    const parsedData = JSON.parse(cached);
    // Проверяем актуальность данных (не старше 1 часа)
    if (Date.now() - parsedData.timestamp > 3600000) return null;
    
    return parsedData;
}

// Получение данных о погоде с улучшенной обработкой ошибок
async function fetchWeatherData(city) {
    try {
        // Проверка кеша перед запросом
        const cachedData = getCachedWeatherData();
        if (cachedData && cachedData.city === city) {
            console.log('Используем кешированные данные для', city);
            return cachedData.data;
        }

        const geoUrl = `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
        const geoResponse = await fetch(geoUrl);
        
        if (!geoResponse.ok) {
            throw new Error(`Ошибка геокодирования: ${geoResponse.status}`);
        }
        
        const geoData = await geoResponse.json();

        if (!geoData.length) {
            throw new Error('Город не найден');
        }

        const { lat, lon } = geoData[0];

        const weatherUrl = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
        const forecastUrl = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
        
        const weatherResponse = await fetch(weatherUrl);
        const forecastResponse = await fetch(forecastUrl);
        
        if (!weatherResponse.ok) {
            throw new Error(`Ошибка получения текущей погоды: ${weatherResponse.status}`);
        }
        
        if (!forecastResponse.ok) {
            throw new Error(`Ошибка получения прогноза: ${forecastResponse.status}`);
        }
        
        const weather = await weatherResponse.json();
        const forecast = await forecastResponse.json();
        
        const result = { weather, forecast };
        
        // Кешируем полученные данные
        cacheWeatherData(city, result);
        
        return result;
    } catch (error) {
        console.error('Ошибка получения данных о погоде:', error);
        showError(error.message);
        throw error;
    }
}

// Генерация советов с улучшенной надежностью
async function generateFarmerTips(weatherData) {
    const tips = await loadFarmerTips();
    if (!tips) {
        return ["Поливайте растения в соответствии с погодными условиями", 
                "Следите за состоянием почвы", 
                "Защищайте растения от экстремальных погодных условий"];
    }

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
    try {
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
    } catch (error) {
        console.error('Ошибка при обновлении текущей погоды:', error);
        showError('Не удалось обновить информацию о погоде');
    }
}

// Обновление почасового прогноза
function updateHourlyForecast(forecast) {
    try {
        elements.forecastDays.innerHTML = '';
        
        if (!forecast || !forecast.list || !Array.isArray(forecast.list)) {
            console.error('Неверные данные прогноза:', forecast);
            return;
        }
        
        forecast.list.slice(0, 24).forEach((item, index) => {
            const hourlyDiv = document.createElement('div');
            hourlyDiv.className = 'forecast-hour';
            hourlyDiv.style.animationDelay = `${index * 0.1}s`;
            
            const icon = item.weather && item.weather[0] && item.weather[0].icon 
                ? weatherEmoji[item.weather[0].icon] 
                : "🌦️";
            
            hourlyDiv.innerHTML = `
                <div class="forecast-time">${index === 0 ? 'Сейчас' : formatTime(item.dt)}</div>
                <div class="forecast-icon">${icon}</div>
                <div class="forecast-temp">${Math.round(item.main.temp)}°</div>
            `;
            
            elements.forecastDays.appendChild(hourlyDiv);
        });
    } catch (error) {
        console.error('Ошибка при обновлении почасового прогноза:', error);
    }
}

// Обновление недельного прогноза
function updateWeeklyForecast(forecast) {
    try {
        elements.weeklyForecastContainer.innerHTML = '';
        
        if (!forecast || !forecast.list || !Array.isArray(forecast.list)) {
            console.error('Неверные данные прогноза для недельного обновления:', forecast);
            return;
        }
        
        // Группировка прогноза по дням
        const dailyForecasts = {};
        forecast.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const day = date.toISOString().split('T')[0];
            
            if (!dailyForecasts[day]) {
                // Получаем день недели
                const fullDayName = getDayOfWeek(item.dt);
                const shortDayName = fullDayName.substring(0, 3); // Первые 3 буквы
                
                dailyForecasts[day] = {
                    temps: [],
                    weather: [],
                    day: fullDayName,
                    shortDay: shortDayName
                };
            }
            
            dailyForecasts[day].temps.push(item.main.temp);
            
            if (item.weather && item.weather[0] && item.weather[0].icon) {
                dailyForecasts[day].weather.push(item.weather[0].icon);
            }
        });
        
        // Выбираем уникальные дни и создаем карточки
        const uniqueDays = Object.values(dailyForecasts).slice(0, 7);
        
        uniqueDays.forEach((dayData, index) => {
            const avgTemp = Math.round(
                dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length
            );
            
            // Определяем наиболее частую иконку погоды
            let mostFrequentIcon = "01d"; // Значение по умолчанию
            if (dayData.weather && dayData.weather.length > 0) {
                mostFrequentIcon = dayData.weather.reduce(
                    (a, b) => dayData.weather.filter(v => v === a).length >= dayData.weather.filter(v => v === b).length ? a : b
                );
            }
            
            const dayElement = document.createElement('div');
            dayElement.className = 'weekly-day';
            dayElement.style.animationDelay = `${index * 0.1}s`;
            
            dayElement.innerHTML = `
                <div class="weekly-day-name">${dayData.day}</div>
                <div class="weekly-day-icon">${weatherEmoji[mostFrequentIcon]}</div>
                <div class="weekly-day-temp">${avgTemp}°</div>
            `;
            
            // Добавляем обработчик для эффекта ripple
            dayElement.addEventListener('click', createRipple);
            
            elements.weeklyForecastContainer.appendChild(dayElement);
        });
    } catch (error) {
        console.error('Ошибка при обновлении недельного прогноза:', error);
    }
}

// Обновление советов с обработкой ошибок
async function updateFarmerTips(weatherData) {
    try {
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
            
            // Добавляем обработчик для эффекта ripple
            tipElement.addEventListener('click', createRipple);
            
            elements.tipsContainer.appendChild(tipElement);
        });
    } catch (error) {
        console.error('Ошибка при обновлении советов для фермеров:', error);
        
        // Показываем стандартные советы при ошибке
        elements.tipsContainer.innerHTML = `
            <div class="tip-item">
                <span class="tip-icon">🌱</span>
                <span class="tip-text">Следите за прогнозом погоды для планирования сельскохозяйственных работ</span>
            </div>
            <div class="tip-item">
                <span class="tip-icon">🌱</span>
                <span class="tip-text">Адаптируйте полив в соответствии с текущими погодными условиями</span>
            </div>
        `;
    }
}

// Показ ошибок с улучшенным визуальным отображением
function showError(message) {
    // Удаляем предыдущие уведомления об ошибке
    const existingErrors = document.querySelectorAll('.error-notification');
    existingErrors.forEach(error => error.remove());
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Добавляем класс для анимации появления
    setTimeout(() => errorDiv.classList.add('show'), 10);
    
    // Удаляем уведомление через 5 секунд
    setTimeout(() => {
        errorDiv.classList.add('hide');
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

// Индикация загрузки с сообщением
function showLoading(message = 'Определяем ваше местоположение...') {
    // Удаляем существующий оверлей загрузки, если он есть
    hideLoading();
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = `
        <div class="loading-spinner">
            <div class="loading-text">${message}</div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.querySelector('.loading-overlay');
    if (loadingDiv) {
        loadingDiv.classList.add('fade-out');
        setTimeout(() => loadingDiv.remove(), 300);
    }
}

// Создание эффекта ripple
function createRipple(event) {
    const target = event.currentTarget;
    
    // Удаляем существующие эффекты ripple
    const existingRipples = target.querySelectorAll('.ripple');
    existingRipples.forEach(ripple => ripple.remove());
    
    const ripple = document.createElement('span');
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;

    const rect = target.getBoundingClientRect();
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - radius}px`;
    ripple.style.top = `${event.clientY - rect.top - radius}px`;
    ripple.className = 'ripple';

    target.appendChild(ripple);
    
    // Удаляем ripple после анимации
    setTimeout(() => {
        if (ripple && ripple.parentNode === target) {
            target.removeChild(ripple);
        }
    }, 600);
}

// Основная функция загрузки приложения
async function initApp() {
    showLoading('Определяем ваше местоположение...');
    
    try {
        // Пробуем получить местоположение через GPS
        const city = await Promise.race([
            getUserLocation(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Геолокация заняла слишком много времени')), 10000)
            )
        ]);
        await loadWeatherData(city);
    } catch (gpsError) {
        console.log('Не удалось определить местоположение через GPS:', gpsError);
        
        try {
            showLoading('Определяем местоположение по IP...');
            // Добавляем таймаут для IP-геолокации
            const city = await getLocationByIP();
            await loadWeatherData(city);
        } catch (ipError) {
            console.error('Ошибка определения местоположения по IP:', ipError);
            // Если и это не сработало, загружаем погоду для города по умолчанию
            await loadWeatherData('Москва');
        }
    } finally {
        hideLoading();
    }
}

// Функция загрузки погоды по городу
async function loadWeatherData(city) {
    try {
        showLoading(`Загружаем данные о погоде для ${city}...`);
        const data = await fetchWeatherData(city);
        updateCurrentWeather(data.weather);
        updateHourlyForecast(data.forecast);
        updateWeeklyForecast(data.forecast);
        await updateFarmerTips(data.weather);
        elements.weatherResult.classList.remove('hidden');
    } catch (error) {
        console.error('Ошибка загрузки данных о погоде:', error);
        showError(`Не удалось загрузить погоду: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Обработчик поиска
function handleSearch() {
    const city = elements.citySearch.value.trim();
    if (city) {
        loadWeatherData(city);
    } else {
        showError('Пожалуйста, введите название города');
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Добавляем обработчики событий
    elements.searchButton.addEventListener('click', handleSearch);
    elements.citySearch.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });

    // Применяем эффект ripple ко всем интерактивным элементам
    document.querySelectorAll('.search-button, .detail-item, .tip-item, .weekly-day').forEach(element => {
        element.addEventListener('click', createRipple);
    });

    // Запускаем определение местоположения и загрузку погоды
    initApp();
});

// Добавляем обработчик для обновления данных при возвращении на страницу
window.addEventListener('focus', () => {
    const cached = getCachedWeatherData();
    if (cached) {
        const cacheTime = Date.now() - cached.timestamp;
        // Обновляем данные, если кеш старше 15 минут
        if (cacheTime > 15 * 60 * 1000) {
            if (elements.cityName.textContent) {
                loadWeatherData(elements.cityName.textContent);
            } else if (cached.city) {
                loadWeatherData(cached.city);
            }
        }
    }
});
