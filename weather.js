const apiKey = 'c708426913319b328c4ff4719583d1c6';

const weatherEmojiMap = {
    "01d": "☀", 
    "01n": "🌕", 
    "02d": "⛅", 
    "02n": "🌥", 
    "03d": "☁", 
    "03n": "☁", 
    "04d": "☁", 
    "04n": "☁", 
    "09d": "🌦", 
    "09n": "🌦", 
    "10d": "🌧", 
    "10n": "🌧", 
    "11d": "⛈", 
    "11n": "⛈", 
    "13d": "❄", 
    "13n": "❄", 
    "50d": "🌫", 
    "50n": "🌫"
};

const fetchWeather = async (city) => {
    if (!city) {
        displayErrorMessage('Пожалуйста, введите название города.'); // функция из utils.js
        return;
    }

    spinner.classList.remove('hidden'); // Показать спиннер

    try {
        const weatherUrl = https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=ru&appid=${apiKey};
        const forecastUrl = https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=ru&appid=${apiKey};
        const weatherResponse = await fetch(weatherUrl);
        const forecastResponse = await fetch(forecastUrl);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error(Ошибка: ${weatherResponse.status} ${weatherResponse.statusText});
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        clearErrorMessage(); // функция из utils.js
        displayWeather(weatherData, city);
        displayForecast(forecastData);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        displayErrorMessage('Не удалось загрузить данные. Пожалуйста, проверьте название города и попробуйте снова.'); // функция из utils.js
        if (error.message.includes('Failed to fetch')) {
            displayErrorMessage('Ошибка сети. Проверьте соединение с интернетом и попробуйте снова.'); // функция из utils.js
        }
    } finally {
        spinner.classList.add('hidden'); // Скрыть спиннер
    }
};

const displayWeather = (data, city) => {
    const { main, weather } = data;
    const temp = main.temp;
    const feelsLike = main.feels_like;
    const condition = weather[0].description;
    const icon = weather[0].icon;
    const weatherEmoji = weatherEmojiMap[icon] || "❓";

    currentTempElement.textContent = ${Math.round(temp)}°C ${weatherEmoji};
    currentFeelsLikeElement.textContent = Ощущается как ${Math.round(feelsLike)}°C;
    currentConditionElement.textContent = condition.charAt(0).toUpperCase() + condition.slice(1);

    // Скрытие поля ввода и кнопки "Узнать погоду" после нажатия и появление кнопки возврата
    document.querySelector('.input-container').style.display = 'none';
    locationElement.textContent = city;  // Отображение введенного названия города
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
        const weatherEmoji = weatherEmojiMap[icon] || "❓";

        dailyForecastContainer.innerHTML += `
            <div class="day">
                <p>${day}</p>
                <p>${Math.round(tempMax)}°C / ${Math.round(tempMin)}°C</p>
                <p>${weatherEmoji}</p>
                <p>${condition}</p>
            </div>
        `;
    });
};

// Обновление подсказок для фермеров из кэшированной переменной
const updateFarmerTips = (temp, condition, humidity, pressure, weatherMain) => {
    let tip = '';

    if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
        tip = farmerTips.rain;
    } else if (weatherMain === 'Clear') {
        if (temp > 30) {
            tip = farmerTips.clear_hot;
        } else if (temp < 10) {
            tip = farmerTips.clear_cold;
        } else {
            tip = farmerTips.clear_mild;
        }
    } else if (weatherMain === 'Clouds') {
        tip = farmerTips.clouds;
    } else if (weatherMain === 'Snow') {
        tip = farmerTips.snow;
    } else if (weatherMain === 'Thunderstorm') {
        tip = farmerTips.thunderstorm;
    } else if (weatherMain === 'Mist' || weatherMain === 'Fog') {
        tip = farmerTips.mist_fog;
    } else {
        tip = farmerTips.stable;
    }

    if (humidity > 80) {
        tip += ' ' + farmerTips.high_humidity;
    }

    if (pressure < 1000) {
        tip += ' ' + farmerTips.low_pressure;
    }

    farmerTipsContainer.style.opacity = 0; // Начальная прозрачность
    setTimeout(() => {
        farmerTipsContainer.innerHTML = <p class="tip">${tip}</p>;
        farmerTipsContainer.style.opacity = 1; // Плавное появление
    }, 300);
};
