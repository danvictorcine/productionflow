// @/src/components/project-type-dialog.tsx
"use client";

import { DollarSign, Clapperboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ProjectTypeDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSelect: (type: 'financial' | 'production') => void;
}

export function ProjectTypeDialog({ isOpen, setIsOpen, onSelect }: ProjectTypeDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
          <DialogDescription>
            Escolha o tipo de projeto que você deseja criar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
