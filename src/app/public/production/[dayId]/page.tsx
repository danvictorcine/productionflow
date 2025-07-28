
// @/src/app/public/production/[dayId]/page.tsx

import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';

import * as firestoreApi from '@/lib/firebase/firestore';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion } from '@/components/ui/accordion';
import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';


type PageProps = {
  params: { dayId: string };
};

type ProductionInfo = {
  name: string;
  type: string;
  director: string;
  responsibleProducer?: string;
  producer?: string;
  client?: string;
}

const ProductionInfoCard = ({ production }: { production: ProductionInfo }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>{production.name}</CardTitle>
      <CardDescription>{production.type}</CardDescription>
    </CardHeader>
    <CardContent className="text-sm space-y-1">
      <p><span className="font-semibold">Diretor(a):</span> {production.director}</p>
      {production.responsibleProducer && <p><span className="font-semibold">Produtor(a) Responsável:</span> {production.responsibleProducer}</p>}
      {production.producer && <p><span className="font-semibold">Produtora:</span> {production.producer}</p>}
      {production.client && <p><span className="font-semibold">Cliente:</span> {production.client}</p>}
    </CardContent>
  </Card>
);

export async function generateMetadata({ params }: PageProps, parent: ResolvingMetadata): Promise<Metadata> {
  const dayId = params.dayId;
  const dayData = await firestoreApi.getPublicShootingDay(dayId);

  if (!dayData) {
    return {
      title: 'Ordem do Dia não encontrada',
    };
  }

  const dateString = format(dayData.date, 'dd/MM/yyyy');
  const title = `Ordem do Dia: ${dayData.productionName} - ${dateString}`;

  return {
    title,
    description: `Veja os detalhes da filmagem para ${dayData.location} no dia ${dateString}.`,
    openGraph: {
      title,
      description: `Detalhes da Ordem do Dia para a produção '${dayData.productionName}'.`,
      images: ['/og-image.png'], // Add a default open graph image if you have one
    },
  };
}

export default async function PublicShootingDayPage({ params }: PageProps) {
  const data = await firestoreApi.getPublicShootingDay(params.dayId);

  if (!data) {
    notFound();
  }

  const productionData: Production = {
    id: data.productionId,
    name: data.productionName,
    type: data.productionType,
    director: data.director,
    responsibleProducer: data.responsibleProducer,
    producer: data.producer,
    client: data.client,
    createdAt: data.createdAt,
    userId: data.userId,
    team: [], // Team data is not on the public doc for privacy
  };

  const processedDay: ShootingDay & { equipment: ChecklistItem[], costumes: ChecklistItem[], props: ChecklistItem[], generalNotes: ChecklistItem[] } = {
    ...data,
    equipment: Array.isArray(data.equipment) ? data.equipment : [],
    costumes: Array.isArray(data.costumes) ? data.costumes : [],
    props: Array.isArray(data.props) ? data.props : [],
    generalNotes: Array.isArray(data.generalNotes) ? data.generalNotes : [],
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b bg-background/95 backdrop-blur-sm px-6">
            <Link href="/" className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Criado com</p>
                <div className="flex items-center gap-2">
                     <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                      <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                      <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                    </svg>
                    <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
                </div>
            </Link>
            <Button asChild>
                <Link href="/login">Acessar Plataforma</Link>
            </Button>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <ProductionInfoCard production={productionData} />
            <Accordion type="single" collapsible defaultValue={processedDay.id} className="w-full">
                <ShootingDayCard
                    day={processedDay}
                    production={productionData}
                    isFetchingWeather={false}
                    isExporting={false}
                    isPublicView={true}
                />
            </Accordion>
        </main>
        <AppFooter />
    </div>
  );
}
