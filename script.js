/**
 * Погодное приложение - оптимизированная версия
 * 
 * Основные улучшения:
 * 1. Использование строгого режима для предотвращения скрытых ошибок
 * 2. Константы вынесены в глобальную область для единой точки контроля
 * 3. Улучшенная обработка ошибок и таймауты на всех уровнях
 * 4. Проверка DOM элементов перед использованием
 * 5. Защита от зависания индикатора загрузки
 * 6. Оптимизация производительности и использования ресурсов
 * 7. Асинхронная загрузка с отображением данных из кеша
 */

'use strict';

// ===== ГЛОБАЛЬНЫЕ КОНСТАНТЫ =====
const API_KEY = 'c708426913319b328c4ff4719583d1c6';
const BASE_URL = 'https://api.openweathermap.org';
const DEFAULT_CITY = 'Грозный';
const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 час в миллисекундах
const CACHE_KEY = 'weatherData';
const LAST_CITY_KEY = 'lastLoadedCity';

// Таймауты (мс)
const TIMEOUTS = {
    API_REQUEST: 5000,          // Таймаут для запросов к API
    GEOLOCATION: 5000,          // Таймаут для получения геолокации
    IP_GEOLOCATION: 3000,       // Таймаут для получения местоположения по IP
    WEATHER_LOADING: 8000,      // Таймаут для загрузки погоды
    LOADING_INDICATOR: 10000,   // Максимальное время отображения индикатора загрузки
    EMERGENCY: 15000,           // Аварийный таймаут для принудительного завершения загрузки
    ANIMATION: 300              // Длительность анимаций
};

// ===== ГЛОБАЛЬНАЯ ЗАЩИТА ОТ ЗАВИСАНИЯ =====
(function setupEmergencyTimeout() {
    // Удаляем любые существующие индикаторы загрузки при старте
    document.querySelectorAll('.loading-overlay').forEach(overlay => overlay.remove());
    
    // Очищаем старые таймауты
    if (window._loadingTimeout) {
        clearTimeout(window._loadingTimeout);
        window._loadingTimeout = null;
    }
    
    // Аварийный таймаут для принудительного завершения загрузки
    setTimeout(() => {
        const loadingOverlays = document.querySelectorAll('.loading-overlay');
        if (loadingOverlays.length > 0) {
            console.warn('АВАРИЙНОЕ ПРЕРЫВАНИЕ ЗАГРУЗКИ: сработал таймаут безопасности');
            loadingOverlays.forEach(overlay => overlay.remove());
            
            // Показываем аварийные данные о погоде
            const weatherResult = document.getElementById('weatherResult');
            if (weatherResult && weatherResult.classList.contains('hidden')) {
                weatherResult.classList.remove('hidden');
                displayEmergencyWeatherData();
            }
        }
    }, TIMEOUTS.EMERGENCY);
    
    // Полифилл для jQuery, если он используется другими скриптами
    if (typeof $ === 'undefined') {
        window.$ = function() {
            return {
                ready: function(fn) { document.addEventListener('DOMContentLoaded', fn); return this; },
                on: function() { return this; },
                css: function() { return this; },
                html: function() { return this; },
                text: function() { return this; }
            };
        };
    }
})();

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ БЕЗОПАСНОГО ДОСТУПА К DOM =====
function safeGetElement(id) {
    const element = document.getElementById(id);
    return element;
}

// ===== DOM ЭЛЕМЕНТЫ =====
const elements = {
    get citySearch() { return safeGetElement('citySearch'); },
    get searchButton() { return safeGetElement('searchButton'); },
    get weatherResult() { return safeGetElement('weatherResult'); },
    get temperature() { return safeGetElement('temperature'); },
    get cityName() { return safeGetElement('cityName'); },
    get weatherDescription() { return safeGetElement('weatherDescription'); },
    get feelsLike() { return safeGetElement('feelsLike'); },
    get maxTemp() { return safeGetElement('maxTemp'); },
    get minTemp() { return safeGetElement('minTemp'); },
    get humidity() { return safeGetElement('humidity'); },
    get windSpeed() { return safeGetElement('windSpeed'); },
    get visibility() { return safeGetElement('visibility'); },
    get forecastDays() { return safeGetElement('forecastDays'); },
    get tipsContainer() { return safeGetElement('tipsContainer'); },
    get weeklyForecastContainer() { return safeGetElement('weeklyForecastContainer'); }
};

