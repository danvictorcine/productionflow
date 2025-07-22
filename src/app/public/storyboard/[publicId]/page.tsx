// @/src/app/public/storyboard/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AppFooter } from '@/components/app-footer';


interface PublicStoryboardPageProps {
  params: {
    publicId: string;
  };
}

// Re-added this component as it's needed for the structure
const PublicPageView = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col min-h-screen bg-muted/40">
      {/* A simple header can be placed here if desired */}
      <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
      <AppFooter />
    </div>
);

export default async function PublicStoryboardPage({ params }: PublicStoryboardPageProps) {
  const data = await firestoreApi.getPublicStoryboard(params.publicId);

  if (!data) {
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
  
  const { storyboard, panels } = data;

  return (
    <PublicPageView>
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

      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        {panels.map((panel, index) => (
          <div key={panel.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm break-inside-avoid">
            <div
              className={cn(
                "relative w-full rounded-md overflow-hidden bg-muted",
                storyboard.aspectRatio === '16:9' ? "aspect-video" : "aspect-[4/3]"
              )}
            >
              <Image src={panel.imageUrl} alt={`Storyboard panel ${index + 1}`} layout="fill" objectFit="cover" />
              <div className="absolute top-1 left-1 bg-black/50 text-white text-xs font-bold px-1.5 py-0.5 rounded-sm pointer-events-none">
                {index + 1}
              </div>
            </div>
            {panel.notes && (
                <div className="p-2 text-sm bg-muted rounded-md whitespace-pre-wrap">{panel.notes}</div>
            )}
          </div>
        ))}
      </div>
    </PublicPageView>
  );
}
