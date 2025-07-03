// @/src/components/shooting-day-card.tsx
"use client";

import type { ShootingDay } from "@/lib/types";
import { format, fromUnixTime } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MoreVertical, Edit, Trash2, Calendar, MapPin, Clapperboard, Clock,
  Users, Truck, Shirt, Star, FileText, Sun, Sunset, CloudRain, Wind, Cloud, SunSnow, Cloudy
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { useEffect, useState } from "react";
import { getLocationData, LocationData, WeatherData } from "@/ai/flows/get-location-data-flow";
import { Skeleton } from "./ui/skeleton";

interface ShootingDayCardProps {
  day: ShootingDay;
  onEdit: () => void;
  onDelete: () => void;
}

const DetailSection = ({ icon: Icon, title, content, badge }: { icon: React.ElementType, title: string, content?: React.ReactNode, badge?: React.ReactNode }) => {
  const hasContent = typeof content === 'string' ? !!content.trim() : !!content;

  if (!hasContent) return null;

  return (
    <div>
      <h4 className="flex items-center text-md font-semibold mb-2">
        <Icon className="h-4 w-4 mr-2 text-primary" />
        {title}
        {badge}
      </h4>
      {typeof content === 'string' ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">{content}</p>
      ) : (
        <div className="pl-6">{content}</div>
      )}
    </div>
  )
};

const WeatherIcon = ({ code }: { code: number }) => {
  if (code >= 200 && code < 300) return <CloudRain className="h-5 w-5" />; // Thunderstorm
  if (code >= 300 && code < 600) return <CloudRain className="h-5 w-5" />; // Drizzle & Rain
  if (code >= 600 && code < 700) return <SunSnow className="h-5 w-5" />; // Snow
  if (code === 800) return <Sun className="h-5 w-5" />; // Clear
  if (code === 801) return <Cloudy className="h-5 w-5" />; // Few clouds
  if (code > 801) return <Cloud className="h-5 w-5" />; // Cloudy
  return <Sun className="h-5 w-5" />; // Default
};


export function ShootingDayCard({ day, onEdit, onDelete }: ShootingDayCardProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  
  useEffect(() => {
    const fetchWeather = async () => {
      if (!process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY) {
        console.warn("OpenWeather API key not found. Skipping weather fetch.");
        setIsLoadingWeather(false);
        return;
      }
      
      if (day.latitude && day.longitude) {
        try {
          setIsLoadingWeather(true);
          const data = await getLocationData({ lat: day.latitude, lon: day.longitude, date: day.date });
          setWeatherData(data?.weather || null);
        } catch (error) {
          console.error("Failed to fetch weather data", error);
        } finally {
          setIsLoadingWeather(false);
        }
      } else {
        setIsLoadingWeather(false);
      }
    };

    fetchWeather();
  }, [day.latitude, day.longitude, day.date]);


  return (
    <Card className="flex flex-col w-full">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4">
               <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                    <CardTitle>Dia {format(new Date(day.date), "dd/MM")}: {format(new Date(day.date), "eeee", { locale: ptBR })}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 pt-1">
                      <MapPin className="h-3 w-3" /> {day.location}
                    </CardDescription>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Ordem do Dia
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between space-y-4">
        <Separator />
         {day.latitude && day.longitude && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-semibold text-center mb-2">Previsão do Tempo</h4>
              {isLoadingWeather ? (
                  <div className="space-y-3">
                      <Skeleton className="h-6 w-3/4 mx-auto" />
                      <div className="flex justify-around">
                          <Skeleton className="h-8 w-1/4" />
                          <Skeleton className="h-8 w-1/4" />
                          <Skeleton className="h-8 w-1/4" />
                      </div>
                  </div>
              ) : weatherData ? (
                  <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-xl font-bold">
                        <WeatherIcon code={weatherData.weather[0].id} />
                        <span>{Math.round(weatherData.temp.day)}°C</span>
                        <span className="text-sm font-normal text-muted-foreground">({weatherData.weather[0].description})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mt-2 pt-2 border-t">
                          <div className="flex flex-col items-center"><Sun className="h-4 w-4 mb-1" />{format(fromUnixTime(weatherData.sunrise), "HH:mm")}</div>
                          <div className="flex flex-col items-center"><Sunset className="h-4 w-4 mb-1" />{format(fromUnixTime(weatherData.sunset), "HH:mm")}</div>
                          <div className="flex flex-col items-center"><CloudRain className="h-4 w-4 mb-1" />{Math.round(weatherData.pop * 100)}%</div>
                      </div>
                  </div>
              ) : (
                  <p className="text-sm text-muted-foreground text-center">Não foi possível carregar a previsão do tempo.</p>
              )}
            </div>
            <div className="rounded-lg border overflow-hidden h-40 md:h-full">
              <iframe
                  width="100%"
                  height="100%"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${day.longitude-0.01},${day.latitude-0.01},${day.longitude+0.01},${day.latitude+0.01}&layer=mapnik&marker=${day.latitude},${day.longitude}`}
                  className="border-0"
              ></iframe>
            </div>
          </div>
        )}

        <div className="space-y-6">
            <DetailSection icon={Clock} title="Horários de Chamada" content={day.callTimes} />
            <DetailSection icon={Clapperboard} title="Cenas a Gravar" content={day.scenes} />
            <DetailSection
                icon={Users}
                title="Equipe Presente"
                content={
                  day.presentTeam && day.presentTeam.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                          {day.presentTeam.map(member => (
                              <Badge key={member.id} variant="secondary" className="font-normal">{member.name} <span className="text-muted-foreground ml-1.5">({member.role})</span></Badge>
                          ))}
                      </div>
                  ) : <p className="text-sm text-muted-foreground pl-6">Nenhuma equipe selecionada para este dia.</p>
                }
            />
            <DetailSection icon={Truck} title="Equipamentos Especiais" content={day.equipment} />
            <DetailSection icon={Shirt} title="Figurino" content={day.costumes} />
            <DetailSection icon={Star} title="Objetos de Cena (Props)" content={day.props} />
            <DetailSection icon={FileText} title="Observações Gerais" content={day.generalNotes} />
        </div>
      </CardContent>
    </Card>
  );
}