// Элементы модального окна
const modalElements = {
    get dayModal() { return safeGetElement('dayModal'); },
    get closeModal() { return safeGetElement('closeModal'); },
    get dayName() { return safeGetElement('modalDayName'); },
    get temperature() { return safeGetElement('modalTemperature'); },
    get weatherDescription() { return safeGetElement('modalWeatherDescription'); },
    get maxTemp() { return safeGetElement('modalMaxTemp'); },
    get minTemp() { return safeGetElement('modalMinTemp'); },
    get feelsLike() { return safeGetElement('modalFeelsLike'); },
    get humidity() { return safeGetElement('modalHumidity'); },
    get windSpeed() { return safeGetElement('modalWindSpeed'); },
    get visibility() { return safeGetElement('modalVisibility'); },
    get hourlyForecast() { return safeGetElement('modalHourlyForecast'); },
    get tipsContainer() { return safeGetElement('modalTipsContainer'); }
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

// ===== РАБОТА С ЛОКАЛЬНЫМ ХРАНИЛИЩЕМ =====

/**
 * Сохраняет данные о погоде в кеш
 * @param {string} city - Название города
 * @param {Object} data - Данные о погоде
 */
function cacheWeatherData(city, data) {
    try {
        if (!city || !data) return;
        
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            city,
            data,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Не удалось сохранить данные в кеш:', error);
    }
}

/**
 * Получает данные о погоде из кеша
 * @returns {Object|null} Кешированные данные или null
 */
function getCachedWeatherData() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const parsedData = JSON.parse(cached);
        
        // Проверяем актуальность данных
        if (Date.now() - parsedData.timestamp > CACHE_EXPIRATION) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        
        // Не используем Москву из кеша
        if (parsedData.city === 'Москва') {
            return null;
        }
        
        return parsedData;
    } catch (error) {
        console.warn('Ошибка при получении данных из кеша:', error);
        return null;
    }
}

/**
 * Получает последний использованный город
 * @returns {string|null} Название города или null
 */
function getLastCity() {
    try {
        const lastCity = localStorage.getItem(LAST_CITY_KEY);
        if (!lastCity || lastCity === 'Москва') return null;
        return lastCity;
    } catch (error) {
        console.warn('Ошибка при получении последнего города:', error);
        return null;
    }
}

/**
 * Очищает устаревшие данные из хранилища
 */
