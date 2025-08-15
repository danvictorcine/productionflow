// @/src/app/share/production/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Clapperboard, Loader2 } from 'lucide-react';

import * as firestoreApi from '@/lib/firebase/firestore';
import type { Production, ShootingDay } from '@/lib/types';
import { AppFooter } from '@/components/app-footer';
import { Badge } from '@/components/ui/badge';
import { Accordion } from '@/components/ui/accordion';
import { ProductionInfoCard } from '@/components/production-info-card';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicProductionPage() {
  const params = useParams();
  const productionId = params.id as string;
  const [production, setProduction] = useState<Production | null>(null);
  const [shootingDays, setShootingDays] = useState<ShootingDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productionId) {
      firestoreApi.getPublicProduction(productionId)
        .then(data => {
          if (data) {
            const { days, ...prodData } = data;
            setProduction(prodData);
            setShootingDays(days);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [productionId]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }

    if (!production) {
      return (
        <div className="text-center py-24">
          <Clapperboard className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-2xl font-semibold">Produção não encontrada</h2>
          <p className="text-muted-foreground mt-2">O link pode estar quebrado ou a produção pode ter sido removida.</p>
        </div>
      );
    }
    
    return (
        <div className="space-y-6">
            <ProductionInfoCard production={production} />
             <Accordion 
                type="multiple" 
                className="w-full space-y-4"
             >
                {shootingDays.length > 0 ? (
                    shootingDays.map(day => (
                        <ShootingDayCard 
                            key={day.id} 
                            day={day} 
                            production={production} 
                            isExporting={false}
                            isPublicView={true} 
                        />
                    ))
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <h3 className="text-lg font-semibold">Nenhuma Ordem do Dia</h3>
                        <p className="text-muted-foreground mt-1">Ainda não há Ordens do Dia publicadas para esta produção.</p>
                    </div>
                )}
            </Accordion>
        </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <div className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
            <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
            <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
          </svg>
          <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
          <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {renderContent()}
      </main>
      <AppFooter />
    </div>
  );
}
