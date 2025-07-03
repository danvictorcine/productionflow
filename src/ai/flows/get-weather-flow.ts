'use server';
/**
 * @fileOverview A Genkit flow to get weather data for a specific location and date.
 *
 * - getWeather - A function that handles fetching weather data.
 * - WeatherInput - The input type for the getWeather function.
 * - WeatherOutput - The return type for the getWeather function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { WeatherData } from '@/lib/types';
import { format } from 'date-fns';

const WeatherInputSchema = z.object({
  location: z.string().describe('The city or address for the weather forecast.'),
  date: z.date().describe('The date for the forecast.'),
});
export type WeatherInput = z.infer<typeof WeatherInputSchema>;

export type WeatherOutput = WeatherData;

const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

export async function getWeather(input: WeatherInput): Promise<WeatherOutput | null> {
  if (!API_KEY) {
    console.error('OpenWeather API key is not configured.');
    return null;
  }
  return getWeatherFlow(input);
}

// OpenWeatherMap API returns time in seconds, we convert to milliseconds for Date
const toDateTime = (secs: number) => new Date(secs * 1000);

const getWeatherFlow = ai.defineFlow(
  {
    name: 'getWeatherFlow',
    inputSchema: WeatherInputSchema,
    outputSchema: z.custom<WeatherOutput>().nullable(),
  },
  async ({ location, date }) => {
    try {
      // 1. Geocode location to get latitude and longitude
      const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${API_KEY}`);
      if (!geoResponse.ok) throw new Error('Failed to geocode location');
      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) throw new Error('Location not found');
      
      const { lat, lon } = geoData[0];

      // 2. Get 5-day/3-hour forecast
      const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`);
      if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');
      const weatherData = await weatherResponse.json();

      // 3. Find the forecast for the target date (closest to midday)
      const targetDateStr = format(date, 'yyyy-MM-dd');
      let bestForecast = null;
      let minHourDiff = Infinity;
      
      for (const forecast of weatherData.list) {
          const forecastDate = new Date(forecast.dt_txt);
          if (format(forecastDate, 'yyyy-MM-dd') === targetDateStr) {
              const hourDiff = Math.abs(forecastDate.getHours() - 12); // Find forecast closest to noon
              if (hourDiff < minHourDiff) {
                  minHourDiff = hourDiff;
                  bestForecast = forecast;
              }
          }
      }

      if (!bestForecast) return null; // No forecast found for that day

      // 4. Format and return the data
      const sunrise = toDateTime(weatherData.city.sunrise).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const sunset = toDateTime(weatherData.city.sunset).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return {
        weather: {
          temp: Math.round(bestForecast.main.temp),
          description: bestForecast.weather[0].description.charAt(0).toUpperCase() + bestForecast.weather[0].description.slice(1),
          iconUrl: `https://openweathermap.org/img/wn/${bestForecast.weather[0].icon}@2x.png`,
          precipitation: Math.round((bestForecast.pop || 0) * 100), // 'pop' is probability of precipitation
        },
        sun: {
          sunrise,
          sunset,
        },
      };

    } catch (error) {
      console.error("Error in getWeatherFlow:", error);
      return null;
    }
  }
);