function cleanupStorage() {
    try {
        // Удаляем данные о Москве
        const lastCity = localStorage.getItem(LAST_CITY_KEY);
        if (lastCity === 'Москва') {
            localStorage.removeItem(LAST_CITY_KEY);
            localStorage.removeItem(CACHE_KEY);
        }
        
        // Проверяем валидность кеша
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsedData = JSON.parse(cached);
                if (Date.now() - parsedData.timestamp > CACHE_EXPIRATION) {
                    localStorage.removeItem(CACHE_KEY);
                }
            } catch (e) {
                localStorage.removeItem(CACHE_KEY);
            }
        }
    } catch (error) {
        console.warn('Ошибка при очистке хранилища:', error);
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

/**
 * Форматирует время из timestamp
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Отформатированное время
 */
function formatTime(timestamp) {
    try {
        return new Date(timestamp * 1000).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (error) {
        console.warn('Ошибка форматирования времени:', error);
        return '--:--';
    }
}

/**
 * Определяет день недели из timestamp
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Название дня недели
 */
function getDayOfWeek(timestamp) {
    try {
        const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        return days[new Date(timestamp * 1000).getDay()];
    } catch (error) {
        console.warn('Ошибка определения дня недели:', error);
        return 'День';
    }
}

/**
 * Определяет текущий сезон
 * @returns {string} Сезон (spring/summer/autumn/winter)
 */
function getCurrentSeason() {
    try {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'autumn';
        return 'winter';
    } catch (error) {
        console.warn('Ошибка определения сезона:', error);
        return 'spring';
    }
}

/**
 * Создает эффект ripple при клике
 * @param {Event} event - Событие клика
 */
function createRipple(event) {
    try {
        const target = event.currentTarget;
        if (!target) return;
        
        // Удаляем существующие эффекты ripple
        target.querySelectorAll('.ripple').forEach(ripple => ripple.remove());
        
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
    } catch (error) {
        console.warn('Ошибка создания ripple эффекта:', error);
    }
}

/**
 * Отображает сообщение об ошибке
 * @param {string} message - Текст сообщения
 */
function showError(message) {
    try {
        // Удаляем предыдущие уведомления
        document.querySelectorAll('.error-notification').forEach(error => error.remove());
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        // Добавляем класс для анимации появления
        setTimeout(() => errorDiv.classList.add('show'), 10);
        
        // Удаляем уведомление через 5 секунд
        setTimeout(() => {
            errorDiv.classList.add('hide');
            setTimeout(() => errorDiv.remove(), TIMEOUTS.ANIMATION);
        }, 5000);
    } catch (error) {
        console.error('Ошибка отображения уведомления:', error);
    }
}

/**
 * Отображает индикатор загрузки
 * @param {string} message - Текст сообщения
 */
function showLoading(message = 'Определяем ваше местоположение...') {
    try {
        console.log('Показ индикатора загрузки:', message);
        
        // Удаляем существующий оверлей загрузки
        hideLoading();
        
        // Не показываем загрузку, если результаты уже видны
        const weatherResult = elements.weatherResult;
        if (weatherResult && !weatherResult.classList.contains('hidden')) {
            console.log('Индикатор загрузки пропущен: результаты уже видны');
            return;
        }
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.id = 'loadingOverlay';
        loadingDiv.innerHTML = `
            <div class="loading-spinner">
                <div class="loading-text">${message}</div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
        
        // Очищаем предыдущий таймаут
        if (window._loadingTimeout) {
            clearTimeout(window._loadingTimeout);
        }
        
        // Гарантируем скрытие индикатора через заданное время
        window._loadingTimeout = setTimeout(() => {
            console.warn('Принудительное скрытие индикатора загрузки по таймауту');
            hideLoading();
            
            // Проверяем, отображены ли данные
            setTimeout(() => {
                const weatherResult = elements.weatherResult;
                if (weatherResult && weatherResult.classList.contains('hidden')) {
                    console.warn('Отображаем аварийные данные при таймауте загрузки');
                    displayEmergencyWeatherData();
                }
            }, 500);
        }, TIMEOUTS.LOADING_INDICATOR);
    } catch (error) {
        console.error('Ошибка отображения индикатора загрузки:', error);
    }
}

/**
 * Скрывает индикатор загрузки
 */
function hideLoading() {
    try {
        // Очищаем таймаут
        if (window._loadingTimeout) {
            clearTimeout(window._loadingTimeout);
            window._loadingTimeout = null;
        }
        
        // Находим все оверлеи загрузки
        const loadingDivs = document.querySelectorAll('.loading-overlay');
        
        if (loadingDivs.length === 0) return;
        
        // Добавляем анимацию исчезновения и удаляем
        loadingDivs.forEach(div => {
            div.classList.add('fade-out');
            setTimeout(() => {
                if (div && div.parentNode) {
                    div.remove();
                }
            }, TIMEOUTS.ANIMATION);
        });
        
        // Страховка - дополнительная проверка через 1 секунду
        setTimeout(() => {
            document.querySelectorAll('.loading-overlay').forEach(div => div.remove());
        }, 1000);
    } catch (error) {
        console.error('Ошибка скрытия индикатора загрузки:', error);
        
        // В случае ошибки, удаляем все индикаторы принудительно
        try {
            document.querySelectorAll('.loading-overlay').forEach(div => div.remove());
        } catch (e) {}
    }
}

/**
 * Отображает аварийные данные о погоде
 */
function displayEmergencyWeatherData() {
    try {
        // Показываем блок результатов
        if (elements.weatherResult) {
            elements.weatherResult.classList.remove('hidden');
        }
        
        // Заполняем базовыми данными
        if (elements.cityName) elements.cityName.textContent = DEFAULT_CITY;
        if (elements.temperature) elements.temperature.textContent = '15°';
        if (elements.weatherDescription) elements.weatherDescription.textContent = 'Погода недоступна';
        if (elements.feelsLike) elements.feelsLike.textContent = '14°';
        if (elements.maxTemp) elements.maxTemp.textContent = '17';
        if (elements.minTemp) elements.minTemp.textContent = '13';
        if (elements.humidity) elements.humidity.textContent = '70%';
        if (elements.windSpeed) elements.windSpeed.textContent = '2.5 м/с';
        if (elements.visibility) elements.visibility.textContent = '10.0 км';
        
        // Заполняем прогноз базовыми данными
        showFallbackWeather(DEFAULT_CITY);
    } catch (error) {
        console.error('Ошибка отображения аварийных данных:', error);
    }
}

// ===== ФУНКЦИИ РАБОТЫ С API И ДАННЫМИ =====

/**
 * Получает местоположение по IP-адресу
 * @returns {Promise<string>} Название города
 */
async function getLocationByIP() {
    return new Promise((resolve) => {
        // Используем AbortController для отмены запроса по таймауту
        const controller = new AbortController();
        const signal = controller.signal;
        
        // Создаем таймаут для запроса
        const timeoutId = setTimeout(() => {
            controller.abort();
            console.warn('Таймаут IP геолокации');
            resolve(DEFAULT_CITY);
        }, TIMEOUTS.IP_GEOLOCATION);

        fetch('https://ipapi.co/json/', { signal })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ошибка! статус: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                clearTimeout(timeoutId);
                resolve(data.city || DEFAULT_CITY);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                console.warn('Ошибка IP-геолокации:', error.message);
                resolve(DEFAULT_CITY);
            });
    });
}

/**
 * Получает местоположение через GPS
 * @returns {Promise<string>} Название города
 */
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Геолокация не поддерживается'));
            return;
        }

        const options = {
            enableHighAccuracy: false,
            timeout: TIMEOUTS.GEOLOCATION,
            maximumAge: 60000
        };

        // Таймаут для всего процесса геолокации
        const timeoutId = setTimeout(() => {
            reject(new Error('Превышено время ожидания геолокации'));
        }, TIMEOUTS.GEOLOCATION + 1000);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    clearTimeout(timeoutId);
                    const { latitude, longitude } = position.coords;
                    
                    // Таймаут для запроса API
                    const controller = new AbortController();
                    const signal = controller.signal;
                    
                    const apiTimeoutId = setTimeout(() => {
                        controller.abort();
                        // Используем координаты вместо названия города
                        resolve(`${DEFAULT_CITY}`);
                    }, TIMEOUTS.API_REQUEST / 2);
                    
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
                            // Игнорируем Москву если она вернулась
                            if (data[0].name === 'Москва') {
                                resolve(DEFAULT_CITY);
                            } else {
                                resolve(data[0].name);
                            }
                        } else {
                            resolve(DEFAULT_CITY);
                        }
                    } catch (fetchError) {
                        clearTimeout(apiTimeoutId);
                        console.warn('Ошибка запроса к API геокодирования:', fetchError.message);
                        resolve(DEFAULT_CITY);
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            },
            (error) => {
                clearTimeout(timeoutId);
                reject(new Error('Ошибка геолокации: ' + error.message));
            },
            options
        );
    });
}

/**
 * Проверяет разрешение на использование геолокации
 * @returns {Promise<Object>} Объект с состоянием разрешения
 */
function checkGeolocationPermission() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ state: 'unavailable' });
            return;
        }
        
        // Если API разрешений недоступен
        if (!navigator.permissions || !navigator.permissions.query) {
            resolve({ state: 'unknown' });
            return;
        }
        
        // Добавляем таймаут для запроса разрешений
        const timeoutId = setTimeout(() => {
            resolve({ state: 'unknown' });
        }, 2000);
        
        navigator.permissions.query({ name: 'geolocation' })
            .then((permissionStatus) => {
                clearTimeout(timeoutId);
                resolve({ state: permissionStatus.state });
            })
            .catch(() => {
                clearTimeout(timeoutId);
                resolve({ state: 'unknown' });
            });
    });
}

/**
 * Получает данные о погоде через API
 * @param {string} city - Название города
 * @returns {Promise<Object>} Данные о погоде
 */
async function fetchWeatherData(city) {
    try {
        // Проверка кеша перед запросом
        const cachedData = getCachedWeatherData();
        if (cachedData && cachedData.city === city) {
            console.log('Используем кешированные данные для', city);
            return cachedData.data;
        }

        // Обработка городов на кириллице
        let cityForApi = city;
        if (city === DEFAULT_CITY) {
            cityForApi = 'Grozny';
        } else if (city === 'Москва') {
            cityForApi = 'Moscow';
        }
        
        // Отправляем запрос геокодирования
        const controller = new AbortController();
        const signal = controller.signal;
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.API_REQUEST);
        
        const geoUrl = `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(cityForApi)}&limit=1&appid=${API_KEY}`;
        const geoResponse = await fetch(geoUrl, { signal });
        
        if (!geoResponse.ok) {
            clearTimeout(timeoutId);
            throw new Error(`Ошибка геокодирования: ${geoResponse.status}`);
        }
        
        const geoData = await geoResponse.json();

        if (!geoData.length) {
            clearTimeout(timeoutId);
            // Используем фиксированные координаты для известных городов
            if (city === DEFAULT_CITY || cityForApi === 'Grozny') {
                return fetchWeatherByCoords(43.3168, 45.6981, city);
            } else if (city === 'Москва' || cityForApi === 'Moscow') {
                return fetchWeatherByCoords(55.7558, 37.6173, DEFAULT_CITY);
            }
            throw new Error('Город не найден');
        }

        const { lat, lon } = geoData[0];
        clearTimeout(timeoutId);
        
        return fetchWeatherByCoords(lat, lon, city);
    } catch (error) {
        console.warn('Ошибка запроса данных о погоде:', error.message);
        
        // Если запрос был отменен, используем координаты для известных городов
        if (error.name === 'AbortError') {
            if (city === DEFAULT_CITY) {
                return fetchWeatherByCoords(43.3168, 45.6981, city);
            } else if (city === 'Москва') {
                return fetchWeatherByCoords(55.7558, 37.6173, DEFAULT_CITY);
            }
        }
        throw error;
    }
}

/**
 * Получает данные о погоде по координатам
 * @param {number} lat - Широта
 * @param {number} lon - Долгота
 * @param {string} cityName - Название города
 * @returns {Promise<Object>} Данные о погоде
 */
async function fetchWeatherByCoords(lat, lon, cityName) {
    try {
        // Используем AbortController для контроля таймаута
        const controller = new AbortController();
        const signal = controller.signal;
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.API_REQUEST);
        
        const weatherUrl = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
        const forecastUrl = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
        
        // Отправляем параллельные запросы
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
        
        // Переопределяем название города при необходимости
        if (cityName === DEFAULT_CITY && weather.name !== DEFAULT_CITY) {
            weather.name = DEFAULT_CITY;
        } else if (cityName === 'Москва') {
            // Если запрашиваем Москву, всё равно заменяем на город по умолчанию
            cityName = DEFAULT_CITY;
            weather.name = DEFAULT_CITY;
        }
        
        const result = { weather, forecast };
        
        // Кешируем полученные данные
        cacheWeatherData(cityName, result);
        
        return result;
    } catch (error) {
        console.warn('Ошибка получения погоды по координатам:', error.message);
        throw error;
    }
}

/**
 * Загружает советы для фермеров
 * @returns {Promise<Object>} Советы
 */
async function loadFarmerTips() {
    try {
        // Добавляем параметр с временем для предотвращения кеширования
        const timestamp = new Date().getTime();
        const response = await Promise.race([
            fetch(`https://alihanvu.github.io/weather-app/farmer-tips.json?${timestamp}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Таймаут загрузки советов')), TIMEOUTS.API_REQUEST))
        ]);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.warn('Ошибка загрузки советов:', error.message);
        
        // Резервные советы, если сервер недоступен
        return {
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
    }
}

