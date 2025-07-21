
// @/src/app/public/day/[publicId]/page.tsx

import { notFound } from 'next/navigation';
import { AppFooter } from '@/components/app-footer';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { getPublicShootingDay } from '@/lib/firebase/firestore';
import type { ShootingDay, ChecklistItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

export default async function PublicDayPage({ params }: { params: { publicId: string }}) {
    const dayData = await getPublicShootingDay(params.publicId);

    if (!dayData) {
        notFound();
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

    const processedDay: ProcessedShootingDay = {
        ...dayData,
        equipment: convertNotesToItems(dayData.equipment),
        costumes: convertNotesToItems(dayData.costumes),
        props: convertNotesToItems(dayData.props),
        generalNotes: convertNotesToItems(dayData.generalNotes),
    };

    return (
        <div className="flex flex-col min-h-screen w-full bg-background">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <div className="flex items-center gap-2">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                        <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                        <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                    </svg>
                    <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
                </div>
                 <div className="ml-auto flex items-center gap-4">
                   <p className="text-sm text-muted-foreground">Página Pública</p>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                <ShootingDayCard
                    day={processedDay}
                    isFetchingWeather={false}
                    isExporting={false}
                    isPublicView={true}
                    // As funções interativas são intencionalmente omitidas
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onShare={() => {}}
                    onExportExcel={() => {}}
                    onExportPdf={() => {}}
                    onUpdateNotes={() => {}}
                />
                 <div className="mt-8 text-center text-sm text-muted-foreground">
                    <p>Gerencie suas produções audiovisuais com facilidade.</p>
                    <Link href="/login" className="text-primary hover:underline">Acesse o ProductionFlow</Link>
                </div>
            </main>
            <AppFooter />
        </div>
    );
}
