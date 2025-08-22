
// @/src/components/team-and-cast-section.tsx
'use client';

import { useState } from 'react';
import type { TeamMember } from '@/lib/types';
import { Users, Phone, Utensils, Info, MoreVertical, Edit, Trash2, ChevronDown } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';

interface TeamAndCastSectionProps {
    team: TeamMember[];
    onEdit: () => void;
    onDeleteMember: (member: TeamMember) => void;
}

export function TeamAndCastSection({ team, onEdit, onDeleteMember }: TeamAndCastSectionProps) {
    if (!team) return null;

    return (
        <Accordion type="multiple" className="w-full space-y-4">
            <AccordionItem value="team" className="border-none">
                <Card>
                    <AccordionTrigger className="w-full p-0 rounded-t-lg transition-colors group hover:no-underline">
                        <CardHeader className="flex-1 flex flex-row items-center justify-between text-left p-6">
                            <div className="flex flex-col text-left">
                                <div className="flex items-center">
                                    <Users className="h-6 w-6 mr-3 text-primary" />
                                    <CardTitle>Equipe e Elenco</CardTitle>
                                </div>
                                <CardDescription className="mt-1 pl-9">
                                    Informações detalhadas sobre todos os envolvidos na produção.
                                </CardDescription>
                            </div>
                            <div className="h-8 w-8 rounded-md flex items-center justify-center transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                        </CardHeader>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 pt-0 max-h-[500px] overflow-y-auto">
                        <div className="space-y-4">
                            {(team.length > 0) ? (
                                team.map(member => (
                                    <Collapsible key={member.id} className="group">
                                        <div className="rounded-md border bg-muted/50 flex items-center pr-2">
                                            <div className="flex-1 flex items-center justify-between">
                                                <CollapsibleTrigger asChild>
                                                    <div className="p-3 text-left flex-1 flex items-center justify-between cursor-pointer">
                                                        <div className="flex items-center gap-4 text-left">
                                                            <Avatar className="h-12 w-12">
                                                                <AvatarImage src={member.photoURL} />
                                                                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-semibold text-base">{member.name}</p>
                                                                <p className="text-base text-muted-foreground">{member.role}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CollapsibleTrigger>
                                                <div className="flex items-center pr-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                                <MoreVertical className="h-4 w-4"/>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={onEdit}>
                                                                <Edit className="mr-2 h-4 w-4"/>
                                                                Editar Produção
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDeleteMember(member)}>
                                                                <Trash2 className="mr-2 h-4 w-4"/>
                                                                Remover do Projeto
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <CollapsibleTrigger asChild>
                                                       <div className="h-8 w-8 rounded-md flex items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground">
                                                         <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                       </div>
                                                    </CollapsibleTrigger>
                                                </div>
                                            </div>
                                        </div>
                                        <CollapsibleContent>
                                            <div className="p-3 pt-0">
                                                <div className="mt-2 pt-2 border-t space-y-2">
                                                    {member.contact && (
                                                        <div className="flex items-start gap-2 text-base p-2">
                                                            <Phone className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                                                            <div>
                                                                <span className="font-semibold">Contato: </span>
                                                                <a href={`tel:${member.contact.replace(/\D/g, '')}`} className="text-muted-foreground hover:underline">{member.contact}</a>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {member.hasDietaryRestriction && (
                                                        <div className="flex items-start gap-2 text-base p-2">
                                                            <Utensils className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                                                            <div>
                                                                <span className="font-semibold">Restrição Alimentar: </span>
                                                                <span className="text-muted-foreground">{member.dietaryRestriction || 'Não especificada'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {member.extraNotes && (
                                                        <div className="flex items-start gap-2 text-base p-2">
                                                            <Info className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                                                            <div>
                                                                <span className="font-semibold">Observação: </span>
                                                                <span className="text-muted-foreground">{member.extraNotes}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro da equipe cadastrado.</p>
                            )}
                        </div>
                    </AccordionContent>
                </Card>
            </AccordionItem>
        </Accordion>
    );
}
