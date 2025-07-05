// @/src/components/shooting-day-card.tsx
"use client";

import { useState, useEffect } from "react";
import type { ShootingDay, Scene, ChecklistItem } from "@/lib/types";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MoreVertical, Edit, Trash2, Calendar, MapPin, Clapperboard, Clock, Hourglass,
  Users, Truck, Shirt, Star, FileText, Hospital, ParkingCircle, Radio, Utensils, Hash, Film, AlignLeft, FileSpreadsheet, FileDown
} from "lucide-react";
import dynamic from 'next/dynamic';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { WeatherCard } from "./weather-card";
import { Skeleton } from "./ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

const DisplayMap = dynamic(() => import('./display-map').then(mod => mod.DisplayMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});


interface ShootingDayCardProps {
  day: Omit<ShootingDay, 'equipment'|'costumes'|'props'|'generalNotes'> & { equipment: ChecklistItem[], costumes: ChecklistItem[], props: ChecklistItem[], generalNotes: ChecklistItem[]};
  isFetchingWeather: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onUpdateNotes: (dayId: string, listName: 'equipment' | 'costumes' | 'props' | 'generalNotes', updatedList: ChecklistItem[]) => void;
  isExporting: boolean;
}

const StaticDetailSection = ({ icon: Icon, title, content }: { icon: React.ElementType, title: string, content?: React.ReactNode }) => {
  const hasContent = typeof content === 'string' ? !!content.trim() : !!content;
  if (!hasContent) return null;

  return (
    <div className="py-2">
        <h4 className="flex items-center text-md font-semibold">
            <Icon className="h-4 w-4 mr-2 text-primary" />
            {title}
        </h4>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap pt-1 pl-6">{content}</div>
    </div>
  );
};

