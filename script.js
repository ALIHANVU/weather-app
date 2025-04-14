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
        
        // Создаем таймаут для запроса
        const timeoutId = setTimeout(() => {
            controller.abort(); // Отменяем fetch-запрос
            console.warn('Таймаут IP геолокации');
            resolve('Москва'); // Резервный город при таймауте
        }, 5000); // 5 секунд на ответ

        fetch('https://ipapi.co/json/', { signal })
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
                if (error.name === 'AbortError') {
                    console.warn('Запрос IP-геолокации был отменен из-за таймаута');
                    resolve('Москва');
                } else {
                    console.error('Ошибка IP-геолокации:', error);
                    resolve('Москва'); // Возвращаем город по умолчанию
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
            timeout: 8000, // Уменьшаем таймаут до 8 секунд
            maximumAge: 60000 // Разрешаем использовать кешированные результаты до 1 минуты
        };

        // Создаем таймаут для всего процесса геолокации
        const timeoutId = setTimeout(() => {
            reject(new Error('Превышено время ожидания геолокации'));
        }, 10000); // 10 секунд на весь процесс

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
                    }, 5000);
                    
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

        const geoUrl = `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
        
        // Используем AbortController для контроля таймаута
        const controller = new AbortController();
        const signal = controller.signal;
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const geoResponse = await fetch(geoUrl, { signal });
        
        if (!geoResponse.ok) {
            clearTimeout(timeoutId);
            throw new Error(`Ошибка геокодирования: ${geoResponse.status}`);
        }
        
        const geoData = await geoResponse.json();

        if (!geoData.length) {
            clearTimeout(timeoutId);
            throw new Error('Город не найден');
        }

        const { lat, lon } = geoData[0];

        const weatherUrl = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
        const forecastUrl = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`;
        
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
        
        const result = { weather, forecast };
        
        // Кешируем полученные данные
        cacheWeatherData(city, result);
        
        return result;
    } catch (error) {
        console.error('Ошибка получения данных о погоде:', error);
        // Проверяем, был ли запрос отменен из-за таймаута
        if (error.name === 'AbortError') {
            throw new Error('Превышено время ожидания ответа от сервера');
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

// Индикация загрузки с сообщением
function showLoading(message = 'Определяем ваше местоположение...') {
    // Удаляем существующий оверлей загрузки, если он есть
    hideLoading();
    
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
    
    window._loadingTimeout = setTimeout(() => {
        hideLoading();
    }, 20000); // Максимум 20 секунд показа загрузки
}

function hideLoading() {
    if (window._loadingTimeout) {
        clearTimeout(window._loadingTimeout);
        window._loadingTimeout = null;
    }
    
    const loadingDiv = document.querySelector('.loading-overlay');
    if (loadingDiv) {
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
    return localStorage.getItem('lastLoadedCity') || null;
}

// Основная функция загрузки приложения с улучшенной обработкой отказа от геолокации
async function initApp() {
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
                    await loadWeatherData('Москва');
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
                    await loadWeatherData('Москва');
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
                    setTimeout(() => reject(new Error('Превышено время ожидания геолокации')), 10000)
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
                    await loadWeatherData('Москва');
                }
            }
        }
    } catch (error) {
        console.error('Общая ошибка инициализации приложения:', error);
        
        // В случае любой ошибки загружаем для Москвы
        try {
            await loadWeatherData('Москва');
        } catch (finalError) {
            console.error('Критическая ошибка загрузки данных:', finalError);
            showError('Не удалось загрузить погоду. Пожалуйста, проверьте подключение к интернету.');
        }
    } finally {
        hideLoading();
    }
}

// Функция загрузки погоды по городу
async function loadWeatherData(city) {
    try {
        showLoading(`Загружаем данные о погоде для ${city}...`);
        
        // Добавляем таймаут для всего процесса получения погоды
        const weatherPromise = Promise.race([
            fetchWeatherData(city),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Время ожидания получения погоды истекло')), 15000)
            )
        ]);
        
        const data = await weatherPromise;
        
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
    } catch (error) {
        console.error('Ошибка загрузки данных о погоде:', error);
        
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
        if (city !== 'Москва') {
            showError(`Не удалось загрузить погоду для "${city}". Загружаем для города по умолчанию.`);
            // Рекурсивный вызов, но только если мы еще не пытались загрузить для Москвы
            await loadWeatherData('Москва');
        } else {
            // Если мы уже пытались загрузить Москву и все равно получили ошибку
            showError(`Не удалось загрузить данные о погоде: ${error.message}`);
            
            // Показываем заглушку с базовыми данными
            const fallbackData = {
                weather: {
                    main: { temp: 15, feels_like: 14, temp_max: 17, temp_min: 13, humidity: 70 },
                    weather: [{ description: 'облачно с прояснениями', icon: '04d' }],
                    name: 'Москва',
                    visibility: 10000,
                    wind: { speed: 2.5 }
                },
                forecast: {
                    list: [
                        // Минимальные данные для почасового прогноза
                        { dt: Math.floor(Date.now() / 1000), main: { temp: 15 }, weather: [{ icon: '04d' }] }
                    ]
                }
            };
            
            updateCurrentWeather(fallbackData.weather);
            elements.weatherResult.classList.remove('hidden');
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
    // Добавляем обработчики событий
    elements.searchButton.addEventListener('click', handleSearch);
    elements.citySearch.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Добавляем обработчик закрытия модального окна
    modalElements.closeModal.addEventListener('click', closeDayWeatherModal);
    
    // Закрытие по клику вне контента модального окна
    modalElements.dayModal.addEventListener('click', (event) => {
        if (event.target === modalElements.dayModal) {
            closeDayWeatherModal();
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
    // Проверяем, когда в последний раз обновляли данные
    const cached = getCachedWeatherData();
    if (cached) {
        const cacheTime = Date.now() - cached.timestamp;
        // Обновляем данные, если кеш старше 15 минут и страница видима
        if (cacheTime > 15 * 60 * 1000 && document.visibilityState === 'visible') {
            if (elements.cityName.textContent && elements.cityName.textContent !== '-') {
                loadWeatherData(elements.cityName.textContent);
            } else if (cached.city) {
                loadWeatherData(cached.city);
            }
        }
    }
});
