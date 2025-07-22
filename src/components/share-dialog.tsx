// src/components/share-dialog.tsx
"use client";

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Copy, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from './copyable-error';

interface ShareDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    item: { id: string; name: string; isPublic?: boolean; publicId?: string };
    itemType: 'day' | 'storyboard';
    onStateChange: (isPublic: boolean, publicId: string) => Promise<void>;
}

export function ShareDialog({ isOpen, setIsOpen, item, itemType, onStateChange }: ShareDialogProps) {
    const [isPublic, setIsPublic] = useState(item.isPublic || false);
    const [publicId, setPublicId] = useState(item.publicId || '');
    const [isLoading, setIsLoading] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const { toast } = useToast();

    const itemTypeName = itemType === 'day' ? 'Ordem do Dia' : 'Storyboard';
    
    useEffect(() => {
        if (isOpen) {
            const initialPublicState = item.isPublic || false;
            setIsPublic(initialPublicState);
            setPublicId(item.publicId || crypto.randomUUID());
            setIsLoading(false);
            setHasCopied(false);
        }
    }, [isOpen, item]);
    
    const publicUrl = isPublic && publicId
        ? `${window.location.origin}/public/${itemType}/${publicId}`
        : '';

    const handleSwitchChange = async (newPublicState: boolean) => {
        setIsLoading(true);
        try {
            await onStateChange(newPublicState, publicId);
            setIsPublic(newPublicState);
            
            toast({
                title: newPublicState ? "Link Público Ativado" : "Link Público Desativado",
                description: `O compartilhamento foi ${newPublicState ? 'habilitado' : 'desabilitado'}.`,
            });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            console.error("Failed to update sharing state:", error);
            toast({
                variant: 'destructive',
                title: "Erro ao Atualizar Compartilhamento",
                description: <CopyableError 
                                userMessage={`Não foi possível ${newPublicState ? 'ativar' : 'desativar'} o compartilhamento.`}
                                errorCode={`share-dialog.tsx: ${errorTyped.code || errorTyped.message}`} 
                             />
            });
            // Revert switch on error
            setIsPublic(!newPublicState);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = () => {
        if (!publicUrl) return;
        navigator.clipboard.writeText(publicUrl);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Compartilhar {itemTypeName}</DialogTitle>
                    <DialogDescription>
                        Gere um link público para compartilhar uma versão de leitura da sua {itemTypeName.toLowerCase()}. A alteração é salva automaticamente ao usar o interruptor.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-3 py-4">
                    <Switch
                        id="public-switch"
                        checked={isPublic}
                        onCheckedChange={handleSwitchChange}
                        disabled={isLoading}
                    />
                    <Label htmlFor="public-switch" className="flex items-center text-base">
                      Tornar público
                    </Label>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                {isPublic && (
                    <div className="space-y-2">
                        <Label htmlFor="public-link">Link Público</Label>
                        <div className="flex items-center space-x-2">
                            <Input id="public-link" value={publicUrl} readOnly placeholder="Gerando link..."/>
                            <Button type="button" size="icon" onClick={handleCopyToClipboard} disabled={!publicUrl}>
                                {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
