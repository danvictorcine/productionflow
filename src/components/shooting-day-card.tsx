
// @/src/components/shooting-day-card.tsx
"use client";

import { useState, useEffect } from "react";
import type { Production, ShootingDay, Scene, ChecklistItem, LocationAddress, TeamMember } from "@/lib/types";
import { format, isToday, isPast, parse, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MoreVertical, Edit, Trash2, Calendar, MapPin, Clock,
  Users, FileText, Hospital, Radio, Utensils, Hash, Film, AlignLeft, FileSpreadsheet, FileDown, Share2, Hourglass, ChevronDown, AlignJustify, Truck, Star, Shirt, RotateCw, Loader2
} from "lucide-react";
import dynamic from 'next/dynamic';


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { WeatherCardAnimated } from "./weather-card-animated";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { getInitials } from "@/lib/utils";
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { CopyableError } from "./copyable-error";
import { useIsMobile } from "@/hooks/use-mobile";


const DisplayMap = dynamic(() => import('../components/display-map').then(mod => mod.DisplayMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

const StaticDetailSection = ({ icon: Icon, title, content }: { icon: React.ElementType; title: string; content?: string | React.ReactNode }) => {
    if (!content) return null;

    return (
        <div className="flex items-start gap-3 pt-2">
            <Icon className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
            <div className="flex-1">
                <p className="font-semibold text-foreground text-base">{title}</p>
                {typeof content === 'string' ? (
                    <p className="text-base text-muted-foreground whitespace-pre-wrap">{content}</p>
                ) : (
                    <div className="text-muted-foreground">{content}</div>
                )}
            </div>
        </div>
    );
};


const ChecklistSection = ({ icon: Icon, title, items, onListUpdate, isPublicView }: { icon: React.ElementType; title: string; items?: ChecklistItem[]; onListUpdate?: (updatedList: ChecklistItem[]) => void; isPublicView?: boolean; }) => {
    if (!items || items.length === 0) {
        return null;
    }

    const handleCheckChange = (itemId: string, newCheckedState: boolean) => {
        if (!onListUpdate || !items) return;
        const updatedList = items.map(item =>
            item.id === itemId ? { ...item, checked: newCheckedState } : item
        );
        onListUpdate(updatedList);
    };

    return (
        <div className="py-2">
            <h4 className="flex items-center text-base font-semibold">
                <Icon className="h-5 w-5 mr-2 text-primary" />
                <span>{title}</span>
            </h4>
            <div className="space-y-2 pt-2 pl-7">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                        <Checkbox
                            id={`${item.id}-checkbox`}
                            checked={item.checked}
                            onCheckedChange={(checked) => handleCheckChange(item.id, !!checked)}
                            disabled={isPublicView || !onListUpdate}
                        />
                        <Label htmlFor={`${item.id}-checkbox`} className={cn("text-base font-normal", item.checked ? 'text-muted-foreground line-through' : 'text-foreground')}>
                            {item.text}
                        </Label>
                    </div>
                ))}
            </div>
        </div>
    );
};

const formatSceneAddress = (location?: LocationAddress): string => {
    if (!location) return "Localização não definida";
    
    // Normalize city-like fields
    const city = location.city || location.town || location.village;
    const amenity = location.amenity || location.shop || location.tourism || location.office;
    const road = location.road;

    const addressParts: string[] = [
        amenity,
        road,
        location.house_number,
        location.suburb || location.neighbourhood,
        city,
        location.state,
        location.postcode,
        location.country,
    ].filter((p): p is string => typeof p === 'string' && p.trim() !== '');


    if (addressParts.length > 0) {
        return [...new Set(addressParts)].join(', ');
    }

    return location.displayName || "Localização não definida";
};


