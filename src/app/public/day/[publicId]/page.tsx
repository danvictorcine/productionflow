// @/src/app/public/day/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { ShootingDay, UserProfile } from '@/lib/types';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { AppFooter } from '@/components/app-footer';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion } from '@/components/ui/accordion';

// Re-added this component as it's needed for the structure
const PublicPageView = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col min-h-screen bg-muted/40">
      {/* A simple header can be placed here if desired */}
      <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
      <AppFooter />
    </div>
);


interface PublicShootingDayPageProps {
  params: {
    publicId: string;
  };
}

// Helper to convert string-based checklists to the new format for old data
const processDay = (day: ShootingDay | null): (Omit<ShootingDay, 'equipment'|'costumes'|'props'|'generalNotes'> & { equipment: any[], costumes: any[], props: any[], generalNotes: any[]}) | null => {
  if (!day) return null;
  const convertNotesToItems = (notes: string | any[] | undefined) => {
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
  return {
    ...day,
    equipment: convertNotesToItems(day.equipment),
    costumes: convertNotesToItems(day.costumes),
    props: convertNotesToItems(day.props),
    generalNotes: convertNotesToItems(day.generalNotes),
  };
}

export default async function PublicShootingDayPage({ params }: PublicShootingDayPageProps) {
  const dayData = await firestoreApi.getPublicShootingDay(params.publicId);
  const day = processDay(dayData);

  if (!day) {
    return (
        <PublicPageView>
             <div className="max-w-2xl mx-auto">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro de Acesso</AlertTitle>
                    <AlertDescription>
                        Ocorreu um erro ao carregar os dados. Este link pode ser inválido, privado ou ter sido excluído. Verifique o link e tente novamente.
                    </AlertDescription>
                </Alert>
            </div>
        </PublicPageView>
    );
  }

  return (
    <PublicPageView>
        <Accordion type="single" collapsible defaultValue={day.id} className="w-full">
            <ShootingDayCard
                day={day}
                isFetchingWeather={false}
                isExporting={false}
                isPublicView={true}
            />
        </Accordion>
    </PublicPageView>
  );
}
