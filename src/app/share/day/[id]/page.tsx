
// @/src/app/share/day/[id]/page.tsx
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
import { ProductionFlowIcon } from '@/components/production-flow-icon';

export default function PublicShootingDayPage() {
  const params = useParams();
  const dayId = params.id as string;
  const [production, setProduction] = useState<Production | null>(null);
  const [day, setDay] = useState<ShootingDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (dayId) {
      firestoreApi.getPublicShootingDay(dayId)
        .then(data => {
          if (data) {
            setProduction(data.production);
            setDay(data.day);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [dayId]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      );
    }

    if (!day || !production) {
      return (
        <div className="text-center py-24">
          <Clapperboard className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-2xl font-semibold">Ordem do Dia não encontrada</h2>
          <p className="text-muted-foreground mt-2">O link pode estar quebrado ou a ordem do dia pode ter sido removida.</p>
        </div>
      );
    }
    
    return (
        <div className="space-y-6">
            <ProductionInfoCard production={production} />
            <Accordion type="single" collapsible defaultValue={day.id} className="w-full">
                <ShootingDayCard day={day} production={production} isExporting={false} isPublicView={true} />
            </Accordion>
        </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <div className="flex items-center gap-2">
          <ProductionFlowIcon className="h-7 w-7" />
          <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
          <Badge variant="outline" className="px-2 py-0.5 text-[0.6rem] font-normal">BETA</Badge>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {renderContent()}
      </main>
      <AppFooter />
    </div>
  );
}
