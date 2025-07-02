"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Film, MoreVertical, Edit, Trash2, Rocket } from "lucide-react";
import { useRouter } from 'next/navigation';

import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateEditProjectDialog } from "@/components/create-edit-project-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import AuthGuard from "@/components/auth-guard";
import { useAuth } from "@/context/auth-context";
import * as projectApi from '@/lib/firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { UserNav } from "@/components/user-nav";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const FREE_PLAN_PROJECT_LIMIT = 1;
  const isFreePlan = user?.subscriptionStatus !== 'active';
  const hasReachedFreeLimit = isFreePlan && projects.length >= FREE_PLAN_PROJECT_LIMIT;

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
        const userProjects = await projectApi.getProjects();
        setProjects(userProjects);
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro ao buscar projetos', description: (error as Error).message });
    } finally {
        setIsLoading(false);
    }
  }

  const handleProjectSubmit = async (projectData: Omit<Project, 'id' | 'userId'>) => {
    try {
        if (editingProject) {
          await projectApi.updateProject(editingProject.id, projectData);
          toast({ title: 'Projeto atualizado com sucesso!' });
        } else {
          await projectApi.addProject(projectData);
          toast({ title: 'Projeto criado com sucesso!' });
        }
        await fetchProjects(); // Refresh the list
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao salvar projeto', description: (error as Error).message });
    }
    
    setIsDialogOpen(false);
    setEditingProject(null);
  };
  
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    try {
        await projectApi.deleteProject(projectToDelete.id);
        toast({ title: `Projeto "${projectToDelete.name}" excluído.` });
        await fetchProjects();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao excluir projeto', description: (error as Error).message });
    }
    setProjectToDelete(null);
  };

  const openCreateDialog = () => {
    if (hasReachedFreeLimit) return;
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };
  
  const renderProjectCards = () => {
    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[220px] w-full" />)}
            </div>
        )
    }

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[400px]">
                <Film className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum projeto encontrado</h3>
                <p className="mt-2 text-sm text-muted-foreground">Comece criando seu primeiro projeto de produção.</p>
                <Button className="mt-6" onClick={openCreateDialog} disabled={hasReachedFreeLimit}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar Projeto
                </Button>
            </div>
        )
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow h-full flex flex-col relative">
            <div className="absolute top-2 right-2 z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(project)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setProjectToDelete(project)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
             <Link href={`/project/${project.id}`} className="flex flex-col flex-grow">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pr-10">
                    <div className="p-3 rounded-full bg-primary/10">
                    <Film className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>Orçamento: {formatCurrency(project.budget)}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="mt-auto">
                    <Button className="w-full">Gerenciar Projeto</Button>
                </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <h1 className="text-2xl font-bold text-primary truncate">
          ProductionFlow
          {user?.name && <span className="text-lg font-normal text-muted-foreground ml-2">/ {user.name}</span>}
        </h1>
        <div className="ml-auto flex items-center gap-4">
          <Button onClick={openCreateDialog} disabled={hasReachedFreeLimit}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Novo Projeto
          </Button>
          <UserNav />
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {hasReachedFreeLimit && (
          <Alert className="mb-6 border-primary/50 text-primary bg-primary/5">
            <Rocket className="h-4 w-4" />
            <AlertTitle>Plano Gratuito</AlertTitle>
            <AlertDescription>
              Você atingiu o limite de {FREE_PLAN_PROJECT_LIMIT} projeto.{" "}
              <Link href="/settings" className="font-semibold underline">
                Faça um upgrade para criar projetos ilimitados.
              </Link>
            </AlertDescription>
          </Alert>
        )}
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Meus Projetos</h2>
          <p className="text-muted-foreground">Selecione um projeto para gerenciar ou crie um novo.</p>
        </div>
        {renderProjectCards()}
      </main>

      <CreateEditProjectDialog
        isOpen={isDialogOpen}
        setIsOpen={(open) => {
            if (!open) {
                setEditingProject(null);
            }
            setIsDialogOpen(open);
        }}
        onSubmit={handleProjectSubmit}
        project={editingProject || undefined}
      />
      
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o projeto e todas as suas transações associadas.
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
    </div>
  );
}


export default function Home() {
    return (
        <AuthGuard>
            <HomePage />
        </AuthGuard>
    )
}
