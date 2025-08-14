
// @/src/components/production-page-detail.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Share2, Clapperboard, FileSpreadsheet, FileDown } from 'lucide-react';
import { format, isToday, isFuture, parseISO, differenceInHours } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import type { Production, ShootingDay, TeamMember, WeatherInfo } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { CreateEditProductionDialog } from '@/components/create-edit-production-dialog';
import { CreateEditShootingDayDialog } from '@/components/create-edit-shooting-day-dialog';
import { ShootingDayCard } from '@/components/shooting-day-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CopyableError } from '@/components/copyable-error';
import { Accordion } from '@/components/ui/accordion';
import { ProductionInfoCard } from '@/components/production-info-card';
import { TeamAndCastSection } from '@/components/team-and-cast-section';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

type ProcessedShootingDay = ShootingDay;

const PdfExportPortal = ({ day, production }: { day: ProcessedShootingDay, production: Production }) => {
  return (
    <div 
      id="pdf-export-content" 
      className="fixed left-[-9999px] top-0 w-[800px] bg-background p-8"
    >
       <div className="mb-6">
        <ProductionInfoCard production={production} />
      </div>
      <Accordion type="single" collapsible defaultValue={day.id} className="w-full">
        <ShootingDayCard
          day={day}
          production={production}
          isFetchingWeather={false}
          isExporting={true}
          isPublicView={true}
          onRefreshWeather={() => {}}
        />
      </Accordion>
      <div className="mt-8 text-center text-sm text-muted-foreground">
        Criado com ProductionFlow
      </div>
    </div>
  );
};

interface ProductionPageDetailProps {
    production: Production;
    shootingDays: ShootingDay[];
    onDataRefresh: () => void;
}

