
// @/src/components/weather-card.tsx
"use client";

import { useEffect, useState } from "react";
import type { WeatherInfo } from "@/lib/types";
import { format, isToday } from "date-fns";
import {
  Sun, Cloud, CloudRain, CloudDrizzle, CloudLightning, CloudSnow,
  Wind, Sunrise, Sunset, Haze, CloudFog, CloudSun
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface WeatherCardProps {
  weather: WeatherInfo;
}

const getWeatherIcon = (code: number) => {
  switch (code) {
    case 0: return <Sun className="h-10 w-10 text-yellow-500" />;
    case 1: return <Sun className="h-10 w-10 text-yellow-500" />; // Mainly clear
    case 2: return <CloudSun className="h-10 w-10 text-yellow-400" />; // Partly cloudy
    case 3: return <Cloud className="h-10 w-10 text-gray-500" />; // Overcast
    case 45: case 48: return <CloudFog className="h-10 w-10 text-gray-400" />;
    case 51: case 53: case 55: case 56: case 57: return <CloudDrizzle className="h-10 w-10 text-blue-400" />;
    case 61: case 63: case 65: return <CloudRain className="h-10 w-10 text-blue-500" />;
    case 66: case 67: return <CloudRain className="h-10 w-10 text-blue-500" />; // Freezing Rain
    case 71: case 73: case 75: case 77: return <CloudSnow className="h-10 w-10 text-blue-300" />;
    case 85: case 86: return <CloudSnow className="h-10 w-10 text-blue-400" />; // Snow showers
    case 95: case 96: case 99: return <CloudLightning className="h-10 w-10 text-yellow-600" />;
    default: return <Haze className="h-10 w-10 text-gray-500" />;
  }
};

const getWeatherDescription = (code: number): string => {
    switch (code) {
        case 0: return "Ensolarado";
        case 1: return "Céu Limpo";
        case 2: return "Parcialmente Nublado";
        case 3: return "Nublado";
        case 45: case 48: return "Nevoeiro";
        case 51: case 53: case 55: case 56: case 57: return "Garoa";
        case 61: case 63: case 65: case 66: case 67: return "Chuva";
        case 80: case 81: case 82: return "Pancadas de Chuva";
        case 71: case 73: case 75: case 77: case 85: case 86: return "Neve";
        case 95: case 96: case 99: return "Trovoadas";
        default: return "Condição Incerta";
    }
};


export function WeatherCard({ weather }: WeatherCardProps) {
  const [daylightStatus, setDaylightStatus] = useState<string | null>(null);

  useEffect(() => {
    // Only run the timer if the weather date is today
    const weatherDate = new Date(weather.date + 'T00:00:00'); // Ensure we compare dates only
    if (!isToday(weatherDate)) {
      setDaylightStatus(null); // No timer for past or future dates
      return;
    }

    const sunriseTime = new Date(weather.sunrise);
    const sunsetTime = new Date(weather.sunset);

    const calculateDaylight = () => {
      const now = new Date();

      if (now < sunriseTime) {
        setDaylightStatus(`Começa às ${format(sunriseTime, "HH:mm")}`);
      } else if (now > sunsetTime) {
        setDaylightStatus("Fim da Luz Natural");
        clearInterval(interval);
      } else {
        const diff = sunsetTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setDaylightStatus(`${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`);
      }
    };

    calculateDaylight();
    const interval = setInterval(calculateDaylight, 60000); // Update every minute

    return () => clearInterval(interval);

  }, [weather.sunrise, weather.sunset, weather.date]);

  return (
    <Card className="relative bg-card/50 h-full">
      <CardContent className="flex flex-col justify-between p-4 h-full">
        <div className="flex items-start justify-between">
            <div className="flex flex-col items-center gap-1 w-1/3 text-center">
                {getWeatherIcon(weather.weatherCode)}
                <p className="text-xs font-medium text-muted-foreground">{getWeatherDescription(weather.weatherCode)}</p>
            </div>
            <div className="text-center w-1/3">
                <p className="text-4xl font-bold">{weather.temperature}°C</p>
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                    <Wind className="h-4 w-4" />
                    <p className="text-sm">{weather.windSpeed} km/h</p>
                </div>
            </div>
            <div className="text-center w-1/3">
                <p className="text-sm font-semibold text-primary">Luz do dia restante:</p>
                <p className="text-xl font-bold text-foreground">
                  {daylightStatus || format(new Date(weather.sunset), "HH:mm")}
                </p>
            </div>
        </div>
        
        <div className="mt-2 grid grid-cols-2 gap-2 w-full text-xs text-muted-foreground">
          <div className="flex flex-col items-center text-center">
            <Sunrise className="h-5 w-5 text-yellow-500 mb-1" />
            <span className="font-semibold">Nascer do Sol</span>
            <span>{format(new Date(weather.sunrise), "HH:mm")}</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <Sunset className="h-5 w-5 text-orange-500 mb-1" />
             <span className="font-semibold">Pôr do Sol</span>
            <span>{format(new Date(weather.sunset), "HH:mm")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
