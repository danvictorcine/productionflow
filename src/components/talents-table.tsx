"use client";

import { useState, useMemo } from 'react';
import type { Talent, Transaction } from "@/lib/types";
import { MoreHorizontal, Trash2, Edit, Banknote, Check } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TalentsTableProps {
  talents: Talent[];
  transactions: Transaction[];
  onEdit: () => void;
  onDelete: (id: string) => void;
  onPay: (talent: Talent) => void;
}

export default function TalentsTable({ talents, transactions, onEdit, onDelete, onPay }: TalentsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };
  
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
      <ScrollArea className="h-[265px] pr-4">
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
                             <Badge variant="secondary" className="border-green-500 text-green-600">
                                <Check className="mr-1 h-4 w-4" />
                                Pago
                            </Badge>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => onPay(talent)}>
                                <Banknote className="mr-2 h-4 w-4" />
                                Pagar
                            </Button>
                        )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit()}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(talent.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
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
