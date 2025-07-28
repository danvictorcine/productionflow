
// @/src/app/public/production/[dayId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CopyableError } from '@/components/copyable-error';
import { Accordion } from '@/components/ui/accordion';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Clapperboard, Loader2 } from 'lucide-react';

const ProductionInfoCard = ({ production }: { production: Production }) => (
    <div className="mb-6 p-4 border rounded-lg bg-card shadow-sm">
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

type ProcessedPublicShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};


export default function PublicProductionPage() {
  const params = useParams();
  const dayId = params.id as string;
  const { toast } = useToast();
  
  const [dayData, setDayData] = useState<ProcessedPublicShootingDay | null>(null);
  const [productionData, setProductionData] = useState<Production | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPublicDay = async () => {
      if (!dayId) return;
      setIsLoading(true);
      try {
        const data = await firestoreApi.getPublicShootingDay(dayId);
        
        if (data) {
          const { id, userId, createdAt, productionName, productionType, director, responsibleProducer, producer, client, ...dayDetails } = data;

          const productionInfo: Production = {
            id: '', // Not relevant for public view
            userId: '', // Not relevant for public view
            name: productionName || '',
            type: productionType || '',
            director: director || '',
            responsibleProducer: responsibleProducer || '',
            producer: producer || '',
            client: client || '',
            team: [], // Not exposed publicly
            createdAt: new Date(), // Not relevant for public view
          };

          const processedDay: ProcessedPublicShootingDay = {
            ...(dayDetails as Omit<ShootingDay, 'id'|'productionId'|'userId'>), // Cast to ensure base properties are there
            id: data.id,
            productionId: '', // Not needed for public view
            userId: '', // Not needed for public view
            equipment: Array.isArray(dayDetails.equipment) ? dayDetails.equipment : [],
            costumes: Array.isArray(dayDetails.costumes) ? dayDetails.costumes : [],
            props: Array.isArray(dayDetails.props) ? dayDetails.props : [],
            generalNotes: Array.isArray(dayDetails.generalNotes) ? dayDetails.generalNotes : [],
          };
          
          setDayData(processedDay);
          setProductionData(productionInfo);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        const errorTyped = error as { code?: string; message: string };
        toast({
            variant: 'destructive',
            title: 'Erro ao Carregar Página',
            description: <CopyableError userMessage="Não foi possível carregar os dados desta Ordem do Dia." errorCode={errorTyped.code || errorTyped.message} />,
        });
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicDay();
  }, [dayId, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
             <div className="flex items-center justify-center gap-3">
                <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" style={{color: "hsl(var(--brand-login, var(--primary)))"}}>
                    <rect width="32" height="32" rx="6" fill="currentColor"/>
                    <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))" style={{opacity: 0.8}}/>
                </svg>
                <h1 className="text-3xl font-bold tracking-tighter" style={{color: "hsl(var(--brand-login, var(--primary)))"}}>ProductionFlow</h1>
             </div>
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <Clapperboard className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold">Página Não Encontrada</h1>
        <p className="text-lg text-muted-foreground mt-2">
          O link para esta Ordem do Dia pode estar incorreto, ou ela pode não estar mais disponível para compartilhamento.
        </p>
      </div>
    );
  }

  if (!dayData || !productionData) {
    return null; // Should be covered by loading/not found states
  }

  return (
    <div className="min-h-screen w-full bg-background p-4 sm:p-6 md:p-8">
      <main className="max-w-4xl mx-auto">
        <ProductionInfoCard production={productionData} />
        <Accordion type="single" collapsible defaultValue={dayData.id} className="w-full">
            <ShootingDayCard
                day={dayData}
                production={productionData}
                isFetchingWeather={false}
                isPublicView={true}
                isExporting={false}
            />
        </Accordion>
        <div className="mt-8 text-center text-sm text-muted-foreground">
            Criado com <span className="font-semibold text-foreground">ProductionFlow</span>
        </div>
      </main>
    </div>
  );
}

