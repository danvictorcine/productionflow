// @/src/components/weather-card.tsx
"use client";

import { WeatherInfo } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import {
  Sun, Cloud, CloudRain, CloudDrizzle, CloudLightning, CloudSnow,
  Wind, Sunrise, Sunset, Haze, CloudFog
} from "lucide-react";

interface WeatherCardProps {
  weather: WeatherInfo;
}

const getWeatherIcon = (code: number) => {
  switch (code) {
    case 0: return <Sun className="h-12 w-12 text-yellow-500" />;
    case 1: case 2: return <Cloud className="h-12 w-12 text-gray-400" />;
    case 3: return <Cloud className="h-12 w-12 text-gray-500" />;
    case 45: case 48: return <CloudFog className="h-12 w-12 text-gray-400" />;
    case 51: case 53: case 55: return <CloudDrizzle className="h-12 w-12 text-blue-400" />;
    case 61: case 63: case 65: return <CloudRain className="h-12 w-12 text-blue-500" />;
    case 66: case 67: return <CloudRain className="h-12 w-12 text-blue-500" />; // Freezing Rain
    case 71: case 73: case 75: case 77: return <CloudSnow className="h-12 w-12 text-blue-300" />;
    case 80: case 81: case 82: return <CloudRain className="h-12 w-12 text-blue-600" />; // Rain showers
    case 85: case 86: return <CloudSnow className="h-12 w-12 text-blue-400" />; // Snow showers
    case 95: case 96: case 99: return <CloudLightning className="h-12 w-12 text-yellow-600" />;
    default: return <Haze className="h-12 w-12 text-gray-500" />;
  }
};

export function WeatherCard({ weather }: WeatherCardProps) {
  return (
    <Card className="relative bg-card/50 h-full">
      <CardContent className="flex flex-col items-center justify-center p-4 h-full">
        <div className="flex items-center gap-4">
          {getWeatherIcon(weather.weatherCode)}
          <div>
            <p className="text-4xl font-bold">{weather.temperature}°C</p>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Wind className="h-4 w-4" />
              <p className="text-sm">{weather.windSpeed} km/h</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex w-full justify-around text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sunrise className="h-5 w-5 text-yellow-500" />
            <span>{format(new Date(weather.sunrise), "HH:mm")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sunset className="h-5 w-5 text-orange-500" />
            <span>{format(new Date(weather.sunset), "HH:mm")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
