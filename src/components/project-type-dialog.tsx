// @/src/components/project-type-dialog.tsx
"use client";

import { DollarSign, Clapperboard, Brush, Image, Upload } from "lucide-react";
import { useState, useRef } from "react";
import type { ExportedProjectData } from "@/lib/types";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { useToast } from "@/hooks/use-toast";

interface ProjectTypeDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSelect: (type: 'financial' | 'production' | 'creative' | 'storyboard') => void;
  onImport: (data: ExportedProjectData) => void;
}

export function ProjectTypeDialog({ isOpen, setIsOpen, onSelect, onImport }: ProjectTypeDialogProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      toast({
        variant: "destructive",
        title: "Arquivo Inválido",
        description: "Por favor, selecione um arquivo .json válido.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as ExportedProjectData;

        // Basic validation
        if (!data.type || !['financial', 'production', 'creative', 'storyboard'].includes(data.type)) {
          throw new Error("O arquivo de backup não contém um tipo de projeto válido.");
        }
        
        onImport(data);
        setIsOpen(false);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro ao ler arquivo",
          description: "O arquivo de backup está corrompido ou em formato inválido.",
        });
      }
    };
    reader.readAsText(file);
  };


  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Criar Novo Projeto</SheetTitle>
          <SheetDescription>
            Escolha o tipo de projeto que você deseja criar ou importe um projeto existente.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 flex flex-col gap-4 py-4">
            <h3 className="text-sm font-medium text-muted-foreground px-6">Criar do zero</h3>
            <ScrollArea className="flex-1 -mx-6">
                <div className="grid grid-cols-1 gap-4 px-6">
                  <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelect('financial')}
                  >
                    <CardHeader className="items-center text-center">
                      <div className="p-3 rounded-full bg-primary/10 mb-2">
                        <DollarSign className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle>Gerenciamento Financeiro</CardTitle>
                      <CardDescription>Controle orçamentos, despesas e cachês.</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelect('production')}
                  >
                    <CardHeader className="items-center text-center">
                      <div className="p-3 rounded-full bg-primary/10 mb-2">
                        <Clapperboard className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle>Ordem do Dia</CardTitle>
                      <CardDescription>Crie e gerencie as Ordens do Dia (Call Sheets).</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelect('storyboard')}
                  >
                    <CardHeader className="items-center text-center">
                      <div className="p-3 rounded-full bg-primary/10 mb-2">
                        <Image className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle>Storyboard</CardTitle>
                      <CardDescription>Visualize sua história com painéis sequenciais.</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelect('creative')}
                  >
                    <CardHeader className="items-center text-center">
                      <div className="p-3 rounded-full bg-primary/10 mb-2">
                        <Brush className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle>Moodboard</CardTitle>
                      <CardDescription>Crie um moodboard e organize suas ideias.</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
            </ScrollArea>
        </div>
        <Separator />
        <div className="px-6 py-4 flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Importar de um arquivo</h3>
            <Button variant="outline" onClick={() => importInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Importar Projeto (.json)
            </Button>
            <input 
                type="file" 
                ref={importInputRef} 
                className="hidden" 
                accept=".json"
                onChange={handleFileSelect}
            />
        </div>
      </SheetContent>
    </Sheet>
  );
}
