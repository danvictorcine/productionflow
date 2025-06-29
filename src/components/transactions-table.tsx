"use client";

import { useState } from 'react';
import type { Transaction } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreHorizontal, Trash2, TrendingDown, Edit } from "lucide-react";
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
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}

export default function TransactionsTable({ transactions, onDelete, onEdit }: TransactionsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const transactionToDelete = transactions.find(t => t.id === deleteId);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[10px]"></TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="hidden md:table-cell">Data</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length > 0 ? (
            transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{t.description}</div>
                  {t.category && (
                    <Badge variant="outline" className="mt-1 font-normal">{t.category}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  -{formatCurrency(t.amount)}
                </TableCell>
                <TableCell className="hidden md:table-cell">{format(t.date, "d MMM, yyyy", { locale: ptBR })}</TableCell>
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
                Nenhuma despesa ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
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
