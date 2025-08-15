// @/src/components/production-page-detail.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Share2, Clapperboard, FileSpreadsheet, FileDown, Copy } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

import type { Production, ShootingDay, TeamMember } from '@/lib/types';
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
import { Accordion } from '@/components/ui/accordion';
import { ProductionInfoCard } from '@/components/production-info-card';
import { TeamAndCastSection } from '@/components/team-and-cast-section';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
          isExporting={true}
          isPublicView={true}
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
  const { toast } = useToast();
  
  const [isExporting, setIsExporting] = useState(false);
  const [dayToExportPdf, setDayToExportPdf] = useState<ProcessedShootingDay | null>(null);

  // Dialog states
  const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
  const [isShootingDayDialogOpen, setIsShootingDayDialogOpen] = useState(false);
  const [editingShootingDay, setEditingShootingDay] = useState<ProcessedShootingDay | null>(null);
  const [dayToDelete, setDayToDelete] = useState<ProcessedShootingDay | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  

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
  
  const handleShareDay = async (day: ShootingDay) => {
    try {
      await firestoreApi.createOrUpdatePublicShootingDay(production, day);
      const url = `${window.location.origin}/share/day/${day.id}`;
      setShareLink(url);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao compartilhar', description: 'Não foi possível gerar o link público.' });
    }
  };

  const handleShareProduction = async () => {
    try {
        await firestoreApi.createOrUpdatePublicProduction(production, shootingDays);
        const url = `${window.location.origin}/share/production/${production.id}`;
        setShareLink(url);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao compartilhar', description: 'Não foi possível gerar o link público para a produção.' });
    }
  };

  const handleExportDayToPdf = async (day: ShootingDay) => {
    setDayToExportPdf(day);
    setIsExporting(true);

    toast({ title: "Gerando PDF...", description: "Isso pode levar alguns segundos." });

    setTimeout(async () => {
      const element = document.getElementById('pdf-export-content');
      if (element) {
        try {
          const canvas = await html2canvas(element, { useCORS: true, scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'l' : 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          pdf.save(`Ordem_do_Dia_${production.name.replace(/\s+/g, '_')}.pdf`);
          toast({ title: "PDF gerado com sucesso!" });
        } catch (error) {
          toast({ variant: "destructive", title: "Erro ao gerar PDF", description: "Não foi possível criar o arquivo." });
        }
      }
      setDayToExportPdf(null);
      setIsExporting(false);
    }, 500); // Small delay to allow portal to render
  };

  const handleExportToExcel = async (day: ShootingDay) => {
    toast({ title: 'Gerando Excel...' });
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Informações Gerais
    const generalInfo = [
      ["Produção", production.name],
      ["Tipo", production.type],
      ["Diretor(a)", production.director],
      ["Data", new Date(day.date).toLocaleDateString('pt-BR')],
      ["Horário", `${day.startTime || ''} - ${day.endTime || ''}`],
      ["Localização", day.location?.displayName],
      ["Hospital", `${day.nearestHospital?.name || ''} - ${day.nearestHospital?.address || ''}`],
    ];
    const wsGeneral = XLSX.utils.aoa_to_sheet(generalInfo);
    wsGeneral['!cols'] = [{wch: 20}, {wch: 60}];
    XLSX.utils.book_append_sheet(wb, wsGeneral, 'Geral');

    // Sheet 2: Horários de Chamada
    const callTimesData = day.callTimes.map(ct => [ct.department, ct.time]);
    const wsCallTimes = XLSX.utils.aoa_to_sheet([["Departamento/Pessoa", "Horário"], ...callTimesData]);
    wsCallTimes['!cols'] = [{wch: 30}, {wch: 15}];
    XLSX.utils.book_append_sheet(wb, wsCallTimes, 'Horários');

    // Sheet 3: Cenas
    const scenesData = day.scenes.flatMap(scene => [
        ["CENA", scene.sceneNumber, scene.title, `(${scene.pages})`],
        ["Descrição", scene.description],
        ["Elenco", scene.presentInScene.map(p => p.name).join(', ')],
        ["Local", scene.location?.displayName || ''],
        [""], // Empty row for spacing
    ]);
    const wsScenes = XLSX.utils.aoa_to_sheet(scenesData);
    wsScenes['!cols'] = [{wch: 15}, {wch: 15}, {wch: 40}, {wch: 20}];
    XLSX.utils.book_append_sheet(wb, wsScenes, 'Cenas');

    // Sheet 4: Equipe
    const teamData = day.presentTeam.map(t => [t.name, t.role, t.contact || '']);
    const wsTeam = XLSX.utils.aoa_to_sheet([["Nome", "Função", "Contato"], ...teamData]);
    wsTeam['!cols'] = [{wch: 30}, {wch: 30}, {wch: 20}];
    XLSX.utils.book_append_sheet(wb, wsTeam, 'Equipe Presente');

    XLSX.writeFile(wb, `Ordem_do_Dia_${production.name.replace(/\s+/g, '_')}.xlsx`);
    toast({ title: 'Excel gerado com sucesso!' });
  };


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
      <div className="flex-none p-2 border-b">
         <div className="flex items-center gap-1">
            <Button onClick={() => setIsProductionDialogOpen(true)} variant="ghost" size="sm">
                <Edit className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Editar Produção</span>
            </Button>
            <Button onClick={() => { setEditingShootingDay(null); setIsShootingDayDialogOpen(true); }} variant="ghost" size="sm">
                <PlusCircle className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Nova Ordem do Dia</span>
            </Button>
             <Button onClick={handleShareProduction} variant="ghost" size="sm">
                <Share2 className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Compartilhar Produção</span>
            </Button>
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
                    onEdit={() => { setEditingShootingDay(day); setIsShootingDayDialogOpen(true); }}
                    onDelete={() => setDayToDelete(day)}
                    onExportExcel={() => handleExportToExcel(day)}
                    onExportPdf={() => handleExportDayToPdf(day)}
                    onUpdateNotes={handleUpdateNotes}
                    isExporting={isExporting}
                    onShare={() => handleShareDay(day)}
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
