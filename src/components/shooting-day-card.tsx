// @/src/components/shooting-day-card.tsx
"use client";

import type { ShootingDay } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MoreVertical, Edit, Trash2, Calendar, MapPin, Clapperboard, Clock,
  Users, Truck, Shirt, Star, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface ShootingDayCardProps {
  day: ShootingDay;
  onEdit: () => void;
  onDelete: () => void;
}

const DetailSection = ({ icon: Icon, title, content }: { icon: React.ElementType, title: string, content: React.ReactNode }) => {
  const hasContent = typeof content === 'string' ? !!content.trim() : !!content;

  if (!hasContent) return null;

  return (
    <div>
      <h4 className="flex items-center text-md font-semibold mb-2">
        <Icon className="h-4 w-4 mr-2 text-primary" />
        {title}
      </h4>
      {typeof content === 'string' ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">{content}</p>
      ) : (
        <div className="pl-6">{content}</div>
      )}
    </div>
  )
};

export function ShootingDayCard({ day, onEdit, onDelete }: ShootingDayCardProps) {
  return (
    <Card className="flex flex-col w-full">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4">
               <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                    <CardTitle>Dia {format(new Date(day.date), "dd/MM")}: {format(new Date(day.date), "eeee", { locale: ptBR })}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 pt-1">
                      <MapPin className="h-3 w-3" /> {day.location}
                    </CardDescription>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Ordem do Dia
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between space-y-4">
        <Separator />
        <div className="space-y-4">
            <DetailSection icon={Clock} title="Horários de Chamada" content={day.callTimes} />
            <DetailSection icon={Clapperboard} title="Cenas a Gravar" content={day.scenes} />
            <DetailSection
                icon={Users}
                title="Equipe Presente"
                content={
                  day.presentTeam && day.presentTeam.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                          {day.presentTeam.map(member => (
                              <Badge key={member.id} variant="secondary" className="font-normal">{member.name} <span className="text-muted-foreground ml-1.5">({member.role})</span></Badge>
                          ))}
                      </div>
                  ) : <p className="text-sm text-muted-foreground pl-6">Nenhuma equipe selecionada para este dia.</p>
                }
            />
            <DetailSection icon={Truck} title="Equipamentos Especiais" content={day.equipment} />
            <DetailSection icon={Shirt} title="Figurino" content={day.costumes} />
            <DetailSection icon={Star} title="Objetos de Cena (Props)" content={day.props} />
            <DetailSection icon={FileText} title="Observações Gerais" content={day.generalNotes} />
        </div>
      </CardContent>
    </Card>
  );
}
