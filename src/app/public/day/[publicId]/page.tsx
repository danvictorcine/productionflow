// @/src/app/public/day/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { ShootingDay, ChecklistItem } from '@/lib/types';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { PublicPageView } from '@/components/public-page-view';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PublicShootingDayPageProps {
    params: {
        publicId: string;
    };
}

const convertNotesToItems = (notes: string | ChecklistItem[] | undefined): ChecklistItem[] => {
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


export default async function PublicShootingDayPage({ params }: PublicShootingDayPageProps) {
    const dayData = await firestoreApi.getPublicShootingDay(params.publicId);

    if (!dayData) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-muted/40">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro de Acesso</AlertTitle>
                    <AlertDescription>
                        Ocorreu um erro ao carregar os dados. Este link pode ser inválido, privado ou ter sido excluído.
                        Verifique o link e tente novamente.
                         <Button asChild variant="secondary" className="mt-4 w-full">
                            <Link href="/login">Voltar para ProductionFlow</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    const day = {
      ...dayData,
      equipment: convertNotesToItems(dayData.equipment),
      costumes: convertNotesToItems(dayData.costumes),
      props: convertNotesToItems(dayData.props),
      generalNotes: convertNotesToItems(dayData.generalNotes),
    };


    return (
        <PublicPageView>
            <div className="max-w-4xl mx-auto">
                <ShootingDayCard day={day} isFetchingWeather={false} isExporting={false} isPublicView={true} />
            </div>
        </PublicPageView>
    );
}