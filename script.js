'use strict';

// ===== ГЛОБАЛЬНЫЕ КОНСТАНТЫ =====
const API_KEY = 'c708426913319b328c4ff4719583d1c6';
const BASE_URL = 'https://api.openweathermap.org';
const DEFAULT_CITY = 'Грозный';
const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 час в миллисекундах
const CACHE_KEY = 'weatherData';
const LAST_CITY_KEY = 'lastLoadedCity';

// iOS Animation Constants - Константы iOS анимаций
const IOS_ANIMATIONS = {
    // Длительности анимаций (мс)
    DURATIONS: {
        MICRO: 150,       // Микро-переходы (кнопки, тапы)
        QUICK: 250,       // Быстрые переходы (смена состояний)
        STANDARD: 350,    // Стандартные переходы (появление элементов)
        EMPHASIZED: 500   // Акцентированные переходы (модальные окна)
    },
    
    // Функции плавности (easing) - точно как в iOS 17
    EASING: {
        SPRING: 'cubic-bezier(0.23, 1, 0.32, 1)',      // Основная пружинная
        BOUNCE: 'cubic-bezier(0.34, 1.56, 0.64, 1)',   // Отскок
        STANDARD: 'cubic-bezier(0.4, 0.0, 0.22, 1)',   // Стандартная
        EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',        // Ease-out
        EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)'          // Ease-in
    },
    
    // Задержки для последовательности (мс)
    STAGGER: {
        ULTRA_FAST: 20,   // Минимально заметная задержка
        FAST: 30,         // Быстрая последовательность
        NORMAL: 50,       // Обычная последовательность
        SLOW: 80          // Заметная последовательность
    },
    
    // Масштабы трансформации - точные значения как в iOS
    SCALE: {
        PRESS: 0.97,      // Масштаб при нажатии на элемент
        ACTIVE: 1.03,     // Масштаб активного элемента
        HOVER: 1.02,      // Масштаб при наведении (для десктопа)
        SPRING_INITIAL: 0.95 // Начальный масштаб для пружинных анимаций
    }
};

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

// Известные города с координатами
const KNOWN_CITIES = {
    'Москва': { lat: 55.7558, lon: 37.6173 },
    'Санкт-Петербург': { lat: 59.9343, lon: 30.3351 },
    'Грозный': { lat: 43.3168, lon: 45.6981 },
    'Казань': { lat: 55.7887, lon: 49.1221 },
    'Нижний Новгород': { lat: 56.2965, lon: 43.9361 }
};

// Переводы городов для API
const CITY_TRANSLATIONS = {
    'Москва': 'Moscow',
    'Санкт-Петербург': 'Saint Petersburg',
    'Грозный': 'Grozny',
    'Казань': 'Kazan',
    'Нижний Новгород': 'Nizhny Novgorod'
};

