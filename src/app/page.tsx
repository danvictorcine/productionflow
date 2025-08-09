
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PlusCircle,
  Film,
  MoreVertical,
  Edit,
  Trash2,
  Clapperboard,
  DollarSign,
  Brush,
  Image as ImageIcon,
  Upload,
  Download,
} from 'lucide-react';

import type { Project, Production, CreativeProject, Storyboard, ExportedProjectData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { CreateEditProjectDialog } from '@/components/create-edit-project-dialog';
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
import { formatCurrency } from '@/lib/utils';
import { ProjectTypeDialog } from '@/components/project-type-dialog';
import { CreateEditProductionDialog } from '@/components/create-edit-production-dialog';
import { CreateEditCreativeProjectDialog } from '@/components/create-edit-creative-project-dialog';
import { CopyableError } from '@/components/copyable-error';
import { Badge } from '@/components/ui/badge';
import { AppFooter } from '@/components/app-footer';
import { CreateEditStoryboardDialog } from '@/components/create-edit-storyboard-dialog';


type DisplayableItem =
  | (Project & { itemType: 'financial' })
  | (Production & { itemType: 'production' })
  | (CreativeProject & { itemType: 'creative' })
  | (Storyboard & { itemType: 'storyboard'});

function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<DisplayableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
  const [isCreativeProjectDialogOpen, setIsCreativeProjectDialogOpen] = useState(false);
  const [isStoryboardDialogOpen, setIsStoryboardDialogOpen] = useState(false);

  // Editing states
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingProduction, setEditingProduction] = useState<Production | null>(null);
  const [editingCreativeProject, setEditingCreativeProject] = useState<CreativeProject | null>(null);
  const [editingStoryboard, setEditingStoryboard] = useState<Storyboard | null>(null);

  // Deleting state
  const [itemToDelete, setItemToDelete] = useState<DisplayableItem | null>(
    null
  );

  const fetchItems = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [
        projects,
        productions,
        creativeProjects,
        storyboards,
      ] = await Promise.all([
        firestoreApi.getProjects(),
        firestoreApi.getProductions(),
        firestoreApi.getCreativeProjects(),
        firestoreApi.getStoryboards(),
      ]);

      const displayableItems: DisplayableItem[] = [
        ...projects.map((p) => ({ ...p, itemType: 'financial' as const })),
        ...productions.map((p) => ({ ...p, itemType: 'production' as const })),
        ...storyboards.map((p) => ({ ...p, itemType: 'storyboard' as const })),
        ...creativeProjects.map((p) => ({
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
        title: 'Erro em /page.tsx (fetchItems)',
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

  const handleCreateNewClick = () => {
    setIsTypeDialogOpen(true);
  };

  const handleSelectProjectType = (
    type: 'financial' | 'production' | 'creative' | 'storyboard'
  ) => {
    setIsTypeDialogOpen(false);
    if (type === 'financial') {
      setEditingProject(null);
      setIsProjectDialogOpen(true);
    } else if (type === 'production') {
      setEditingProduction(null);
      setIsProductionDialogOpen(true);
    } else if (type === 'storyboard') {
      setEditingStoryboard(null);
      setIsStoryboardDialogOpen(true);
    } else {
      setEditingCreativeProject(null);
      setIsCreativeProjectDialogOpen(true);
    }
  };

  const handleProjectSubmit = async (
    projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>
  ) => {
    try {
      if (editingProject) {
        await firestoreApi.updateProject(editingProject.id, projectData);
        toast({ title: 'Projeto financeiro atualizado!' });
      } else {
        await firestoreApi.addProject(projectData);
        toast({ title: 'Projeto financeiro criado!' });
      }
      await fetchItems();
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro em /page.tsx (handleProjectSubmit)',
        description: (
          <CopyableError
            userMessage="Não foi possível salvar o projeto."
            errorCode={errorTyped.code || errorTyped.message}
          />
        ),
      });
    }
    setIsProjectDialogOpen(false);
    setEditingProject(null);
  };

  const handleProductionSubmit = async (
    productionData: Omit<Production, 'id' | 'userId' | 'createdAt'>
  ) => {
    try {
      if (editingProduction) {
        await firestoreApi.updateProduction(
          editingProduction.id,
          productionData
        );
        toast({ title: 'Produção atualizada!' });
      } else {
        await firestoreApi.addProduction(productionData);
        toast({ title: 'Produção criada!' });
      }
      await fetchItems();
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro em /page.tsx (handleProductionSubmit)',
        description: (
          <CopyableError
            userMessage="Não foi possível salvar a produção."
            errorCode={errorTyped.code || errorTyped.message}
          />
        ),
      });
    }
    setIsProductionDialogOpen(false);
    setEditingProduction(null);
  };

  const handleCreativeProjectSubmit = async (
    data: Omit<CreativeProject, 'id' | 'userId' | 'createdAt'>
  ) => {
    try {
      if (editingCreativeProject) {
        await firestoreApi.updateCreativeProject(editingCreativeProject.id, data);
        toast({ title: 'Moodboard atualizado!' });
      } else {
        await firestoreApi.addCreativeProject(data);
        toast({ title: 'Moodboard criado!' });
      }
      await fetchItems();
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro em /page.tsx (handleCreativeProjectSubmit)',
        description: (
          <CopyableError
            userMessage="Não foi possível salvar o moodboard."
            errorCode={errorTyped.code || errorTyped.message}
          />
        ),
      });
    }
    setIsCreativeProjectDialogOpen(false);
    setEditingCreativeProject(null);
  };

  const handleStoryboardSubmit = async (
    data: Omit<Storyboard, 'id' | 'userId' | 'createdAt'>
  ) => {
    try {
      if (editingStoryboard) {
        await firestoreApi.updateStoryboard(editingStoryboard.id, data);
        toast({ title: 'Storyboard atualizado!' });
      } else {
        await firestoreApi.addStoryboard(data);
        toast({ title: 'Storyboard criado!' });
      }
      await fetchItems();
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro em /page.tsx (handleStoryboardSubmit)',
        description: (
          <CopyableError
            userMessage="Não foi possível salvar o storyboard."
            errorCode={errorTyped.code || errorTyped.message}
          />
        ),
      });
    }
    setIsStoryboardDialogOpen(false);
    setEditingStoryboard(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.itemType === 'financial') {
        await firestoreApi.deleteProject(itemToDelete.id);
      } else if (itemToDelete.itemType === 'production') {
        await firestoreApi.deleteProductionAndDays(itemToDelete.id);
      } else if (itemToDelete.itemType === 'creative') {
        await firestoreApi.deleteCreativeProjectAndItems(itemToDelete.id);
      } else if (itemToDelete.itemType === 'storyboard') {
        await firestoreApi.deleteStoryboardAndPanels(itemToDelete.id);
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

  const handleExportProject = async (item: DisplayableItem) => {
    try {
      const dataToExport = await firestoreApi.getProjectDataForExport(item.id, item.itemType);
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `productionflow_${item.itemType}_${item.name.replace(/ /g, "_")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Exportação Concluída!" });
    } catch (error) {
       const errorTyped = error as { code?: string; message: string };
       toast({
        variant: 'destructive',
        title: 'Erro ao Exportar',
        description: <CopyableError userMessage="Não foi possível exportar o projeto." errorCode={errorTyped.code || errorTyped.message} />,
      });
    }
  };

  const handleImportProject = async (data: ExportedProjectData) => {
    try {
      await firestoreApi.importProject(data);
      await fetchItems();
      toast({ title: "Projeto importado com sucesso!" });
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao Importar',
        description: <CopyableError userMessage="Não foi possível importar o projeto." errorCode={errorTyped.code || errorTyped.message} />,
      });
    }
  };

  const openEditDialog = (item: DisplayableItem) => {
    if (item.itemType === 'financial') {
      setEditingProject(item);
      setIsProjectDialogOpen(true);
    } else if (item.itemType === 'production') {
      setEditingProduction(item);
      setIsProductionDialogOpen(true);
    } else if (item.itemType === 'creative') {
      setEditingCreativeProject(item);
      setIsCreativeProjectDialogOpen(true);
    } else if (item.itemType === 'storyboard') {
      setEditingStoryboard(item);
      setIsStoryboardDialogOpen(true);
    }
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
          <Clapperboard className="mx-auto h-10 w-10 text-primary" />
          <h3 className="mt-4 text-lg font-semibold">
            Nenhum projeto encontrado
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Comece criando ou importando seu primeiro projeto.
          </p>
          <Button className="mt-6" onClick={handleCreateNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar ou Importar Projeto
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          let link, Icon, projectType;

          switch (item.itemType) {
            case 'financial':
              link = `/project/${item.id}`;
              Icon = DollarSign;
              projectType = 'Gerenciamento Financeiro';
              break;
            case 'production':
              link = `/production/${item.id}`;
              Icon = Clapperboard;
              projectType = 'Ordem do Dia';
              break;
            case 'creative':
              link = `/creative/${item.id}`;
              Icon = Brush;
              projectType = 'Moodboard';
              break;
            case 'storyboard':
              link = `/storyboard/${item.id}`;
              Icon = ImageIcon;
              projectType = 'Storyboard';
              break;
          }

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
                    <DropdownMenuItem onClick={() => handleExportProject(item)}>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar
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
              <Link href={link} className="flex flex-col flex-grow">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pr-10">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{projectType}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button className="w-full">Gerenciar</Button>
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
          <Button onClick={handleCreateNewClick} size="sm">
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

      <ProjectTypeDialog
        isOpen={isTypeDialogOpen}
        setIsOpen={setIsTypeDialogOpen}
        onSelect={handleSelectProjectType}
        onImport={handleImportProject}
      />

      <CreateEditProjectDialog
        isOpen={isProjectDialogOpen}
        setIsOpen={(open) => {
          if (!open) setEditingProject(null);
          setIsProjectDialogOpen(open);
        }}
        onSubmit={handleProjectSubmit}
        project={editingProject || undefined}
      />

      <CreateEditProductionDialog
        isOpen={isProductionDialogOpen}
        setIsOpen={(open) => {
          if (!open) setEditingProduction(null);
          setIsProductionDialogOpen(open);
        }}
        onSubmit={handleProductionSubmit}
        production={editingProduction || undefined}
      />

      <CreateEditCreativeProjectDialog
        isOpen={isCreativeProjectDialogOpen}
        setIsOpen={(open) => {
          if (!open) setEditingCreativeProject(null);
          setIsCreativeProjectDialogOpen(open);
        }}
        onSubmit={handleCreativeProjectSubmit}
        project={editingCreativeProject || undefined}
      />

      <CreateEditStoryboardDialog
        isOpen={isStoryboardDialogOpen}
        setIsOpen={(open) => {
            if (!open) setEditingStoryboard(null);
            setIsStoryboardDialogOpen(open);
        }}
        onSubmit={handleStoryboardSubmit}
        storyboard={editingStoryboard || undefined}
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