const ChecklistSection = ({ icon: Icon, title, items, onListUpdate }: { icon: React.ElementType; title: string; items: ChecklistItem[]; onListUpdate: (updatedList: ChecklistItem[]) => void; }) => {
    if (!items || items.length === 0) {
        return null;
    }

    const handleCheckChange = (itemId: string, newCheckedState: boolean) => {
        const updatedList = items.map(item =>
            item.id === itemId ? { ...item, checked: newCheckedState } : item
        );
        onListUpdate(updatedList);
    };

    return (
        <div className="py-2">
            <h4 className="flex items-center text-md font-semibold">
                <Icon className="h-4 w-4 mr-2 text-primary" />
                {title}
            </h4>
            <div className="space-y-2 pt-1 pl-6">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                            id={`${item.id}-checkbox`}
                            checked={item.checked}
                            onCheckedChange={(checked) => handleCheckChange(item.id, !!checked)}
                        />
                        <Label htmlFor={`${item.id}-checkbox`} className={`text-sm font-normal ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {item.text}
                        </Label>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SceneCard = ({ scene }: { scene: Scene }) => (
    <div className="p-4 rounded-lg border bg-background/50 space-y-3">
        <div className="flex justify-between items-center">
            <div className="flex items-baseline gap-2">
                <h5 className="font-bold text-lg text-foreground">{scene.sceneNumber}</h5>
                <p className="font-semibold text-primary">{scene.title}</p>
            </div>
            <Badge variant="outline">{scene.pages} pág.</Badge>
        </div>
        <div className="pl-2 space-y-3">
            <div className="flex items-start gap-2">
                <AlignLeft className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{scene.description}</p>
            </div>
             {scene.presentInScene && scene.presentInScene.length > 0 && (
                <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-wrap gap-1">
                        {scene.presentInScene.map(member => (
                            <Badge key={member.id} variant="secondary" className="font-normal">{member.name}</Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
);

const calculateDuration = (start?: string, end?: string): string | null => {
    if (!start || !end) return null;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;

    const startDate = new Date(0, 0, 0, startH, startM);
    const endDate = new Date(0, 0, 0, endH, endM);

    let diff = endDate.getTime() - startDate.getTime();
    if (diff < 0) { // Handles overnight shoots
        diff += 24 * 60 * 60 * 1000;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
};


export function ShootingDayCard({ day, isFetchingWeather, onEdit, onDelete, onExportExcel, onExportPdf, onUpdateNotes, isExporting }: ShootingDayCardProps) {
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const totalDuration = calculateDuration(day.startTime, day.endTime);

  useEffect(() => {
    if (!day.startTime || !day.endTime || !isToday(new Date(day.date))) {
      setRemainingTime(null);
      return;
    }

    const calculate = () => {
      const now = new Date();
      const date = new Date(day.date);
      const [startH, startM] = day.startTime!.split(':').map(Number);
      const [endH, endM] = day.endTime!.split(':').map(Number);

      const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startH, startM);
      const endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endH, endM);

      if (endTime < startTime) { // overnight
        endTime.setDate(endTime.getDate() + 1);
      }

      if (now < startTime) {
        setRemainingTime('Aguardando início');
      } else if (now > endTime) {
        setRemainingTime("Finalizado");
      } else {
        const remainingMs = endTime.getTime() - now.getTime();
        const hours = Math.floor(remainingMs / 3600000);
        const minutes = Math.floor((remainingMs % 3600000) / 60000);
        setRemainingTime(`${hours}h ${minutes}m`);
      }
    };

    calculate();
    const intervalId = setInterval(calculate, 60000);

    return () => clearInterval(intervalId);
  }, [day.date, day.startTime, day.endTime]);

  return (
    <AccordionItem value={day.id} className="border-none">
      <Card id={`shooting-day-card-${day.id}`} className="flex flex-col w-full">
        <div className="relative">
          <AccordionTrigger className="flex w-full items-center p-6 text-left hover:no-underline">
            <div className="flex items-center gap-4">
               <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold leading-none tracking-tight">
                        {day.dayNumber && day.totalDays ? `Diária ${day.dayNumber}/${day.totalDays}: ` : ''} 
                        {format(new Date(day.date), "eeee, dd/MM", { locale: ptBR })}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
                      <MapPin className="h-3 w-3" /> {day.location}
                    </p>
                </div>
            </div>
          </AccordionTrigger>
          <div className="absolute top-1/2 right-12 -translate-y-1/2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit} disabled={isExporting}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Ordem do Dia
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onExportExcel} disabled={isExporting}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Exportar para Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onExportPdf} disabled={isExporting}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Exportar como PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} disabled={isExporting} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <AccordionContent className="pt-0">
          <CardContent className="flex-grow flex flex-col justify-between space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-[180px]">
                {isFetchingWeather ? (
                  <Skeleton className="h-full w-full" />
                ) : day.weather ? (
                  <WeatherCard weather={day.weather} shootingDate={day.date} />
                ) : (
                  <div className="h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center">
                     <p className="text-sm font-semibold">Sem dados de clima</p>
                     <p className="text-xs text-muted-foreground mt-1">Edite a Ordem do Dia para buscar a previsão.</p>
                     <Button size="sm" variant="outline" className="mt-3" onClick={onEdit}>Editar</Button>
                  </div>
                )}
              </div>
              <div className="h-[180px]">
                {day.latitude && day.longitude ? (
                    <DisplayMap position={[day.latitude, day.longitude]} className="h-full w-full rounded-lg" />
                ) : (
                  <div className="h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-sm font-semibold">Sem mapa</p>
                    <p className="text-xs text-muted-foreground mt-1">Defina um local para exibir o mapa.</p>
                  </div>
                )}
              </div>
              <div className="h-[180px]">
                <Card className="h-full flex flex-col justify-center items-center text-center p-4 bg-card/50">
                    <CardHeader className="p-0 mb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Horários da Diária
                        </CardTitle>
                    </CardHeader>
                    {day.startTime && day.endTime ? (
                        <div className="space-y-2">
                            <p className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{day.startTime}</span> até <span className="font-semibold text-foreground">{day.endTime}</span>
                            </p>
                            {totalDuration && <Badge variant="secondary">{totalDuration} de duração</Badge>}
                            {remainingTime && (
                                <div className="pt-2">
                                     <p className="text-sm font-semibold flex items-center justify-center gap-1.5">
                                        <Hourglass className="h-4 w-4 text-primary" />
                                        Tempo Restante
                                     </p>
                                     <p className="text-xl font-bold text-foreground">{remainingTime}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                         <div className="text-center text-sm text-muted-foreground">
                            <p>Horários não definidos.</p>
                            <Button size="sm" variant="outline" className="mt-2" onClick={onEdit}>Editar</Button>
                        </div>
                    )}
                </Card>
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
                {/* Logistics Section */}
                <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold text-lg flex items-center"><Hash className="h-5 w-5 mr-2 text-primary"/>Logística e Segurança</h4>
                    <StaticDetailSection icon={ParkingCircle} title="Estacionamento" content={day.parkingInfo} />
                    <StaticDetailSection icon={Utensils} title="Refeição" content={day.mealTime} />
                    <StaticDetailSection icon={Radio} title="Rádios" content={day.radioChannels} />
                    {day.nearestHospital && day.nearestHospital.name && (
                         <StaticDetailSection icon={Hospital} title="Hospital Mais Próximo" content={
                            <div className="space-y-1">
                                <p><span className="font-semibold text-foreground">Nome:</span> {day.nearestHospital.name}</p>
                                <p><span className="font-semibold text-foreground">Endereço:</span> {day.nearestHospital.address}</p>
                                <p><span className="font-semibold text-foreground">Telefone:</span> {day.nearestHospital.phone}</p>
                            </div>
                         }/>
                    )}
                </div>

                {/* Call Times */}
                <div>
                    <h4 className="flex items-center text-lg font-semibold mb-2">
                        <Clock className="h-5 w-5 mr-2 text-primary" />
                        Horários de Chamada
                    </h4>
                     {Array.isArray(day.callTimes) && day.callTimes.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>Departamento/Pessoa</TableHead><TableHead className="text-right">Horário</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {day.callTimes.map(ct => (
                                    <TableRow key={ct.id}><TableCell>{ct.department}</TableCell><TableCell className="text-right">{ct.time}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     ) : (
                        <p className="text-sm text-muted-foreground pl-6">Nenhum horário de chamada definido.</p>
                     )}
                </div>

                 {/* Scenes */}
                <div>
                     <h4 className="flex items-center text-lg font-semibold mb-2">
                        <Film className="h-5 w-5 mr-2 text-primary" />
                        Cenas a Gravar
                    </h4>
                    <div className="space-y-3">
                        {Array.isArray(day.scenes) && day.scenes.length > 0 ? (
                            day.scenes.map(scene => <SceneCard key={scene.id} scene={scene} />)
                        ) : (
                             <p className="text-sm text-muted-foreground pl-6">Nenhuma cena definida para hoje.</p>
                        )}
                    </div>
                </div>

                {/* Department Notes */}
                <div className="p-4 border rounded-lg space-y-2">
                     <h4 className="font-semibold text-lg flex items-center"><Users className="h-5 w-5 mr-2 text-primary"/>Notas dos Departamentos</h4>
                     <ChecklistSection icon={Truck} title="Equipamentos" items={day.equipment} onListUpdate={(list) => onUpdateNotes(day.id, 'equipment', list)} />
                     <ChecklistSection icon={Shirt} title="Figurino" items={day.costumes} onListUpdate={(list) => onUpdateNotes(day.id, 'costumes', list)} />
                     <ChecklistSection icon={Star} title="Objetos de Cena e Direção de Arte" items={day.props} onListUpdate={(list) => onUpdateNotes(day.id, 'props', list)} />
                </div>
                
                 {/* Present Team & General Notes */}
                 <div className="p-4 border rounded-lg space-y-2">
                    <ChecklistSection icon={FileText} title="Observações Gerais" items={day.generalNotes} onListUpdate={(list) => onUpdateNotes(day.id, 'generalNotes', list)} />
                    <StaticDetailSection icon={Users} title="Equipe Presente na Diária" content={
                        day.presentTeam && day.presentTeam.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {day.presentTeam.map(member => (
                                    <Badge key={member.id} variant="secondary" className="font-normal">{member.name} <span className="text-muted-foreground ml-1.5">({member.role})</span></Badge>
                                ))}
                            </div>
                        ) : <p className="text-sm text-muted-foreground">Nenhuma equipe selecionada para este dia.</p>
                    }/>
                </div>
            </div>
          </CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}
