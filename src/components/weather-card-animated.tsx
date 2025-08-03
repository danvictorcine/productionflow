
// @/src/components/weather-card-animated.tsx
"use client";

import { useEffect, useState } from "react";
import type { WeatherInfo, ShootingDay } from "@/lib/types";
import { format, isToday, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wind, Sunrise, Sunset, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeatherCardAnimatedProps {
  weather: WeatherInfo;
  day: ShootingDay;
}

const getWeatherState = (code: number) => {
  if ([0, 1].includes(code)) return "sunny";
  if ([45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return "rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
  return "cloudy";
};


export function WeatherCardAnimated({ weather, day }: WeatherCardAnimatedProps) {
    const [daylightStatus, setDaylightStatus] = useState<string | null>(null);
    const weatherState = getWeatherState(weather.weatherCode);

    useEffect(() => {
        const sunriseTime = parseISO(weather.sunrise);
        const sunsetTime = parseISO(weather.sunset);
        const weatherDate = parseISO(weather.date);

        const calculateDaylight = () => {
            const now = new Date();

            if (isPast(weatherDate) && !isToday(weatherDate)) {
                setDaylightStatus("Fim da Luz Natural");
                return;
            }

            if (isToday(weatherDate)) {
                if (now < sunriseTime) {
                    setDaylightStatus(`Começa às ${format(sunriseTime, "HH:mm")}`);
                } else if (now > sunsetTime) {
                    setDaylightStatus("Fim da Luz Natural");
                } else {
                    const diff = sunsetTime.getTime() - now.getTime();
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    setDaylightStatus(`${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`);
                }
            } else {
                 setDaylightStatus(null);
            }
        };

        calculateDaylight();
        
        if (isToday(weatherDate) && new Date() < sunsetTime) {
            const interval = setInterval(calculateDaylight, 60000);
            return () => clearInterval(interval);
        }

    }, [weather.sunrise, weather.sunset, weather.date]);

  const formattedLocation = [day.location?.city, day.location?.state]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={cn(
        "relative w-full h-full p-6 rounded-2xl text-[#574d33] overflow-hidden shadow-lg",
        "transition-all duration-500 ease-in-out hover:scale-105",
        weatherState === 'sunny' && 'bg-gradient-to-br from-[#FFF7B1] via-white to-white/0',
        weatherState === 'cloudy' && 'bg-gradient-to-br from-gray-300 via-white to-white/0',
        weatherState === 'rainy' && 'bg-gradient-to-br from-blue-300 via-white to-white/0',
        weatherState === 'snowy' && 'bg-gradient-to-br from-sky-300 via-white to-white/0'
    )}>
        {/* Animated Background Elements */}
        <div className="absolute w-[250px] h-[250px] -right-9 -top-12 flex items-center justify-center scale-70">
            <div className={cn("sun absolute w-28 h-28 rounded-full bg-gradient-to-r from-[#fcbb04] to-[#fffc00]", weatherState !== 'sunny' && "hidden")}></div>
            <div className={cn("sunshine absolute w-28 h-28 rounded-full bg-gradient-to-r from-[#fcbb04] to-[#fffc00] animate-sunshine", weatherState !== 'sunny' && "hidden")}></div>
            
            <div className={cn("cloud absolute w-60 pt-11 ml-6 animate-clouds-fast z-10", weatherState === 'sunny' && "hidden")}>
                <div className={cn("w-[65px] h-[65px] inline-block rounded-[50%_50%_0%_50%]", weatherState === 'rainy' ? 'bg-blue-400': 'bg-gray-400')}></div>
                <div className={cn("w-[45px] h-[45px] -ml-6 inline-block rounded-[50%_50%_50%_0%]", weatherState === 'rainy' ? 'bg-blue-400': 'bg-gray-400')}></div>
            </div>
            <div className="cloud absolute w-60 -mt-8 ml-36 animate-clouds-slow z-20">
                <div className={cn("w-[30px] h-[30px] inline-block rounded-[50%_50%_0%_50%]", weatherState === 'rainy' ? 'bg-blue-500': 'bg-gray-500')}></div>
                <div className={cn("w-[50px] h-[50px] -ml-5 inline-block rounded-[50%_50%_50%_0%]", weatherState === 'rainy' ? 'bg-blue-500': 'bg-gray-500')}></div>
            </div>
        </div>

        {/* Content */}
        <div className="relative z-30 flex flex-col h-full">
            <div className="card-header">
                <span className="font-extrabold text-base leading-tight text-[#574d33]/80 break-words">{formattedLocation || weather.locationName}</span>
                <span className="font-bold text-sm text-[#574d33]/50">{format(day.date, "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
            
            <span className="absolute left-6 bottom-3 font-bold text-6xl text-[#574d33]">{weather.temperature}°</span>

            <div className="absolute right-6 bottom-4 space-y-2 text-xs font-semibold text-[#574d33]/80 text-center">
                <div className="flex items-center justify-center gap-1"><Wind className="w-3 h-3"/> {weather.windSpeed} km/h</div>
                <div className="flex items-center justify-center gap-1"><Sunrise className="w-3 h-3"/> {format(parseISO(weather.sunrise), "HH:mm")}</div>
                <div className="flex items-center justify-center gap-1"><Sunset className="w-3 h-3"/> {format(parseISO(weather.sunset), "HH:mm")}</div>
                {daylightStatus && <div className="flex items-center justify-center gap-1"><Hourglass className="w-3 h-3"/> {daylightStatus}</div>}
            </div>
        </div>
    </div>
  );
}
    