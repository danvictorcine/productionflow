
// @/src/components/shooting-day-card.tsx
"use client";

import { useState, useEffect, forwardRef } from "react";
import type { Production, ShootingDay, Scene, ChecklistItem } from "@/lib/types";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MoreVertical, Edit, Trash2, Calendar, MapPin, Clapperboard, Clock, Hourglass,
  Users, Truck, Shirt, Star, FileText, Hospital, ParkingCircle, Radio, Utensils, Hash, Film, AlignLeft, FileSpreadsheet, FileDown, Share2, Image as ImageIcon
} from "lucide-react";
import dynamic from 'next/dynamic';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';


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
  isExporting: boolean;
  isPublicView?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onUpdateNotes?: (dayId: string, listName: 'equipment' | 'costumes' | 'props' | 'generalNotes', updatedList: ChecklistItem[]) => void;
}

const StaticDetailSection = ({ icon: Icon, title, content }: { icon: React.ElementType, title: string, content?: React.ReactNode }) => {
  const hasContent = typeof content === 'string' ? !!content.trim() : !!content;
  if (!hasContent) return null;

  return (
    <div className="py-2">
        <h4 className="flex items-center text-lg font-semibold">
            <Icon className="h-5 w-5 mr-2 text-primary" />
            {title}
        </h4>
        <div className="text-base text-muted-foreground whitespace-pre-wrap pt-1 pl-7">{content}</div>
    </div>
  );
};

