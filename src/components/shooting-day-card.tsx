// @/src/components/shooting-day-card.tsx
"use client";

import type { ShootingDay, Scene } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MoreVertical, Edit, Trash2, Calendar, MapPin, Clapperboard, Clock,
  Users, Truck, Shirt, Star, FileText, Hospital, ParkingCircle, Radio, Utensils, Hash, Film, AlignLeft, FileSpreadsheet, FileDown
} from "lucide-react";
import dynamic from 'next/dynamic';

import { Card, CardContent } from "@/components/ui/card";
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

const DisplayMap = dynamic(() => import('./display-map').then(mod => mod.DisplayMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});


interface ShootingDayCardProps {
  day: ShootingDay;
  isFetchingWeather: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
}

// Collapsible section
const DetailSection = ({ icon: Icon, title, content, defaultOpen = false }: { icon: React.ElementType, title: string, content?: React.ReactNode, defaultOpen?: boolean }) => {
  const hasContent = typeof content === 'string' ? !!content.trim() : !!content;

  if (!hasContent) return null;

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue={defaultOpen ? "item-1" : ""}>
        <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline">
                <h4 className="flex items-center text-md font-semibold">
                    <Icon className="h-4 w-4 mr-2 text-primary" />
                    {title}
                </h4>
            </AccordionTrigger>
            <AccordionContent>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">{content}</div>
            </AccordionContent>
        </AccordionItem>
    </Accordion>
  )
};

// Always-visible section
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


export function ShootingDayCard({ day, isFetchingWeather, onEdit, onDelete, onExportExcel, onExportPdf, isExporting }: ShootingDayCardProps) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            <Separator />
            
            <div className="space-y-4">
                {/* Logistics Section */}
                <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold text-lg flex items-center"><Hash className="h-5 w-5 mr-2 text-primary"/>Logística e Segurança</h4>
                    <StaticDetailSection icon={ParkingCircle} title="Estacionamento" content={day.parkingInfo} />
                    <StaticDetailSection icon={Utensils} title="Refeição" content={day.mealTime} />
                    <DetailSection icon={Radio} title="Rádios" content={day.radioChannels} />
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
                        <p className="text-sm text-muted-foreground pl-6">{typeof day.callTimes === 'string' ? day.callTimes : "Nenhum horário de chamada definido."}</p>
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
                             <p className="text-sm text-muted-foreground pl-6">{typeof day.scenes === 'string' ? day.scenes : "Nenhuma cena definida para hoje."}</p>
                        )}
                    </div>
                </div>

                {/* Department Notes */}
                <div className="p-4 border rounded-lg space-y-2">
                     <h4 className="font-semibold text-lg flex items-center"><Users className="h-5 w-5 mr-2 text-primary"/>Notas dos Departamentos</h4>
                     <StaticDetailSection icon={Truck} title="Equipamentos" content={day.equipment} />
                     <StaticDetailSection icon={Shirt} title="Figurino" content={day.costumes} />
                     <StaticDetailSection icon={Star} title="Objetos de Cena e Direção de Arte" content={day.props} />
                </div>
                
                 {/* Present Team & General Notes */}
                <DetailSection icon={Users} title="Equipe Presente na Diária" content={
                    day.presentTeam && day.presentTeam.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {day.presentTeam.map(member => (
                                <Badge key={member.id} variant="secondary" className="font-normal">{member.name} <span className="text-muted-foreground ml-1.5">({member.role})</span></Badge>
                            ))}
                        </div>
                    ) : <p className="text-sm text-muted-foreground">Nenhuma equipe selecionada para este dia.</p>
                }/>
                <DetailSection icon={FileText} title="Observações Gerais" content={day.generalNotes} defaultOpen />
            </div>
          </CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}
