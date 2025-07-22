
// @/src/app/public/day/[publicId]/page.tsx
import { getPublicShootingDay } from '@/lib/firebase/firestore';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { PublicPageView } from '@/components/public-page-view';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion } from '@/components/ui/accordion';

export default async function PublicShootingDayPage({ params }: { params: { publicId: string } }) {
  const day = await getPublicShootingDay(params.publicId);

  return (
    <PublicPageView>
      {day ? (
         <Accordion type="single" collapsible defaultValue={day.id} className="w-full">
            <ShootingDayCard day={day} isFetchingWeather={false} isExporting={false} isPublicView={true} />
        </Accordion>
      ) : (
        <div className="flex items-center justify-center h-full">
            <Alert variant="destructive" className="max-w-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro de Acesso</AlertTitle>
              <AlertDescription>
                Ocorreu um erro ao carregar os dados. Este link pode ser inválido, privado ou ter sido excluído. Verifique o link e tente novamente.
              </AlertDescription>
            </Alert>
        </div>
      )}
    </PublicPageView>
  );
}
