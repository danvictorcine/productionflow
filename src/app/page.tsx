"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Film, MoreVertical, Edit, Trash2 } from "lucide-react";
import type { Project, Transaction } from "@/lib/types";
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

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    try {
      const storedProjects = localStorage.getItem('production_flow_projects');
      if (storedProjects) {
        const parsedProjects: Project[] = JSON.parse(storedProjects).map((p: any) => ({
          ...p,
          includeProductionCostsInBudget: p.includeProductionCostsInBudget ?? true,
        }));
        setProjects(parsedProjects);
      }
    } catch (error) {
      console.error("Failed to parse projects from localStorage", error);
    }
  }, []);

  const saveProjects = (updatedProjects: Project[]) => {
    const sortedProjects = updatedProjects.sort((a, b) => a.name.localeCompare(b.name));
    setProjects(sortedProjects);
    localStorage.setItem('production_flow_projects', JSON.stringify(sortedProjects));
  };

  const handleProjectSubmit = (projectData: Omit<Project, 'id'>) => {
    if (editingProject) {
      const updatedProject = { ...editingProject, ...projectData };
      const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
      saveProjects(updatedProjects);
    } else {
      const newProject = { ...projectData, id: crypto.randomUUID() };
      const updatedProjects = [...projects, newProject];
      saveProjects(updatedProjects);
    }
    setIsDialogOpen(false);
    setEditingProject(null);
  };
  
  const handleConfirmDelete = () => {
    if (!projectToDelete) return;

    const updatedProjects = projects.filter(p => p.id !== projectToDelete.id);
    saveProjects(updatedProjects);

    try {
        const storedTransactions = localStorage.getItem('production_flow_transactions');
        if (storedTransactions) {
            const allTransactions: Transaction[] = JSON.parse(storedTransactions);
            const remainingTransactions = allTransactions.filter(t => t.projectId !== projectToDelete.id);
            localStorage.setItem('production_flow_transactions', JSON.stringify(remainingTransactions));
        }
    } catch (error) {
        console.error("Failed to update transactions in localStorage after project deletion", error);
    }

    setProjectToDelete(null);
  };

  const openCreateDialog = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <h1 className="text-2xl font-bold text-primary">ProductionFlow</h1>
        <div className="ml-auto flex items-center gap-4">
          <Button onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Novo Projeto
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Meus Projetos</h2>
          <p className="text-muted-foreground">Selecione um projeto para gerenciar ou crie um novo.</p>
        </div>
        {projects.length > 0 ? (
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
                 <Link href={`/project/${project.id}`} className="flex flex-col flex-grow cursor-pointer">
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
        ) : (
          <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[400px]">
            <Film className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum projeto encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">Comece criando seu primeiro projeto de produção.</p>
            <Button className="mt-6" onClick={openCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Projeto
            </Button>
          </div>
        )}
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
