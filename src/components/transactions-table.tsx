
"use client";

import { useState } from 'react';
import type { Transaction } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, Trash2, Edit, Banknote, Check, Undo2, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from './ui/scroll-area';

interface TransactionsTableProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  onPay?: (id: string) => void;
  onUndo?: (id: string) => void;
  variant?: 'default' | 'history';
}

export default function TransactionsTable({ 
  transactions, 
  onDelete, 
  onEdit,
  onPay,
  onUndo,
  variant = 'default'
}: TransactionsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const transactionToDelete = transactions.find(t => t.id === deleteId);
  const colSpan = variant === 'default' ? 5 : 4;

  return (
    <>
      <ScrollArea className="w-full whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              {variant === 'default' && <TableHead className="text-center w-[120px]">Ação</TableHead>}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((t) => (
                <TableRow key={t.id} data-state={t.status === 'paid' ? 'paid' : 'planned'}>
                   <TableCell>
                    <div className="flex items-center gap-3">
                      {t.status === 'paid' && variant === 'history' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Pago</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <div>
                        <div className="font-medium">{t.description}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2">
                            {t.category && (
                              <Badge variant="outline" className="font-normal">{t.category}</Badge>
                            )}
                            <span className="md:hidden">{format(t.date, "d MMM, yy", { locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{format(t.date, "d MMM, yyyy", { locale: ptBR })}</TableCell>
                  {variant === 'default' && (
                    <TableCell className="text-center">
                      {t.status === 'planned' && onPay && (
                        <Button size="sm" variant="outline" onClick={() => onPay(t.id)} aria-label={`Pagar ${t.description}`} className="w-[120px]">
                            <Banknote className="mr-2 h-4 w-4" />
                            Pagar
                        </Button>
                      )}
                      {t.status === 'paid' && onUndo && (
                        <div className="group relative w-[120px] h-9 mx-auto">
                            <Button
                                size="sm"
                                className="absolute inset-0 w-full h-full bg-green-600 hover:bg-green-700 text-white transition-opacity group-hover:opacity-0 pointer-events-none rounded-md"
                                aria-hidden="true"
                                tabIndex={-1}
                            >
                                <Check className="mr-1 h-4 w-4" />
                                Pago
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md"
                                onClick={() => onUndo(t.id)}
                                aria-label={`Desfazer pagamento de ${t.description}`}
                            >
                                <Undo2 className="mr-2 h-4 w-4" /> Desfazer
                            </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {variant === 'default' && onEdit && onDelete ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Opções para transação ${t.description}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => onEdit(t)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(t.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      variant === 'history' && onUndo && t.status === 'paid' &&(
                         <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => onUndo(t.id)} aria-label={`Desfazer pagamento de ${t.description}`}>
                                  <Undo2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Desfazer Pagamento</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colSpan + 1} className="text-center h-24">
                  Nenhuma despesa encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
       <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a transação "{transactionToDelete?.description}" de seus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if(deleteId && onDelete) {
                    onDelete(deleteId);
                    setDeleteId(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
