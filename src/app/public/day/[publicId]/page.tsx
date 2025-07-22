// @/src/app/public/day/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import * as firestoreApi from '@/lib/firebase/firestore';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { AppFooter } from '@/components/app-footer';
import { Accordion } from '@/components/ui/accordion';
import { PublicPageHeader } from '@/components/public-page-header';

interface PublicDayPageProps {
  params: {
    publicId: string;
  };
}

export default async function PublicDayPage({ params }: PublicDayPageProps) {
  const day = await firestoreApi.getPublicShootingDay(params.publicId);

  if (!day) {
    return notFound();
  }

  // Create a mock creator profile from the data stored on the day document
  const creatorProfile = {
      uid: day.userId,
      name: day.creatorName || 'Criador Anônimo',
      email: '', // Not needed for public view
      photoURL: day.creatorPhotoURL || '',
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <PublicPageHeader creator={creatorProfile} />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
            <Accordion type="single" collapsible defaultValue={day.id} className="w-full">
                <ShootingDayCard
                    day={day}
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
