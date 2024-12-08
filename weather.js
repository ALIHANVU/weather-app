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
    loadingSpinner.style.display = 'block'; // Показ индикатора загрузки

    try {
        const [weatherResponse, forecastResponse] = await Promise.all([
            fetchWithTimeout(getWeatherUrl(city)),
            fetchWithTimeout(getForecastUrl(city))
        ]);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error('Ошибка загрузки данных');
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        displayWeather(weatherData, city);
        displayForecast(forecastData);
        removePlaceholders(); // Удаление placeholders после загрузки данных
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        alert('Произошла ошибка при загрузке данных. Попробуйте снова позже.');
    } finally {
        loadingSpinner.style.display = 'none'; // Скрытие индикатора загрузки
    }
};

const getWeatherUrl = (city) => {
    return `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=ru&appid=${apiKey}`;
};

const getForecastUrl = (city) => {
    return `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=ru&appid=${apiKey}`;
};

// Функция для запроса с тайм-аутом
const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout))
    ]);
};

const displayWeather = (data, city) => {
    const { main, weather } = data;
    const temp = main.temp;
    const feelsLike = main.feels_like;
    const condition = weather[0].description;
    const icon = weather[0].icon;
    const weatherEmoji = weatherEmojiMap[icon] || '❓';

    currentTempElement.textContent = `${Math.round(temp)}°C ${weatherEmoji}`;
    currentFeelsLikeElement.textContent = `Ощущается как ${Math.round(feelsLike)}°C`;
    currentConditionElement.textContent = condition.charAt(0).toUpperCase() + condition.slice(1);

    document.querySelector('.input-container').style.display = 'none';
    locationElement.textContent = city;
    returnBtn.classList.remove('hidden');

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

    dailyForecastContainer.innerHTML = '';

    forecastList.forEach((item, index) => {
        const date = new Date(item.dt * 1000);
        const dayIndex = date.getDay();
        const day = index === 0 ? 'Сегодня' : (index === 1 ? 'Завтра' : days[dayIndex]);
        const tempMin = item.main.temp_min;
        const tempMax = item.main.temp_max;
        const condition = item.weather[0].description;
        const icon = item.weather[0].icon;
        const weatherEmoji = weatherEmojiMap[icon] || '❓';

        dailyForecastContainer.innerHTML += `
            <div class="day fade-in">
                <p>${day}</p>
                <p>${Math.round(tempMax)}°C / ${Math.round(tempMin)}°C</p>
                <p>${weatherEmoji}</p>
                <p>${condition}</p>
            </div>
        `;
    });
};

const updateFarmerTips = (temp, condition, humidity, pressure, weatherMain) => {
    fetch('farmer_tips.json')
        .then(response => response.json())
        .then(tips => {
            let tip = '';

            if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
                tip = tips.tips.rain;
            } else if (weatherMain === 'Clear') {
                if (temp > 30) {
                    tip = tips.tips.clear_hot;
                } else if (temp < 10) {
                    tip = tips.tips.clear_cold;
                } else {
                    tip = tips.tips.clear_mild;
                }
            } else if (weatherMain === 'Clouds') {
                tip = tips.tips.clouds;
            } else if (weatherMain === 'Snow') {
                tip = tips.tips.snow;
            } else if (weatherMain === 'Thunderstorm') {
                tip = tips.tips.thunderstorm;
            } else if (weatherMain === 'Mist' || weatherMain === 'Fog') {
                tip = tips.tips.mist_fog;
            } else {
                tip = tips.tips.stable;
            }

            if (humidity > 80) {
                tip += ` ${tips.tips.high_humidity}`;
            }

            if (pressure < 1000) {
                tip += ` ${tips.tips.low_pressure}`;
            }

            farmerTipsContainer.style.opacity = 0;
            setTimeout(() => {
                farmerTipsContainer.innerHTML = `<p class="tip fade-in">${tip}</p>`;
                farmerTipsContainer.style.opacity = 1;
            }, 300);
        })
        .catch(error => console.error('Ошибка загрузки подсказок:', error));
};

// Не забудьте удалить placeholders после загрузки данных
const removePlaceholders = () => {
    dailyForecastContainer.innerHTML = '';
    farmerTipsContainer.innerHTML = '';
};