const SceneCard = ({ scene, isExporting, onUpdateSceneNotes }: { 
    scene: Scene, 
    isExporting: boolean,
    onUpdateSceneNotes?: (sceneId: string, listName: 'equipment' | 'costumes' | 'props', updatedList: ChecklistItem[]) => void 
}) => {
    const hasNotes = scene.equipment?.length || scene.costumes?.length || scene.props?.length;
    const isMobile = useIsMobile();

    const shareLink = scene.latitude && scene.longitude
      ? isMobile
        ? `geo:${scene.latitude},${scene.longitude}`
        : `https://www.google.com/maps?q=${scene.latitude},${scene.longitude}`
      : '#';
    
    return (
    <div className="p-4 rounded-lg border bg-background/50 space-y-3">
        <div className="flex flex-col md:flex-row gap-4 items-start">
            {scene.latitude && scene.longitude && (
                <div className="w-full md:w-1/3 aspect-video md:aspect-auto md:h-48 rounded-lg overflow-hidden shadow-lg border flex-shrink-0">
                    <DisplayMap position={[scene.latitude, scene.longitude]} className="h-full w-full" isExporting={isExporting} />
                </div>
            )}
            <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-baseline gap-2">
                        <h5 className="font-bold text-xl text-foreground">{scene.sceneNumber}</h5>
                        <p className="font-semibold text-lg text-primary">{scene.title}</p>
                    </div>
                    <Badge variant="outline" className="text-sm">{scene.pages}</Badge>
                </div>
                 <div className="flex items-start gap-2">
                    <AlignLeft className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <p className="text-base text-muted-foreground">{scene.description}</p>
                </div>
                 {scene.location?.displayName && scene.latitude && scene.longitude && (
                     <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <a href={shareLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                            {formatSceneAddress(scene.location)}
                        </a>
                    </div>
                )}
                {scene.presentInScene && scene.presentInScene.length > 0 && (
                    <div className="flex items-start gap-2">
                        <Users className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-wrap gap-2 items-center">
                           {scene.presentInScene.map(member => (
                                <Badge key={member.id} variant="secondary" className="font-normal text-sm p-1 pr-2.5 flex items-center gap-1.5">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={member.photoURL} />
                                        <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
                                    </Avatar>
                                    {member.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {hasNotes && (
            <>
                <Separator className="my-3" />
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="notes" className="border-b-0">
                        <AccordionTrigger className="w-full p-0 rounded-t-lg transition-colors group hover:no-underline">
                           <div className="flex items-center text-lg font-semibold flex-1">
                                <FileText className="h-5 w-5 mr-2 text-primary"/>
                                Notas por Departamento
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                            <div className="space-y-4 pt-2">
                                <ChecklistSection icon={Truck} title="Equipamentos" items={scene.equipment} onListUpdate={onUpdateSceneNotes ? (list) => onUpdateSceneNotes(scene.id, 'equipment', list) : undefined} isPublicView={isExporting} />
                                <ChecklistSection icon={Shirt} title="Figurino" items={scene.costumes} onListUpdate={onUpdateSceneNotes ? (list) => onUpdateSceneNotes(scene.id, 'costumes', list) : undefined} isPublicView={isExporting} />
                                <ChecklistSection icon={Star} title="Objetos de Cena e Direção de Arte" items={scene.props} onListUpdate={onUpdateSceneNotes ? (list) => onUpdateSceneNotes(scene.id, 'props', list) : undefined} isPublicView={isExporting} />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </>
        )}
    </div>
)};


interface ShootingDayCardProps {
  day: Omit<ShootingDay, 'generalNotes'> & { generalNotes?: string | ChecklistItem[] };
  production: Production;
  isFetchingWeather: boolean;
  isExporting: boolean;
  isPublicView?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onUpdateNotes?: (dayId: string, listName: 'equipment' | 'costumes' | 'props' | 'generalNotes', updatedList: ChecklistItem[]) => void;
  onRefreshWeather: () => void;
}


const formatLocationForHeader = (location?: LocationAddress): string => {
    if (!location) return "Localização não definida";

    const city = location.city || location.town || location.village;
    
    const parts = [city, location.state, location.country].filter(Boolean);

    if (parts.length > 0) {
        return parts.join(', ');
    }
    
    return location.displayName || "Localização não definida";
}

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

export const ShootingDayCard = ({ day, production, isFetchingWeather, onEdit, onDelete, onShare, onExportExcel, onExportPdf, onUpdateNotes, onRefreshWeather, isExporting, isPublicView = false }: ShootingDayCardProps) => {
    const { toast } = useToast();
    const [localDay, setLocalDay] = useState(day);
    const [remainingProductionTime, setRemainingProductionTime] = useState<string | null>(null);
    
    useEffect(() => {
        setLocalDay(day);
    }, [day]);

    const isFinished = isPast(parse(localDay.endTime || "00:00", "HH:mm", localDay.date));

    const formattedDateString = format(new Date(localDay.date), "eeee, dd/MM", { locale: ptBR });
    const displayDate = formattedDateString.charAt(0).toUpperCase() + formattedDateString.slice(1);

    const handleUpdateSceneNotes = async (
      sceneId: string,
      listName: 'equipment' | 'costumes' | 'props',
      updatedList: ChecklistItem[]
    ) => {
        const newLocalDay = {
            ...localDay,
            scenes: localDay.scenes.map(scene => 
                scene.id === sceneId 
                ? { ...scene, [listName]: updatedList } 
                : scene
            )
        };
        setLocalDay(newLocalDay as any);

        try {
            await firestoreApi.updateShootingDayScene(localDay.id, sceneId, { [listName]: updatedList });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao Atualizar', 
                description: <CopyableError userMessage="Não foi possível salvar a nota da cena." errorCode={errorTyped.code || errorTyped.message} /> 
            });
            setLocalDay(day);
        }
    };

    useEffect(() => {
        if (!localDay.startTime || !localDay.endTime || !isToday(localDay.date)) {
            setRemainingProductionTime(null);
            return;
        }

        const calculateRemaining = () => {
            const now = new Date();
            const startTime = parse(localDay.startTime!, "HH:mm", localDay.date);
            const endTime = parse(localDay.endTime!, "HH:mm", localDay.date);

            if (now < startTime) {
                setRemainingProductionTime("A produção ainda não começou.");
            } else if (now > endTime) {
                setRemainingProductionTime(null);
            } else {
                const diff = endTime.getTime() - now.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setRemainingProductionTime(`${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m restantes`);
            }
        };

        calculateRemaining();
        
        if (isToday(localDay.date) && new Date() < parse(localDay.endTime!, "HH:mm", localDay.date)) {
            const interval = setInterval(calculateRemaining, 60000);
            return () => clearInterval(interval);
        }

    }, [localDay.startTime, localDay.endTime, localDay.date]);

    const getFormattedGeneralNotes = () => {
        if (typeof localDay.generalNotes === 'string') {
            return localDay.generalNotes;
        }
        if (Array.isArray(localDay.generalNotes)) {
            return localDay.generalNotes.map(item => item.text).join('\n');
        }
        return '';
    };

    const totalDuration = calculateDuration(localDay.startTime, localDay.endTime);
    const topGridClass = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

    return (
        <AccordionItem value={localDay.id} className="border-none">
            <Card id={`shooting-day-card-${localDay.id}`} className="flex flex-col w-full">
                 <AccordionTrigger className="w-full p-6 hover:no-underline hover:bg-muted/50 rounded-t-lg transition-colors">
                    <CardHeader className="flex-1 flex flex-row items-center justify-between text-left p-0">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold leading-none tracking-tight">
                                    {localDay.dayNumber && localDay.totalDays ? `Diária ${localDay.dayNumber}/${localDay.totalDays}: ` : ''} 
                                    {displayDate}
                                </h3>
                                <p className="text-base text-muted-foreground flex items-center gap-1.5 pt-1">
                                <MapPin className="h-4 w-4" /> {formatLocationForHeader(localDay.location)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {!isPublicView && (
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
                                        <DropdownMenuItem onClick={onShare} disabled={isExporting}>
                                            <Share2 className="mr-2 h-4 w-4" />
                                            Compartilhar Link
                                        </DropdownMenuItem>
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
                            )}
                            <div className="h-8 w-8 rounded-md flex items-center justify-center transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                        </div>
                    </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="flex-grow flex flex-col justify-between space-y-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="relative h-[235px] transition-all duration-500 ease-in-out group">
                                {isFetchingWeather ? (
                                    <Skeleton className="h-full w-full rounded-2xl" />
                                ) : localDay.weather ? (
                                    <>
                                        <WeatherCardAnimated weather={localDay.weather} day={localDay as ShootingDay} />
                                        {!isPublicView && (
                                            <Button size="icon" variant="ghost" className="absolute top-2 right-2 z-40 h-8 w-8 text-black/60 dark:text-white/70 hover:bg-transparent" onClick={onRefreshWeather} disabled={isFetchingWeather} aria-label="Atualizar previsão do tempo">
                                                {isFetchingWeather ? <Loader2 className="h-4 w-4 animate-spin"/> : <RotateCw className="h-4 w-4"/>}
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <div className="h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center">
                                        <p className="text-sm font-semibold">Sem dados de clima</p>
                                        <p className="text-xs text-muted-foreground mt-1">Edite a Ordem do Dia para buscar a previsão.</p>
                                        {!isPublicView && <Button size="sm" variant="outline" className="mt-3" onClick={onEdit}>Editar</Button>}
                                    </div>
                                )}
                            </div>
                            <div className="h-[235px] transition-all duration-500 ease-in-out hover:scale-105 rounded-2xl shadow-lg">
                                {localDay.latitude && localDay.longitude ? (
                                    <DisplayMap position={[localDay.latitude, localDay.longitude]} className="h-full w-full" isExporting={isExporting} />
                                ) : (
                                    <div className="h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center">
                                    <p className="text-sm font-semibold">Sem mapa</p>
                                    <p className="text-xs text-muted-foreground mt-1">Defina um local para exibir o mapa.</p>
                                    </div>
                                )}
                            </div>
                            <div className="h-[235px] transition-all duration-500 ease-in-out hover:scale-105">
                                <Card className="h-full flex flex-col justify-center items-center p-4 bg-card rounded-2xl shadow-lg">
                                    <CardHeader className="p-0 text-center">
                                        <CardTitle className="text-lg flex items-center justify-center gap-2">
                                            <Clock className="h-5 w-5 text-primary" />
                                            Horários da Diária
                                        </CardTitle>
                                    </CardHeader>
                                    
                                    <div className="text-center space-y-2 mt-4">
                                        {localDay.startTime && localDay.endTime ? (
                                            <>
                                                <p className="text-muted-foreground text-lg">
                                                    <span className="font-semibold text-foreground">{localDay.startTime}</span> até <span className="font-semibold text-foreground">{localDay.endTime}</span>
                                                </p>
                                                <div className="flex flex-col items-center gap-1.5 mt-2">
                                                    {totalDuration && <Badge variant="secondary" className="text-sm">{totalDuration} de duração</Badge>}
                                                    {remainingProductionTime ? (
                                                        <Badge variant="secondary" className="text-sm bg-primary/10 text-primary">{remainingProductionTime}</Badge>
                                                    ) : isFinished ? (
                                                         <Badge variant="destructive" className="text-sm">{`Produção Finalizada`}</Badge>
                                                    ) : null}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center text-sm text-muted-foreground">
                                                <p>Horários não definidos.</p>
                                                {!isPublicView && <Button size="sm" variant="outline" className="mt-2" onClick={onEdit}>Editar</Button>}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </div>

                        <Separator />
                        
                        <div className="space-y-4">
                            <div className="p-4 border rounded-lg space-y-2">
                                <h4 className="font-semibold text-xl flex items-center"><Hash className="h-6 w-6 mr-2 text-primary" />Logística e Segurança</h4>
                                <StaticDetailSection icon={Utensils} title="Refeição" content={localDay.mealTime} />
                                <StaticDetailSection icon={Radio} title="Rádios" content={localDay.radioChannels} />
                                {localDay.nearestHospital && localDay.nearestHospital.name && (
                                    <StaticDetailSection icon={Hospital} title="Hospital Mais Próximo" content={
                                        <div className="space-y-1 text-base">
                                            <p><span className="font-semibold text-foreground">Nome:</span> {localDay.nearestHospital.name}</p>
                                            <p><span className="font-semibold text-foreground">Endereço:</span> {localDay.nearestHospital.address}</p>
                                            <p><span className="font-semibold text-foreground">Telefone:</span> {localDay.nearestHospital.phone}</p>
                                        </div>
                                    }/>
                                )}
                            </div>

                            <div>
                                <h4 className="flex items-center text-xl font-semibold mb-2">
                                    <Clock className="h-6 w-6 mr-2 text-primary" />
                                    Horários de Chamada
                                </h4>
                                {Array.isArray(localDay.callTimes) && localDay.callTimes.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow><TableHead className="text-base">Departamento/Pessoa</TableHead><TableHead className="text-right text-base">Horário</TableHead></TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {localDay.callTimes.map(ct => (
                                                <TableRow key={ct.id}><TableCell className="text-base">{ct.department}</TableCell><TableCell className="text-right text-base">{ct.time}</TableCell></TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-base text-muted-foreground pl-6">Nenhum horário de chamada definido.</p>
                                )}
                            </div>

                            <div>
                                <h4 className="flex items-center text-xl font-semibold mb-2">
                                    <Film className="h-6 w-6 mr-2 text-primary" />
                                    Cenas a Gravar
                                </h4>
                                <div className="space-y-3">
                                    {Array.isArray(localDay.scenes) && localDay.scenes.length > 0 ? (
                                        localDay.scenes.map(scene => (
                                            <SceneCard 
                                                key={scene.id} 
                                                scene={scene} 
                                                isExporting={isExporting}
                                                onUpdateSceneNotes={onUpdateNotes ? handleUpdateSceneNotes : undefined}
                                            />
                                        ))
                                    ) : (
                                        <p className="text-base text-muted-foreground pl-6">Nenhuma cena definida para hoje.</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-4 border rounded-lg space-y-2">
                                <StaticDetailSection icon={AlignJustify} title="Observações Gerais" content={getFormattedGeneralNotes()} />
                                <StaticDetailSection icon={Users} title="Equipe Presente na Diária" content={
                                    localDay.presentTeam && localDay.presentTeam.length > 0 ? (
                                        <div className="flex flex-wrap gap-3 items-center">
                                            {localDay.presentTeam.map(member => (
                                                <div key={member.id} className="flex items-center gap-2 bg-muted p-1 pr-2.5 rounded-full">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={member.photoURL} />
                                                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium text-sm text-foreground">{member.name} <span className="text-muted-foreground">({member.role})</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-base text-muted-foreground">Nenhuma equipe selecionada para este dia.</p>
                                }/>
                            </div>
                        </div>
                    </CardContent>
                </AccordionContent>
            </Card>
        </AccordionItem>
    );
};
