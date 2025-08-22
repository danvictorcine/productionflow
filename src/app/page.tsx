

'use client';

import { useState, useEffect } from 'react';
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
  Folder,
  AlertTriangle,
  Loader2,
  Users,
} from 'lucide-react';

import type { Project, Production, CreativeProject, Storyboard, UnifiedProject, DisplayableItem } from '@/lib/types';
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
import { Alert } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { ProductionFlowIcon } from '@/components/production-flow-icon';


function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [items, setItems] = useState<DisplayableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);

  // Dialog states
  const [isUnifiedProjectDialogOpen, setIsUnifiedProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<UnifiedProject | null>(null);

  // Deleting state
  const [itemToDelete, setItemToDelete] = useState<DisplayableItem | null>(null);
  
  const hasLegacyProjects = items.some(item => item.itemType !== 'unified');

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
  
  const handleMigrateProjects = async () => {
    const legacyProjects = items.filter(item => item.itemType !== 'unified');
    if (legacyProjects.length === 0) return;
    
    setIsMigrating(true);
    try {
        await firestoreApi.migrateLegacyProjects(legacyProjects);
        toast({ title: "Migração Concluída!", description: "Seus projetos antigos agora estão no novo formato." });
        await fetchItems();
    } catch (error) {
        const errorTyped = error as { code?: string; message: string };
        toast({
            variant: "destructive",
            title: "Erro na Migração",
            description: <CopyableError userMessage="Não foi possível migrar os projetos." errorCode={errorTyped.code || errorTyped.message} />,
        });
    } finally {
        setIsMigrating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.itemType === 'unified') {
        await firestoreApi.deleteUnifiedProject(itemToDelete.id);
      } else {
         // Lógica para excluir projetos legado (se necessário no futuro)
         console.warn("A exclusão de projetos legado ainda não está implementada nesta interface.");
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
  
  const getLegacyProjectIcon = (itemType: DisplayableItem['itemType']) => {
    switch(itemType) {
        case 'financial': return <DollarSign className="h-6 w-6 text-muted-foreground" />;
        case 'production': return <Clapperboard className="h-6 w-6 text-muted-foreground" />;
        case 'creative': return <Brush className="h-6 w-6 text-muted-foreground" />;
        case 'storyboard': return <ImageIcon className="h-6 w-6 text-muted-foreground" />;
        default: return <Folder className="h-6 w-6 text-primary" />;
    }
  };
  
  const getLegacyProjectLink = (item: DisplayableItem) => {
    // Links para rotas antigas, que agora serão redirecionadas
    switch(item.itemType) {
        case 'financial': return `/project/${item.id}`;
        case 'production': return `/production/${item.id}`;
        case 'creative': return `/creative/${item.id}`;
        case 'storyboard': return `/storyboard/${item.id}`;
        default: return '#';
    }
  }

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
                <Link href={`/project/${item.id}`} className="flex flex-col flex-grow p-6">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pr-10 p-0">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Folder className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{item.description || 'Sem descrição'}</CardDescription>
                    </div>
                  </CardHeader>
                </Link>
              </Card>
            );
          }
          // Renderiza projetos legado
          return (
            <Card
                key={`${item.itemType}-${item.id}`}
                className="hover:shadow-lg transition-shadow h-full flex flex-col relative border-dashed bg-muted/50"
              >
                <Link href={getLegacyProjectLink(item)} className="flex flex-col flex-grow">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pr-10">
                    <div className="p-3 rounded-full bg-muted">
                        {getLegacyProjectIcon(item.itemType)}
                    </div>
                    <div>
                      <CardTitle className="text-muted-foreground">{item.name}</CardTitle>
                      <CardDescription>Projeto Legado</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button className="w-full" variant="secondary">Abrir Projeto Legado</Button>
                  </CardContent>
                </Link>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-2">
          <ProductionFlowIcon className="h-8 w-8" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-2xl font-bold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>
              ProductionFlow
            </h1>
            <Badge variant="outline" className="px-2 py-0.5 text-[0.6rem] font-normal">
              BETA
            </Badge>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => router.push('/talents')} size="sm" variant="ghost">
            <Users className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Banco de Talentos</span>
          </Button>
          <Button onClick={() => setIsUnifiedProjectDialogOpen(true)} size="sm" variant="ghost">
            <PlusCircle className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Criar Novo</span>
          </Button>
          <UserNav />
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {hasLegacyProjects && (
            <Alert className="mb-6 border-amber-500/50 text-amber-900 dark:text-amber-300 [&>svg]:text-amber-500">
                <AlertTriangle className="h-4 w-4" />
                <CardTitle className="text-base">Atualização da Estrutura de Projetos</CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-400">
                    Detectamos projetos no formato antigo. Para usar as novas funcionalidades integradas, migre seus projetos para o novo formato unificado. A migração é segura e não apaga seus dados originais.
                </CardDescription>
                <Button onClick={handleMigrateProjects} disabled={isMigrating} className="mt-3 bg-amber-500 hover:bg-amber-600 text-white">
                    {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Migrar Projetos Antigos
                </Button>
            </Alert>
        )}
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
