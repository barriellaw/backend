// backend/server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = 3000;

// Proxy: WeatherAPI current and forecast (combined for frontend)
app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  try {
    // Get current weather
    const currentRes = await axios.get(`https://api.weatherapi.com/v1/current.json`, {
      params: {
        key: process.env.WEATHER_API_KEY,
        q: `${lat},${lon}`
      }
    });
    // Get forecast
    const forecastRes = await axios.get(`https://api.weatherapi.com/v1/forecast.json`, {
      params: {
        key: process.env.WEATHER_API_KEY,
        q: `${lat},${lon}`,
        days: 7
      }
    });
    // Get timezone
    const timezone = currentRes.data.location.tz_id;
    res.json({
      current: currentRes.data.current,
      forecast: forecastRes.data.forecast,
      timezone
    });
  } catch (err) {
    res.status(500).json({ error: 'WeatherAPI fetch failed' });
  }
});

// Proxy: WeatherAPI timezone
app.get('/api/timezone', async (req, res) => {
  const { lat, lon } = req.query;
  try {
    const response = await axios.get(`https://api.weatherapi.com/v1/timezone.json`, {
      params: {
        key: process.env.WEATHER_API_KEY,
        q: `${lat},${lon}`
      }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Timezone fetch failed' });
  }
});

// Proxy: Google Maps Geocoding (for /api/geocode)
// server.js
app.get('/api/geocode', async (req, res) => {
  const { lat, lon } = req.query;
  try {
    const { data } = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { latlng: `${lat},${lon}`, key: process.env.GOOGLE_API_KEY }
    });
    const result = data.results?.[0];
    const comps = (result?.address_components || []).reduce((acc, c) => {
      c.types.forEach(t => acc[t] = c.long_name);
      return acc;
    }, {});
    const city   = comps.locality || comps.sublocality || comps.postal_town || '';
    const state  = comps.administrative_area_level_1 || '';
    const borough = comps.sublocality_level_1 || '';
    const neighborhood = comps.neighborhood || '';
    const locationText = [neighborhood, borough || city, state].filter(Boolean).join(', ');
    res.json({ neighborhood, borough, city, state, locationText });
  } catch (e) {
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// Proxy: Geoapify autocomplete
app.get('/api/autocomplete', async (req, res) => {
  const { text } = req.query;
  try {
    const response = await axios.get(`https://api.geoapify.com/v1/geocode/autocomplete`, {
      params: {
        text,
        limit: 10,
        filter: 'countrycode:us',
        apiKey: process.env.GEOAPIFY_KEY
      }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Geoapify autocomplete failed' });
  }
});

app.listen(PORT, () => console.log(`API proxy server running on port ${PORT}`));
