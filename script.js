const cityInput = document.getElementById('cityInput');
const getWeatherBtn = document.getElementById('getWeatherBtn');
const weatherInfo = document.getElementById('weather-info');
const farmerTips = document.getElementById('farmer-tips');
const themeToggle = document.getElementById('themeToggle');
const forecastContainer = document.querySelector('.forecast');
let isDarkTheme = false;

const apiKey = 'c708426913319b328c4ff4719583d1c6'; // Замените на свой API-ключ от OpenWeatherMap

// Эмоджи для отображения погодных условий
const weatherEmojiMap = {
    "01d": "☀️", // солнечно
    "01n": "🌕", // солнечно ночью
    "02d": "⛅", // немного облачно
    "02n": "🌥️", // немного облачно ночью
    "03d": "☁️", // облачно
    "03n": "☁️", // облачно ночью
    "04d": "☁️", // облачно
    "04n": "☁️", // облачно ночью
    "09d": "🌦️", // кратковременные дожди
    "09n": "🌦️", // кратковременные дожди ночью
    "10d": "🌧️", // дождь
    "10n": "🌧️", // дождь ночью
    "11d": "⛈️", // гроза
    "11n": "⛈️", // гроза ночью
    "13d": "❄️", // снег
    "13n": "❄️", // снег ночью
    "50d": "🌫️", // туман
    "50n": "🌫️"  // туман ночью
};

// Функция для получения погоды и прогноза
const fetchWeather = async (city) => {
    if (!city) {
        alert('Введите название города.');
        return;
    }

    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=ru&appid=${apiKey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=ru&appid=${apiKey}`;
        const weatherResponse = await fetch(weatherUrl);
        const forecastResponse = await fetch(forecastUrl);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error(`Ошибка: ${weatherResponse.status} ${weatherResponse.statusText}`);
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        displayWeather(weatherData);
        displayForecast(forecastData);
    } catch (error) {
        weatherInfo.innerHTML = `<p>Ошибка загрузки данных: ${error.message}</p>`;
        forecastContainer.innerHTML = '';
    }
};

// Отображение погоды на странице
const displayWeather = (data) => {
    const { main, weather } = data;
    const temp = main.temp;
    const condition = weather[0].description;
    const icon = weather[0].icon;

    // Получаем эмоджи для погодных условий
    const weatherEmoji = weatherEmojiMap[icon] || "❓";

    // Устанавливаем информацию о погоде с анимацией
    weatherInfo.style.opacity = 0; // Начальная прозрачность
    setTimeout(() => {
        weatherInfo.innerHTML = `
            <h2>Температура: ${temp}°C ${weatherEmoji}</h2>
            <p>Погодные условия: ${condition}</p>
        `;
        weatherInfo.style.opacity = 1; // Плавное появление
    }, 300);

    updateFarmerTips(temp, condition, main.humidity, main.pressure, weather[0].main);
};

// Отображение прогноза на странице
const displayForecast = (data) => {
    const forecastList = data.list.filter((item, index) => index % 8 === 0); // Берем прогноз каждые 24 часа
    forecastContainer.innerHTML = '';

    const days = ['Сегодня', 'Завтра', 'Послезавтра', 'Через два дня'];

    forecastList.slice(0, 3).forEach((item, index) => {
        const tempMin = item.main.temp_min;
        const tempMax = item.main.temp_max;
        const condition = item.weather[0].description;
        const icon = item.weather[0].icon;
        const weatherEmoji = weatherEmojiMap[icon] || "❓";

        forecastContainer.innerHTML += `
            <div class="forecast-item">
                <p>${days[index]}</p>
                <p>${Math.round(tempMax)}°C / ${Math.round(tempMin)}°C</p>
                <p>${weatherEmoji}</p>
                <p>${condition}</p>
            </div>
        `;
    });
};

// Обновление подсказок для фермеров
const updateFarmerTips = (temp, condition, humidity, pressure, weatherMain) => {
    let tip = '';

    if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
        tip = `Дождливо (${temp}°C). Проверьте состояние полей и убедитесь, что дренаж работает правильно.`;
    } else if (weatherMain === 'Clear') {
        if (temp > 30) {
            tip = `Солнечно и жарко (${temp}°C). Обеспечьте достаточный полив растений, чтобы избежать пересыхания.`;
        } else if (temp < 10) {
            tip = `Солнечно, но холодно (${temp}°C). Защитите молодые растения от возможных заморозков.`;
        } else {
            tip = `Солнечно (${temp}°C). Отличное время для всех видов полевых работ.`;
        }
    } else if (weatherMain === 'Clouds') {
        tip = `Облачно (${temp}°C). Отличное время для посадки и пересадки растений.`;
    } else if (weatherMain === 'Snow') {
        tip = `Снегопад (${temp}°C). Проверьте теплицы и укрытия для растений.`;
    } else if (weatherMain === 'Thunderstorm') {
        tip = `Гроза (${temp}°C). Опасно проводить работы на открытых полях.`;
    } else if (weatherMain === 'Mist' || weatherMain === 'Fog') {
        tip = `Туман (${temp}°C). Следите за влажностью почвы и воздуха.`;
    } else {
        tip = `Погодные условия стабильные (${temp}°C). Работы на полях могут продолжаться в обычном режиме.`;
    }

    if (humidity > 80) {
        tip += ' Высокая влажность может способствовать развитию грибковых заболеваний.';
    }

    if (pressure < 1000) {
        tip += ' Низкое давление. Возможны затруднения в опылении.';
    }

    farmerTips.style.opacity = 0; // Начальная прозрачность
    setTimeout(() => {
        farmerTips.innerHTML = `<p>${tip}</p>`;
        farmerTips.style.opacity = 1; // Плавное появление
    }, 300);
};

// Переключение темной и светлой темы
themeToggle.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? '☀️' : '🌙';
});

// Обработчик для кнопки "Узнать погоду"
getWeatherBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    fetchWeather(city);
});
