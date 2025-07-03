// @/src/components/shooting-day-card.tsx
"use client";

import { useEffect, useState } from "react";
import type { ShootingDay, WeatherData } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Image from 'next/image';
import {
  MoreVertical, Edit, Trash2, Calendar, MapPin, Clapperboard, Clock,
  Users, Truck, Shirt, Star, FileText, CloudDrizzle, Sunrise, Sunset, WifiOff
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
import { Skeleton } from "./ui/skeleton";
import { getWeather } from "@/ai/flows/get-weather-flow";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

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

const WeatherInfo = ({ day }: { day: ShootingDay }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getWeather({ location: day.location, date: new Date(day.date) });
        if (result) {
          setWeather(result);
        } else {
           setError("Não foi possível buscar a previsão do tempo. Verifique a chave da API no arquivo .env");
        }
      } catch (e) {
        setError("Erro ao buscar dados do tempo.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWeather();
  }, [day.location, day.date]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 pl-6">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <Alert variant="destructive" className="ml-6">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Erro de API</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }
  
  if (!weather) return null;

  return (
    <div className="pl-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        <div className="flex items-center gap-2">
            <Image src={weather.weather.iconUrl} alt={weather.weather.description} width={50} height={50} className="bg-primary/10 rounded-full"/>
            <div>
                <p className="text-2xl font-bold">{weather.weather.temp}°C</p>
                <p className="text-sm text-muted-foreground">{weather.weather.description}</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CloudDrizzle className="h-4 w-4"/> {weather.weather.precipitation}% chuva
            </div>
             <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Sunrise className="h-4 w-4"/> {weather.sun.sunrise}
            </div>
             <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Sunset className="h-4 w-4"/> {weather.sun.sunset}
            </div>
        </div>
    </div>
  );
};


export function ShootingDayCard({ day, onEdit, onDelete }: ShootingDayCardProps) {
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=-74.01,40.70,-73.99,40.72&layer=mapnik&marker=40.71,-74.00`;
  
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
        <div className="space-y-6">
            <DetailSection icon={Calendar} title="Previsão do Tempo" content={<WeatherInfo day={day} />} />
            
             <DetailSection
              icon={MapPin}
              title="Mapa da Localização"
              content={
                <div className="h-48 w-full rounded-md overflow-hidden border">
                   <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(day.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      title={`Mapa de ${day.location}`}
                    ></iframe>
                </div>
              }
            />

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
