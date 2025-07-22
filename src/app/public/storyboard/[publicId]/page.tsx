// @/src/app/public/storyboard/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import * as firestoreApi from '@/lib/firebase/firestore';
import { PublicPageHeader } from '@/components/public-page-header';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  params: { publicId: string }
}

// Revalidate this page every 60 seconds
export const revalidate = 60;

export default async function PublicStoryboardPage({ params }: Props) {
  const { publicId } = params;
  if (!publicId) {
    notFound();
  }

  const data = await firestoreApi.getPublicStoryboard(publicId);

  if (!data) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-2xl font-bold">Erro de Acesso</h1>
        <p className="mt-2 text-muted-foreground">Ocorreu um erro ao carregar os dados. Verifique o link e tente novamente.</p>
      </div>
    );
  }
  
  const { storyboard, panels, creator } = data;

  return (
    <div className="min-h-screen bg-muted/40">
      <PublicPageHeader creator={creator} />
      <main className="p-4 sm:p-6 md:p-8">
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
                        {panel.notes && <p className="text-sm text-foreground p-1 whitespace-pre-wrap">{panel.notes}</p>}
                    </div>
                ))}
            </div>
        ) : (
             <div className="text-center py-20 text-muted-foreground">
                Este storyboard ainda não tem quadros.
            </div>
        )}
      </main>
    </div>
  );
}
