// @/src/app/public/day/[publicId]/page.tsx
import * as firestoreApi from '@/lib/firebase/firestore';
import { notFound } from 'next/navigation';
import { PublicPageView } from '@/components/public-page-view';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Accordion } from '@/components/ui/accordion';

export const revalidate = 60; // Revalidate data every 60 seconds

type Props = {
  params: { publicId: string };
};

export default async function PublicDayPage({ params }: Props) {
  const data = await firestoreApi.getPublicShootingDay(params.publicId);

  if (!data) {
    return notFound();
  }

  const { day, creator } = data;

  return (
    <PublicPageView creator={creator}>
        <div className="w-full max-w-5xl mx-auto">
            <Accordion type="single" collapsible defaultValue={day.id}>
                <ShootingDayCard day={day} isFetchingWeather={false} isExporting={false} isPublicView={true} />
            </Accordion>
        </div>
    </PublicPageView>
  );
}
