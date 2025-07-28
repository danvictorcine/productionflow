// @/src/app/public/production/[dayId]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';

import * as firestoreApi from '@/lib/firebase/firestore';
import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import { AppFooter } from '@/components/app-footer';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Accordion } from '@/components/ui/accordion';

type ProcessedPublicDay = ShootingDay & {
  productionName: string;
  productionType: string;
  director: string;
  responsibleProducer?: string;
  client?: string;
  producer?: string;
  equipment: ChecklistItem[];
  costumes: ChecklistItem[];
  props: ChecklistItem[];
  generalNotes: ChecklistItem[];
};

type Props = {
  params: { dayId: string };
};

// Function to generate metadata dynamically based on the day's data
export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const dayId = params.dayId;
  const dayData = await firestoreApi.getPublicShootingDay(dayId);

  if (!dayData) {
    return {
      title: 'Ordem do Dia não encontrada',
    };
  }

  return {
    title: `Ordem do Dia: ${dayData.productionName}`,
    description: `Detalhes da produção para ${dayData.productionName} no dia ${new Date(dayData.date).toLocaleDateString('pt-BR')}.`,
  };
}


const ProductionInfoCard = ({ production }: { production: Partial<Production> }) => (
    <div className="mb-6 p-4 border rounded-lg bg-card">
    <h2 className="text-2xl font-bold tracking-tight">{production.name}</h2>
    <p className="text-muted-foreground">{production.type}</p>
    <div className="text-base mt-2 space-y-1">
        {production.director && <p><span className="font-semibold">Diretor(a):</span> {production.director}</p>}
        {production.responsibleProducer && <p><span className="font-semibold">Produtor(a) Responsável:</span> {production.responsibleProducer}</p>}
        {production.producer && <p><span className="font-semibold">Produtora:</span> {production.producer}</p>}
        {production.client && <p><span className="font-semibold">Cliente:</span> {production.client}</p>}
    </div>
    </div>
);


export default async function PublicProductionPage({ params }: Props) {
  const dayId = params.dayId;
  const dayData = await firestoreApi.getPublicShootingDay(dayId);

  if (!dayData) {
    notFound();
  }
  
  // Safely process checklists, ensuring they are always arrays
  const processedDay: ProcessedPublicDay = {
    ...dayData,
    equipment: Array.isArray(dayData.equipment) ? dayData.equipment : [],
    costumes: Array.isArray(dayData.costumes) ? dayData.costumes : [],
    props: Array.isArray(dayData.props) ? dayData.props : [],
    generalNotes: Array.isArray(dayData.generalNotes) ? dayData.generalNotes : [],
  };

  const productionInfo = {
    name: processedDay.productionName,
    type: processedDay.productionType,
    director: processedDay.director,
    responsibleProducer: processedDay.responsibleProducer,
    client: processedDay.client,
    producer: processedDay.producer,
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <ProductionInfoCard production={productionInfo} />
        <Accordion type="single" collapsible defaultValue={dayId} className="w-full">
            <ShootingDayCard
                day={processedDay}
                production={productionInfo as Production}
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
