// @/src/app/public/day/[publicId]/page.tsx

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

import * as firestoreApi from '@/lib/firebase/firestore';
import type { ShootingDay, ChecklistItem } from '@/lib/types';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Clapperboard } from 'lucide-react';

type Props = {
  params: { publicId: string };
};

// This function generates metadata for the page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const day = await firestoreApi.getPublicShootingDay(params.publicId);
  const title = day ? `Ordem do Dia: ${format(day.date, "dd/MM/yyyy", { locale: ptBR })}` : 'Ordem do Dia não encontrada';
  const description = day ? `Ordem do Dia para a filmagem em ${day.location}.` : 'Visualize esta Ordem do Dia pública.';

  return {
    title: `${title} | ProductionFlow`,
    description,
  };
}

export default async function PublicShootingDayPage({ params }: Props) {
  const day = await firestoreApi.getPublicShootingDay(params.publicId);
  
  if (!day) {
    notFound();
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

  const processedDay = {
    ...day,
    equipment: convertNotesToItems(day.equipment),
    costumes: convertNotesToItems(day.costumes),
    props: convertNotesToItems(day.props),
    generalNotes: convertNotesToItems(day.generalNotes),
  };
  
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
          <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                  <Clapperboard className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-primary truncate">Ordem do Dia</h1>
          </div>
           <div className="ml-auto">
                 <Button asChild>
                    <Link href="/login">Criado com ProductionFlow</Link>
                </Button>
            </div>
      </header>
       <main className="flex-1 p-4 sm:p-6 md:p-8">
         <Accordion type="single" collapsible defaultValue={day.id} className="w-full">
            <ShootingDayCard 
                key={day.id} 
                day={processedDay} 
                isFetchingWeather={false}
                onEdit={() => {}}
                onDelete={() => {}}
                onShare={() => {}}
                onExportExcel={() => {}}
                onExportPdf={() => {}}
                onUpdateNotes={() => {}}
                isExporting={false}
                isPublicView={true}
            />
         </Accordion>
       </main>
       <AppFooter />
    </div>
  );
}
