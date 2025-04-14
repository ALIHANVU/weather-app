const API_KEY = 'c708426913319b328c4ff4719583d1c6';
const BASE_URL = 'https://api.openweathermap.org';
const DEFAULT_CITY = 'Грозный'; // Константа для города по умолчанию

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

// Элементы модального окна
const modalElements = {
    dayModal: document.querySelector('#dayModal'),
    closeModal: document.querySelector('#closeModal'),
    dayName: document.querySelector('#modalDayName'),
    temperature: document.querySelector('#modalTemperature'),
    weatherDescription: document.querySelector('#modalWeatherDescription'),
    maxTemp: document.querySelector('#modalMaxTemp'),
    minTemp: document.querySelector('#modalMinTemp'),
    feelsLike: document.querySelector('#modalFeelsLike'),
    humidity: document.querySelector('#modalHumidity'),
    windSpeed: document.querySelector('#modalWindSpeed'),
    visibility: document.querySelector('#modalVisibility'),
    hourlyForecast: document.querySelector('#modalHourlyForecast'),
    tipsContainer: document.querySelector('#modalTipsContainer')
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

// Решение проблемы с $ в xman.js
document.addEventListener('DOMContentLoaded', () => {
    // Если $ не определен, создаем пустую функцию для предотвращения ошибок
    if (typeof $ === 'undefined') {
        window.$ = function() {
            console.warn('jQuery ($) был вызван, но не загружен');
            return {
                ready: function(fn) { document.addEventListener('DOMContentLoaded', fn); return this; },
                on: function() { return this; },
                css: function() { return this; },
                html: function() { return this; },
                text: function() { return this; }
            };
        };
    }
});

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
        // Используем AbortController для возможности отменить fetch-запрос при таймауте
        const controller = new AbortController();
        const signal = controller.signal;
        
        // Создаем таймаут для запроса - 3 секунды
        const timeoutId = setTimeout(() => {
            controller.abort(); // Отменяем fetch-запрос
            console.warn('Таймаут IP геолокации');
            resolve(DEFAULT_CITY); // Резервный город при таймауте
        }, 3000);

        fetch('https://ipapi.co/json/', { signal })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ошибка! статус: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                clearTimeout(timeoutId); // Очищаем таймаут при успешном получении
                resolve(data.city || DEFAULT_CITY);
            })
            .catch(error => {
                clearTimeout(timeoutId); // Очищаем таймаут при ошибке
                if (error.name === 'AbortError') {
                    console.warn('Запрос IP-геолокации был отменен из-за таймаута');
                    resolve(DEFAULT_CITY);
                } else {
                    console.error('Ошибка IP-геолокации:', error);
                    resolve(DEFAULT_CITY); // Возвращаем город по умолчанию
                }
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
            enableHighAccuracy: false, // Изменяем на false для ускорения
            timeout: 5000, // 5 секунд
            maximumAge: 60000 // Разрешаем использовать кешированные результаты до 1 минуты
        };

        // Создаем таймаут для всего процесса геолокации
        const timeoutId = setTimeout(() => {
            reject(new Error('Превышено время ожидания геолокации'));
        }, 6000); // 6 секунд на весь процесс

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    clearTimeout(timeoutId); // Очищаем таймаут при успешном получении
                    const { latitude, longitude } = position.coords;
                    
                    // Добавляем таймаут и для запроса к API
                    const controller = new AbortController();
                    const signal = controller.signal;
                    
                    const apiTimeoutId = setTimeout(() => {
                        controller.abort();
                        reject(new Error('Таймаут запроса к API геокодирования'));
                    }, 3000); // 3 секунды
                    
                    try {
                        const response = await fetch(
                            `${BASE_URL}/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`,
                            { signal }
                        );
                        
                        clearTimeout(apiTimeoutId);
                        
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
                        clearTimeout(apiTimeoutId);
                        console.error('Ошибка запроса к API:', fetchError);
                        
                        if (fetchError.name === 'AbortError') {
                            reject(new Error('Время ожидания ответа от сервера истекло'));
                        } else {
                            reject(new Error('Ошибка запроса к серверу: ' + fetchError.message));
                        }
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            },
            (error) => {
                clearTimeout(timeoutId);
                let errorMessage;
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Доступ к геолокации запрещён";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Информация о местоположении недоступна";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Превышено время ожидания геолокации";
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

// Функция для проверки доступа к геолокации перед запуском
function checkGeolocationPermission() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ state: 'unavailable' });
            return;
        }
        
        // Если API разрешений недоступен, возвращаем "unknown"
        if (!navigator.permissions || !navigator.permissions.query) {
            resolve({ state: 'unknown' });
            return;
        }
        
        navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
            resolve({ state: permissionStatus.state });
            
            // Слушаем изменения статуса разрешения
            permissionStatus.onchange = function() {
                console.log('Статус разрешения геолокации изменен:', permissionStatus.state);
            };
        }).catch(() => {
            // Если запрос разрешений не поддерживается, просто пробуем использовать геолокацию
            resolve({ state: 'unknown' });
        });
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

        // Обработка особого случая для названия города на кириллице
        // Иногда API может не распознавать кириллические названия
        let cityForApi = city;
        if (city === DEFAULT_CITY) {
            cityForApi = 'Grozny';
        } else if (city === 'Москва') {
            cityForApi = 'Moscow';
        }
        
        const geoUrl = `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(cityForApi)}&limit=1&appid=${API_KEY}`;
        
        // Используем AbortController для контроля таймаута
        const controller = new AbortController();
        const signal = controller.signal;
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд
        
        console.log('Отправляем запрос геокодирования:', geoUrl);
        const geoResponse = await fetch(geoUrl, { signal });
        
        if (!geoResponse.ok) {
            clearTimeout(timeoutId);
            throw new Error(`Ошибка геокодирования: ${geoResponse.status}`);
        }
        
        const geoData = await geoResponse.json();
        console.log('Получены данные геокодирования:', geoData);

        if (!geoData.length) {
            clearTimeout(timeoutId);
            // Проверяем особый случай для города по умолчанию
            if (city === DEFAULT_CITY || cityForApi === 'Grozny') {
                // Жесткое задание координат Грозного
                console.log('Используем жестко заданные координаты для Грозного');
                return fetchWeatherByCoords(43.3168, 45.6981, city);
            } else if (city === 'Москва' || cityForApi === 'Moscow') {
                // Жесткое задание координат Москвы (на случай, если она все еще где-то используется)
                console.log('Используем жестко заданные координаты для Москвы');
                return fetchWeatherByCoords(55.7558, 37.6173, DEFAULT_CITY); // Заменяем на город по умолчанию
            }
            throw new Error('Город не найден');
        }

        const { lat, lon } = geoData[0];
        clearTimeout(timeoutId);
        
        return fetchWeatherByCoords(lat, lon, city);
    } catch (error) {
        console.error('Ошибка получения данных о погоде:', error);
        // Проверяем, был ли запрос отменен из-за таймаута
        if (error.name === 'AbortError') {
            console.log('Запрос был отменен из-за таймаута');
            if (city === DEFAULT_CITY) {
                console.log('Пробуем использовать жестко заданные координаты для Грозного после таймаута');
                return fetchWeatherByCoords(43.3168, 45.6981, city);
            } else if (city === 'Москва') {
                // Перенаправляем на город по умолчанию при таймауте
                return fetchWeatherByCoords(43.3168, 45.6981, DEFAULT_CITY);
            }
            throw new Error('Превышено время ожидания ответа от сервера');
        }
        throw error;
    }
}

