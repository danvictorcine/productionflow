// @/src/app/public/storyboard/[publicId]/page.tsx
import * as firestoreApi from '@/lib/firebase/firestore';
import { notFound } from 'next/navigation';
import { PublicPageView } from '@/components/public-page-view';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardTitle } from '@/components/ui/card';

export const revalidate = 60; // Revalidate data every 60 seconds

type Props = {
  params: { publicId: string };
};

export default async function PublicStoryboardPage({ params }: Props) {
  const data = await firestoreApi.getPublicStoryboard(params.publicId);

  if (!data) {
    return notFound();
  }

  const { storyboard, panels, creator } = data;

  return (
    <PublicPageView creator={creator}>
      <div className="w-full max-w-7xl mx-auto">
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
                        {panel.notes && (
                            <p className="text-sm text-muted-foreground p-1 whitespace-pre-wrap">{panel.notes}</p>
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-16 text-muted-foreground">
                <p>Este storyboard ainda não possui quadros.</p>
            </div>
        )}
      </div>
    </PublicPageView>
  );
}
