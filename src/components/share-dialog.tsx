

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

interface ShareDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    item: { id: string; name: string; isPublic?: boolean; publicId?: string };
    itemType: 'day' | 'storyboard';
    onStateChange: (isPublic: boolean, publicId: string) => Promise<void>;
}

export function ShareDialog({ isOpen, setIsOpen, item, itemType, onStateChange }: ShareDialogProps) {
    const [isPublic, setIsPublic] = useState(item.isPublic || false);
    // Maintain a stable publicId throughout the dialog's lifecycle
    const [publicId, setPublicId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const { toast } = useToast();

    const itemTypeName = itemType === 'day' ? 'Ordem do Dia' : 'Storyboard';
    
    useEffect(() => {
        if (isOpen) {
            setIsPublic(item.isPublic || false);
            // Ensure we have a stable publicId for the session
            setPublicId(item.publicId || crypto.randomUUID());
            setIsSaving(false);
            setHasCopied(false);
        }
    }, [isOpen, item]);
    
    const publicUrl = isPublic && publicId
        ? `${window.location.origin}/public/${itemType}/${publicId}`
        : '';
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onStateChange(isPublic, publicId);
            toast({
                title: "Configuração Salva!",
                description: `O compartilhamento da ${itemTypeName.toLowerCase()} foi atualizado.`,
            });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update sharing state:", error);
            toast({
                variant: 'destructive',
                title: "Erro ao Salvar",
                description: `Não foi possível atualizar o estado de compartilhamento.`
            });
        } finally {
            setIsSaving(false);
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
                        Gere um link público para compartilhar uma versão de leitura da sua {itemTypeName.toLowerCase()}.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 py-4">
                    <Switch
                        id="public-switch"
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                        disabled={isSaving}
                    />
                    <Label htmlFor="public-switch" className="flex items-center">
                      Tornar público
                    </Label>
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
                    <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
