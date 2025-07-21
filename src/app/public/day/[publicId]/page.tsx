
// @/src/app/public/day/[publicId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { Production, ShootingDay } from '@/lib/types';
import { AppFooter } from '@/components/app-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AlertCircle, Clapperboard } from 'lucide-react';
import Link from 'next/link';

export default function PublicDayPage() {
    const params = useParams();
    const publicId = params.publicId as string;

    const [day, setDay] = useState<ShootingDay | null>(null);
    const [production, setProduction] = useState<Production | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (!publicId) {
            setError("ID da Ordem do Dia não fornecido.");
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const dayData = await firestoreApi.getPublicShootingDay(publicId);
                if (dayData) {
                    setDay(dayData);
                    const productionData = await firestoreApi.getProductionForPublicPage(dayData.productionId);
                    if (productionData) {
                        setProduction(productionData);
                    } else {
                        setError("Produção associada não encontrada.");
                    }
                } else {
                    setError("Ordem do Dia não encontrada ou não é pública.");
                }
            } catch (err) {
                const errorTyped = err as { code?: string; message: string };
                console.error("Error fetching public day:", err);
                setError(errorTyped.message || "Ocorreu um erro ao buscar os dados.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [publicId]);
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="p-8 space-y-6 w-full max-w-4xl">
                    <Skeleton className="h-[60px] w-full" />
                    <Skeleton className="h-[150px] w-full" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                           <AlertCircle className="h-6 w-6 text-destructive" />
                            Acesso Inválido
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{error}</p>
                        <Button asChild className="mt-6">
                            <Link href="/">Voltar à Página Inicial</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!day || !production) return null;

    return (
        <div className="bg-muted/40 min-h-screen">
            <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
                <Clapperboard className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold truncate">{production.name}</h1>
                 <div className="ml-auto flex items-center gap-2">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                        <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                        <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                    </svg>
                    <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
                </div>
            </header>
            <main className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
                {isClient && (
                    <ShootingDayCard 
                        day={day as any} 
                        isFetchingWeather={false}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        onShare={() => {}}
                        onExportExcel={() => {}}
                        onExportPdf={() => {}}
                        onUpdateNotes={() => {}}
                        isExporting={false}
                        isPublicView={true}
                    />
                )}
            </main>
            <AppFooter />
        </div>
    );
}
