// @/src/app/public/day/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { ChecklistItem } from '@/lib/types';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { AppFooter } from '@/components/app-footer';
import { Badge } from '@/components/ui/badge';
import { Accordion } from '@/components/ui/accordion';


export default async function PublicShootingDayPage({ params }: { params: { publicId: string } }) {
    const day = await firestoreApi.getPublicShootingDay(params.publicId);

    if (!day) {
        return notFound();
    }
    
    // Process notes from string to ChecklistItem[] for backward compatibility
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

    const processedDay = {
      ...day,
      equipment: convertNotesToItems(day.equipment),
      costumes: convertNotesToItems(day.costumes),
      props: convertNotesToItems(day.props),
      generalNotes: convertNotesToItems(day.generalNotes),
    };


    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <div className="flex items-center gap-2">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                    <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                    <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                    </svg>
                    <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
                </div>
                 <div className="ml-auto">
                    <Badge variant="secondary">Página Pública</Badge>
                </div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 <Accordion type="single" collapsible defaultValue={day.id}>
                    <ShootingDayCard 
                        day={processedDay} 
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
