// @/src/app/public/day/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import * as firestoreApi from '@/lib/firebase/firestore';
import { AppFooter } from '@/components/app-footer';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { type ChecklistItem, type ShootingDay } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// Helper function to convert string-based notes to ChecklistItem array
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

const getProcessedDay = async (publicId: string): Promise<(Omit<ShootingDay, 'equipment'|'costumes'|'props'|'generalNotes'> & { equipment: ChecklistItem[], costumes: ChecklistItem[], props: ChecklistItem[], generalNotes: ChecklistItem[]}) | null> => {
    const day = await firestoreApi.getPublicShootingDay(publicId);
    if (!day) return null;

    return {
        ...day,
        equipment: convertNotesToItems(day.equipment),
        costumes: convertNotesToItems(day.costumes),
        props: convertNotesToItems(day.props),
        generalNotes: convertNotesToItems(day.generalNotes),
    };
};

export default async function PublicShootingDayPage({ params }: { params: { publicId: string } }) {
    const day = await getProcessedDay(params.publicId);

    if (!day) {
        notFound();
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <div className="flex items-center gap-2">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
                        <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))" />
                        <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))" />
                    </svg>
                     <Link href="/">
                        <h1 className="text-2xl font-bold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</h1>
                    </Link>
                </div>
                 <Badge variant="outline" className="ml-2">Visualização Pública</Badge>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                <ShootingDayCard
                    day={day}
                    isFetchingWeather={false} // No real-time weather fetching on public page
                    isExporting={false}
                    isPublicView={true}
                />
            </main>
            <AppFooter />
        </div>
    );
}

// Add a revalidation period if desired
export const revalidate = 60; // Re-generate the page every 60 seconds