// Новая функция для получения погоды по координатам
async function fetchWeatherByCoords(lat, lon, cityName) {
    try {
        console.log(`Запрашиваем погоду по координатам: ${lat}, ${lon} для города ${cityName}`);
        
        // Используем AbortController для контроля таймаута
        const controller = new AbortController();
        const signal = controller.signal;
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд
        
        const weatherUrl = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
        const forecastUrl = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
        
        console.log('Запрашиваем данные о погоде и прогнозе...');
        
        // Запрашиваем одновременно текущую погоду и прогноз
        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl, { signal }),
            fetch(forecastUrl, { signal })
        ]);
        
        clearTimeout(timeoutId);
        
        if (!weatherResponse.ok) {
            throw new Error(`Ошибка получения текущей погоды: ${weatherResponse.status}`);
        }
        
        if (!forecastResponse.ok) {
            throw new Error(`Ошибка получения прогноза: ${forecastResponse.status}`);
        }
        
        const weather = await weatherResponse.json();
        const forecast = await forecastResponse.json();
        
        // Если загружаем по координатам, но название города отличается,
        // переопределяем название города для единообразия отображения
        if (cityName === DEFAULT_CITY && weather.name !== DEFAULT_CITY) {
            weather.name = DEFAULT_CITY;
        }
        
        const result = { weather, forecast };
        
        // Кешируем полученные данные
        cacheWeatherData(cityName, result);
        
        console.log('Данные о погоде получены успешно');
        return result;
    } catch (error) {
        console.error('Ошибка получения погоды по координатам:', error);
        if (error.name === 'AbortError') {
            throw new Error('Превышено время ожидания ответа от сервера погоды');
        }
        throw error;
    }
}
// Группировка данных прогноза по дням
function groupForecastByDays(forecast) {
    const dailyForecasts = {};
    
    forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0];
        
        if (!dailyForecasts[day]) {
            const fullDayName = getDayOfWeek(item.dt);
            const shortDayName = fullDayName.substring(0, 3);
            
            dailyForecasts[day] = {
                date: day,
                temps: [],
                humidity: [],
                windSpeed: [],
                visibility: [],
                feelsLike: [],
                weather: [],
                weatherData: [],
                day: fullDayName,
                shortDay: shortDayName
            };
        }
        
        dailyForecasts[day].temps.push(item.main.temp);
        dailyForecasts[day].humidity.push(item.main.humidity);
        dailyForecasts[day].windSpeed.push(item.wind.speed);
        dailyForecasts[day].visibility.push(item.visibility);
        dailyForecasts[day].feelsLike.push(item.main.feels_like);
        
        if (item.weather && item.weather[0]) {
            dailyForecasts[day].weather.push(item.weather[0].icon);
            dailyForecasts[day].weatherData.push(item.weather[0]);
        }
        
        // Сохраняем полные данные прогноза для каждого временного промежутка
        if (!dailyForecasts[day].hourlyData) {
            dailyForecasts[day].hourlyData = [];
        }
        dailyForecasts[day].hourlyData.push(item);
    });
    
    return dailyForecasts;
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

