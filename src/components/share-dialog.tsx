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
import { Copy, Check } from 'lucide-react';

interface ShareDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    item: { id: string; name: string; isPublic?: boolean; publicId?: string };
    itemType: 'day' | 'storyboard';
    onStateChange: (isPublic: boolean, publicId?: string) => void;
}

export function ShareDialog({ isOpen, setIsOpen, item, itemType, onStateChange }: ShareDialogProps) {
    const [isPublic, setIsPublic] = useState(item.isPublic || false);
    const [hasCopied, setHasCopied] = useState(false);

    const itemTypeName = itemType === 'day' ? 'Ordem do Dia' : 'Storyboard';
    const publicUrl = isPublic && item.publicId
        ? `${window.location.origin}/public/${itemType}/${item.publicId}`
        : '';
    
    useEffect(() => {
        setIsPublic(item.isPublic || false);
    }, [item.isPublic]);

    const handleSwitchChange = (checked: boolean) => {
        setIsPublic(checked);
        onStateChange(checked, item.publicId);
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
                        onCheckedChange={handleSwitchChange}
                    />
                    <Label htmlFor="public-switch">Tornar público</Label>
                </div>

                {isPublic && (
                    <div className="space-y-2">
                        <Label htmlFor="public-link">Link Público</Label>
                        <div className="flex items-center space-x-2">
                            <Input id="public-link" value={publicUrl} readOnly />
                            <Button type="button" size="icon" onClick={handleCopyToClipboard}>
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