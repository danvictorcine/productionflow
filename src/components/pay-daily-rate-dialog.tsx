// @/src/components/pay-daily-rate-dialog.tsx
"use client"

import { useMemo } from "react";
import type { TeamMember, Transaction } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { Banknote, Check, Undo2 } from "lucide-react";
import { Badge } from "./ui/badge";

interface PayDailyRateDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  talent: TeamMember;
  transactions: Transaction[];
  onPay: (talent: TeamMember, dayNumber: number) => void;
  onUndo: (transactionId: string) => void;
}

export function PayDailyRateDialog({ isOpen, setIsOpen, talent, transactions, onPay, onUndo }: PayDailyRateDialogProps) {

  const paidDays = useMemo(() => {
    return new Map(transactions
        .filter(t => t.status === 'paid' && t.paidDay)
        .map(t => [t.paidDay!, t.id])
    );
  }, [transactions]);

  const daysArray = Array.from({ length: talent.days || 0 }, (_, i) => i + 1);
  const allDaysPaid = paidDays.size === (talent.days || 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Diárias</DialogTitle>
          <DialogDescription>
            Pague as diárias para <span className="font-semibold text-foreground">{talent.name}</span>.
            {allDaysPaid && <Badge className="ml-2 border-green-500 bg-green-50 text-green-700">Todas as diárias pagas</Badge>}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4 my-4 flex-1">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Diária</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center w-[120px]">Ação</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {daysArray.map((dayNumber) => {
                        const isPaid = paidDays.has(dayNumber);
                        const transactionId = paidDays.get(dayNumber);

                        return (
                            <TableRow key={dayNumber}>
                                <TableCell>Diária {dayNumber}</TableCell>
                                <TableCell className="text-right">{formatCurrency(talent.dailyRate || 0)}</TableCell>
                                <TableCell className="text-center">
                                    {isPaid ? (
                                        <div className="group relative w-[100px] h-9 mx-auto">
                                            <Button size="sm" className="absolute inset-0 w-full h-full bg-green-600 hover:bg-green-700 text-white transition-opacity group-hover:opacity-0 pointer-events-none rounded-md" aria-hidden="true" tabIndex={-1}>
                                                <Check className="mr-1 h-4 w-4" /> Pago
                                            </Button>
                                            <Button size="sm" variant="ghost" className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={() => onUndo(transactionId!)} aria-label={`Desfazer pagamento da diária ${dayNumber}`}>
                                                <Undo2 className="mr-2 h-4 w-4" /> Desfazer
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={() => onPay(talent, dayNumber)} aria-label={`Pagar diária ${dayNumber}`} className="w-[100px]">
                                            <Banknote className="mr-2 h-4 w-4" /> Pagar
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </ScrollArea>
        
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