/**
 * Генерирует советы для фермеров на основе погодных данных
 * @param {Object} weatherData - Данные о погоде
 * @returns {Promise<Array<string>>} Массив советов
 */
async function generateFarmerTips(weatherData) {
    try {
        const tips = await loadFarmerTips();
        if (!tips) {
            return getDefaultTips();
        }

        const result = [];
        const temp = weatherData.main.temp;
        const humidity = weatherData.main.humidity;

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

        // Удаляем дубликаты и ограничиваем количество
        return [...new Set(result)].slice(0, 5);
    } catch (error) {
        console.warn('Ошибка генерации советов:', error.message);
        return getDefaultTips();
    }
}

/**
 * Возвращает набор стандартных советов
 * @returns {Array<string>} Массив советов
 */
function getDefaultTips() {
    return [
        "Поливайте растения в соответствии с погодными условиями", 
        "Следите за состоянием почвы", 
        "Защищайте растения от экстремальных погодных условий"
    ];
}

/**
 * Группирует данные прогноза по дням
 * @param {Object} forecast - Данные прогноза
 * @returns {Object} Прогноз, сгруппированный по дням
 */
function groupForecastByDays(forecast) {
    try {
        const dailyForecasts = {};
        
        forecast.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const day = date.toISOString().split('T')[0];
            
            // Создаем объект для нового дня, если его еще нет
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
                    shortDay: shortDayName,
                    hourlyData: []
                };
            }
            
            // Добавляем данные для текущего временного интервала
            dailyForecasts[day].temps.push(item.main.temp);
            dailyForecasts[day].humidity.push(item.main.humidity);
            dailyForecasts[day].windSpeed.push(item.wind.speed);
            dailyForecasts[day].visibility.push(item.visibility);
            dailyForecasts[day].feelsLike.push(item.main.feels_like);
            
            if (item.weather && item.weather[0]) {
                dailyForecasts[day].weather.push(item.weather[0].icon);
                dailyForecasts[day].weatherData.push(item.weather[0]);
            }
            
            // Сохраняем полные данные для почасового прогноза
            dailyForecasts[day].hourlyData.push(item);
        });
        
        return dailyForecasts;
    } catch (error) {
        console.warn('Ошибка группировки прогноза по дням:', error.message);
        return {};
    }
}

