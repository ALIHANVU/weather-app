const cityInput = document.getElementById('cityInput');
const getWeatherBtn = document.getElementById('getWeatherBtn');
const locationElement = document.getElementById('location');
const currentTempElement = document.getElementById('current-temp');
const currentFeelsLikeElement = document.getElementById('current-feels-like');
const currentConditionElement = document.getElementById('current-condition');
const themeToggle = document.getElementById('themeToggle');
const returnBtn = document.getElementById('returnBtn');
const dailyForecastContainer = document.querySelector('.daily');
const farmerTipsContainer = document.querySelector('#farmer-tips-content');
const loadingIndicator = document.getElementById('loadingIndicator');

let isDarkTheme = false;
const apiKey = 'c708426913319b328c4ff4719583d1c6';

const weatherIconsMap = {
    "01d": "wi wi-day-sunny",
    "01n": "wi wi-night-clear",
    "02d": "wi wi-day-cloudy",
    "02n": "wi wi-night-alt-cloudy",
    "03d": "wi wi-cloud",
    "03n": "wi wi-cloud",
    "04d": "wi wi-cloudy",
    "04n": "wi wi-cloudy",
    "09d": "wi wi-day-showers",
    "09n": "wi wi-night-alt-showers",
    "10d": "wi wi-day-rain",
    "10n": "wi wi-night-alt-rain",
    "11d": "wi wi-day-thunderstorm",
    "11n": "wi wi-night-alt-thunderstorm",
    "13d": "wi wi-day-snow",
    "13n": "wi wi-night-alt-snow",
    "50d": "wi wi-day-fog",
    "50n": "wi wi-night-fog"
};

function updateWeatherIcon(icon, element) {
    const newIcon = weatherIconsMap[icon] || "wi wi-na";
    element.className = `weather-icon ${newIcon}`;
    gsap.fromTo(element, { opacity: 0 }, { opacity: 1, duration: 0.3 });
}

themeToggle.addEventListener('click', toggleTheme);
getWeatherBtn.addEventListener('click', handleWeatherFetch);
returnBtn.addEventListener('click', resetApp);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleWeatherFetch();
});

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    const themeIcon = themeToggle.querySelector('i');
    themeIcon.classList.toggle('fa-moon', !isDarkTheme);
    themeIcon.classList.toggle('fa-sun', isDarkTheme);
}


function handleWeatherFetch() {
    const city = cityInput.value.trim();

    if (!city) {
        alert('Введите название города!');
        return;
    }

    fetchWeather(city);
}

