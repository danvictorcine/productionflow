"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Edit, Trash2, PlusCircle, AlertCircle } from "lucide-react";
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
import { Alert, AlertDescription } from "./ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  customCategories: string[];
  onAddCategory: (name: string) => Promise<void>;
  onUpdateCategory: (oldName: string, newName: string) => Promise<void>;
  onDeleteCategory: (name: string) => Promise<boolean>; // Returns success status
  transactions: any[]; // Pass transactions to check if category is in use
}

export function ManageCategoriesDialog({
  isOpen,
  setIsOpen,
  customCategories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  transactions
}: ManageCategoriesDialogProps) {
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);

  const categoryUsage = transactions.reduce((acc, t) => {
    if (t.category) {
      acc[t.category] = (acc[t.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const handleAdd = async () => {
    if (!newCategoryName) return;
    await onAddCategory(newCategoryName);
    setNewCategoryName("");
  };

  const handleUpdate = async () => {
    if (!editingCategory || !editingCategory.newName || editingCategory.oldName === editingCategory.newName) {
      setEditingCategory(null);
      return;
    }
    await onUpdateCategory(editingCategory.oldName, editingCategory.newName);
    setEditingCategory(null);
  }

  const handleDelete = async (name: string) => {
    await onDeleteCategory(name);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>Adicione, edite ou exclua suas categorias de despesa personalizadas.</DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Nome da nova categoria" 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              />
              <Button onClick={handleAdd} disabled={!newCategoryName.trim()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Categorias padrão não podem ser editadas ou excluídas. A edição de um nome de categoria atualizará todas as transações existentes.
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[250px] border rounded-md p-2">
                {customCategories.length > 0 ? (
                    <div className="space-y-2">
                        {customCategories.map(cat => {
                            const isUsed = (categoryUsage[cat] || 0) > 0;
                            return (
                              <div key={cat} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                  <span className="text-sm">{cat}</span>
                                  <div className="flex gap-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory({ oldName: cat, newName: cat })}>
                                          <Edit className="h-4 w-4" />
                                      </Button>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div tabIndex={isUsed ? 0 : -1}>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isUsed}>
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Excluir Categoria?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Você tem certeza que deseja excluir a categoria "{cat}"? Esta ação não pode ser desfeita.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(cat)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            </div>
                                          </TooltipTrigger>
                                          {isUsed && (
                                            <TooltipContent>
                                              <p>Esta categoria não pode ser excluída pois está em uso.</p>
                                            </TooltipContent>
                                          )}
                                        </Tooltip>
                                      </TooltipProvider>
                                  </div>
                              </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        Nenhuma categoria personalizada.
                    </div>
                )}
            </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>

      {/* Edit Dialog */}
      <AlertDialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Editar Categoria</AlertDialogTitle>
                <AlertDialogDescription>
                    Renomeie a categoria. Isso atualizará todas as transações que a utilizam.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <Input 
                value={editingCategory?.newName || ""}
                onChange={e => setEditingCategory(prev => prev ? { ...prev, newName: e.target.value } : null)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdate(); } }}
            />
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleUpdate}>Salvar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
