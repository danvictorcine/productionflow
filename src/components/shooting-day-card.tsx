// @/src/components/shooting-day-card.tsx
"use client";

import type { ShootingDay } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShootingDayCardProps {
  day: ShootingDay;
  onEdit: () => void;
  onDelete: () => void;
}

export function ShootingDayCard({ day, onEdit, onDelete }: ShootingDayCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Ordem do Dia: {format(new Date(day.date), "dd/MM/yyyy")}</CardTitle>
                <CardDescription>Local: {day.location}</CardDescription>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div>
            <h4 className="font-semibold text-sm mb-1">Cenas a gravar:</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{day.scenes}</p>
        </div>
        <Button className="mt-4 w-full" variant="outline" onClick={onEdit}>
            Ver Detalhes
        </Button>
      </CardContent>
    </Card>
  );
}
