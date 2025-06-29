
"use client";

import { useState } from 'react';
import type { Transaction } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, Trash2, Edit, Banknote, Check, Undo2 } from "lucide-react";
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

interface TransactionsTableProps {
  transactions: Transaction[];
  mode: 'planned' | 'paid';
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onPay?: (id: string) => void;
  onUndo?: (id: string) => void;
}

export default function TransactionsTable({ 
  transactions, 
  mode,
  onDelete, 
  onEdit,
  onPay,
  onUndo
}: TransactionsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const transactionToDelete = transactions.find(t => t.id === deleteId);

  return (
    <>
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              <TableHead className="text-center w-[120px]">Ação</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.description}</div>
                    {t.category && mode === 'paid' && (
                      <Badge variant="outline" className="mt-1 font-normal">{t.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{format(t.date, "d MMM, yyyy", { locale: ptBR })}</TableCell>
                  <TableCell className="text-center">
                    {mode === 'planned' && onPay && (
                      <Button size="sm" variant="outline" onClick={() => onPay(t.id)} aria-label={`Pagar ${t.description}`} className="w-[100px]">
                          <Banknote className="mr-2 h-4 w-4" />
                          Pagar
                      </Button>
                    )}
                    {mode === 'paid' && onUndo && (
                      <div className="group relative w-[100px] h-9 mx-auto">
                          <Button
                              size="sm"
                              variant="outline"
                              className="absolute inset-0 w-full h-full border-green-500 bg-green-50 text-green-700 transition-opacity group-hover:opacity-0 pointer-events-none"
                              aria-hidden="true"
                              tabIndex={-1}
                          >
                              <Check className="mr-1 h-4 w-4" />
                              Pago
                          </Button>
                          <Button
                              size="sm"
                              variant="ghost"
                              className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => onUndo(t.id)}
                              aria-label={`Desfazer pagamento de ${t.description}`}
                          >
                              <Undo2 className="mr-2 h-4 w-4" />
                              Desfazer
                          </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  Nenhuma despesa encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
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
                if(deleteId) {
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