// ===== ФУНКЦИИ ОБНОВЛЕНИЯ UI =====

/**
 * Обновляет данные о текущей погоде
 * @param {Object} data - Данные о погоде
 */
function updateCurrentWeather(data) {
    try {
        const { main, weather, name, visibility, wind } = data;
        
        // Обновляем UI только если элементы существуют
        if (elements.cityName) elements.cityName.textContent = name;
        if (elements.temperature) elements.temperature.textContent = `${Math.round(main.temp)}°`;
        if (elements.weatherDescription && weather && weather[0]) {
            elements.weatherDescription.textContent = weather[0].description.charAt(0).toUpperCase() + 
                                                    weather[0].description.slice(1);
        }
        if (elements.feelsLike) elements.feelsLike.textContent = `${Math.round(main.feels_like)}°`;
        if (elements.maxTemp) elements.maxTemp.textContent = Math.round(main.temp_max);
        if (elements.minTemp) elements.minTemp.textContent = Math.round(main.temp_min);
        if (elements.humidity) elements.humidity.textContent = `${main.humidity}%`;
        if (elements.windSpeed) elements.windSpeed.textContent = `${wind.speed.toFixed(1)} м/с`;
        if (elements.visibility) elements.visibility.textContent = `${(visibility / 1000).toFixed(1)} км`;
    } catch (error) {
        console.warn('Ошибка обновления текущей погоды:', error.message);
    }
}

/**
 * Обновляет почасовой прогноз
 * @param {Object} forecast - Данные прогноза
 */
