const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/weather', async (req, res) => {
  const city = req.query.city || 'Moscow'; // Получаем город из параметров
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: city,
        appid: 'c708426913319b328c4ff4719583d1c6', // Замените на ваш реальный ключ
        units: 'metric'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении данных о погоде' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