// Функция для открытия модального окна с погодой на выбранный день
async function openDayWeatherModal(dayData) {
    try {
        // Базовые данные о дне
        modalElements.dayName.textContent = dayData.day;
        
        // Рассчитываем средние значения
        const avgTemp = Math.round(dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length);
        const maxTemp = Math.round(Math.max(...dayData.temps));
        const minTemp = Math.round(Math.min(...dayData.temps));
        const avgHumidity = Math.round(dayData.humidity.reduce((a, b) => a + b, 0) / dayData.humidity.length);
        const avgWindSpeed = (dayData.windSpeed.reduce((a, b) => a + b, 0) / dayData.windSpeed.length).toFixed(1);
        const avgVisibility = (dayData.visibility.reduce((a, b) => a + b, 0) / dayData.visibility.length / 1000).toFixed(1);
        const avgFeelsLike = Math.round(dayData.feelsLike.reduce((a, b) => a + b, 0) / dayData.feelsLike.length);
        
       // Определяем наиболее частый тип погоды
let mostFrequentWeather = null;
if (dayData.weatherData && dayData.weatherData.length > 0) {
    // Группируем погодные описания и находим самое частое
    const weatherCounts = {};
    dayData.weatherData.forEach(item => {
        if (!weatherCounts[item.description]) {
            weatherCounts[item.description] = 0;
        }
        weatherCounts[item.description]++;
    });
    
    let maxCount = 0;
    for (const [description, count] of Object.entries(weatherCounts)) {
        if (count > maxCount) {
            maxCount = count;
            mostFrequentWeather = description;
        }
    }
}

// Определяем наиболее частую иконку погоды
let mostFrequentIcon = "01d";
if (dayData.weather && dayData.weather.length > 0) {
    const iconCounts = {};
    dayData.weather.forEach(icon => {
        if (!iconCounts[icon]) {
            iconCounts[icon] = 0;
        }
        iconCounts[icon]++;
    });
    
    let maxIconCount = 0;
    for (const [icon, count] of Object.entries(iconCounts)) {
        if (count > maxIconCount) {
            maxIconCount = count;
            mostFrequentIcon = icon;
        }
    }
}

// Обновляем данные в модальном окне
modalElements.temperature.textContent = `${avgTemp}°`;
modalElements.weatherDescription.textContent = mostFrequentWeather ? 
    mostFrequentWeather.charAt(0).toUpperCase() + mostFrequentWeather.slice(1) : "-";
modalElements.maxTemp.textContent = maxTemp;
modalElements.minTemp.textContent = minTemp;
modalElements.humidity.textContent = `${avgHumidity}%`;
modalElements.windSpeed.textContent = `${avgWindSpeed} м/с`;
modalElements.visibility.textContent = `${avgVisibility} км`;
modalElements.feelsLike.textContent = `${avgFeelsLike}°`;

// Обновляем почасовой прогноз
updateModalHourlyForecast(dayData.hourlyData);

// Генерируем советы для выбранного дня
await updateModalFarmerTips({
    main: { 
        temp: avgTemp, 
        humidity: avgHumidity, 
        feels_like: avgFeelsLike 
    },
    weather: [{ 
        description: mostFrequentWeather, 
        icon: mostFrequentIcon 
    }],
    wind: { 
        speed: avgWindSpeed 
    },
    visibility: avgVisibility * 1000
});

// Показываем модальное окно
modalElements.dayModal.classList.remove('hidden');
document.body.classList.add('modal-open');

// Добавляем плавное появление
setTimeout(() => {
    modalElements.dayModal.classList.add('visible');
}, 10);
} catch (error) {
    console.error('Ошибка при открытии модального окна погоды:', error);
    showError('Не удалось загрузить детали погоды для выбранного дня');
}
}

