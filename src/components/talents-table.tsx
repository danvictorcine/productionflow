
"use client";

import { useState, useMemo } from 'react';
import type { Talent, Transaction } from "@/lib/types";
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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TalentsTableProps {
  talents: Talent[];
  transactions: Transaction[];
  onEdit: () => void;
  onDelete: (id: string) => void;
  onPay: (talent: Talent) => void;
  onUndoPayment: (transactionId: string) => void;
}

export default function TalentsTable({ talents, transactions, onEdit, onDelete, onPay, onUndoPayment }: TalentsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const talentToDelete = talents.find(t => t.id === deleteId);

  const paidAmounts = useMemo(() => {
    const amounts = new Map<string, number>();
    transactions
        .filter(t => t.category === 'Cachê do Talento' && t.talentId)
        .forEach(t => {
            const currentAmount = amounts.get(t.talentId!) || 0;
            amounts.set(t.talentId!, currentAmount + t.amount);
        });
    return amounts;
  }, [transactions]);

  return (
    <>
      <ScrollArea className="h-[265px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="text-right">Cachê</TableHead>
              <TableHead className="text-center w-[120px]">Pagamento</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {talents.length > 0 ? (
              talents.map((talent) => {
                const paidAmount = paidAmounts.get(talent.id) || 0;
                const isPaid = paidAmount >= talent.fee;

                return (
                  <TableRow key={talent.id}>
                    <TableCell className="font-medium">{talent.name}</TableCell>
                    <TableCell>{talent.role}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(talent.fee)}
                    </TableCell>
                    <TableCell className="text-center">
                        {isPaid ? (
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
                                    onClick={() => {
                                        const lastPayment = transactions.find(t => t.talentId === talent.id && t.category === "Cachê do Talento");
                                        if (lastPayment) {
                                            onUndoPayment(lastPayment.id);
                                        }
                                    }}
                                    aria-label={`Desfazer pagamento de ${talent.name}`}
                                >
                                    <Undo2 className="mr-2 h-4 w-4" />
                                    Desfazer
                                </Button>
                            </div>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => onPay(talent)} aria-label={`Pagar cachê de ${talent.name}`} className="w-[100px]">
                                <Banknote className="mr-2 h-4 w-4" />
                                Pagar
                            </Button>
                        )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Opções para ${talent.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit()}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar Projeto
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(talent.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Talento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  Nenhum talento cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente o talento '{talentToDelete?.name}' da equipe do projeto. Esta ação não pode ser desfeita.
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
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
