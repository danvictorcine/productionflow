// @/src/hooks/useWeather.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, isToday } from 'date-fns';
import { getCurrentWeatherFromWeatherAPI, getForecastFromOpenMeteo, type CurrentWeather, type ForecastWeather } from '@/services/weatherProviders';

interface UseWeatherProps {
  lat?: number;
  lon?: number;
  targetDate: Date;
  days?: number;
  tz?: string;
}

interface WeatherData {
  loading: boolean;
  current?: CurrentWeather | null;
  forecast?: ForecastWeather | null;
  error?: string | null;
  attribution: { label: string; href: string }[];
}

const CACHE_DURATION_CURRENT = 60 * 60 * 1000; // 1 hour in ms
const CACHE_DURATION_FORECAST = 6 * 60 * 60 * 1000; // 6 hours in ms

export function useWeather({ lat, lon, targetDate, days = 1, tz = 'America/Sao_Paulo' }: UseWeatherProps): WeatherData {
  const [data, setData] = useState<Omit<WeatherData, 'loading'>>({
    current: null,
    forecast: null,
    error: null,
    attribution: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchWeatherData = useCallback(async () => {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      setLoading(false);
      return;
    }

    setLoading(true);
    let currentData: CurrentWeather | null = null;
    let forecastData: ForecastWeather | null = null;
    let newAttribution: { label: string; href: string }[] = [];

    const dateKey = format(targetDate, 'yyyy-MM-dd');
    const hourKey = format(new Date(), 'yyyy-MM-dd-HH');

    // --- Current Weather Logic (WeatherAPI) ---
    if (isToday(targetDate)) {
      const cacheKey = `weather_current_${lat.toFixed(2)}_${lon.toFixed(2)}_${hourKey}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (new Date().getTime() - new Date(parsed.fetchedAt).getTime() < CACHE_DURATION_CURRENT) {
            currentData = parsed;
          }
        }
        if (!currentData) {
          currentData = await getCurrentWeatherFromWeatherAPI({ lat, lon });
          if (currentData) {
            localStorage.setItem(cacheKey, JSON.stringify(currentData));
          }
        }
      } catch (e) {
        console.error("Failed to get/set current weather from cache", e);
      }
    }
    
    // --- Forecast Weather Logic (Open-Meteo) ---
    const forecastCacheKey = `weather_forecast_${lat.toFixed(2)}_${lon.toFixed(2)}_${dateKey}_${days}`;
     try {
        const cached = localStorage.getItem(forecastCacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (new Date().getTime() - new Date(parsed.fetchedAt).getTime() < CACHE_DURATION_FORECAST) {
                forecastData = parsed;
            }
        }
        if (!forecastData) {
            forecastData = await getForecastFromOpenMeteo({ lat, lon, days, tz });
            if (forecastData) {
                localStorage.setItem(forecastCacheKey, JSON.stringify(forecastData));
            }
        }
    } catch (e) {
        console.error("Failed to get/set forecast from cache", e);
    }
    
    if (currentData?.attribution) newAttribution.push(currentData.attribution);
    if (forecastData?.attribution) newAttribution.push(forecastData.attribution);
    
    // Remove duplicates
    newAttribution = newAttribution.filter((v,i,a)=>a.findIndex(t=>(t.label === v.label))===i);

    setData({
      current: currentData,
      forecast: forecastData,
      attribution: newAttribution,
      error: !currentData && !forecastData ? 'Failed to fetch weather data' : null,
    });
    setLoading(false);

  }, [lat, lon, targetDate, days, tz]);

  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  return { ...data, loading };
}
