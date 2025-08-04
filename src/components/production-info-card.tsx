// @/src/components/production-info-card.tsx
'use client';

import type { Production } from '@/lib/types';

export const ProductionInfoCard = ({ production }: { production: Production }) => (
    <div className="mb-6 p-4 border rounded-lg bg-card">
        <h2 className="text-2xl font-bold tracking-tight">{production.name}</h2>
        <p className="text-muted-foreground">{production.type}</p>
        <div className="text-base mt-2 space-y-1">
            <p><span className="font-semibold">Diretor(a):</span> {production.director}</p>
            {production.responsibleProducer && <p><span className="font-semibold">Produtor(a) Responsável:</span> {production.responsibleProducer}</p>}
            {production.producer && <p><span className="font-semibold">Produtora:</span> {production.producer}</p>}
            {production.client && <p><span className="font-semibold">Cliente:</span> {production.client}</p>}
        </div>
    </div>
);
