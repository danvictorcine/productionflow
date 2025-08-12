// @/src/components/production-page-detail.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Share2, Clapperboard } from 'lucide-react';
import { format, isToday } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
import { CopyableError } from '@/components/copyable-error';
import { Accordion } from '@/components/ui/accordion';
import { ProductionInfoCard } from '@/components/production-info-card';
import { TeamAndCastSection } from '@/components/team-and-cast-section';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';

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
    // Weather logic would go here
  }, [toast]);
  
  useEffect(() => {
    // Weather fetching logic would go here
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
  const handleUpdateNotes = (dayId: string, listName: string, list: any[]) => toast({title: "Função de atualização de notas em desenvolvimento"});


  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-6xl mx-auto space-y-6">
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
    </div>
  );
}
