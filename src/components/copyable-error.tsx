'use client';
import { Badge } from "./ui/badge";

export function CopyableError({ userMessage, errorCode }: { userMessage: string; errorCode?: string }) {
    if (!errorCode) {
        return <p>{userMessage}</p>;
    }

    return (
        <div>
            <p>{userMessage}</p>
            <div className="mt-2">
                <Badge variant="outline">Código do Erro</Badge>
                <div className="mt-1 select-all rounded-md bg-muted p-2 font-mono text-xs text-muted-foreground">
                    {errorCode}
                </div>
            </div>
        </div>
    );
}
