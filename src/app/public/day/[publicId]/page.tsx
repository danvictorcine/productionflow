// @/src/app/public/day/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import { getPublicShootingDay } from '@/lib/firebase/firestore';
import { PublicPageView } from '@/components/public-page-view';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Accordion } from '@/components/ui/accordion';

type PublicDayPageProps = {
  params: {
    publicId: string;
  };
};

export default async function PublicDayPage({ params }: PublicDayPageProps) {
  const result = await getPublicShootingDay(params.publicId);
  
  if (!result) {
    notFound();
  }
  
  const { day, creator } = result;

  return (
    <PublicPageView creator={creator}>
      <Accordion type="single" collapsible defaultValue={day.id}>
        <ShootingDayCard day={day} isFetchingWeather={false} isExporting={false} isPublicView={true} />
      </Accordion>
    </PublicPageView>
  );
}
