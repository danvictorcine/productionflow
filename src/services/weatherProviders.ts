// @/src/services/weatherProviders.ts
'use server';

// Tipos normalizados para a saída dos provedores
export interface CurrentWeather {
  tempC: number;
  windKmh: number;
  precipMm: number;
  conditionText?: string;
  icon?: string;
  source: 'weatherapi';
  attribution: { label: string; href: string };
  fetchedAt: string;
}

export interface ForecastWeather {
  days: {
    date: string; // YYYY-MM-DD
    tMaxC: number;
    tMinC: number;
    precipMmSum?: number;
    sunrise?: string;
    sunset?: string;
    weatherCode?: number;
  }[];
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
  source: 'open-meteo';
  attribution: { label: string; href: string };
  fetchedAt: string;
}

const API_TIMEOUT = 6000;
const WEATHER_API_KEY = process.env.VITE_WEATHERAPI_KEY;

/**
 * Busca o tempo atual na WeatherAPI.com.
 */
export async function getCurrentWeatherFromWeatherAPI({ lat, lon }: { lat: number; lon: number }): Promise<CurrentWeather | null> {
  if (!WEATHER_API_KEY) {
    console.error("WeatherAPI key (VITE_WEATHERAPI_KEY) is not configured.");
    return null;
  }

  const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`;
  
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT) });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`WeatherAPI Error ${response.status}:`, errorData.error.message);
      return null;
    }

    const data = await response.json();
    const { current } = data;

    return {
      tempC: current.temp_c,
      windKmh: current.wind_kph,
      precipMm: current.precip_mm,
      conditionText: current.condition.text,
      icon: current.condition.icon,
      source: 'weatherapi',
      attribution: { label: 'Powered by WeatherAPI.com', href: 'https://www.weatherapi.com/' },
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('WeatherAPI request timed out.');
    } else {
      console.error('Failed to fetch from WeatherAPI:', error);
    }
    return null;
  }
}

/**
 * Busca a previsão do tempo no Open-Meteo.
 */
export async function getForecastFromOpenMeteo({ lat, lon, days = 3, tz = 'America/Sao_Paulo' }: { lat: number; lon: number; days?: number; tz?: string }): Promise<ForecastWeather | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum&hourly=temperature_2m,weather_code&forecast_days=${days}&timezone=${tz}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT) });

    if (!response.ok) {
      console.error(`Open-Meteo Error ${response.status}: Failed to fetch forecast.`);
      return null;
    }

    const data = await response.json();

    const formattedDays = data.daily.time.map((date: string, index: number) => ({
      date,
      tMaxC: data.daily.temperature_2m_max[index],
      tMinC: data.daily.temperature_2m_min[index],
      precipMmSum: data.daily.precipitation_sum[index],
      sunrise: data.daily.sunrise[index],
      sunset: data.daily.sunset[index],
      weatherCode: data.daily.weather_code[index],
    }));

    return {
      days: formattedDays,
      hourly: data.hourly,
      source: 'open-meteo',
      attribution: { label: 'Data © Open-Meteo (CC BY 4.0)', href: 'https://open-meteo.com/' },
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
     if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('Open-Meteo request timed out.');
    } else {
      console.error('Failed to fetch from Open-Meteo:', error);
    }
    return null;
  }
}