const ChecklistSection = ({ icon: Icon, title, items, onListUpdate, isPublicView }: { icon: React.ElementType; title: string; items: ChecklistItem[]; onListUpdate?: (updatedList: ChecklistItem[]) => void; isPublicView?: boolean; }) => {
    if (!items || items.length === 0) {
        return null;
    }

    const handleCheckChange = (itemId: string, newCheckedState: boolean) => {
        if (!onListUpdate) return;
        const updatedList = items.map(item =>
            item.id === itemId ? { ...item, checked: newCheckedState } : item
        );
        onListUpdate(updatedList);
    };

    return (
        <div className="py-2">
            <h4 className="flex items-center text-lg font-semibold">
                <Icon className="h-5 w-5 mr-2 text-primary" />
                <span>{title}</span>
            </h4>
            <div className="space-y-2 pt-1 pl-7">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                        <Checkbox
                            id={`${item.id}-checkbox`}
                            checked={item.checked}
                            onCheckedChange={(checked) => handleCheckChange(item.id, !!checked)}
                            disabled={isPublicView || !onListUpdate}
                        />
                        <Label htmlFor={`${item.id}-checkbox`} className={`text-base font-normal ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
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
                <h5 className="font-bold text-xl text-foreground">{scene.sceneNumber}</h5>
                <p className="font-semibold text-lg text-primary">{scene.title}</p>
            </div>
            <Badge variant="outline" className="text-sm">{scene.pages}</Badge>
        </div>
        <div className="pl-2 space-y-3">
            <div className="flex items-start gap-2">
                <AlignLeft className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <p className="text-base text-muted-foreground">{scene.description}</p>
            </div>
             {scene.presentInScene && scene.presentInScene.length > 0 && (
                <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-wrap gap-1">
                        {scene.presentInScene.map(member => (
                            <Badge key={member.id} variant="secondary" className="font-normal text-sm">{member.name}</Badge>
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

const ShootingDayCardContent = forwardRef<HTMLDivElement, ShootingDayCardProps>(({ day, isFetchingWeather, onEdit, onDelete, onExportExcel, onExportPdf, onUpdateNotes, isExporting, isPublicView = false }, ref) => {
    const [isClient, setIsClient] = useState(false);
  
    useEffect(() => {
        setIsClient(true);
    }, []);

    const totalDuration = calculateDuration(day.startTime, day.endTime);
    const topGridClass = "grid grid-cols-1 md:grid-cols-3 gap-6";

    return (
        <CardContent className="flex-grow flex flex-col justify-between space-y-6">
            <div className={topGridClass}>
                <div className="h-[180px]">
                    {isFetchingWeather ? (
                        <Skeleton className="h-full w-full" />
                    ) : day.weather ? (
                        <WeatherCard weather={day.weather} />
                    ) : (
                        <div className="h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center">
                            <p className="text-sm font-semibold">Sem dados de clima</p>
                            <p className="text-xs text-muted-foreground mt-1">Edite a Ordem do Dia para buscar a previsão.</p>
                            {!isPublicView && <Button size="sm" variant="outline" className="mt-3" onClick={onEdit}>Editar</Button>}
                        </div>
                    )}
                </div>
                <div className="h-[180px]">
                    {day.latitude && day.longitude ? (
                        <DisplayMap position={[day.latitude, day.longitude]} className="h-full w-full rounded-lg" isExporting={isExporting} />
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
                        {isClient && day.startTime && day.endTime ? (
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-lg">
                                    <span className="font-semibold text-foreground">{day.startTime}</span> até <span className="font-semibold text-foreground">{day.endTime}</span>
                                </p>
                                {totalDuration && <Badge variant="secondary" className="text-sm">{totalDuration} de duração</Badge>}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground">
                                <p>Horários não definidos.</p>
                                {!isPublicView && <Button size="sm" variant="outline" className="mt-2" onClick={onEdit}>Editar</Button>}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
                {/* Logistics Section */}
                <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold text-xl flex items-center"><Hash className="h-6 w-6 mr-2 text-primary" />Logística e Segurança</h4>
                    <StaticDetailSection icon={ParkingCircle} title="Estacionamento" content={day.parkingInfo} />
                    <StaticDetailSection icon={Utensils} title="Refeição" content={day.mealTime} />
                    <StaticDetailSection icon={Radio} title="Rádios" content={day.radioChannels} />
                    {day.nearestHospital && day.nearestHospital.name && (
                         <StaticDetailSection icon={Hospital} title="Hospital Mais Próximo" content={
                            <div className="space-y-1 text-base">
                                <p><span className="font-semibold text-foreground">Nome:</span> {day.nearestHospital.name}</p>
                                <p><span className="font-semibold text-foreground">Endereço:</span> {day.nearestHospital.address}</p>
                                <p><span className="font-semibold text-foreground">Telefone:</span> {day.nearestHospital.phone}</p>
                            </div>
                         }/>
                    )}
                </div>

                {/* Call Times */}
                <div>
                    <h4 className="flex items-center text-xl font-semibold mb-2">
                        <Clock className="h-6 w-6 mr-2 text-primary" />
                        Horários de Chamada
                    </h4>
                     {Array.isArray(day.callTimes) && day.callTimes.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead className="text-base">Departamento/Pessoa</TableHead><TableHead className="text-right text-base">Horário</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {day.callTimes.map(ct => (
                                    <TableRow key={ct.id}><TableCell className="text-base">{ct.department}</TableCell><TableCell className="text-right text-base">{ct.time}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     ) : (
                        <p className="text-base text-muted-foreground pl-6">Nenhum horário de chamada definido.</p>
                     )}
                </div>

                 {/* Scenes */}
                <div>
                     <h4 className="flex items-center text-xl font-semibold mb-2">
                        <Film className="h-6 w-6 mr-2 text-primary" />
                        Cenas a Gravar
                    </h4>
                    <div className="space-y-3">
                        {Array.isArray(day.scenes) && day.scenes.length > 0 ? (
                            day.scenes.map(scene => <SceneCard key={scene.id} scene={scene} />)
                        ) : (
                             <p className="text-base text-muted-foreground pl-6">Nenhuma cena definida para hoje.</p>
                        )}
                    </div>
                </div>

                {/* Department Notes */}
                <div className="p-4 border rounded-lg space-y-2">
                     <h4 className="font-semibold text-xl flex items-center"><Users className="h-6 w-6 mr-2 text-primary"/>Notas dos Departamentos</h4>
                     <ChecklistSection icon={Truck} title="Equipamentos" items={day.equipment} onListUpdate={onUpdateNotes ? (list) => onUpdateNotes(day.id, 'equipment', list) : undefined} isPublicView={isPublicView} />
                     <ChecklistSection icon={Shirt} title="Figurino" items={day.costumes} onListUpdate={onUpdateNotes ? (list) => onUpdateNotes(day.id, 'costumes', list) : undefined} isPublicView={isPublicView} />
                     <ChecklistSection icon={Star} title="Objetos de Cena e Direção de Arte" items={day.props} onListUpdate={onUpdateNotes ? (list) => onUpdateNotes(day.id, 'props', list) : undefined} isPublicView={isPublicView} />
                </div>
                
                 {/* Present Team & General Notes */}
                 <div className="p-4 border rounded-lg space-y-2">
                    <ChecklistSection icon={FileText} title="Observações Gerais" items={day.generalNotes} onListUpdate={onUpdateNotes ? (list) => onUpdateNotes(day.id, 'generalNotes', list) : undefined} isPublicView={isPublicView} />
                    <StaticDetailSection icon={Users} title="Equipe Presente na Diária" content={
                        day.presentTeam && day.presentTeam.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {day.presentTeam.map(member => (
                                    <Badge key={member.id} variant="secondary" className="font-normal text-base">{member.name} <span className="text-muted-foreground ml-1.5">({member.role})</span></Badge>
                                ))}
                            </div>
                        ) : <p className="text-base text-muted-foreground">Nenhuma equipe selecionada para este dia.</p>
                    }/>
                </div>
            </div>
        </CardContent>
    );
});
ShootingDayCardContent.displayName = 'ShootingDayCardContent';

export const ShootingDayCard = ({ day, isFetchingWeather, onEdit, onDelete, onExportExcel, onExportPdf, onExportPng, onUpdateNotes, isExporting, isPublicView = false }: ShootingDayCardProps) => {
    
    // For normal display, use the Accordion
    if (!isPublicView) {
        return (
            <AccordionItem value={day.id} className="border-none">
                <Card id={`shooting-day-card-${day.id}`} className="flex flex-col w-full">
                    <div className="relative">
                    <AccordionTrigger className="flex w-full items-center p-6 text-left hover:no-underline [&>svg]:data-[public=true]:hidden" data-public={isPublicView}>
                        <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                            <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold leading-none tracking-tight">
                                    {day.dayNumber && day.totalDays ? `Diária ${day.dayNumber}/${day.totalDays}: ` : ''} 
                                    {format(new Date(day.date), "eeee, dd/MM", { locale: ptBR })}
                                </h3>
                                <p className="text-base text-muted-foreground flex items-center gap-1.5 pt-1">
                                <MapPin className="h-4 w-4" /> {day.location}
                                </p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    {!isPublicView && (
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
                                    <DropdownMenuItem onClick={onExportPng} disabled={isExporting}>
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        Exportar como PNG
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onDelete} disabled={isExporting} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                    </div>
                    <AccordionContent className="pt-0">
                        <ShootingDayCardContent {...{ day, isFetchingWeather, onEdit, onDelete, onExportExcel, onExportPdf, onExportPng, onUpdateNotes, isExporting, isPublicView }} />
                    </AccordionContent>
                </Card>
            </AccordionItem>
        );
    }

    // For PDF/public view, render without Accordion, fully expanded.
    return (
        <Card id={`shooting-day-card-${day.id}`} className="flex flex-col w-full border-none shadow-none bg-background text-foreground">
             <CardHeader className="p-0 pb-6">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold leading-none tracking-tight">
                            {day.dayNumber && day.totalDays ? `Diária ${day.dayNumber}/${day.totalDays}: ` : ''} 
                            {format(new Date(day.date), "eeee, dd MMMM, yyyy", { locale: ptBR })}
                        </h3>
                        <p className="text-base text-muted-foreground flex items-center gap-1.5 pt-1">
                            <MapPin className="h-4 w-4" /> {day.location}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <ShootingDayCardContent {...{ day, isFetchingWeather, onEdit, onDelete, onExportExcel, onExportPdf, onExportPng, onUpdateNotes, isExporting, isPublicView }} />
        </Card>
    );
};

// PDF Document Component using @react-pdf/renderer
Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2', fontWeight: 500 },
        { src: 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2', fontWeight: 700 },
    ]
});

const styles = StyleSheet.create({
    page: { fontFamily: 'Inter', fontSize: 10, padding: 30, color: '#333' },
    header: { marginBottom: 20 },
    productionTitle: { fontSize: 24, fontWeight: 'bold', color: '#111' },
    productionSubtitle: { fontSize: 12, color: '#555' },
    section: { marginBottom: 15, },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#000', borderBottom: 1, borderBottomColor: '#eee', paddingBottom: 4 },
    text: { fontSize: 11, color: '#444' },
    bold: { fontWeight: 'bold', color: '#222' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, padding: '4px 0' },
    table: { display: "flex", width: "auto", borderStyle: "solid", borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0, borderColor: '#ddd' },
    tableRow: { flexDirection: "row" },
    tableColHeader: { width: "50%", borderStyle: "solid", borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, borderColor: '#ddd', backgroundColor: '#f8f8f8', padding: 5 },
    tableCol: { width: "50%", borderStyle: "solid", borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, borderColor: '#ddd', padding: 5 },
    tableCellHeader: { fontWeight: 'bold' },
    sceneCard: { backgroundColor: '#f9f9f9', borderRadius: 4, padding: 10, marginBottom: 8, border: 1, borderColor: '#eee' },
    sceneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    sceneNumber: { fontSize: 14, fontWeight: 'bold'},
    sceneTitleText: { fontSize: 12, fontWeight: 'semibold', color: '#1a1a1a' },
    scenePages: { backgroundColor: '#eee', padding: '2px 5px', borderRadius: 10, fontSize: 10 },
    checklistItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    checkbox: { width: 8, height: 8, borderWidth: 1, borderColor: '#555', marginRight: 5 },
    footer: { position: 'absolute', bottom: 15, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#aaa' }
});

export const ShootingDayPdfDocument = ({ day, production }: { day: ProcessedShootingDay, production: Production }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.header}>
                <Text style={styles.productionTitle}>{production.name}</Text>
                <Text style={styles.productionSubtitle}>{production.type} | Diretor: {production.director}</Text>
                <Text style={styles.productionSubtitle}>
                    {day.dayNumber && day.totalDays ? `Diária ${day.dayNumber}/${day.totalDays} | ` : ''} 
                    {format(new Date(day.date), "eeee, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Text>
                 <Text style={styles.productionSubtitle}>Local: {day.location}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Horários de Chamada</Text>
                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Departamento/Pessoa</Text></View>
                        <View style={{ ...styles.tableColHeader, textAlign: 'right' }}><Text style={styles.tableCellHeader}>Horário</Text></View>
                    </View>
                    {(day.callTimes || []).map(ct => (
                        <View key={ct.id} style={styles.tableRow}>
                            <View style={styles.tableCol}><Text>{ct.department}</Text></View>
                            <View style={{...styles.tableCol, textAlign: 'right'}}><Text>{ct.time}</Text></View>
                        </View>
                    ))}
                </View>
            </View>
            
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cenas a Gravar</Text>
                {(day.scenes || []).map(scene => (
                     <View key={scene.id} style={styles.sceneCard}>
                        <View style={styles.sceneHeader}>
                            <Text><Text style={styles.sceneNumber}>{scene.sceneNumber}</Text> <Text style={styles.sceneTitleText}>{scene.title}</Text></Text>
                            <Text style={styles.scenePages}>{scene.pages}</Text>
                        </View>
                        <Text style={styles.text}>{scene.description}</Text>
                        {scene.presentInScene && scene.presentInScene.length > 0 && (
                            <Text style={{...styles.text, marginTop: 5}}><Text style={styles.bold}>Elenco:</Text> {scene.presentInScene.map(m => m.name).join(', ')}</Text>
                        )}
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                 <Text style={styles.sectionTitle}>Notas dos Departamentos</Text>
                 {(day.equipment || []).length > 0 && <Text style={{...styles.bold, marginTop: 5}}>Equipamentos:</Text>}
                 {(day.equipment || []).map(item => (<View key={item.id} style={styles.checklistItem}><View style={styles.checkbox}/><Text>{item.text}</Text></View>))}
                 {(day.costumes || []).length > 0 && <Text style={{...styles.bold, marginTop: 5}}>Figurino:</Text>}
                 {(day.costumes || []).map(item => (<View key={item.id} style={styles.checklistItem}><View style={styles.checkbox}/><Text>{item.text}</Text></View>))}
                 {(day.props || []).length > 0 && <Text style={{...styles.bold, marginTop: 5}}>Objetos de Cena e Arte:</Text>}
                 {(day.props || []).map(item => (<View key={item.id} style={styles.checklistItem}><View style={styles.checkbox}/><Text>{item.text}</Text></View>))}
                 {(day.generalNotes || []).length > 0 && <Text style={{...styles.bold, marginTop: 5}}>Observações Gerais:</Text>}
                 {(day.generalNotes || []).map(item => (<View key={item.id} style={styles.checklistItem}><View style={styles.checkbox}/><Text>{item.text}</Text></View>))}
            </View>
            
             <View style={styles.section}>
                <Text style={styles.sectionTitle}>Logística e Segurança</Text>
                <Text><Text style={styles.bold}>Estacionamento:</Text> {day.parkingInfo || 'N/A'}</Text>
                <Text><Text style={styles.bold}>Refeição:</Text> {day.mealTime || 'N/A'}</Text>
                <Text><Text style={styles.bold}>Canais de Rádio:</Text> {day.radioChannels || 'N/A'}</Text>
                 {day.nearestHospital?.name && <Text><Text style={styles.bold}>Hospital:</Text> {`${day.nearestHospital.name}, ${day.nearestHospital.address}, ${day.nearestHospital.phone}`}</Text>}
            </View>

            <Text style={styles.footer}>Gerado com ProductionFlow - © {new Date().getFullYear()} Candeeiro Filmes</Text>
        </Page>
    </Document>
);