function updateHourlyForecast(forecast) {
    try {
        if (!elements.forecastDays) return;
        elements.forecastDays.innerHTML = '';
        
        if (!forecast || !forecast.list || !Array.isArray(forecast.list)) {
            console.warn('Неверные данные прогноза:', forecast);
            return;
        }
        
        // Берем только первые 24 часа
        forecast.list.slice(0, 24).forEach((item, index) => {
            const hourlyDiv = document.createElement('div');
            hourlyDiv.className = 'forecast-hour';
            hourlyDiv.style.animationDelay = `${index * 0.1}s`;
            
            // Определяем иконку погоды
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
        console.warn('Ошибка обновления почасового прогноза:', error.message);
    }
}

/**
 * Обновляет недельный прогноз
 * @param {Object} forecast - Данные прогноза
 */
function updateWeeklyForecast(forecast) {
    try {
        if (!elements.weeklyForecastContainer) return;
        elements.weeklyForecastContainer.innerHTML = '';
        
        if (!forecast || !forecast.list || !Array.isArray(forecast.list)) {
            console.warn('Неверные данные прогноза для недельного обновления:', forecast);
            return;
        }
        
        // Группируем прогноз по дням
        const dailyForecasts = groupForecastByDays(forecast);
        const uniqueDays = Object.values(dailyForecasts).slice(0, 7);
        
        uniqueDays.forEach((dayData, index) => {
            try {
                // Рассчитываем среднюю температуру
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
                    Object.entries(iconCounts).forEach(([icon, count]) => {
                        if (count > maxIconCount) {
                            maxIconCount = count;
                            mostFrequentIcon = icon;
                        }
                    });
                }
                
                // Создаем элемент для дня недели
                const dayElement = document.createElement('div');
                dayElement.className = 'weekly-day';
                dayElement.style.animationDelay = `${index * 0.1}s`;
                dayElement.setAttribute('data-date', dayData.date);
                
                dayElement.innerHTML = `
                    <div class="weekly-day-name">${dayData.day}</div>
                    <div class="weekly-day-icon">${weatherEmoji[mostFrequentIcon]}</div>
                    <div class="weekly-day-temp">${avgTemp}°</div>
                `;
                
                // Добавляем обработчики событий
                dayElement.addEventListener('click', createRipple);
                dayElement.addEventListener('click', () => openDayWeatherModal(dayData));
                
                elements.weeklyForecastContainer.appendChild(dayElement);
            } catch (dayError) {
                console.warn('Ошибка обработки дня прогноза:', dayError.message);
            }
        });
    } catch (error) {
        console.warn('Ошибка обновления недельного прогноза:', error.message);
    }
}

/**
 * Обновляет советы для фермеров
 * @param {Object} weatherData - Данные о погоде
 */
async function updateFarmerTips(weatherData) {
    try {
        if (!elements.tipsContainer) return;
        elements.tipsContainer.innerHTML = '';
        
        const tips = await generateFarmerTips(weatherData);
        
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
        console.warn('Ошибка обновления советов для фермеров:', error.message);
        
        // Показываем стандартные советы при ошибке
        if (elements.tipsContainer) {
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
}

/**
 * Показывает заглушку с данными о погоде
 * @param {string} city - Название города
 */
function showFallbackWeather(city) {
    try {
        // Базовые данные для отображения
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
        
        // Обновляем интерфейс базовыми данными
        updateCurrentWeather(fallbackData.weather);
        updateHourlyForecast(fallbackData.forecast);
        
        // Создаем минимальный недельный прогноз
        if (elements.weeklyForecastContainer) {
            elements.weeklyForecastContainer.innerHTML = '';
            
            // Получаем названия дней недели на неделю вперед
            const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
            const today = new Date();
            
            // Создаем простую карточку для каждого дня недели
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dayName = days[date.getDay()];
                
                // Генерируем случайную температуру для разнообразия
                const temp = Math.round(15 - i % 5 + Math.sin(i) * 3);
                
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
        }
        
        // Показываем базовые советы
        if (elements.tipsContainer) {
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
        
        // Показываем блок с результатами
        if (elements.weatherResult) {
            elements.weatherResult.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Ошибка при отображении fallback данных:', error.message);
    }
}

// ===== ФУНКЦИИ МОДАЛЬНОГО ОКНА =====

/**
 * Открывает модальное окно с погодой на выбранный день
 * @param {Object} dayData - Данные о погоде на день
 */
async function openDayWeatherModal(dayData) {
    try {
        if (!modalElements.dayModal || !dayData) return;
        
        // Базовые данные о дне
        if (modalElements.dayName) modalElements.dayName.textContent = dayData.day;
        
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
            const weatherCounts = {};
            dayData.weatherData.forEach(item => {
                if (!weatherCounts[item.description]) {
                    weatherCounts[item.description] = 0;
                }
                weatherCounts[item.description]++;
            });
            
            let maxCount = 0;
            Object.entries(weatherCounts).forEach(([description, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    mostFrequentWeather = description;
                }
            });
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
            Object.entries(iconCounts).forEach(([icon, count]) => {
                if (count > maxIconCount) {
                    maxIconCount = count;
                    mostFrequentIcon = icon;
                }
            });
        }
        
        // Обновляем данные в модальном окне
        if (modalElements.temperature) modalElements.temperature.textContent = `${avgTemp}°`;
        if (modalElements.weatherDescription) {
            modalElements.weatherDescription.textContent = mostFrequentWeather ? 
                mostFrequentWeather.charAt(0).toUpperCase() + mostFrequentWeather.slice(1) : "-";
        }
        if (modalElements.maxTemp) modalElements.maxTemp.textContent = maxTemp;
        if (modalElements.minTemp) modalElements.minTemp.textContent = minTemp;
        if (modalElements.humidity) modalElements.humidity.textContent = `${avgHumidity}%`;
        if (modalElements.windSpeed) modalElements.windSpeed.textContent = `${avgWindSpeed} м/с`;
        if (modalElements.visibility) modalElements.visibility.textContent = `${avgVisibility} км`;
        if (modalElements.feelsLike) modalElements.feelsLike.textContent = `${avgFeelsLike}°`;
        
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
        console.warn('Ошибка при открытии модального окна:', error.message);
        showError('Не удалось загрузить детали погоды для выбранного дня');
    }
}

/**
 * Обновляет почасовой прогноз в модальном окне
 * @param {Array} hourlyData - Данные почасового прогноза
 */
function updateModalHourlyForecast(hourlyData) {
    try {
        if (!modalElements.hourlyForecast) return;
        modalElements.hourlyForecast.innerHTML = '';
        
        if (!hourlyData || !Array.isArray(hourlyData)) {
            console.warn('Неверные данные почасового прогноза для модального окна:', hourlyData);
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
    } catch (error) {
        console.warn('Ошибка обновления почасового прогноза в модальном окне:', error.message);
    }
}

/**
 * Обновляет советы в модальном окне
 * @param {Object} weatherData - Данные о погоде
 */
async function updateModalFarmerTips(weatherData) {
    try {
        if (!modalElements.tipsContainer) return;
        modalElements.tipsContainer.innerHTML = '';
        
        const tips = await generateFarmerTips(weatherData);
        
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
        console.warn('Ошибка обновления советов в модальном окне:', error.message);
        
        // Показываем стандартные советы при ошибке
        if (modalElements.tipsContainer) {
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
}

/**
 * Закрывает модальное окно
 */
function closeDayWeatherModal() {
    try {
        if (!modalElements.dayModal) return;
        
        modalElements.dayModal.classList.remove('visible');
        
        // Задержка для анимации закрытия
        setTimeout(() => {
            modalElements.dayModal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        }, TIMEOUTS.ANIMATION);
    } catch (error) {
        console.warn('Ошибка закрытия модального окна:', error.message);
        
        // В случае ошибки принудительно скрываем модальное окно
        if (modalElements.dayModal) {
            modalElements.dayModal.classList.add('hidden');
        }
        document.body.classList.remove('modal-open');
    }
}

// ===== ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ =====

/**
 * Загружает данные о погоде
 * @param {string} city - Название города
 */
async function loadWeatherData(city) {
    // Если город Москва, заменяем на город по умолчанию
    if (city === 'Москва') {
        city = DEFAULT_CITY;
    }
    
    console.log(`Загрузка данных о погоде для ${city}`);
    const startTime = Date.now();
    
    try {
        // Определяем, первая ли это загрузка
        const isFirstLoad = elements.weatherResult && elements.weatherResult.classList.contains('hidden');
        
        // Показываем индикатор загрузки только при первой загрузке
        if (isFirstLoad) {
            showLoading(`Загружаем данные о погоде для ${city}...`);
        }
        
        // Добавляем таймаут для запроса данных
        const weatherPromise = Promise.race([
            fetchWeatherData(city),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Время ожидания получения погоды истекло')), 
                TIMEOUTS.WEATHER_LOADING)
            )
        ]);
        
        const data = await weatherPromise;
        
        if (!data || !data.weather || !data.forecast) {
            throw new Error('Получены неполные данные о погоде');
        }
        
       // Обновляем UI
        updateCurrentWeather(data.weather);
        updateHourlyForecast(data.forecast);
        updateWeeklyForecast(data.forecast);
        
        // Асинхронно обновляем советы
        setTimeout(async () => {
            try {
                await updateFarmerTips(data.weather);
            } catch (e) {
                console.warn('Ошибка асинхронного обновления советов:', e.message);
            }
        }, 10);
        
        // Показываем результаты
        if (elements.weatherResult) {
            elements.weatherResult.classList.remove('hidden');
        }
        
        // Сохраняем последний успешно загруженный город
        localStorage.setItem(LAST_CITY_KEY, city);
        
        console.log(`Данные о погоде для ${city} загружены за ${(Date.now() - startTime)/1000} секунд`);
    } catch (error) {
        console.warn('Ошибка загрузки данных о погоде:', error.message);
        
        // Проверяем, есть ли кешированные данные
        const cached = getCachedWeatherData();
        if (cached) {
            console.log('Используем кешированные данные');
            try {
                updateCurrentWeather(cached.data.weather);
                updateHourlyForecast(cached.data.forecast);
                updateWeeklyForecast(cached.data.forecast);
                
                setTimeout(async () => {
                    try {
                        await updateFarmerTips(cached.data.weather);
                    } catch (e) {}
                }, 10);
                
                if (elements.weatherResult) {
                    elements.weatherResult.classList.remove('hidden');
                }
                
                showError(`Используются сохраненные данные. ${error.message}`);
                return;
            } catch (cacheError) {
                console.warn('Ошибка использования кеша:', cacheError.message);
            }
        }
        
        // Если нет кеша или кеш не сработал
        if (city !== DEFAULT_CITY) {
            showError(`Не удалось загрузить погоду для "${city}". Используем город по умолчанию.`);
            // Рекурсивный вызов для города по умолчанию
            loadWeatherData(DEFAULT_CITY);
        } else {
            // Если уже пытались загрузить город по умолчанию
            showError(`Не удалось загрузить данные о погоде: ${error.message}`);
            showFallbackWeather(city);
        }
    } finally {
        // Всегда скрываем индикатор загрузки
        hideLoading();
    }
}

/**
 * Загружает свежие данные о погоде после отображения базовых
 */
async function loadFreshWeatherData() {
    try {
        // Очищаем устаревшие данные
        cleanupStorage();
        
        // Проверяем сохраненный город
        const savedCity = getLastCity();
        
        // Проверяем разрешение на геолокацию
        const geoPermission = await checkGeolocationPermission();
        
        // Если геолокация запрещена или недоступна
        if (geoPermission.state === 'denied' || geoPermission.state === 'unavailable') {
            console.log('Геолокация недоступна или запрещена');
            try {
                // Пробуем определить местоположение по IP
                const city = await getLocationByIP();
                await loadWeatherData(city);
            } catch (ipError) {
                console.warn('Ошибка определения местоположения по IP:', ipError.message);
                if (savedCity) {
                    await loadWeatherData(savedCity);
                } else {
                    await loadWeatherData(DEFAULT_CITY);
                }
            }
            return;
        }
        
        // Пробуем получить местоположение через GPS
        try {
            const locationPromise = Promise.race([
                getUserLocation(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Превышено время ожидания геолокации')), 
                    TIMEOUTS.GEOLOCATION)
                )
            ]);
            
            const city = await locationPromise;
            await loadWeatherData(city);
        } catch (gpsError) {
            console.warn('Ошибка определения местоположения через GPS:', gpsError.message);
            
            // Если есть сохраненный город
            if (savedCity) {
                await loadWeatherData(savedCity);
            } else {
                // Пробуем IP-геолокацию
                try {
                    const city = await getLocationByIP();
                    await loadWeatherData(city);
                } catch (ipError) {
                    console.warn('Ошибка определения местоположения по IP:', ipError.message);
                    await loadWeatherData(DEFAULT_CITY);
                }
            }
        }
    } catch (error) {
        console.warn('Общая ошибка загрузки свежих данных:', error.message);
    }
}

/**
 * Обработчик поиска города
 */
function handleSearch() {
    try {
        if (!elements.citySearch) return;
        
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
        
        // Проверка на валидные символы
        if (!/^[a-zA-Zа-яА-ЯёЁ\s\-,.]+$/.test(city)) {
            showError('Название города содержит недопустимые символы');
            return;
        }
        
        loadWeatherData(city);
        
        // Убираем фокус с поля ввода
        elements.citySearch.blur();
    } catch (error) {
        console.warn('Ошибка обработки поиска:', error.message);
        showError('Произошла ошибка при поиске. Попробуйте еще раз.');
    }
}

/**
 * Инициализация приложения
 */
async function initApp() {
    console.log('Инициализация приложения');
    
    try {
        // Очищаем хранилище от устаревших данных
        cleanupStorage();
        
        // Проверяем кеш - если есть, показываем данные сразу
        const cached = getCachedWeatherData();
        if (cached) {
            console.log('Найден кеш, отображаем сохраненные данные');
            updateCurrentWeather(cached.data.weather);
            updateHourlyForecast(cached.data.forecast);
            updateWeeklyForecast(cached.data.forecast);
            
            setTimeout(async () => {
                try {
                    await updateFarmerTips(cached.data.weather);
                } catch (e) {}
            }, 10);
            
            if (elements.weatherResult) {
                elements.weatherResult.classList.remove('hidden');
            }
            
            // Асинхронно загружаем свежие данные
            setTimeout(() => {
                loadFreshWeatherData();
            }, 500);
            
            return;
        }
        
        // Если нет кеша, начинаем с отображения данных для города по умолчанию
        console.log('Нет кешированных данных, отображаем базовую информацию');
        showFallbackWeather(DEFAULT_CITY);
        
        // Затем асинхронно загружаем актуальные данные
        setTimeout(() => {
            loadFreshWeatherData();
        }, 500);
    } catch (error) {
        console.warn('Ошибка инициализации приложения:', error.message);
        
        // В крайнем случае, показываем минимальные данные
        showFallbackWeather(DEFAULT_CITY);
    }
}

/**
 * Инициализация обработчиков событий
 */
function setupEventListeners() {
    try {
        // Поиск города
        if (elements.searchButton) {
            elements.searchButton.addEventListener('click', handleSearch);
        }
        
        if (elements.citySearch) {
            elements.citySearch.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    handleSearch();
                }
            });
        }
        
        // Модальное окно
        if (modalElements.closeModal) {
            modalElements.closeModal.addEventListener('click', closeDayWeatherModal);
        }
        
        if (modalElements.dayModal) {
            modalElements.dayModal.addEventListener('click', (event) => {
                if (event.target === modalElements.dayModal) {
                    closeDayWeatherModal();
                }
            });
        }

        // Эффект ripple для элементов UI
        document.querySelectorAll('.search-button, .detail-item, .tip-item, .weekly-day').forEach(element => {
            if (element) {
                element.addEventListener('click', createRipple);
            }
        });
        
        // Обновление при возвращении на страницу
        window.addEventListener('focus', () => {
            // Проверяем актуальность кеша
            const cached = getCachedWeatherData();
            if (cached) {
                const cacheTime = Date.now() - cached.timestamp;
                // Обновляем данные, если кеш старше 15 минут и страница видима
                if (cacheTime > 15 * 60 * 1000 && document.visibilityState === 'visible') {
                    let cityToUpdate = DEFAULT_CITY;
                    
                    // Определяем город для обновления
                    if (elements.cityName && elements.cityName.textContent && 
                        elements.cityName.textContent !== '-') {
                        cityToUpdate = elements.cityName.textContent;
                        if (cityToUpdate === 'Москва') {
                            cityToUpdate = DEFAULT_CITY;
                        }
                    } else if (cached.city && cached.city !== 'Москва') {
                        cityToUpdate = cached.city;
                    }
                    
                    loadWeatherData(cityToUpdate);
                }
            }
        });
    } catch (error) {
        console.warn('Ошибка установки обработчиков событий:', error.message);
    }
}

// Запуск приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен');
    
    try {
        // Решение проблемы с jQuery
        if (typeof $ === 'undefined') {
            window.$ = function() {
                return {
                    ready: function(fn) { document.addEventListener('DOMContentLoaded', fn); return this; },
                    on: function() { return this; },
                    css: function() { return this; },
                    html: function() { return this; },
                    text: function() { return this; }
                };
            };
        }
        
        // Устанавливаем обработчики событий
        setupEventListeners();
        
        // Запускаем приложение с небольшой задержкой
        setTimeout(() => {
            initApp();
        }, 100);
    } catch (error) {
        console.error('Критическая ошибка при запуске приложения:', error.message);
        
        // Показываем базовые данные в крайнем случае
        setTimeout(() => {
            try {
                showFallbackWeather(DEFAULT_CITY);
                if (elements.weatherResult) {
                    elements.weatherResult.classList.remove('hidden');
                }
            } catch (e) {}
        }, 1000);
    }
});