// Нормализация названий для поиска
const CITY_NORMALIZATIONS = {
    'москва': 'Москва',
    'питер': 'Санкт-Петербург',
    'спб': 'Санкт-Петербург',
    'санкт петербург': 'Санкт-Петербург',
    'санкт-петербург': 'Санкт-Петербург',
    'грозный': 'Грозный',
    'казань': 'Казань'
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
        return lastCity || null;
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
 * Определяет, поддерживает ли устройство сложные анимации
 * @returns {boolean} true, если устройство мощное
 */
function isHighPerformanceDevice() {
    // Определяем производительное устройство по:
    // 1. Не мобильное устройство
    // 2. Или достаточно мощный процессор (обычно на десктопе)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Если не мобильное - считаем высокопроизводительным
    if (!isMobile) return true;
    
    // Используем базовую эвристику для определения производительности
    // Более современные браузеры будут иметь эти возможности
    return 'serviceWorker' in navigator && 
           'requestIdleCallback' in window &&
           'IntersectionObserver' in window;
}

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
 * Создает эффект ripple в стиле iOS
 * @param {Event} event - Событие клика
 */
function createRipple(event) {
    try {
        const target = event.currentTarget;
        if (!target) return;
        
        // На слабых устройствах используем более простой эффект
        if (!isHighPerformanceDevice()) {
            // Упрощенный эффект для слабых устройств
            target.classList.add('simple-active');
            setTimeout(() => target.classList.remove('simple-active'), 300);
            return;
        }
        
        // Удаляем существующие эффекты ripple
        target.querySelectorAll('.ripple').forEach(ripple => ripple.remove());
        
        // iOS-стиль: более локализованный и сдержанный эффект
        const ripple = document.createElement('span');
        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 0.5; // Меньший эффект для iOS
        
        ripple.style.width = ripple.style.height = `${size}px`;
        const x = event.clientX - rect.left - (size / 2);
        const y = event.clientY - rect.top - (size / 2);
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        ripple.className = 'ripple';
        
        // Добавляем эффект уменьшения (scale-down) для элемента
        target.style.transform = 'scale(0.97)';
        target.style.transition = `transform 0.15s ${IOS_ANIMATIONS.EASING.EASE_IN}`;
        
        target.appendChild(ripple);
        
        // Удаляем ripple после анимации и возвращаем элемент к нормальному размеру
        setTimeout(() => {
            target.style.transform = '';
            target.style.transition = `transform 0.2s ${IOS_ANIMATIONS.EASING.SPRING}`;
            
            if (ripple && ripple.parentNode === target) {
                target.removeChild(ripple);
            }
        }, 400);
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
        
        // Анимация уже определена в CSS, не требуется добавлять классы
        
        // Удаляем уведомление через 5 секунд
        setTimeout(() => {
            if (errorDiv && errorDiv.parentNode) {
                errorDiv.remove();
            }
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
            
            // Добавляем iOS-стиль анимации
            requestAnimationFrame(() => {
                elements.weatherResult.style.opacity = '1';
                elements.weatherResult.style.transform = 'translateY(0)';
            });
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
                            resolve(data[0].name);
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
        console.log('Запрашиваем погоду для города:', city);
        
        // ВАЖНО: всегда выполняем прямой запрос к API, игнорируя кеш и локальные данные
        // Создаем URL для прямого геокодирования
        const geoUrl = `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
        
        console.log('Отправляем запрос к Geo API:', geoUrl);
        
        // Прямой запрос к API геокодирования для получения координат города
        const geoResponse = await fetch(geoUrl);
        
        if (!geoResponse.ok) {
            throw new Error(`Ошибка геокодирования: ${geoResponse.status}`);
        }
        
        const geoData = await geoResponse.json();
        console.log('Ответ от Geo API:', geoData);
        
        // Если город не найден, пробуем искать через альтернативный API
        if (!geoData || geoData.length === 0) {
            console.log('Город не найден через основной API, пробуем прямой запрос погоды');
            
            // Пробуем прямой запрос текущей погоды по названию города
            const directWeatherUrl = `${BASE_URL}/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=ru&appid=${API_KEY}`;
            
            console.log('Отправляем прямой запрос текущей погоды:', directWeatherUrl);
            const weatherResponse = await fetch(directWeatherUrl);
            
            if (!weatherResponse.ok) {
                throw new Error(`Город не найден: ${weatherResponse.status}`);
            }
            
            const weather = await weatherResponse.json();
            
            // Получаем координаты из ответа по погоде
            const { lat, lon } = weather.coord;
            
            // Теперь получаем прогноз по координатам
            const forecastUrl = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
            console.log('Получаем прогноз по координатам:', forecastUrl);
            
            const forecastResponse = await fetch(forecastUrl);
            
            if (!forecastResponse.ok) {
                throw new Error(`Ошибка получения прогноза: ${forecastResponse.status}`);
            }
            
            const forecast = await forecastResponse.json();
            
            const result = { weather, forecast };
            
            // Кешируем полученные данные
            cacheWeatherData(city, result);
            
            return result;
        }
        
        // Получаем координаты из результата геокодирования
        const { lat, lon, name } = geoData[0];
        
        console.log('Получены координаты:', lat, lon, 'для города:', name);
        
        // Теперь получаем текущую погоду и прогноз по координатам
        const weatherUrl = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
        const forecastUrl = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
        
        console.log('Запрашиваем текущую погоду и прогноз по координатам');
        
        // Выполняем параллельные запросы для текущей погоды и прогноза
        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);
        
        if (!weatherResponse.ok) {
            throw new Error(`Ошибка получения текущей погоды: ${weatherResponse.status}`);
        }
        
        if (!forecastResponse.ok) {
            throw new Error(`Ошибка получения прогноза: ${forecastResponse.status}`);
        }
        
        const weather = await weatherResponse.json();
        const forecast = await forecastResponse.json();
        
        // Сохраняем название города из запроса пользователя
        weather.name = name || city;
        
        const result = { weather, forecast };
        
        // Кешируем полученные данные
        cacheWeatherData(city, result);
        
        return result;
    } catch (error) {
        console.error('Ошибка получения данных о погоде:', error);
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
            fetch(`farmer-tips.json?${timestamp}`, {
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
 * Обновляет почасовой прогноз с iOS-анимациями
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
        
        // Создаем DocumentFragment для оптимизации DOM операций
        const fragment = document.createDocumentFragment();
        
        // Ограничиваем количество элементов для производительности
        const isHighPerf = isHighPerformanceDevice();
        const limit = isHighPerf ? 24 : 12;
        
        // Берем только первые часы
        forecast.list.slice(0, limit).forEach((item, index) => {
            const hourlyDiv = document.createElement('div');
            hourlyDiv.className = 'forecast-hour';
            hourlyDiv.style.setProperty('--index', index); // Для управления задержкой анимации в CSS
            
            // Определяем иконку погоды
            const icon = item.weather && item.weather[0] && item.weather[0].icon 
                ? weatherEmoji[item.weather[0].icon] 
                : "🌦️";
            
            hourlyDiv.innerHTML = `
                <div class="forecast-time">${index === 0 ? 'Сейчас' : formatTime(item.dt)}</div>
                <div class="forecast-icon">${icon}</div>
                <div class="forecast-temp">${Math.round(item.main.temp)}°</div>
            `;
            
            // Добавляем обработчик для iOS-эффекта нажатия
            hourlyDiv.addEventListener('click', createRipple);
            
            fragment.appendChild(hourlyDiv);
        });
        
        // Вставляем все элементы за одну DOM операцию
        elements.forecastDays.appendChild(fragment);
    } catch (error) {
        console.warn('Ошибка обновления почасового прогноза:', error.message);
    }
}

/**
 * Обновляет недельный прогноз с iOS-анимациями
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
        
        // Создаем DocumentFragment для оптимизации DOM операций
        const fragment = document.createDocumentFragment();
        
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
                
                // Создаем элемент для дня недели с iOS-анимацией
                const dayElement = document.createElement('div');
                dayElement.className = 'weekly-day';
                dayElement.style.setProperty('--day-index', index); // Для управления задержкой анимации
                
                dayElement.setAttribute('data-date', dayData.date);
                
                dayElement.innerHTML = `
                    <div class="weekly-day-name">${dayData.day}</div>
                    <div class="weekly-day-icon">${weatherEmoji[mostFrequentIcon]}</div>
                    <div class="weekly-day-temp">${avgTemp}°</div>
                `;
                
                // Добавляем iOS-эффект нажатия
                dayElement.addEventListener('click', createRipple);
                dayElement.addEventListener('click', () => openDayWeatherModal(dayData));
                
                fragment.appendChild(dayElement);
            } catch (dayError) {
                console.warn('Ошибка обработки дня прогноза:', dayError.message);
            }
        });
        
        // Вставляем все элементы за одну DOM операцию
        elements.weeklyForecastContainer.appendChild(fragment);
    } catch (error) {
        console.warn('Ошибка обновления недельного прогноза:', error.message);
    }
}

/**
 * Обновляет советы для фермеров с iOS-анимациями
 * @param {Object} weatherData - Данные о погоде
 */
async function updateFarmerTips(weatherData) {
    try {
        if (!elements.tipsContainer) return;
        elements.tipsContainer.innerHTML = '';
        
        const tips = await generateFarmerTips(weatherData);
        
        // Создаем DocumentFragment для оптимизации DOM операций
        const fragment = document.createDocumentFragment();
        
        tips.forEach((tip, index) => {
            const tipElement = document.createElement('div');
            tipElement.className = 'tip-item';
            tipElement.style.setProperty('--tip-index', index); // Для управления задержкой анимации
            
            tipElement.innerHTML = `
                <span class="tip-icon">🌱</span>
                <span class="tip-text">${tip}</span>
            `;
            
            // Добавляем обработчик для iOS-эффекта
            tipElement.addEventListener('click', createRipple);
            
            fragment.appendChild(tipElement);
        });
        
        // Вставляем все элементы за одну DOM операцию
        elements.tipsContainer.appendChild(fragment);
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
            
            // Создаем DocumentFragment для оптимизации DOM операций
            const fragment = document.createDocumentFragment();
            
            // Создаем простую карточку для каждого дня недели
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dayName = days[date.getDay()];
                
                // Генерируем случайную температуру для разнообразия
                const temp = Math.round(15 - i % 5 + Math.sin(i) * 3);
                
                const dayElement = document.createElement('div');
                dayElement.className = 'weekly-day';
                dayElement.style.setProperty('--day-index', i);
                
                dayElement.innerHTML = `
                    <div class="weekly-day-name">${dayName}</div>
                    <div class="weekly-day-icon">${weatherEmoji['04d']}</div>
                    <div class="weekly-day-temp">${temp}°</div>
                `;
                
                // iOS эффект нажатия
                dayElement.addEventListener('click', createRipple);
                
                fragment.appendChild(dayElement);
            }
            
            elements.weeklyForecastContainer.appendChild(fragment);
        }
        
        // Показываем базовые советы
        if (elements.tipsContainer) {
            elements.tipsContainer.innerHTML = `
                <div class="tip-item" style="--tip-index: 0;">
                    <span class="tip-icon">🌱</span>
                    <span class="tip-text">Следите за прогнозом погоды для планирования сельскохозяйственных работ</span>
                </div>
                <div class="tip-item" style="--tip-index: 1;">
                    <span class="tip-icon">🌱</span>
                    <span class="tip-text">Адаптируйте полив в соответствии с текущими погодными условиями</span>
                </div>
            `;
            
            // Добавляем обработчики с iOS-эффектом
            elements.tipsContainer.querySelectorAll('.tip-item').forEach(item => {
                item.addEventListener('click', createRipple);
            });
        }
        
        // Показываем блок с результатами с iOS-анимацией
        if (elements.weatherResult) {
            elements.weatherResult.classList.remove('hidden');
            
            // Добавляем анимацию в стиле iOS
            requestAnimationFrame(() => {
                elements.weatherResult.style.opacity = '1';
                elements.weatherResult.style.transform = 'translateY(0)';
            });
        }
    } catch (error) {
        console.error('Ошибка при отображении fallback данных:', error.message);
    }
}

// ===== ФУНКЦИИ МОДАЛЬНОГО ОКНА =====

/**
 * Открывает модальное окно с погодой на выбранный день с iOS-анимацией
 * @param {Object} dayData - Данные о погоде на день
 */
function openDayWeatherModal(dayData) {
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
        updateModalFarmerTips({
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
        
        // Сначала покажем модальное окно (сделаем его видимым)
        modalElements.dayModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        
        // Затем в следующем кадре добавим класс visible для запуска анимации
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modalElements.dayModal.classList.add('visible');
            });
        });
    } catch (error) {
        console.warn('Ошибка при открытии модального окна:', error.message);
        showError('Не удалось загрузить детали погоды для выбранного дня');
    }
}

/**
 * Обновляет почасовой прогноз в модальном окне с iOS-анимациями
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
        
        // Создаем DocumentFragment для оптимизации DOM операций
        const fragment = document.createDocumentFragment();
        
        // Показываем все доступные часы
        hourlyData.forEach((item, index) => {
            const hourlyDiv = document.createElement('div');
            hourlyDiv.className = 'forecast-hour';
            
            const icon = item.weather && item.weather[0] && item.weather[0].icon 
                ? weatherEmoji[item.weather[0].icon] 
                : "🌦️";
            
            hourlyDiv.innerHTML = `
                <div class="forecast-time">${formatTime(item.dt)}</div>
                <div class="forecast-icon">${icon}</div>
                <div class="forecast-temp">${Math.round(item.main.temp)}°</div>
            `;
            
            // Создаем эффект появления элементов с задержкой
            hourlyDiv.style.animation = `fadeIn 0.3s ease forwards`;
            hourlyDiv.style.animationDelay = `${index * 0.03}s`;
            hourlyDiv.style.opacity = '0';
            
            fragment.appendChild(hourlyDiv);
        });
        
        modalElements.hourlyForecast.appendChild(fragment);
    } catch (error) {
        console.warn('Ошибка обновления почасового прогноза в модальном окне:', error.message);
    }
}

/**
 * Обновляет советы в модальном окне с iOS-анимациями
 * @param {Object} weatherData - Данные о погоде
 */
async function updateModalFarmerTips(weatherData) {
    try {
        if (!modalElements.tipsContainer) return;
        modalElements.tipsContainer.innerHTML = '';
        
        const tips = await generateFarmerTips(weatherData);
        
        // Создаем DocumentFragment для оптимизации DOM операций
        const fragment = document.createDocumentFragment();
        
        tips.forEach((tip, index) => {
            const tipElement = document.createElement('div');
            tipElement.className = 'tip-item';
            
            tipElement.innerHTML = `
                <span class="tip-icon">🌱</span>
                <span class="tip-text">${tip}</span>
            `;
            
            // Создаем эффект появления с задержкой
            tipElement.style.animation = `fadeIn 0.3s ease forwards`;
            tipElement.style.animationDelay = `${index * 0.05}s`;
            tipElement.style.opacity = '0';
            
            fragment.appendChild(tipElement);
        });
        
        modalElements.tipsContainer.appendChild(fragment);
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
 * Закрывает модальное окно с iOS-анимацией
 */
function closeDayWeatherModal() {
    try {
        if (!modalElements.dayModal) return;
        
        // Сначала удаляем класс visible для запуска анимации закрытия
        modalElements.dayModal.classList.remove('visible');
        
        // Задержка для анимации закрытия, затем скрываем модальное окно полностью
        setTimeout(() => {
            modalElements.dayModal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            
            // Очищаем содержимое модального окна после закрытия для оптимизации памяти
            setTimeout(() => {
                if (modalElements.hourlyForecast) modalElements.hourlyForecast.innerHTML = '';
                if (modalElements.tipsContainer) modalElements.tipsContainer.innerHTML = '';
            }, 100);
        }, 300); // Время должно соответствовать продолжительности CSS-анимации
    } catch (error) {
        console.warn('Ошибка закрытия модального окна:', error.message);
        
        // В случае ошибки принудительно скрываем модальное окно
        if (modalElements.dayModal) {
            modalElements.dayModal.classList.add('hidden');
            modalElements.dayModal.classList.remove('visible');
        }
        document.body.classList.remove('modal-open');
    }
}

// Добавляем CSS-анимацию для элементов модального окна, если её нет
if (!document.getElementById('modalAnimationStyles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'modalAnimationStyles';
    styleEl.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(styleEl);
}

// ===== ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ =====

/**
 * Загружает данные о погоде с iOS-анимациями
 * @param {string} city - Название города
 */
async function loadWeatherData(city) {
    console.log(`Загрузка данных о погоде для ${city}`);
    const startTime = Date.now();
    
    try {
        // Показываем индикатор загрузки, если еще не показан
        if (!document.querySelector('.loading-overlay')) {
            showLoading(`Загружаем данные о погоде для ${city}...`);
        }
        
        // Запрашиваем данные о погоде для города
        const data = await fetchWeatherData(city);
        
        if (!data || !data.weather || !data.forecast) {
            throw new Error('Получены неполные данные о погоде');
        }
        
        // Подготавливаем результаты перед показом UI (iOS-стиль)
        // Сначала скрываем результаты, если они уже видны
        if (elements.weatherResult && !elements.weatherResult.classList.contains('hidden')) {
            elements.weatherResult.style.opacity = '0';
            elements.weatherResult.style.transform = 'translateY(20px)';
            
            // Небольшая задержка для анимации
            await new Promise(resolve => setTimeout(resolve, 100));
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
        
        // Показываем результаты с iOS-анимацией
        if (elements.weatherResult) {
            // Сначала делаем видимым
            elements.weatherResult.classList.remove('hidden');
            
            // Затем запускаем анимацию в следующем кадре
            requestAnimationFrame(() => {
                elements.weatherResult.style.opacity = '1';
                elements.weatherResult.style.transform = 'translateY(0)';
            });
        }
        
        // Сохраняем последний успешно загруженный город
        localStorage.setItem(LAST_CITY_KEY, city);
        
        console.log(`Данные о погоде для ${city} загружены за ${(Date.now() - startTime)/1000} секунд`);
    } catch (error) {
        console.error('Ошибка загрузки данных о погоде:', error.message);
        showError(`Не удалось найти город "${city}". Пожалуйста, проверьте название и попробуйте снова.`);
        
        // Проверяем, отображаются ли уже какие-то данные
        if (elements.weatherResult && elements.weatherResult.classList.contains('hidden')) {
            loadWeatherData(DEFAULT_CITY);
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
 * Обработчик поиска города с iOS-эффектами
 */
function handleSearch() {
    try {
        if (!elements.citySearch) return;
        
        // Получаем введенное пользователем название города без модификаций
        const city = elements.citySearch.value.trim();
        
        if (!city) {
            showError('Пожалуйста, введите название города');
            return;
        }
        
        // Минимальная проверка ввода
        if (city.length < 2) {
            showError('Название города должно содержать минимум 2 символа');
            return;
        }
        
        // Показываем индикатор загрузки
        showLoading(`Ищем город "${city}"...`);
        
        // iOS-эффект перед поиском
        const searchButton = elements.searchButton;
        if (searchButton) {
            searchButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                searchButton.style.transform = '';
            }, 150);
        }
        
        // Выполняем поиск погоды для введенного города
        loadWeatherData(city);
        
        // Убираем фокус с поля ввода
        if (elements.citySearch) {
            elements.citySearch.blur();
        }
    } catch (error) {
        console.error('Ошибка при обработке поиска:', error);
        hideLoading();
        showError('Произошла ошибка при поиске. Пожалуйста, попробуйте еще раз.');
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
                
                // iOS-анимация
                requestAnimationFrame(() => {
                    elements.weatherResult.style.opacity = '1';
                    elements.weatherResult.style.transform = 'translateY(0)';
                });
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
            // Добавляем iOS-эффект нажатия
            elements.searchButton.addEventListener('click', createRipple);
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
            // Добавляем iOS-эффект нажатия
            modalElements.closeModal.addEventListener('click', (event) => {
                const target = event.currentTarget;
                if (!target) return;
                
                target.style.transform = 'scale(0.94)';
                target.style.transition = 'transform 0.15s cubic-bezier(0.4, 0, 1, 1)';
                
                setTimeout(() => {
                    target.style.transform = '';
                    target.style.transition = 'transform 0.2s cubic-bezier(0.23, 1, 0.32, 1)';
                }, 150);
            });
        }
        
        if (modalElements.dayModal) {
            modalElements.dayModal.addEventListener('click', (event) => {
                if (event.target === modalElements.dayModal) {
                    closeDayWeatherModal();
                }
            });
        }

        // Эффект ripple для интерактивных элементов UI
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
                    } else if (cached.city) {
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

/**
 * Глобальная настройка анимаций в зависимости от производительности устройства
 */
function setupOptimizedAnimations() {
    const highPerformance = isHighPerformanceDevice();
    
    // Добавляем класс к body для CSS-оптимизаций
    document.body.classList.toggle('high-performance-device', highPerformance);
    document.body.classList.toggle('low-performance-device', !highPerformance);
    
    // Для слабых устройств уменьшаем количество одновременных анимаций
    if (!highPerformance) {
        // Находим все элементы с анимациями и ограничиваем их
        document.querySelectorAll('.forecast-hour, .weekly-day, .tip-item').forEach((el, index) => {
            // Для мобильных ограничиваем количество анимаций (показываем только первые 8)
            if (index > 8) {
                el.style.animationDelay = '0s';
                el.style.animation = 'none';
            } else {
                // Устанавливаем фиксированные задержки для упрощения
                el.style.animationDelay = `${(index % 4) * 0.1}s`;
            }
        });
        
        // Отключаем сложные эффекты
        document.querySelectorAll('.weather-main, .weather-card').forEach(el => {
            el.style.backdropFilter = 'none';
            el.style.webkitBackdropFilter = 'none';
            el.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        });
    }
}

/**
 * Отслеживает пропущенные кадры для определения проблем с производительностью
 * и адаптирует анимации в реальном времени
 */
function monitorFrameRate() {
    if (!window.requestAnimationFrame) return;
    
    let lastFrameTime = performance.now();
    let droppedFrames = 0;
    let frameCount = 0;
    
    function checkFrame() {
        const now = performance.now();
        const delta = now - lastFrameTime;
        
        // Если прошло больше 33 мс (ниже 30 fps), считаем кадр пропущенным
        if (delta > 33) {
            droppedFrames++;
        }
        
        frameCount++;
        lastFrameTime = now;
        
        // Раз в 100 кадров проверяем производительность
        if (frameCount >= 100) {
            const dropRate = droppedFrames / frameCount;
            
            // Если пропущено больше 10% кадров, считаем устройство низкопроизводительным
            if (dropRate > 0.1 && document.body.classList.contains('high-performance-device')) {
                console.warn('Обнаружена низкая производительность, оптимизируем анимации');
                document.body.classList.remove('high-performance-device');
                document.body.classList.add('low-performance-device');
                
                // Упрощаем анимации
                document.querySelectorAll('.forecast-hour, .weekly-day, .tip-item').forEach(el => {
                    el.style.willChange = 'auto';
                    el.style.animation = 'fadeIn 0.2s forwards';
                });
            }
            
            // Сбрасываем счетчики
            droppedFrames = 0;
            frameCount = 0;
        }
        
        // Продолжаем мониторинг
        requestAnimationFrame(checkFrame);
    }
    
    // Запускаем мониторинг
    requestAnimationFrame(checkFrame);
}

/**
 * Инициализирует все мобильные оптимизации
 */
function initMobileOptimizations() {
    // Определяем производительность устройства и настраиваем анимации
    setupOptimizedAnimations();
    
    // Запускаем мониторинг производительности
    monitorFrameRate();
    
    // Добавляем CSS-классы для оптимизации рендеринга
    document.querySelectorAll('.weather-main, .weather-card').forEach(el => {
        el.classList.add('hardware-accelerated');
    });
    
    // Оптимизируем обработку событий для слабых устройств
    if (!isHighPerformanceDevice()) {
        // Делегирование событий вместо множества обработчиков
        document.addEventListener('click', (event) => {
            // Ripple эффект
            const rippleTarget = event.target.closest('.search-button, .detail-item, .tip-item, .weekly-day');
            if (rippleTarget) {
                createRipple({ currentTarget: rippleTarget });
            }
            
            // Модальное окно
            if (event.target === modalElements.dayModal) {
                closeDayWeatherModal();
            }
        });
        
        // Throttle для обработки скролла
        let isScrolling = false;
        window.addEventListener('scroll', () => {
            if (!isScrolling) {
                isScrolling = true;
                requestAnimationFrame(() => {
                    isScrolling = false;
                });
            }
        }, { passive: true });
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
        
        // Инициализируем мобильные оптимизации для iOS-подобной плавности
        initMobileOptimizations();
        
        // Устанавливаем обработчики событий
        setupEventListeners();
        
        // Добавляем iOS-стиль интерактивности для сенсорных устройств
        if ('ontouchstart' in window) {
            setupIOSTouchEffects();
        }
        
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

/**
 * Настраивает эффекты нажатий в стиле iOS для сенсорных устройств
 */
function setupIOSTouchEffects() {
    // Выбираем все интерактивные элементы
    const touchElements = document.querySelectorAll('.search-button, .detail-item, .tip-item, .weekly-day, .forecast-hour, .close-modal');
    
    touchElements.forEach(el => {
        // Обработка начала касания
        el.addEventListener('touchstart', function(e) {
            this.style.transform = `scale(${IOS_ANIMATIONS.SCALE.PRESS})`;
            this.style.transition = `transform ${IOS_ANIMATIONS.DURATIONS.MICRO}ms ${IOS_ANIMATIONS.EASING.EASE_IN}`;
        }, { passive: true });
        
        // Обработка окончания касания
        el.addEventListener('touchend', function() {
            this.style.transform = '';
            this.style.transition = `transform ${IOS_ANIMATIONS.DURATIONS.STANDARD}ms ${IOS_ANIMATIONS.EASING.SPRING}`;
        }, { passive: true });
        
        // Обработка отмены касания
        el.addEventListener('touchcancel', function() {
            this.style.transform = '';
            this.style.transition = `transform ${IOS_ANIMATIONS.DURATIONS.STANDARD}ms ${IOS_ANIMATIONS.EASING.SPRING}`;
        }, { passive: true });
    });
}
