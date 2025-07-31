
// @/src/app/public/production/all/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import type { Production, ShootingDay } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { ProductionInfoCard, PublicHeader } from '@/app/public/production/[dayId]/page';


function PublicAllDaysPageDetail() {
  const router = useRouter();
  const params = useParams();
  const productionId = params.id as string;
  
  const [production, setProduction] = useState<Production | null>(null);
  const [shootingDays, setShootingDays] = useState<ShootingDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!productionId) return;

    const fetchData = async () => {
      try {
        const data = await firestoreApi.getPublicProduction(productionId);
        if (data) {
          setProduction(data);
          setShootingDays(data.days);
        } else {
          setError("Produção não encontrada ou não é pública.");
        }
      } catch (err) {
        console.error(err);
        setError("Ocorreu um erro ao carregar os dados da produção.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [productionId]);


  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error) {
     return <div className="flex items-center justify-center min-h-screen"><CopyableError userMessage={error} errorCode="PUBLIC_FETCH_FAILED" /></div>;
  }
  
  if (!production) {
    return null;
  }

  const processedDays = shootingDays.map(day => ({
    ...day,
    equipment: [],
    costumes: [],
    props: [],
    generalNotes: [],
  }));


  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <PublicHeader title="Visualização Pública"/>
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <ProductionInfoCard production={production} />
        <div className="mt-6 space-y-4">
          {processedDays.map(day => (
            <ShootingDayCard
              key={day.id}
              day={day}
              production={production}
              isFetchingWeather={false}
              isExporting={false}
              isPublicView={true}
            />
          ))}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

export default function PublicAllDaysPage() {
    return <PublicAllDaysPageDetail />
}

