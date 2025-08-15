// @/src/components/weather-card-animated.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { WeatherInfo, ShootingDay, LocationAddress } from "@/lib/types";
import { format, isToday, isFuture, parse, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wind, Sunrise, Sunset, Hourglass, Cloud, Sun, CloudRain, Snowflake, RotateCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useWeather } from "@/hooks/useWeather";
import Link from "next/link";

interface WeatherCardAnimatedProps {
  weather: WeatherInfo;
  day: ShootingDay;
  isPublicView?: boolean;
  onRefreshWeather?: () => void;
  isFetchingWeather?: boolean;
}

const getWeatherState = (code: number) => {
  if ([0, 1].includes(code)) return "sunny";
  if ([45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return "rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
  return "cloudy";
};

const getWeatherDescription = (code: number): { text: string; icon: React.ReactNode } => {
    switch(code) {
        case 0: return { text: 'Céu Limpo', icon: <Sun className="w-4 h-4" /> };
        case 1: return { text: 'Ensolarado', icon: <Sun className="w-4 h-4" /> };
        case 2: return { text: 'Parcialmente Nublado', icon: <Cloud className="w-4 h-4" /> };
        case 3: return { text: 'Nublado', icon: <Cloud className="w-4 h-4" /> };
        case 45:
        case 48:
            return { text: 'Nevoeiro', icon: <Cloud className="w-4 h-4" /> };
        case 51:
        case 53:
        case 55:
            return { text: 'Garoa', icon: <CloudRain className="w-4 h-4" /> };
        case 61:
        case 63:
        case 65:
            return { text: 'Chuva', icon: <CloudRain className="w-4 h-4" /> };
        case 80:
        case 81:
        case 82:
            return { text: 'Pancadas de Chuva', icon: <CloudRain className="w-4 h-4" /> };
        case 71:
        case 73:
        case 75:
        case 77:
            return { text: 'Neve', icon: <Snowflake className="w-4 h-4" /> };
        case 85:
        case 86:
            return { text: 'Nevasca', icon: <Snowflake className="w-4 h-4" /> };
        case 95:
        case 96:
        case 99:
            return { text: 'Trovoada', icon: <CloudRain className="w-4 h-4" /> };
        default:
            return { text: 'Clima Indefinido', icon: <Cloud className="w-4 h-4" /> };
    }
}

export function WeatherCardAnimated({ day, isPublicView = false, onRefreshWeather, isFetchingWeather: isFetchingLegacy }: WeatherCardAnimatedProps) {
    const { loading, current, forecast, attribution } = useWeather({
      lat: day.latitude,
      lon: day.longitude,
      targetDate: day.date,
      tz: day.weather?.timezone,
    });

    const [daylightStatus, setDaylightStatus] = useState<string | null>(null);
    const [localTime, setLocalTime] = useState<string | null>(null);

    const weatherState = current ? getWeatherState(parseInt(current.icon?.split('/').pop()?.replace('.png','') || '3')) : forecast?.days[0]?.weatherCode ? getWeatherState(forecast.days[0].weatherCode) : 'cloudy';

    const currentWeather = current ? { temp: Math.round(current.tempC), text: current.conditionText } : null;
    const forecastWeather = forecast?.days?.[0] ? { maxTemp: Math.round(forecast.days[0].tMaxC), code: forecast.days[0].weatherCode } : null;
    
    const displayTemp = currentWeather?.temp ?? forecastWeather?.maxTemp;
    const displayDescription = currentWeather?.text ? { text: currentWeather.text, icon: <Sun className="w-4 h-4" /> } : forecastWeather?.code ? getWeatherDescription(forecastWeather.code) : { text: 'Carregando...', icon: <Loader2 className="w-4 h-4 animate-spin" /> };
    
    const sunriseTime = forecast?.days?.[0]?.sunrise ? parseISO(forecast.days[0].sunrise) : null;
    const sunsetTime = forecast?.days?.[0]?.sunset ? parseISO(forecast.days[0].sunset) : null;
    
    useEffect(() => {
        if (!day.weather?.timezone || !isToday(day.date)) {
            setLocalTime(null);
            return;
        }

        const updateLocalTime = () => {
            try {
                const timeString = new Date().toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: day.weather.timezone,
                });
                setLocalTime(timeString);
            } catch (error) {
                console.error("Invalid timezone:", day.weather.timezone);
                setLocalTime(null);
            }
        };

        updateLocalTime();
        const interval = setInterval(updateLocalTime, 60000);

        return () => clearInterval(interval);

    }, [day.weather?.timezone, day.date]);
    
    useEffect(() => {
      const calculateDaylight = () => {
        if (!sunriseTime || !sunsetTime) {
            setDaylightStatus(null);
            return;
        }

        const now = new Date();

        if (isToday(day.date)) {
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
      
       if (isToday(day.date) && sunsetTime && new Date() < sunsetTime) {
          const interval = setInterval(calculateDaylight, 60000);
          return () => clearInterval(interval);
      }
    }, [day.date, sunriseTime, sunsetTime]);


  const formatLocationForCard = (location?: LocationAddress): string => {
    if (!location) return "";
    
    const city = location.city || location.town || location.village || location.county;
    const state = location.state;
    const country = location.country;
    
    const parts = [city, state, country].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(', ');
    }

    return day.weather?.locationName || 'Localização';
  }

  const formattedLocation = formatLocationForCard(day.location);

  return (
    <div className={cn(
        "relative w-full h-full p-6 rounded-2xl text-foreground overflow-hidden shadow-lg",
        weatherState === 'sunny' && 'bg-gradient-to-br from-[#FFF7B1] via-white to-white/0 dark:from-yellow-900/50 dark:via-background dark:to-background/0',
        weatherState === 'cloudy' && 'bg-gradient-to-br from-gray-300 via-white to-white/0 dark:from-gray-700/50 dark:via-background dark:to-background/0',
        weatherState === 'rainy' && 'bg-gradient-to-br from-blue-300 via-white to-white/0 dark:from-blue-800/50 dark:via-background dark:to-background/0',
        weatherState === 'snowy' && 'bg-gradient-to-br from-sky-300 via-white to-white/0 dark:from-sky-800/50 dark:via-background dark:to-background/0'
    )}>
        
        <div className={cn("absolute -top-1 right-0 w-[150px] h-[150px] flex items-center justify-center scale-[1.0]")}>
             <div className={cn("sun absolute w-28 h-28 rounded-full bg-gradient-to-r from-[#fcbb04] to-[#fffc00] dark:from-yellow-400 dark:to-yellow-300", weatherState !== 'sunny' && "hidden")}></div>
            <div className={cn("sunshine absolute w-28 h-28 rounded-full bg-gradient-to-r from-[#fcbb04] to-[#fffc00] animate-sunshine", weatherState !== 'sunny' && "hidden")}></div>
            
            <div className={cn("cloud absolute w-60 pt-11 ml-6 animate-clouds-fast", weatherState === 'sunny' && "hidden")}>
                <div className={cn("w-[65px] h-[65px] inline-block rounded-[50%_50%_0%_50%] ", weatherState === 'rainy' ? 'bg-blue-400 dark:bg-blue-600': 'bg-gray-400 dark:bg-gray-500')}></div>
                <div className={cn("w-[45px] h-[45px] -ml-6 inline-block rounded-[50%_50%_50%_0%]", weatherState === 'rainy' ? 'bg-blue-400 dark:bg-blue-600': 'bg-gray-400 dark:bg-gray-500')}></div>
            </div>
            <div className={cn("cloud absolute w-60 -mt-8 ml-36 animate-clouds-slow", weatherState === 'sunny' && "hidden")}>
                <div className={cn("w-[30px] h-[30px] inline-block rounded-[50%_50%_0%_50%]", weatherState === 'rainy' ? 'bg-blue-500 dark:bg-blue-700': 'bg-gray-500 dark:bg-gray-600')}></div>
                <div className={cn("w-[50px] h-[50px] -ml-5 inline-block rounded-[50%_50%_50%_0%]", weatherState === 'rainy' ? 'bg-blue-500 dark:bg-blue-700': 'bg-gray-500 dark:bg-gray-600')}></div>
            </div>
        </div>

        <div className="relative z-20 flex flex-col h-full">
            <div className="card-header">
                <span className="font-extrabold text-base leading-tight text-foreground/80 break-words">{formattedLocation}</span>
                <p className="font-bold text-sm text-foreground/50">{format(day.date, "dd 'de' MMMM", { locale: ptBR })}</p>
                {localTime && <p className="font-bold text-sm text-foreground/50">{localTime}</p>}
            </div>

            <div className="absolute top-2 left-3 text-xs">
                {!isPublicView && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefreshWeather} disabled={isFetchingLegacy || loading}>
                        {isFetchingLegacy || loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                    </Button>
                )}
            </div>
            
            <span className="absolute left-0 bottom-2 font-bold text-6xl text-foreground">
                {loading ? '--°' : `${displayTemp}°`}
            </span>
            
            <div className="absolute left-0 bottom-0 p-1">
                {attribution.length > 0 && (
                    <p className="text-xs text-foreground/50">
                        {attribution.map((attr, index) => (
                            <React.Fragment key={attr.href}>
                                <Link href={attr.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    {attr.label}
                                </Link>
                                {index < attribution.length - 1 && ' · '}
                            </React.Fragment>
                        ))}
                    </p>
                )}
            </div>

            <div className="absolute right-0 bottom-2 space-y-2 text-xs font-semibold text-foreground/80 text-center">
                 <div className="flex flex-col items-center justify-center font-bold text-sm text-foreground">
                    <div className="flex items-center gap-1.5">
                       {displayDescription.icon}
                       <span>{displayDescription.text}</span>
                    </div>
                 </div>
                 {sunriseTime && sunsetTime && (
                    <div className="flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1"><Sunrise className="w-3 h-3"/> {format(sunriseTime, "HH:mm")}</div>
                        <div className="flex items-center gap-1"><Sunset className="w-3 h-3"/> {format(sunsetTime, "HH:mm")}</div>
                    </div>
                 )}
                {daylightStatus && (
                    <div className="flex items-center justify-center gap-1">
                        <Hourglass className="w-3 h-3"/>
                        <span>{daylightStatus}</span>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
