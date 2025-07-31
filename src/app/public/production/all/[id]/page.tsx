
// @/src/app/public/production/all/[id]/page.tsx

import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Users, Info, Phone, Utensils } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

async function fetchProductionData(productionId: string) {
  const data = await firestoreApi.getPublicProduction(productionId);
  if (!data) {
    return null;
  }
  
  const convertNotesToItems = (notes: string | ChecklistItem[] | undefined): ChecklistItem[] => {
      if (Array.isArray(notes)) {
          return notes.map(item => ({...item, id: item.id || crypto.randomUUID()}));
      }
      if (typeof notes === 'string' && notes.trim()) {
          return notes.split('\n').filter(Boolean).map(line => ({
              id: crypto.randomUUID(),
              text: line.trim(),
              checked: false
          }));
      }
      return [];
  };

  const processedDays = data.days.map(day => ({
    ...day,
    equipment: convertNotesToItems(day.equipment),
    costumes: convertNotesToItems(day.costumes),
    props: convertNotesToItems(day.props),
    generalNotes: convertNotesToItems(day.generalNotes),
  }));

  return { ...data, days: processedDays };
}

export default async function PublicProductionPage({ params }: { params: { id: string } }) {
  const productionData = await fetchProductionData(params.id);

  if (!productionData) {
    notFound();
  }

  const { id, name, type, director, responsibleProducer, client, producer, team, days } = productionData;

  const ProductionInfoCard = ({ production }: { production: Omit<Production, 'days'> }) => (
    <div className="mb-6 p-4 border rounded-lg bg-card">
    <h2 className="text-2xl font-bold tracking-tight">{production.name}</h2>
    <p className="text-muted-foreground">{production.type}</p>
    <div className="text-base mt-2 space-y-1">
        <p><span className="font-semibold">Diretor(a):</span> {production.director}</p>
        {production.responsibleProducer && <p><span className="font-semibold">Produtor(a) Responsável:</span> {production.responsibleProducer}</p>}
        {production.producer && <p><span className="font-semibold">Produtora:</span> {production.producer}</p>}
        {production.client && <p><span className="font-semibold">Cliente:</span> {production.client}</p>}
    </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
         <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Criado com:</span>
            <div className="flex items-center gap-1.5">
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
                    <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                    <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                </svg>
                <p className="text-base font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
            </div>
         </div>
         <div className="ml-auto flex items-center gap-4">
             <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">Visualização Pública</h1>
                <Button asChild>
                    <Link href="/login">Acesse a Plataforma</Link>
                </Button>
            </div>
         </div>
      </header>
       <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ProductionInfoCard production={{ id, name, type, director, responsibleProducer, client, producer, team, createdAt: productionData.createdAt }} />
        
        <div className="space-y-4">
           <Accordion 
                type="multiple"
                className="w-full space-y-4"
            >
                <AccordionItem value="team" className="border-none">
                    <Card>
                         <AccordionTrigger className="w-full hover:no-underline p-0 [&>svg]:mr-6">
                            <CardHeader className="flex-1">
                                <CardTitle className="flex items-center text-left">
                                    <Users className="h-6 w-6 mr-3 text-primary" />
                                    Equipe e Elenco
                                </CardTitle>
                                <CardDescription className="text-left">
                                    Informações detalhadas sobre todos os envolvidos na produção.
                                </CardDescription>
                            </CardHeader>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <div className="space-y-4">
                            {(team && team.length > 0) ? (
                                team.map(member => (
                                    <div key={member.id} className="p-3 rounded-md border bg-muted/50">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-base">{member.name}</p>
                                                <p className="text-base text-muted-foreground">{member.role}</p>
                                            </div>
                                        </div>
                                        {member.contact && (
                                            <div className="mt-2 flex items-start gap-2 text-base p-2 bg-background rounded">
                                                <Phone className="h-4 w-4 mt-1 text-sky-600 flex-shrink-0" />
                                                <div>
                                                    <span className="font-semibold">Contato: </span>
                                                    <a href={`tel:${member.contact.replace(/\D/g, '')}`} className="text-muted-foreground hover:underline">{member.contact}</a>
                                                </div>
                                            </div>
                                        )}
                                        {member.hasDietaryRestriction && (
                                            <div className="mt-2 flex items-start gap-2 text-base p-2 bg-background rounded">
                                                <Utensils className="h-4 w-4 mt-1 text-amber-600 flex-shrink-0" />
                                                <div>
                                                    <span className="font-semibold">Restrição Alimentar: </span>
                                                    <span className="text-muted-foreground">{member.dietaryRestriction || 'Não especificada'}</span>
                                                </div>
                                            </div>
                                        )}
                                        {member.extraNotes && (
                                            <div className="mt-2 flex items-start gap-2 text-base p-2 bg-background rounded">
                                                <Info className="h-4 w-4 mt-1 text-blue-600 flex-shrink-0" />
                                                <div>
                                                    <span className="font-semibold">Observação: </span>
                                                    <span className="text-muted-foreground">{member.extraNotes}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro da equipe cadastrado.</p>
                            )}
                            </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            </Accordion>
          <Accordion 
                type="multiple"
                className="w-full space-y-4"
                defaultValue={days.length > 0 ? [days[0].id] : []}
            >
            {days.map((day) => (
              <ShootingDayCard
                key={day.id}
                day={day}
                production={productionData}
                isFetchingWeather={false}
                isPublicView={true}
                isExporting={false}
              />
            ))}
          </Accordion>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