// Функция для обновления почасового прогноза в модальном окне
function updateModalHourlyForecast(hourlyData) {
    modalElements.hourlyForecast.innerHTML = '';
    
    if (!hourlyData || !Array.isArray(hourlyData)) {
        console.error('Неверные данные почасового прогноза для модального окна:', hourlyData);
        return;
    }
    
    hourlyData.forEach((item, index) => {
        const hourlyDiv = document.createElement('div');
        hourlyDiv.className = 'forecast-hour';
        hourlyDiv.style.animationDelay = `${index * 0.1}s`;
        
        const icon = item.weather && item.weather[0] && item.weather[0].icon 
            ? weatherEmoji[item.weather[0].icon] 
            : "🌦️";
        
        hourlyDiv.innerHTML = `
            <div class="forecast-time">${formatTime(item.dt)}</div>
            <div class="forecast-icon">${icon}</div>
            <div class="forecast-temp">${Math.round(item.main.temp)}°</div>
        `;
        
        modalElements.hourlyForecast.appendChild(hourlyDiv);
    });
}

// Функция для обновления советов для фермеров в модальном окне
async function updateModalFarmerTips(weatherData) {
    try {
        const tips = await generateFarmerTips(weatherData);
        modalElements.tipsContainer.innerHTML = '';
        
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
            
            modalElements.tipsContainer.appendChild(tipElement);
        });
    } catch (error) {
        console.error('Ошибка при обновлении советов для фермеров в модальном окне:', error);
        
        // Показываем стандартные советы при ошибке
        modalElements.tipsContainer.innerHTML = `
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

// Функция для закрытия модального окна
function closeDayWeatherModal() {
    modalElements.dayModal.classList.remove('visible');
    
    // Задержка для анимации закрытия
    setTimeout(() => {
        modalElements.dayModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    }, 300);
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
        const dailyForecasts = groupForecastByDays(forecast);
        
        // Выбираем уникальные дни и создаем карточки
        const uniqueDays = Object.values(dailyForecasts).slice(0, 7);
        
        uniqueDays.forEach((dayData, index) => {
            const avgTemp = Math.round(
                dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length
            );
            
            // Определяем наиболее частую иконку погоды
            let mostFrequentIcon = "01d"; // Значение по умолчанию
            if (dayData.weather && dayData.weather.length > 0) {
                const iconCounts = {};
                dayData.weather.forEach(icon => {
                    if (!iconCounts[icon]) {
                        iconCounts[icon] = 0;
                    }
                    iconCounts[icon]++;
                });
                
                let maxIconCount = 0;
                for (const [icon, count] of Object.entries(iconCounts)) {
                    if (count > maxIconCount) {
                        maxIconCount = count;
                        mostFrequentIcon = icon;
                    }
                }
            }
            
            const dayElement = document.createElement('div');
            dayElement.className = 'weekly-day';
            dayElement.style.animationDelay = `${index * 0.1}s`;
            dayElement.setAttribute('data-date', dayData.date);
            
            dayElement.innerHTML = `
                <div class="weekly-day-name">${dayData.day}</div>
                <div class="weekly-day-icon">${weatherEmoji[mostFrequentIcon]}</div>
                <div class="weekly-day-temp">${avgTemp}°</div>
            `;
            
            // Добавляем обработчик для эффекта ripple
            dayElement.addEventListener('click', createRipple);
            
            // Добавляем обработчик для открытия модального окна
            dayElement.addEventListener('click', () => {
                openDayWeatherModal(dayData);
            });
            
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

// Функция для отображения минимальных данных о погоде (fallback)
function showFallbackWeather(city) {
    console.log('Отображаем минимальные данные о погоде для:', city);
    
    const fallbackData = {
        weather: {
            main: { temp: 15, feels_like: 14, temp_max: 17, temp_min: 13, humidity: 70 },
            weather: [{ description: 'облачно с прояснениями', icon: '04d' }],
            name: city || DEFAULT_CITY,
            visibility: 10000,
            wind: { speed: 2.5 }
        },
        forecast: {
            list: Array(8).fill().map((_, index) => ({
                dt: Math.floor(Date.now() / 1000) + index * 3600,
                main: { temp: 15 - index % 3 },
                weather: [{ icon: '04d' }]
            }))
        }
    };
    
    try {
        updateCurrentWeather(fallbackData.weather);
        updateHourlyForecast(fallbackData.forecast);
        
        // Создаем минимальный недельный прогноз
        elements.weeklyForecastContainer.innerHTML = '';
        
        // Получаем названия дней недели на неделю вперед
        const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const today = new Date();
        
        // Создаем простую карточку для каждого дня недели
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayName = days[date.getDay()];
            
            const temp = Math.round(15 - i % 5 + Math.sin(i) * 3); // Простая имитация изменения температуры
            
            const dayElement = document.createElement('div');
            dayElement.className = 'weekly-day';
            dayElement.style.animationDelay = `${i * 0.1}s`;
            
            dayElement.innerHTML = `
                <div class="weekly-day-name">${dayName}</div>
                <div class="weekly-day-icon">${weatherEmoji['04d']}</div>
                <div class="weekly-day-temp">${temp}°</div>
            `;
            
            elements.weeklyForecastContainer.appendChild(dayElement);
        }
        
        // Показываем базовые советы
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
        
        elements.weatherResult.classList.remove('hidden');
    } catch (e) {
        console.error('Ошибка при отображении fallback данных:', e);
    }
}
// Индикация загрузки с сообщением
function showLoading(message = 'Определяем ваше местоположение...') {
    // Удаляем существующий оверлей загрузки, если он есть
    hideLoading();
    
    console.log('Показываем индикатор загрузки:', message);
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-overlay';
    loadingDiv.id = 'loadingOverlay'; // Добавляем ID для более надежного поиска
    loadingDiv.innerHTML = `
        <div class="loading-spinner">
            <div class="loading-text">${message}</div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    
    // Устанавливаем максимальное время отображения индикатора загрузки
    if (window._loadingTimeout) {
        clearTimeout(window._loadingTimeout);
    }
    
    // Гарантируем, что индикатор загрузки исчезнет спустя заданное время
    window._loadingTimeout = setTimeout(() => {
        console.warn('Принудительное скрытие индикатора загрузки по таймауту');
        hideLoading();
    }, 12000); // 12 секунд максимум
}

