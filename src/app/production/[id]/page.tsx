// @/src/app/production/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, PlusCircle, Clapperboard, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Production, ShootingDay } from '@/lib/types';
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
import { CopyableError } from '@/components/copyable-error';


function ProductionPageDetail() {
  const router = useRouter();
  const params = useParams();
  const productionId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [production, setProduction] = useState<Production | null>(null);
  const [shootingDays, setShootingDays] = useState<ShootingDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
  const [isShootingDayDialogOpen, setIsShootingDayDialogOpen] = useState(false);
  const [editingShootingDay, setEditingShootingDay] = useState<ShootingDay | null>(null);
  const [dayToDelete, setDayToDelete] = useState<ShootingDay | null>(null);

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
        setShootingDays(daysData);
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Produção não encontrada.' });
        router.push('/');
      }
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: <CopyableError userMessage="Não foi possível carregar os dados da produção." errorCode={errorTyped.code || errorTyped.message} />,
      });
    } finally {
      setIsLoading(false);
    }
  }, [productionId, user, router, toast]);

  useEffect(() => {
    fetchProductionData();
  }, [fetchProductionData]);

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
        title: 'Erro ao atualizar',
        description: <CopyableError userMessage="Não foi possível atualizar a produção." errorCode={errorTyped.code || errorTyped.message} />,
      });
    }
  };

  const handleShootingDaySubmit = async (data: Omit<ShootingDay, 'id' | 'userId' | 'productionId'>) => {
    try {
      if (editingShootingDay) {
        await firestoreApi.updateShootingDay(editingShootingDay.id, data);
        toast({ title: 'Ordem do Dia atualizada!' });
      } else {
        await firestoreApi.addShootingDay(productionId, data);
        toast({ title: 'Ordem do Dia criada!' });
      }
      await fetchProductionData();
      setIsShootingDayDialogOpen(false);
      setEditingShootingDay(null);
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
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
        title: 'Erro ao excluir',
        description: <CopyableError userMessage="Não foi possível excluir a Ordem do Dia." errorCode={errorTyped.code || errorTyped.message} />,
      });
    } finally {
      setDayToDelete(null);
    }
  };

  const openEditShootingDayDialog = (day: ShootingDay) => {
    setEditingShootingDay(day);
    setIsShootingDayDialogOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[80px] w-full" />
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  if (!production) {
    return null; // or a not-found component
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar para Projetos">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-primary truncate">{production.name}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setIsProductionDialogOpen(true)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Editar Produção
          </Button>
          <Button onClick={() => { setEditingShootingDay(null); setIsShootingDayDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Ordem do Dia
          </Button>
          <UserNav />
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <h2 className="text-2xl font-bold tracking-tight">{production.name}</h2>
          <p className="text-muted-foreground">{production.type}</p>
          <div className="text-sm mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <p><span className="font-semibold">Diretor(a):</span> {production.director}</p>
            <p><span className="font-semibold">Cliente:</span> {production.client}</p>
          </div>
        </div>

        {shootingDays.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-lg">
            <Clapperboard className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma Ordem do Dia</h3>
            <p className="mt-1 text-sm text-muted-foreground">Crie a primeira Ordem do Dia para esta produção.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {shootingDays.map(day => (
              <ShootingDayCard 
                key={day.id} 
                day={day} 
                onEdit={() => openEditShootingDayDialog(day)}
                onDelete={() => setDayToDelete(day)}
              />
            ))}
          </div>
        )}
      </main>
      
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
        shootingDay={editingShootingDay || undefined}
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
