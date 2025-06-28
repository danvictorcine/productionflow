"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Film } from "lucide-react";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateEditProjectDialog } from "@/components/create-edit-project-dialog";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    try {
      const storedProjects = localStorage.getItem('production_flow_projects');
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      }
    } catch (error) {
      console.error("Failed to parse projects from localStorage", error);
    }
  }, []);

  const saveProjects = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    localStorage.setItem('production_flow_projects', JSON.stringify(updatedProjects));
  };

  const handleCreateProject = (projectData: Omit<Project, 'id'>) => {
    const newProject = { ...projectData, id: crypto.randomUUID() };
    const updatedProjects = [...projects, newProject];
    saveProjects(updatedProjects);
    setIsDialogOpen(false);
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
          <Button onClick={() => setIsDialogOpen(true)}>
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
              <Link href={`/project/${project.id}`} key={project.id} passHref>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0">
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
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[400px]">
            <Film className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum projeto encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">Comece criando seu primeiro projeto de produção.</p>
            <Button className="mt-6" onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Projeto
            </Button>
          </div>
        )}
      </main>

      <CreateEditProjectDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