function hideLoading() {
    if (window._loadingTimeout) {
        clearTimeout(window._loadingTimeout);
        window._loadingTimeout = null;
    }
    
    const loadingDiv = document.querySelector('.loading-overlay');
    if (loadingDiv) {
        console.log('Скрываем индикатор загрузки');
        loadingDiv.classList.add('fade-out');
        setTimeout(() => {
            if (loadingDiv.parentNode) {
                loadingDiv.remove();
            }
        }, 300);
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

// Функция для проверки наличия сохраненного города
function getLastCity() {
    const lastCity = localStorage.getItem('lastLoadedCity');
    // Если сохранена Москва, возвращаем null чтобы использовать новый город по умолчанию
    if (lastCity === 'Москва') {
        return null;
    }
    return lastCity || null;
}

// Улучшенная функция loadWeatherData с обработкой повторных попыток и фиксированным fallback
async function loadWeatherData(city) {
    // Если город Москва, заменяем на город по умолчанию
    if (city === 'Москва') {
        city = DEFAULT_CITY;
    }
    
    // Запоминаем время начала загрузки для отслеживания длительных запросов
    const startTime = Date.now();
    let fallbackUsed = false;
    let globalTimeoutId;
    
    try {
        showLoading(`Загружаем данные о погоде для ${city}...`);
        
        // Глобальный таймаут для всего процесса - 10 секунд
        globalTimeoutId = setTimeout(() => {
            console.warn(`Глобальный таймаут загрузки для ${city} - прошло ${(Date.now() - startTime)/1000} секунд`);
            hideLoading();
            showError(`Загрузка данных заняла слишком много времени. Пожалуйста, попробуйте еще раз.`);
            
            // В случае глобального таймаута, показываем фиксированные данные для критичного пользовательского опыта
            showFallbackWeather(city);
            fallbackUsed = true;
        }, 10000);
        
        // Добавляем таймаут для всего процесса получения погоды - 8 секунд
        const weatherPromise = Promise.race([
            fetchWeatherData(city),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Время ожидания получения погоды истекло')), 8000)
            )
        ]);
        
        const data = await weatherPromise;
        
        // Очищаем глобальный таймаут, так как запрос успешно завершен
        clearTimeout(globalTimeoutId);
        
        // Проверяем наличие всех необходимых данных
        if (!data || !data.weather || !data.forecast) {
            throw new Error('Получены неполные данные о погоде');
        }
        
        updateCurrentWeather(data.weather);
        updateHourlyForecast(data.forecast);
        updateWeeklyForecast(data.forecast);
        await updateFarmerTips(data.weather);
        
        // Показываем результаты
        elements.weatherResult.classList.remove('hidden');
        
        // Сохраняем последний успешно загруженный город
        localStorage.setItem('lastLoadedCity', city);
        
        console.log(`Данные о погоде для ${city} загружены за ${(Date.now() - startTime)/1000} секунд`);
    } catch (error) {
        console.error('Ошибка загрузки данных о погоде:', error);
        
        // Если глобальный таймаут уже сработал, не продолжаем обработку ошибки
        if (fallbackUsed) return;
        
        try {
            // Очищаем глобальный таймаут, так как запрос завершился с ошибкой
            clearTimeout(globalTimeoutId);
        } catch(e) {
            // Игнорируем ошибки при очистке таймаута
        }
        
        // Пробуем загрузить из кеша, если доступно
        const cached = getCachedWeatherData();
        if (cached) {
            console.log('Используем кешированные данные после ошибки');
            try {
                updateCurrentWeather(cached.data.weather);
                updateHourlyForecast(cached.data.forecast);
                updateWeeklyForecast(cached.data.forecast);
                await updateFarmerTips(cached.data.weather);
                elements.weatherResult.classList.remove('hidden');
                showError(`Не удалось загрузить актуальные данные. Отображены данные из кеша.`);
                return;
            } catch (cacheError) {
                console.error('Ошибка при использовании кеша:', cacheError);
            }
        }
        
        // Если нет кеша или кеш не сработал, пробуем город по умолчанию
        if (city !== DEFAULT_CITY) {
            showError(`Не удалось загрузить погоду для "${city}". Загружаем для города по умолчанию.`);
            // Рекурсивный вызов, но только если мы еще не пытались загрузить для города по умолчанию
            await loadWeatherData(DEFAULT_CITY);
        } else {
            // Если мы уже пытались загрузить Грозный и все равно получили ошибку
            showError(`Не удалось загрузить данные о погоде: ${error.message}`);
            
            // Показываем заглушку с базовыми данными
            showFallbackWeather(city);
        }
    } finally {
        hideLoading();
    }
}

// Основная функция загрузки приложения с улучшенной обработкой отказа от геолокации
async function initApp() {
    // Очищаем localStorage от старых данных, где сохранена Москва
    const lastCity = localStorage.getItem('lastLoadedCity');
    if (lastCity === 'Москва') {
        localStorage.removeItem('lastLoadedCity');
        localStorage.removeItem('weatherData');
    }
    
    showLoading('Инициализация приложения...');
    
    try {
        // Проверяем сохраненный город для ускорения загрузки
        const lastCity = getLastCity();
        
        if (lastCity) {
            // Если есть сохраненный город, сначала быстро загружаем его
            console.log('Загружаем погоду для последнего использованного города:', lastCity);
            await loadWeatherData(lastCity);
            // Но всё равно пытаемся определить текущее местоположение после этого
        }
        
        // Проверяем статус разрешения геолокации
        const geoPermission = await checkGeolocationPermission();
        
        if (geoPermission.state === 'denied') {
            // Если доступ явно запрещен, сразу переходим к IP геолокации
            console.log('Доступ к геолокации запрещен пользователем');
            if (!lastCity) {
                showLoading('Определяем местоположение по IP...');
                try {
                    const city = await getLocationByIP();
                    await loadWeatherData(city);
                } catch (ipError) {
                    console.error('Ошибка IP геолокации:', ipError);
                    await loadWeatherData(DEFAULT_CITY);
                }
            }
            return;
        }
        
        if (geoPermission.state === 'unavailable') {
            // Если геолокация недоступна на устройстве
            console.log('Геолокация недоступна на устройстве');
            if (!lastCity) {
                showLoading('Определяем местоположение по IP...');
                try {
                    const city = await getLocationByIP();
                    await loadWeatherData(city);
                } catch (ipError) {
                    console.error('Ошибка IP геолокации:', ipError);
                    await loadWeatherData(DEFAULT_CITY);
                }
            }
            return;
        }
        
        // Продолжаем только если геолокация не запрещена явно
        if (!lastCity) {
            showLoading('Определяем ваше местоположение...');
        }
        
        // Пробуем получить местоположение через GPS с таймаутом
        try {
            const locationPromise = Promise.race([
                getUserLocation(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Превышено время ожидания геолокации')), 7000)
                )
            ]);
            
            const city = await locationPromise;
            await loadWeatherData(city);
        } catch (gpsError) {
            console.log('Не удалось определить местоположение через GPS:', gpsError);
            
            // Если уже загрузили для сохраненного города, не показываем ошибку
            if (!lastCity) {
                try {
                    showLoading('Определяем местоположение по IP...');
                    const city = await getLocationByIP();
                    await loadWeatherData(city);
                } catch (ipError) {
                    console.error('Ошибка определения местоположения по IP:', ipError);
                    await loadWeatherData(DEFAULT_CITY);
                }
            }
        }
    } catch (error) {
        console.error('Общая ошибка инициализации приложения:', error);
        
        // В случае любой ошибки загружаем для города по умолчанию
        try {
            await loadWeatherData(DEFAULT_CITY);
        } catch (finalError) {
            console.error('Критическая ошибка загрузки данных:', finalError);
            showError('Не удалось загрузить погоду. Пожалуйста, проверьте подключение к интернету.');
        }
    } finally {
        hideLoading();
    }
}

// Обработчик поиска с предварительной проверкой ввода
function handleSearch() {
    const city = elements.citySearch.value.trim();
    if (!city) {
        showError('Пожалуйста, введите название города');
        return;
    }
    
    // Проверка на минимальную длину города
    if (city.length < 2) {
        showError('Название города должно содержать минимум 2 символа');
        return;
    }
    
    // Проверка на максимальную длину города
    if (city.length > 50) {
        showError('Название города слишком длинное');
        return;
    }
    
    // Простая проверка на валидные символы
    if (!/^[a-zA-Zа-яА-ЯёЁ\s\-,.]+$/.test(city)) {
        showError('Название города содержит недопустимые символы');
        return;
    }
    
    loadWeatherData(city);
    
    // Убираем фокус с поля ввода, чтобы скрыть клавиатуру на мобильных
    elements.citySearch.blur();
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Решение проблемы с $ в xman.js
    if (typeof $ === 'undefined') {
        window.$ = function() {
            console.warn('jQuery ($) был вызван, но не загружен');
            return {
                ready: function(fn)
