
// @/app/project/[id]/creative/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Brush, PlusCircle, Trash2 } from 'lucide-react';

import type { CreativeProject, BoardItem, UnifiedProject } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { Button } from '@/components/ui/button';
import CreativeProjectPageDetail from '@/components/creative-project-page-detail';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


function CreativeProjectUnifiedPage() {
  const router = useRouter();
  const params = useParams();
  const unifiedProjectId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [unifiedProject, setUnifiedProject] = useState<UnifiedProject | null>(null);
  const [creativeProject, setCreativeProject] = useState<CreativeProject | null>(null);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchCreativeData = useCallback(async () => {
    if (!unifiedProjectId || !user) return;
    setIsLoading(true);

    try {
      const uProject = await firestoreApi.getUnifiedProject(unifiedProjectId);
      if (!uProject) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Projeto não encontrado.' });
        router.push('/');
        return;
      }
      setUnifiedProject(uProject);

      if (uProject.creativeProjectId) {
        const cProject = await firestoreApi.getCreativeProject(uProject.creativeProjectId);
        if (cProject) {
          setCreativeProject(cProject);
          const itemsData = await firestoreApi.getBoardItems(cProject.id);
          setBoardItems(itemsData);
        } else {
          // Sub-projeto foi excluído, resetar o estado
          setCreativeProject(null);
          setBoardItems([]);
        }
      } else {
        setCreativeProject(null);
        setBoardItems([]);
      }
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: <CopyableError userMessage="Não foi possível carregar os dados do moodboard." errorCode={errorTyped.code || errorTyped.message} />,
      });
    } finally {
      setIsLoading(false);
    }
  }, [unifiedProjectId, user, router, toast]);

  useEffect(() => {
    fetchCreativeData();
  }, [fetchCreativeData]);

  const handleCreateCreativeProject = async () => {
    if (!unifiedProject) return;
    setIsLoading(true);
    try {
      const newCreativeData = {
        name: unifiedProject.name,
        description: unifiedProject.description,
        unifiedProjectId: unifiedProject.id,
      };
      const newCreativeId = await firestoreApi.addCreativeProject(newCreativeData);
      await firestoreApi.updateUnifiedProject(unifiedProject.id, { creativeProjectId: newCreativeId });
      toast({ title: 'Módulo de Moodboard Criado!' });
      await fetchCreativeData(); // Re-fetch all data
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar o moodboard.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!unifiedProject?.creativeProjectId) return;
    try {
        await firestoreApi.deleteCreativeSubProject(unifiedProject.creativeProjectId, unifiedProject.id);
        toast({ title: "Módulo Moodboard excluído com sucesso!" });
        fetchCreativeData();
    } catch(error) {
        const errorTyped = error as { code?: string; message: string };
        toast({
            variant: 'destructive',
            title: 'Erro ao excluir módulo',
            description: <CopyableError userMessage="Não foi possível excluir o módulo de moodboard." errorCode={errorTyped.code || errorTyped.message} />,
        });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!creativeProject) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12 min-h-[400px]">
        <Brush className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-4 text-lg font-semibold">
          Moodboard não iniciado
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie um moodboard para começar a organizar as ideias deste projeto.
        </p>
        <Button className="mt-6" onClick={handleCreateCreativeProject}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Criar Moodboard
        </Button>
      </div>
    );
  }

  return (
    <>
      <CreativeProjectPageDetail
        project={creativeProject}
        initialItems={boardItems}
        onDataRefresh={fetchCreativeData}
        onDeleteModule={() => setIsDeleteDialogOpen(true)}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir Módulo Moodboard?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o moodboard e todos os seus itens. O projeto principal permanecerá.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteModule} className="bg-destructive hover:bg-destructive/90">
                    Sim, Excluir
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function CreativeProjectPage() {
  return <CreativeProjectUnifiedPage />;
}
