
"use client";

import { useState, useMemo } from 'react';
import type { Talent, Transaction } from "@/lib/types";
import { MoreHorizontal, Trash2, Edit, Banknote, Check, Undo2, CalendarDays } from "lucide-react";
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
import { Badge } from './ui/badge';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

interface TalentsTableProps {
  talents: Talent[];
  transactions: Transaction[];
  onEdit: () => void;
  onDelete: (id: string) => void;
  onPayFixedFee: (talent: Talent, transaction: Transaction | undefined) => void;
  onUndoPayment: (id: string) => void;
  onManageDailyPayment: (talent: Talent) => void;
}

export default function TalentsTable({ talents, transactions, onEdit, onDelete, onPayFixedFee, onUndoPayment, onManageDailyPayment }: TalentsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const talentToDelete = talents.find(t => t.id === deleteId);

  const transactionsByTalentId = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    transactions
        .filter(t => t.talentId && t.category === "Cachê de Equipe e Talentos")
        .forEach(t => {
            if (!map.has(t.talentId!)) {
                map.set(t.talentId!, []);
            }
            map.get(t.talentId!)?.push(t);
        });
    return map;
  }, [transactions]);

  return (
    <>
      <ScrollArea className="w-full whitespace-nowrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Função</TableHead>
                <TableHead className="text-right hidden md:table-cell">Cachê</TableHead>
                <TableHead className="text-center w-[150px]">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {talents.length > 0 ? (
                talents.map((talent) => {
                  const talentTransactions = transactionsByTalentId.get(talent.id) || [];
                  const isFixedFee = talent.paymentType === 'fixed' || !talent.paymentType;
                  
                  return (
                    <TableRow key={talent.id}>
                      <TableCell className="font-medium">
                        <p>{talent.name}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{talent.role}</p>
                         <p className="text-xs text-muted-foreground md:hidden mt-1">
                            {isFixedFee
                              ? formatCurrency(talent.fee || 0)
                              : `${formatCurrency(talent.dailyRate || 0)}/diária`
                            }
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{talent.role}</TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {isFixedFee
                          ? formatCurrency(talent.fee || 0)
                          : `${formatCurrency(talent.dailyRate || 0)} x ${talent.days} diárias = ${formatCurrency((talent.dailyRate || 0) * (talent.days || 0))}`
                        }
                      </TableCell>
                      <TableCell className="text-center">
                          {isFixedFee ? (
                              talentTransactions.length > 0 && talentTransactions[0].status === 'paid' ? (
                                  <div className="group relative w-[120px] h-9 mx-auto">
                                    <Button size="sm" variant="outline" className="absolute inset-0 w-full h-full border-green-500 bg-green-50 text-green-700 transition-opacity group-hover:opacity-0 pointer-events-none rounded-md" aria-hidden="true" tabIndex={-1}>
                                      <Check className="mr-1 h-4 w-4" /> Pago
                                    </Button>
                                    <Button size="sm" variant="ghost" className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={() => onUndoPayment(talentTransactions[0].id)} aria-label={`Desfazer pagamento de ${talent.name}`}>
                                      <Undo2 className="mr-2 h-4 w-4" /> Desfazer
                                    </Button>
                                  </div>
                              ) : (
                                  <Button size="sm" variant="outline" onClick={() => onPayFixedFee(talent, talentTransactions[0])} aria-label={`Pagar ${talent.name}`} className="w-[120px]">
                                      <Banknote className="mr-2 h-4 w-4" /> Pagar
                                  </Button>
                              )
                          ) : (
                             <div className="flex flex-col items-center gap-1">
                                <Button size="sm" variant="outline" onClick={() => onManageDailyPayment(talent)} aria-label={`Gerenciar Diárias de ${talent.name}`} className="w-[120px]">
                                    <CalendarDays className="mr-2 h-4 w-4" /> Gerenciar
                                </Button>
                                {talentTransactions.length > 0 && (
                                  <Badge variant="secondary" className="font-normal">
                                    {talentTransactions.length} / {talent.days} pagas
                                  </Badge>
                                )}
                              </div>
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
        <ScrollBar orientation="horizontal" />
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
