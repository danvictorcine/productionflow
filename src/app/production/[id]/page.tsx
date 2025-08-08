
// @/src/app/production/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, PlusCircle, Clapperboard, Trash2, Users, Utensils, Info, Phone, FileDown, Loader2, FileSpreadsheet, Copy, Share2, Hourglass, ChevronDown, MoreVertical } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import dynamic from 'next/dynamic';


import type { Production, ShootingDay, WeatherInfo, ChecklistItem, LocationAddress, TeamMember } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyableError } from '@/components/copyable-error';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppFooter } from '@/components/app-footer';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProductionInfoCard } from '@/components/production-info-card';

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

function ProductionPageDetail() {
  const router = useRouter();
  const params = useParams();
  const productionId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  const mainRef = useRef<HTMLElement>(null);
  
  const [production, setProduction] = useState<Production | null>(null);
  const [shootingDays, setShootingDays] = useState<ProcessedShootingDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const formatLocationForWeather = (location?: LocationAddress): string => {
    if (!location) return "Localização não definida";
    
    const parts = [
        location.road,
        location.house_number,
        location.city,
        location.state,
        location.country
    ].filter(p => typeof p === 'string' && p.trim() !== '');

    if (parts.length === 0) {
        return location.displayName || "Localização não definida";
    }

    return parts.join(', ');
  }
  
  const fetchAndUpdateWeather = useCallback(async (day: ShootingDay) => {
    if (!day.latitude || !day.longitude) return;

    setIsFetchingWeather(prev => ({ ...prev, [day.id]: true }));
  
    try {
      const { latitude, longitude, date } = day;
      const formattedDate = format(date, 'yyyy-MM-dd');
      const locationName = formatLocationForWeather(day.location);
  
      const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,sunrise,sunset&hourly=temperature_2m,weather_code&timezone=auto&start_date=${formattedDate}&end_date=${formattedDate}`);
      if (!weatherResponse.ok) throw new Error('Weather API failed');
      const weatherData = await weatherResponse.json();

      if (!weatherData.daily || !weatherData.daily.time || weatherData.daily.time.length === 0) {
        throw new Error('No weather data returned for the selected date.');
      }
  
      const newWeather: WeatherInfo = {
        daily: {
          temperature_2m_max: weatherData.daily.temperature_2m_max,
          sunrise: weatherData.daily.sunrise,
          sunset: weatherData.daily.sunset,
          weather_code: weatherData.daily.weather_code,
        },
        hourly: {
          time: weatherData.hourly.time,
          temperature_2m: weatherData.hourly.temperature_2m,
          weather_code: weatherData.hourly.weather_code,
        },
        lastUpdated: new Date().toISOString(),
        locationName: locationName,
        date: formattedDate,
        timezone: weatherData.timezone,
      };
  
      await firestoreApi.updateShootingDay(day.id, { weather: newWeather });
  
      setShootingDays(prevDays => prevDays.map(d => 
        d.id === day.id ? { ...d, weather: newWeather } : d
      ));
  
    } catch (error) {
      console.error("Failed to fetch weather", error);
      toast({ variant: 'destructive', title: 'Erro ao buscar clima', description: <CopyableError userMessage="Não foi possível obter os dados do clima." errorCode={(error as Error).message} /> });
    } finally {
      setIsFetchingWeather(prev => ({ ...prev, [day.id]: false }));
    }
  }, [toast]);
  
  const checkAndFetchWeatherForDays = useCallback((days: ShootingDay[]) => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      days.forEach(day => {
          if (isFetchingWeather[day.id]) return;
          
          const weather = day.weather;
          const locationName = formatLocationForWeather(day.location);
          const locationMismatch = weather && weather.locationName !== locationName;
          const isStale = !weather || (weather.lastUpdated && new Date(weather.lastUpdated) < threeHoursAgo);
          const dateMismatch = weather && weather.date !== format(day.date, 'yyyy-MM-dd');
          const shouldUpdate = dateMismatch || locationMismatch || isStale;
          
          if (shouldUpdate && day.latitude && day.longitude) {
              fetchAndUpdateWeather(day);
          }
      });
  }, [fetchAndUpdateWeather, isFetchingWeather]);

  const fetchProductionData = useCallback(async () => {
    if (!productionId || !user) return;
    setIsLoading(true);
    try {
      const [prodData, daysData] = await Promise.all([
        firestoreApi.getProduction(productionId),
        firestoreApi.getShootingDays(productionId)
      ]);

      if (prodData) {
        setProduction(prodData);
        
        const processedDays = daysData.map(day => ({
          ...day,
          generalNotes: Array.isArray(day.generalNotes) ? day.generalNotes : [],
        }));

        setShootingDays(processedDays);
        checkAndFetchWeatherForDays(processedDays);

      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Produção não encontrada.' });
        router.push('/');
      }
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro em /production/[id]/page.tsx (fetchProductionData)',
        description: <CopyableError userMessage="Não foi possível carregar os dados da produção." errorCode={errorTyped.code || errorTyped.message} />,
      });
    } finally {
      setIsLoading(false);
    }
  }, [productionId, user, router, toast, checkAndFetchWeatherForDays]);

  useEffect(() => {
    fetchProductionData();
  }, [fetchProductionData]);
  
  useEffect(() => {
    const todayShootingDays = shootingDays.filter(day => isToday(day.date));
    if (todayShootingDays.length > 0) {
      const interval = setInterval(() => {
        checkAndFetchWeatherForDays(todayShootingDays);
      }, 60 * 60 * 1000); // 1 hour
      return () => clearInterval(interval);
    }
  }, [shootingDays, checkAndFetchWeatherForDays]);

  const handleProductionSubmit = async (data: Omit<Production, 'id' | 'userId' | 'createdAt'>) => {
    if (!production) return;
    try {
      await firestoreApi.updateProduction(production.id, data);
      await fetchProductionData();
      setIsProductionDialogOpen(false);
      toast({ title: 'Produção atualizada com sucesso!' });
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro em /production/[id]/page.tsx (handleProductionSubmit)',
        description: <CopyableError userMessage="Não foi possível atualizar a produção." errorCode={errorTyped.code || errorTyped.message} />,
      });
    }
  };

  const handleShootingDaySubmit = async (data: Omit<ShootingDay, 'id' | 'userId' | 'productionId'>) => {
    const sanitizedData = {
      ...data,
      generalNotes: data.generalNotes || [],
      presentTeam: data.presentTeam || [],
      mealTime: data.mealTime || "",
      radioChannels: data.radioChannels || "",
      startTime: data.startTime || "",
      endTime: data.endTime || "",
      nearestHospital: {
        name: data.nearestHospital?.name || "",
        address: data.nearestHospital?.address || "",
        phone: data.nearestHospital?.phone || "",
      },
      callTimes: Array.isArray(data.callTimes) ? data.callTimes.map(ct => ({ ...ct, id: ct.id || crypto.randomUUID() })) : [],
      scenes: Array.isArray(data.scenes) ? data.scenes.map(s => ({ ...s, id: s.id || crypto.randomUUID() })) : [],
    };
    
    let savedDayId = editingShootingDay?.id;

    try {
      if (editingShootingDay) {
        await firestoreApi.updateShootingDay(editingShootingDay.id, sanitizedData);
        toast({ title: 'Ordem do Dia atualizada!' });
      } else {
        savedDayId = await firestoreApi.addShootingDay(productionId, sanitizedData);
        toast({ title: 'Ordem do Dia criada!' });
      }
      
      await fetchProductionData();
      
      const publicProduction = await firestoreApi.getPublicProduction(productionId);
      if (publicProduction && user && production) {
          const allDays = await firestoreApi.getShootingDays(productionId);
          await firestoreApi.createOrUpdatePublicProduction(production, allDays);
      }
      
      setIsShootingDayDialogOpen(false);
      
      if (savedDayId) {
        const updatedDay = await firestoreApi.getShootingDay(savedDayId);
        if (updatedDay) checkAndFetchWeatherForDays([updatedDay]);
      }
      
      setEditingShootingDay(null);
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro em /production/[id]/page.tsx (handleShootingDaySubmit)',
        description: <CopyableError userMessage="Não foi possível salvar a Ordem do Dia." errorCode={errorTyped.code || errorTyped.message} />,
      });
    }
  };

  const handleDeleteDay = async () => {
    if (!dayToDelete) return;
    try {
      await firestoreApi.deleteShootingDay(dayToDelete.id);
      toast({ title: 'Ordem do Dia excluída.' });
      fetchProductionData();
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro em /production/[id]/page.tsx (handleDeleteDay)',
        description: <CopyableError userMessage="Não foi possível excluir a Ordem do Dia." errorCode={errorTyped.code || errorTyped.message} />,
      });
    } finally {
      setDayToDelete(null);
    }
  };
  
  const handleShare = async (dayOrProduction: 'production' | 'day', id: string, dayObject?: ProcessedShootingDay) => {
    if (!production || !user) return;
    try {
        let link = '';
        if (dayOrProduction === 'production') {
            await firestoreApi.createOrUpdatePublicProduction(production, shootingDays);
            link = `${window.location.origin}/public/production/all/${id}`;
            toast({ title: "Link de compartilhamento para produção criado!", description: "A página pública está ativa." });
        } else if (dayObject) {
            await firestoreApi.createOrUpdatePublicShootingDay(production, dayObject);
            link = `${window.location.origin}/public/production/${id}`;
            toast({ title: "Link de compartilhamento para o dia criado!", description: "A página pública está ativa." });
        }
        setShareLink(link);
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao Compartilhar',
        description: <CopyableError userMessage="Não foi possível criar a página pública." errorCode={errorTyped.code || errorTyped.message} />,
      });
    }
  };


  const createShootingDaySheet = (day: ProcessedShootingDay): XLSX.WorkSheet => {
    const dayInfo = [
        ["Data", format(day.date, "PPP", { locale: ptBR })],
        ["Diária", `${day.dayNumber || 'N/A'} de ${day.totalDays || 'N/A'}`],
        ["Horários", `${day.startTime || 'N/A'} - ${day.endTime || 'N/A'}`],
        ["Localização", day.location.displayName],
    ];
    const logisticsInfo = [
        [], ["Logística e Segurança"],
        ["Estacionamento", day.parkingInfo || 'N/A'],
        ["Refeição", day.mealTime || 'N/A'],
        ["Canais de Rádio", day.radioChannels || 'N/A'],
        ["Hospital", `${day.nearestHospital?.name || 'N/A'} | ${day.nearestHospital?.address || ''} | ${day.nearestHospital?.phone || ''}`],
    ];
    const notesInfo = [
        [], ["Notas dos Departamentos"],
        ["Observações Gerais", (day.generalNotes || []).map(i => i.text).join('\n') || 'N/A'],
    ];
    const presentTeamInfo = [[], ["Equipe Presente"], [(day.presentTeam || []).map(p => p.name).join(', ') || 'N/A']];
    
    const wsDay = XLSX.utils.aoa_to_sheet([...dayInfo, ...logisticsInfo]);
    wsDay['!cols'] = [{ wch: 30 }, { wch: 70 }];

    XLSX.utils.sheet_add_aoa(wsDay, [[]], { origin: -1 });
    XLSX.utils.sheet_add_aoa(wsDay, [["Horários de Chamada"]], { origin: -1 });
    const callTimes = (day.callTimes && Array.isArray(day.callTimes) ? day.callTimes : []).map(ct => ({ Departamento: ct.department, Horário: ct.time }));
    XLSX.utils.sheet_add_json(wsDay, callTimes, { origin: -1, skipHeader: false });

    XLSX.utils.sheet_add_aoa(wsDay, [[]], { origin: -1 });
    XLSX.utils.sheet_add_aoa(wsDay, [["Cenas a Gravar"]], { origin: -1 });
    const scenes = (day.scenes && Array.isArray(day.scenes) ? day.scenes : []).map(s => ({
        'Cena Nº': s.sceneNumber, Título: s.title, Páginas: s.pages, Descrição: s.description,
        'Elenco na Cena': (s.presentInScene || []).map(p => p.name).join(', '),
    }));
    XLSX.utils.sheet_add_json(wsDay, scenes, { origin: -1, skipHeader: false });

    XLSX.utils.sheet_add_aoa(wsDay, [...notesInfo, ...presentTeamInfo], { origin: -1 });

    return wsDay;
  };


  const handleExportToExcel = () => {
    if (!production) return;
    setIsExporting(true);

    try {
        const wb = XLSX.utils.book_new();

        // --- Summary & Team Sheet ---
        const summaryData = [
            { Item: "Nome da Produção", Valor: production.name },
            { Item: "Tipo", Valor: production.type },
            { Item: "Diretor(a)", Valor: production.director },
            { Item: "Produtor(a) Responsável", Valor: production.responsibleProducer || 'N/A' },
            { Item: "Produtora", Valor: production.producer || 'N/A' },
            { Item: "Cliente", Valor: production.client || 'N/A' },
        ];
        const teamData = (production.team || []).map(member => ({
            Nome: member.name,
            Função: member.role,
            Contato: member.contact || '',
            'Restrição Alimentar': member.dietaryRestriction || 'Nenhuma',
            Observações: member.extraNotes || '',
        }));

        const wsSummary = XLSX.utils.json_to_sheet(summaryData, { skipHeader: true });
        XLSX.utils.sheet_add_aoa(wsSummary, [["Resumo da Produção"]], { origin: "A1" });
        wsSummary["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
        wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }];
        XLSX.utils.sheet_add_aoa(wsSummary, [[]], { origin: -1 });
        XLSX.utils.sheet_add_aoa(wsSummary, [["Equipe e Elenco"]], { origin: -1 });
        XLSX.utils.sheet_add_json(wsSummary, teamData, { origin: -1, skipHeader: false });
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo e Equipe");

        // --- Shooting Day Sheets ---
        shootingDays.forEach(day => {
            const dateStr = format(day.date, "dd_MM_yyyy");
            const sheetName = `Diaria_${dateStr}`.substring(0, 31);
            const wsDay = createShootingDaySheet(day);
            XLSX.utils.book_append_sheet(wb, wsDay, sheetName);
        });

        XLSX.writeFile(wb, `Producao_${production.name.replace(/ /g, "_")}.xlsx`);
        toast({ title: "Exportação para Excel Concluída" });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro em /production/[id]/page.tsx (handleExportToExcel)', description: 'Não foi possível exportar para Excel.' });
    } finally {
        setIsExporting(false);
    }
  };
  
  const handleExportDayToExcel = (day: ProcessedShootingDay) => {
    if (!production) return;
    setIsExporting(true);

    try {
        const wb = XLSX.utils.book_new();
        const dateStr = format(day.date, "dd_MM_yyyy");
        const sheetName = `Diaria_${dateStr}`.substring(0, 31);
        const wsDay = createShootingDaySheet(day);
        
        XLSX.utils.book_append_sheet(wb, wsDay, sheetName);
        
        XLSX.writeFile(wb, `Ordem_do_Dia_${production.name.replace(/ /g, "_")}_${dateStr}.xlsx`);
        toast({ title: "Exportação para Excel Concluída" });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro em /production/[id]/page.tsx (handleExportDayToExcel)', description: 'Não foi possível exportar a Ordem do Dia.' });
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportDayToPdf = async (dayToExport: ProcessedShootingDay) => {
      if (!production) return;
      toast({ title: "Gerando PDF...", description: "Isso pode levar alguns segundos." });
      setIsExporting(true);
      setDayToExportPdf(dayToExport);
    
      setTimeout(async () => {
        const elementToCapture = document.getElementById('pdf-export-content');
        if (elementToCapture) {
            try {
                const canvas = await html2canvas(elementToCapture, {
                    useCORS: true,
                    scale: 2,
                    logging: false,
                    backgroundColor: window.getComputedStyle(document.body).backgroundColor,
                    scrollY: -window.scrollY,
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });

                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

                const dateStr = format(dayToExport.date, "dd_MM_yyyy");
                pdf.save(`Ordem_do_Dia_${production.name.replace(/ /g, "_")}_${dateStr}.pdf`);
                toast({ title: "Exportação para PDF Concluída!" });

            } catch (error) {
                const errorTyped = error as Error;
                console.error("Error generating PDF", errorTyped);
                toast({ 
                    variant: 'destructive', 
                    title: 'Erro ao gerar PDF', 
                    description: <CopyableError userMessage="Não foi possível gerar o PDF." errorCode={errorTyped.message} />
                });
            } finally {
                setIsExporting(false);
                setDayToExportPdf(null); // Reset the export state
            }
        } else {
            toast({ variant: 'destructive', title: 'Erro ao exportar', description: 'Não foi possível encontrar o conteúdo para exportar.' });
            setIsExporting(false);
            setDayToExportPdf(null);
        }
      }, 500);
  };

  const handleUpdateNotes = async (
    dayId: string,
    listName: 'generalNotes',
    updatedList: ChecklistItem[]
  ) => {
    // Optimistic update
    setShootingDays(prevDays =>
        prevDays.map(day =>
            day.id === dayId ? { ...day, [listName]: updatedList } : day
        )
    );
    // Firestore update
    try {
        await firestoreApi.updateShootingDay(dayId, { [listName]: updatedList });
    } catch (error) {
        const errorTyped = error as { code?: string; message: string };
        toast({ 
            variant: 'destructive', 
            title: 'Erro em /production/[id]/page.tsx (handleUpdateNotes)', 
            description: <CopyableError userMessage="Não foi possível atualizar o item." errorCode={errorTyped.code || errorTyped.message} /> 
        });
        // Revert optimistic update on failure
        fetchProductionData(); 
    }
  };

  const openEditShootingDayDialog = (day: ProcessedShootingDay) => {
    setEditingShootingDay(day);
    setIsShootingDayDialogOpen(true);
  };
  
  const handleDeleteMember = async () => {
    if (!memberToDelete || !production) return;
    const updatedTeam = production.team.filter(member => member.id !== memberToDelete.id);
    await handleProductionSubmit({ ...production, team: updatedTeam });
    toast({ title: "Membro da equipe removido." });
    setMemberToDelete(null);
  }
  
  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <div className="space-y-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  if (!production) {
    return null; // or a not-found component
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Hidden container for PDF export rendering */}
      {dayToExportPdf && (
        <PdfExportPortal day={dayToExportPdf} production={production} />
      )}
      
      <header className="sticky top-0 z-40 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar para Projetos">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-3 rounded-full bg-primary/10 flex-shrink-0">
            <Clapperboard className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg md:text-xl font-bold text-primary truncate">{production.name}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
        <Button onClick={() => { setEditingShootingDay(null); setIsShootingDayDialogOpen(true); }} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Criar Ordem do Dia</span>
          </Button>
          <Button onClick={() => setIsProductionDialogOpen(true)} variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Editar Produção</span>
          </Button>
          <Button onClick={() => handleShare('production', production.id)} variant="outline" size="icon" aria-label="Compartilhar Produção">
            <Share2 className="h-4 w-4" />
          </Button>
          <UserNav />
        </div>
      </header>

      <main ref={mainRef} className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-6xl mx-auto">
        <ProductionInfoCard production={production} />

        <Accordion 
          type="multiple" 
          className="w-full space-y-4"
        >
            <AccordionItem value="team" className="border-none">
                <Card>
                    <AccordionTrigger className="w-full p-0 rounded-t-lg transition-colors group hover:no-underline">
                         <CardHeader className="flex-1 flex flex-row items-center justify-between text-left p-6">
                            <div className="flex flex-col text-left">
                                <div className="flex items-center">
                                    <Users className="h-6 w-6 mr-3 text-primary" />
                                    <CardTitle>Equipe e Elenco</CardTitle>
                                </div>
                                <CardDescription className="mt-1 pl-9">
                                    Informações detalhadas sobre todos os envolvidos na produção.
                                </CardDescription>
                            </div>
                            <div className="h-8 w-8 rounded-md flex items-center justify-center transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                         </CardHeader>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 pt-0 max-h-[500px] overflow-y-auto">
                        <div className="space-y-4">
                        {(production.team && production.team.length > 0) ? (
                            production.team.map(member => (
                                <Collapsible key={member.id} className="group">
                                    <div className="rounded-md border bg-muted/50 flex items-center pr-2">
                                        <div className="flex-1 flex items-center justify-between">
                                            <CollapsibleTrigger asChild>
                                                <div className="p-3 text-left flex-1 flex items-center justify-between cursor-pointer">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <Avatar className="h-12 w-12">
                                                            <AvatarImage src={member.photoURL} />
                                                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-semibold text-base">{member.name}</p>
                                                            <p className="text-base text-muted-foreground">{member.role}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CollapsibleTrigger>
                                            <div className="flex items-center pr-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                            <MoreVertical className="h-4 w-4"/>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => setIsProductionDialogOpen(true)}>
                                                            <Edit className="mr-2 h-4 w-4"/>
                                                            Editar Produção
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setMemberToDelete(member)}>
                                                            <Trash2 className="mr-2 h-4 w-4"/>
                                                            Excluir Membro
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <CollapsibleTrigger asChild>
                                                   <div className="h-8 w-8 rounded-md flex items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground">
                                                     <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                   </div>
                                                </CollapsibleTrigger>
                                            </div>
                                        </div>
                                    </div>
                                    <CollapsibleContent>
                                        <div className="p-3 pt-0">
                                            <div className="mt-2 pt-2 border-t space-y-2">
                                                {member.contact && (
                                                    <div className="flex items-start gap-2 text-base p-2">
                                                        <Phone className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                                                        <div>
                                                            <span className="font-semibold">Contato: </span>
                                                            <a href={`tel:${member.contact.replace(/\D/g, '')}`} className="text-muted-foreground hover:underline">{member.contact}</a>
                                                        </div>
                                                    </div>
                                                )}
                                                {member.hasDietaryRestriction && (
                                                    <div className="flex items-start gap-2 text-base p-2">
                                                        <Utensils className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                                                        <div>
                                                            <span className="font-semibold">Restrição Alimentar: </span>
                                                            <span className="text-muted-foreground">{member.dietaryRestriction || 'Não especificada'}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {member.extraNotes && (
                                                    <div className="flex items-start gap-2 text-base p-2">
                                                        <Info className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                                                        <div>
                                                            <span className="font-semibold">Observação: </span>
                                                            <span className="text-muted-foreground">{member.extraNotes}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro da equipe cadastrado.</p>
                        )}
                        </div>
                    </AccordionContent>
                </Card>
            </AccordionItem>

            {shootingDays.length === 0 && !isLoading ? (
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
                    onEdit={() => openEditShootingDayDialog(day)}
                    onDelete={() => setDayToDelete(day)}
                    onExportExcel={() => handleExportDayToExcel(day)}
                    onExportPdf={() => handleExportDayToPdf(day)}
                    onUpdateNotes={handleUpdateNotes}
                    isExporting={isExporting}
                    onShare={() => handleShare('day', day.id, day)}
                    onRefreshWeather={() => fetchAndUpdateWeather(day)}
                  />
                ))
            )}
        </Accordion>
      </main>

      <AppFooter />
      
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
            <AlertDialogDescription>
              Tem certeza que deseja excluir a Ordem do Dia de {format(dayToDelete?.date || new Date(), "PPP", { locale: ptBR })}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDay} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Membro da Equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{memberToDelete?.name}" da equipe? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <Sheet open={!!shareLink} onOpenChange={(open) => !open && setShareLink(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Compartilhar Produção</SheetTitle>
            <SheetDescription>
              Qualquer pessoa com este link poderá ver as informações. As atualizações feitas serão refletidas publicamente.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="share-link">Link Público</Label>
            <div className="flex gap-2">
                <Input id="share-link" value={shareLink || ''} readOnly />
                <Button size="icon" onClick={() => {
                    if (shareLink) {
                        navigator.clipboard.writeText(shareLink);
                        toast({ title: "Link copiado!" });
                    }
                }}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ProductionPage() {
  return (
    <AuthGuard>
      <ProductionPageDetail />
    </AuthGuard>
  );
}
