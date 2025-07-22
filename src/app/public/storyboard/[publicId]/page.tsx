// @/src/app/public/storyboard/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import * as firestoreApi from '@/lib/firebase/firestore';
import { AppFooter } from '@/components/app-footer';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PublicStoryboardPageProps {
  params: {
    publicId: string;
  };
}

export default async function PublicStoryboardPage({ params }: PublicStoryboardPageProps) {
  const storyboard = await firestoreApi.getPublicStoryboard(params.publicId);

  if (!storyboard) {
    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <main className="flex-1 flex items-center justify-center p-8">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro de Acesso</AlertTitle>
                    <AlertDescription>
                       Ocorreu um erro ao carregar os dados. Este link pode ser inválido, privado ou ter sido excluído. Verifique o link e tente novamente.
                       <Button asChild variant="secondary" className="mt-4 w-full">
                         <Link href="/login">Voltar ao Login</Link>
                       </Button>
                    </AlertDescription>
                </Alert>
            </main>
            <AppFooter />
        </div>
    );
  }

  const panels = await firestoreApi.getStoryboardPanels(storyboard.id);

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mb-6">
          <Card>
            <CardContent className="p-4 space-y-1">
              <CardTitle>{storyboard.name}</CardTitle>
              {storyboard.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {storyboard.description}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        {panels.length > 0 ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {panels.map((panel, index) => (
              <div
                key={panel.id}
                className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm break-inside-avoid"
              >
                <div
                  className={`relative w-full rounded-md overflow-hidden bg-muted ${
                    storyboard.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[4/3]'
                  }`}
                >
                  <Image src={panel.imageUrl} alt={`Storyboard panel ${index + 1}`} layout="fill" objectFit="cover" />
                  <div className="absolute top-1 left-1 bg-black/50 text-white text-xs font-bold px-1.5 py-0.5 rounded-sm pointer-events-none">
                    {index + 1}
                  </div>
                </div>
                {panel.notes && (
                    <div className="text-sm text-muted-foreground p-2 border-t mt-2 whitespace-pre-wrap">{panel.notes}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Este storyboard ainda não possui quadros.</p>
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}