async function fetchWeather(city) {
    showLoadingIndicator();
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=ru&appid=${apiKey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=ru&appid=${apiKey}`;

        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error(`Ошибка: ${weatherResponse.statusText || forecastResponse.statusText}`);
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();

        displayWeather(weatherData, city);
        displayForecast(forecastData);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error.message);
        displayError('Не удалось загрузить данные о погоде. Попробуйте позже.');
    } finally {
        hideLoadingIndicator();
    }
}
function displayWeather(data, city) {
    const { temp, feels_like: feelsLike } = data.main;
    const condition = data.weather[0].description;
    const icon = data.weather[0].icon;

    currentTempElement.textContent = `${Math.round(temp)}°C`;
    currentFeelsLikeElement.textContent = `Ощущается как ${Math.round(feelsLike)}°C`;
    currentConditionElement.textContent = capitalize(condition);
    locationElement.textContent = city;

    const weatherIconElement = document.querySelector('.weather-icon');
    updateWeatherIcon(icon, weatherIconElement);
    weatherIconElement.classList.remove('hidden');

    const currentWeatherSection = document.querySelector('.current-weather');
    const farmerTipsSection = document.querySelector('.farmer-tips');
    const forecastDays = document.querySelectorAll('.daily .day');

    // Сбрасываем классы и стили перед началом новой анимации
    currentWeatherSection.classList.remove('visible');
    farmerTipsSection.classList.remove('visible');
    forecastDays.forEach(day => day.classList.remove('visible'));

    setTimeout(() => {
        currentWeatherSection.classList.add('visible');
        farmerTipsSection.classList.add('visible');
        forecastDays.forEach(day => day.classList.add('visible'));
    }, 100);

    const inputContainer = document.querySelector('.input-container');
    inputContainer.classList.add('hidden');
    inputContainer.style.height = `${inputContainer.offsetHeight}px`;

    setTimeout(() => {
        inputContainer.style.display = 'none';
        currentWeatherSection.style.transition = 'margin-top 0.6s ease';
        farmerTipsSection.style.transition = 'margin-top 0.6s ease';
        dailyForecastContainer.style.transition = 'margin-top 0.6s ease';
    }, 600);

    returnBtn.classList.remove('hidden');
    gsap.to(returnBtn, { opacity: 1, y: 0, duration: 0.6, ease: "power1.inOut" });

    updateFarmerTips(temp, condition, data.main.humidity, data.main.pressure, data.weather[0].main);
}

function displayForecast(data) {
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const uniqueDays = {};
    dailyForecastContainer.innerHTML = '';

    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayIndex = date.getDay();

        if (!uniqueDays[dayIndex]) {
            uniqueDays[dayIndex] = true;
            const day = days[dayIndex];
            const { temp_min: tempMin, temp_max: tempMax } = item.main;
            const icon = item.weather[0].icon;

            const forecastItem = document.createElement('div');
            forecastItem.classList.add('day');
            forecastItem.innerHTML = `
                <p>${day}</p>
                <p>${Math.round(tempMax)}°C / ${Math.round(tempMin)}°C</p>
                <i class="weather-icon ${weatherIconsMap[icon] || "wi wi-na"}"></i>
            `;
            dailyForecastContainer.appendChild(forecastItem);

            // Добавляем класс visible для плавного появления
            setTimeout(() => {
                forecastItem.classList.add('visible');
            }, 100);
        }
    });
}

function updateFarmerTips(temp, condition, humidity, pressure, weatherMain) {
    let tip = '';

    if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
        tip = `Дождливо (${temp}°C). Проверьте состояние полей.`;
    } else if (weatherMain === 'Clear') {
        tip = temp > 30
            ? `Солнечно и жарко (${temp}°C). Поливайте растения.`
            : `Солнечно (${temp}°C). Отличное время для работы.`;
    } else if (weatherMain === 'Snow') {
        tip = `Снегопад (${temp}°C). Проверьте укрытия.`;
    } else {
        tip = `Условия стабильные (${temp}°C). Работы продолжаются.`;
    }

    if (humidity > 80) tip += ' Высокая влажкость: риск грибков.';
    if (pressure < 1000) tip += ' Низкое давление: возможны проблемы с опылением.';

    farmerTipsContainer.innerHTML = `<p class="tip">${tip}</p>`;

    // Добавляем класс visible для плавного появления
    const farmerTipsSection = document.querySelector('.farmer-tips');
    setTimeout(() => {
        farmerTipsSection.classList.add('visible');
    }, 100);
}
// JavaScript для фиксации элементов
returnBtn.addEventListener('click', resetApp);

function resetApp() {
    const inputContainer = document.querySelector('.input-container');
    inputContainer.style.display = 'flex';

    setTimeout(() => {
        inputContainer.classList.remove('hidden');
    }, 0);

    gsap.to(returnBtn, { opacity: 0, y: -20, duration: 0.6, ease: "power1.inOut", onComplete: () => {
        returnBtn.classList.add('hidden');
    }});
    
    locationElement.textContent = 'WeatherNow';
    currentTempElement.textContent = '--°C';
    currentFeelsLikeElement.textContent = 'Ощущается как --°C';
    currentConditionElement.textContent = 'Погодные условия';
    dailyForecastContainer.innerHTML = '';
    farmerTipsContainer.innerHTML = '';
    cityInput.value = '';
}



function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showLoadingIndicator() {
    loadingIndicator.classList.remove('hidden');
    gsap.to(loadingIndicator, { opacity: 1, duration: 0.5 });
}

function hideLoadingIndicator() {
    gsap.to(loadingIndicator, { opacity: 0, duration: 0.5, onComplete: () => {
        loadingIndicator.classList.add('hidden');
    }});
}

function displayError(message) {
    alert(message || 'Произошла ошибка. Попробуйте позже.');
}