export default function ProductionPageDetail({ production, shootingDays, onDataRefresh }: ProductionPageDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isFetchingWeather, setIsFetchingWeather] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [dayToExportPdf, setDayToExportPdf] = useState<ProcessedShootingDay | null>(null);

  // Dialog states
  const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
  const [isShootingDayDialogOpen, setIsShootingDayDialogOpen] = useState(false);
  const [editingShootingDay, setEditingShootingDay] = useState<ProcessedShootingDay | null>(null);
  const [dayToDelete, setDayToDelete] = useState<ProcessedShootingDay | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const fetchAndUpdateWeather = useCallback(async (day: ShootingDay) => {
    if (!day.latitude || !day.longitude) {
      toast({ variant: 'destructive', title: 'Localização necessária', description: 'Defina a localização da diária para obter a previsão do tempo.' });
      return;
    }
    
    setIsFetchingWeather(prev => ({ ...prev, [day.id]: true }));

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${day.latitude}&longitude=${day.longitude}&daily=weather_code,temperature_2m_max,sunrise,sunset&hourly=temperature_2m,weather_code&timezone=auto`);
        if (!response.ok) {
            throw new Error('Não foi possível obter os dados do clima.');
        }
        const weatherData = await response.json();
        
        const locationResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${day.latitude}&lon=${day.longitude}`);
        const locationData = await locationResponse.json();
        const locationName = locationData.display_name || 'Localização Desconhecida';

        const updatedWeather: WeatherInfo = {
            daily: weatherData.daily,
            hourly: weatherData.hourly,
            lastUpdated: new Date().toISOString(),
            locationName,
            date: format(day.date, 'yyyy-MM-dd'),
            timezone: weatherData.timezone
        };

        await firestoreApi.updateShootingDay(day.id, { weather: updatedWeather });
        onDataRefresh();
        toast({ title: 'Previsão do tempo atualizada!' });
    } catch (error) {
        const errorTyped = error as { code?: string; message: string };
        toast({
            variant: 'destructive',
            title: 'Erro ao buscar clima',
            description: <CopyableError userMessage="Não foi possível obter a previsão do tempo." errorCode={errorTyped.code || errorTyped.message} />,
        });
    } finally {
        setIsFetchingWeather(prev => ({ ...prev, [day.id]: false }));
    }
  }, [toast, onDataRefresh]);
  
  useEffect(() => {
    shootingDays.forEach(day => {
        const dayDate = new Date(day.date);
        const shouldFetch = isToday(dayDate) || isFuture(dayDate);
        if (!shouldFetch) return;

        const needsUpdate = !day.weather || !day.weather.lastUpdated || differenceInHours(new Date(), parseISO(day.weather.lastUpdated)) >= 1;

        if (needsUpdate) {
            fetchAndUpdateWeather(day);
        }
    });
  }, [shootingDays, fetchAndUpdateWeather]);

  const handleProductionSubmit = async (data: Omit<Production, 'id' | 'userId' | 'createdAt'>) => {
    try {
      await firestoreApi.updateProduction(production.id, data);
      onDataRefresh();
      setIsProductionDialogOpen(false);
      toast({ title: 'Produção atualizada com sucesso!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar produção.' });
    }
  };

  const handleShootingDaySubmit = async (data: Omit<ShootingDay, 'id' | 'userId' | 'productionId'>) => {
    try {
        if (editingShootingDay) {
            await firestoreApi.updateShootingDay(editingShootingDay.id, data);
            toast({ title: 'Ordem do Dia atualizada!' });
        } else {
            await firestoreApi.addShootingDay(production.id, data);
            toast({ title: 'Ordem do Dia criada!' });
        }
        onDataRefresh();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao salvar Ordem do Dia.' });
    } finally {
        setIsShootingDayDialogOpen(false);
        setEditingShootingDay(null);
    }
  };

  const handleDeleteDay = async () => {
    if (!dayToDelete) return;
    try {
      await firestoreApi.deleteShootingDay(dayToDelete.id);
      toast({ title: 'Ordem do Dia excluída.' });
      onDataRefresh();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao excluir Ordem do Dia.' });
    } finally {
      setDayToDelete(null);
    }
  };

   const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    const updatedTeam = production.team.filter(member => member.id !== memberToDelete.id);
    await handleProductionSubmit({ ...production, team: updatedTeam });
    toast({ title: "Membro da equipe removido." });
    setMemberToDelete(null);
  };
  
  // SHARE AND EXPORT FUNCTIONS (simplified for brevity)
  const handleShare = (type: 'day'|'production', id: string, day?: ShootingDay) => toast({title: "Função de compartilhamento em desenvolvimento"});
  const handleExportToExcel = () => toast({title: "Função de exportação para Excel em desenvolvimento"});
  const handleExportDayToExcel = () => toast({title: "Função de exportação para Excel em desenvolvimento"});
  const handleExportDayToPdf = async (dayToExport: ShootingDay) => toast({title: "Função de exportação para PDF em desenvolvimento"});

  const handleUpdateNotes = async (dayId: string, listName: string, list: any[]) => {
    try {
        await firestoreApi.updateShootingDay(dayId, { [listName]: list });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao salvar nota',
            description: 'Não foi possível salvar a alteração na nota.',
        });
        onDataRefresh(); // Revert local state on error
    }
  };


  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-none p-4 border-b">
         <div className="flex items-center gap-2">
            <Button onClick={() => setIsProductionDialogOpen(true)} variant="outline" size="sm">
                <Edit className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Editar Produção</span>
            </Button>
            <Button onClick={() => { setEditingShootingDay(null); setIsShootingDayDialogOpen(true); }} size="sm">
                <PlusCircle className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Nova Ordem do Dia</span>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Opções de Compartilhamento e Exportação">
                        <Share2 className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleShare('production', production.id)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Compartilhar Produção Inteira
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportToExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Exportar para Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportDayToPdf(shootingDays[0])} disabled={shootingDays.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Exportar Primeira Diária (PDF)
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-6xl mx-auto space-y-6 overflow-y-auto">
        {dayToExportPdf && <PdfExportPortal day={dayToExportPdf} production={production} />}

        <ProductionInfoCard production={production} />

        <TeamAndCastSection 
            team={production.team}
            onEdit={() => setIsProductionDialogOpen(true)}
            onDeleteMember={setMemberToDelete}
        />

        <Accordion 
            type="multiple" 
            className="w-full space-y-4"
            >
            {shootingDays.length === 0 ? (
                <div className="text-center p-12 border-2 border-dashed rounded-lg mt-6">
                <Clapperboard className="mx-auto h-12 w-12 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma Ordem do Dia</h3>
                <p className="mt-1 text-sm text-muted-foreground">Crie a primeira Ordem do Dia para esta produção.</p>
                <Button className="mt-6" onClick={() => { setEditingShootingDay(null); setIsShootingDayDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Ordem do Dia
                </Button>
                </div>
            ) : (
                shootingDays.map(day => (
                    <ShootingDayCard 
                    key={day.id} 
                    day={day} 
                    production={production}
                    isFetchingWeather={isFetchingWeather[day.id] ?? false}
                    onEdit={() => { setEditingShootingDay(day); setIsShootingDayDialogOpen(true); }}
                    onDelete={() => setDayToDelete(day)}
                    onExportExcel={() => handleExportDayToExcel()}
                    onExportPdf={() => handleExportDayToPdf(day)}
                    onUpdateNotes={handleUpdateNotes}
                    isExporting={isExporting}
                    onShare={() => handleShare('day', day.id, day)}
                    onRefreshWeather={() => fetchAndUpdateWeather(day)}
                    />
                ))
            )}
        </Accordion>

        <CreateEditProductionDialog
            isOpen={isProductionDialogOpen}
            setIsOpen={setIsProductionDialogOpen}
            onSubmit={handleProductionSubmit}
            production={production}
        />
        <CreateEditShootingDayDialog
            isOpen={isShootingDayDialogOpen}
            setIsOpen={(open) => {
            if (!open) setEditingShootingDay(null);
            setIsShootingDayDialogOpen(open);
            }}
            onSubmit={handleShootingDaySubmit}
            shootingDay={editingShootingDay}
            productionTeam={production?.team || []}
        />
        
        <AlertDialog open={!!dayToDelete} onOpenChange={(open) => !open && setDayToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Ordem do Dia?</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja excluir a Ordem do Dia? Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteDay} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Membro da Equipe?</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja excluir "{memberToDelete?.name}" da equipe? Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        <Sheet open={!!shareLink} onOpenChange={(open) => !open && setShareLink(null)}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Compartilhar Produção</SheetTitle>
                        <SheetDescription>Qualquer pessoa com este link poderá ver as informações. As atualizações feitas serão refletidas publicamente.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-2 py-4">
                        <Label htmlFor="share-link">Link Público</Label>
                        <div className="flex gap-2">
                            <Input id="share-link" value={shareLink || ''} readOnly />
                            <Button size="icon" onClick={() => { if (shareLink) { navigator.clipboard.writeText(shareLink); toast({ title: "Link copiado!" }); }}}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </main>
    </div>
  );
}
