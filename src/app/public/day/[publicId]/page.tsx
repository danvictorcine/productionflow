// @/src/app/public/day/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import * as firestoreApi from '@/lib/firebase/firestore';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Accordion } from '@/components/ui/accordion';
import { PublicPageHeader } from '@/components/public-page-header';

type Props = {
  params: { publicId: string }
}

// Revalidate this page every 60 seconds
export const revalidate = 60;

export default async function PublicShootingDayPage({ params }: Props) {
  const { publicId } = params;
  if (!publicId) {
    notFound();
  }
  
  const data = await firestoreApi.getPublicShootingDay(publicId);
  
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-2xl font-bold">Erro de Acesso</h1>
        <p className="mt-2 text-muted-foreground">Ocorreu um erro ao carregar os dados. Verifique o link e tente novamente.</p>
      </div>
    );
  }
  
  const { day, creator } = data;
  
  return (
    <div className="min-h-screen bg-muted/40">
        <PublicPageHeader creator={creator}/>
        <main className="p-4 sm:p-6 md:p-8">
             <Accordion type="single" collapsible defaultValue={day.id} className="w-full">
                <ShootingDayCard day={day} isFetchingWeather={false} isExporting={false} isPublicView={true} />
            </Accordion>
        </main>
    </div>
  );
}
