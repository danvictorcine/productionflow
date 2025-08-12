

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PlusCircle,
  MoreVertical,
  Edit,
  Trash2,
  Clapperboard,
  DollarSign,
  Brush,
  Image as ImageIcon,
  Download,
  Folder,
} from 'lucide-react';

import type { Project, Production, CreativeProject, Storyboard, ExportedProjectData, UnifiedProject, DisplayableItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { CreateEditUnifiedProjectDialog } from '@/components/create-edit-unified-project-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AuthGuard from '@/components/auth-guard';
import { useAuth } from '@/context/auth-context';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { UserNav } from '@/components/user-nav';
import { CopyableError } from '@/components/copyable-error';
import { Badge } from '@/components/ui/badge';
import { AppFooter } from '@/components/app-footer';


function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<DisplayableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isUnifiedProjectDialogOpen, setIsUnifiedProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<UnifiedProject | null>(null);

  // Deleting state
  const [itemToDelete, setItemToDelete] = useState<DisplayableItem | null>(null);

  const fetchItems = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [
        projects,
        productions,
        creativeProjects,
        storyboards,
        unifiedProjects,
      ] = await Promise.all([
        firestoreApi.getProjects(),
        firestoreApi.getProductions(),
        firestoreApi.getCreativeProjects(),
        firestoreApi.getStoryboards(),
        firestoreApi.getUnifiedProjects(),
      ]);

      const displayableItems: DisplayableItem[] = [
        ...unifiedProjects.map((p) => ({ ...p, itemType: 'unified' as const })),
        ...projects.filter(p => !p.unifiedProjectId).map((p) => ({ ...p, itemType: 'financial' as const })),
        ...productions.filter(p => !p.unifiedProjectId).map((p) => ({ ...p, itemType: 'production' as const })),
        ...storyboards.filter(p => !p.unifiedProjectId).map((p) => ({ ...p, itemType: 'storyboard' as const })),
        ...creativeProjects.filter(p => !p.unifiedProjectId).map((p) => ({
          ...p,
          itemType: 'creative' as const,
        })),
      ];
      
      displayableItems.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      setItems(displayableItems);
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar projetos',
        description: (
          <CopyableError
            userMessage="Não foi possível carregar seus projetos."
            errorCode={errorTyped.code || errorTyped.message}
          />
        ),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user]);
  
  const handleProjectSubmit = async (
    projectData: Omit<UnifiedProject, 'id' | 'userId' | 'createdAt'>
  ) => {
    try {
      if (editingProject) {
        await firestoreApi.updateUnifiedProject(editingProject.id, projectData);
        toast({ title: 'Projeto atualizado!' });
      } else {
        await firestoreApi.addUnifiedProject(projectData);
        toast({ title: 'Novo projeto criado!' });
      }
      await fetchItems();
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar projeto',
        description: (
          <CopyableError
            userMessage="Não foi possível salvar o projeto."
            errorCode={errorTyped.code || errorTyped.message}
          />
        ),
      });
    }
    setIsUnifiedProjectDialogOpen(false);
    setEditingProject(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.itemType === 'unified') {
        await firestoreApi.deleteUnifiedProject(itemToDelete.id);
      }
      toast({ title: `"${itemToDelete.name}" excluído(a).` });
      await fetchItems();
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao Excluir',
        description: (
          <CopyableError
            userMessage="Não foi possível excluir o item."
            errorCode={errorTyped.code || errorTyped.message}
          />
        ),
      });
    }
    setItemToDelete(null);
  };
  
  const openEditDialog = (item: UnifiedProject) => {
    setEditingProject(item);
    setIsUnifiedProjectDialogOpen(true);
  };

  const renderCards = () => {
    if (isLoading) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[220px] w-full" />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[400px]">
          <Folder className="mx-auto h-10 w-10 text-primary" />
          <h3 className="mt-4 text-lg font-semibold">
            Nenhum projeto encontrado
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Comece criando seu primeiro projeto.
          </p>
          <Button className="mt-6" onClick={() => setIsUnifiedProjectDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Novo Projeto
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          if (item.itemType === 'unified') {
             return (
              <Card
                key={`${item.itemType}-${item.id}`}
                className="hover:shadow-lg transition-shadow h-full flex flex-col relative"
              >
                <div className="absolute top-2 right-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setItemToDelete(item)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link href={`/project/${item.id}`} className="flex flex-col flex-grow">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pr-10">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Folder className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>Projeto Unificado</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button className="w-full">Gerenciar</Button>
                  </CardContent>
                </Link>
              </Card>
            );
          }
          // Placeholder for legacy projects
          return <Card key={`${item.itemType}-${item.id}`} className="bg-muted/50 p-4 border-dashed"><p className="text-sm text-muted-foreground">Projeto antigo: {item.name}</p></Card>
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-2">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
          >
            <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))" />
            <path
              d="M22 16L12 22V10L22 16Z"
              fill="hsl(var(--primary-foreground))"
            />
          </svg>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-2xl font-bold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>
              ProductionFlow
            </h1>
            <Badge variant="outline" className="text-xs font-normal">
              BETA
            </Badge>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setIsUnifiedProjectDialogOpen(true)} size="sm">
            <PlusCircle className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Criar Novo</span>
          </Button>
          <UserNav />
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Meus Projetos</h2>
          <p className="text-muted-foreground">
            Selecione um projeto para gerenciar ou crie um novo.
          </p>
        </div>
        {renderCards()}
      </main>

      <CreateEditUnifiedProjectDialog
        isOpen={isUnifiedProjectDialogOpen}
        setIsOpen={(open) => {
          if (!open) setEditingProject(null);
          setIsUnifiedProjectDialogOpen(open);
        }}
        onSubmit={handleProjectSubmit}
        project={editingProject || undefined}
      />

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              projeto e todos os seus dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AppFooter />
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  );
}
