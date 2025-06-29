
"use client";

import { useState } from "react";
import * as XLSX from 'xlsx';
import { useForm } from "react-hook-form";
import { Download, Upload, FileX2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import type { Transaction, Project } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";

type ParsedTransaction = Omit<Transaction, "id" | "projectId" | "userId" | "type" | "status"> & {
    originalRow: number;
};
type ErrorRow = {
    row: number;
    message: string;
    data: any;
};

interface ImportTransactionsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (transactions: Omit<Transaction, 'id' | 'userId'>[]) => void;
  project: Project;
}

const REQUIRED_HEADERS = ['Descricao', 'Valor', 'Data'];

export function ImportTransactionsDialog({ isOpen, setIsOpen, onSubmit, project }: ImportTransactionsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [errorRows, setErrorRows] = useState<ErrorRow[]>([]);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setIsLoading(false);
    setParsedData([]);
    setErrorRows([]);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
        ['Descricao', 'Valor', 'Data', 'Categoria'],
        ['Aluguel de Câmera', 1500.50, '25/12/2024', 'Aluguel de Equipamentos'],
        ['Figurino Ator Principal', 850, '26/12/2024', 'Custos de Produção'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_importacao_despesas.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    resetState();
    setFile(selectedFile);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
            raw: false // Use formatted text
        });

        if (jsonData.length === 0) {
            toast({ variant: "destructive", title: "Arquivo Vazio", description: "A planilha parece estar vazia." });
            setIsLoading(false);
            return;
        }

        const headers = Object.keys(jsonData[0]);
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            toast({ variant: "destructive", title: "Cabeçalhos Ausentes", description: `Sua planilha precisa ter as colunas: ${missingHeaders.join(', ')}.` });
            setIsLoading(false);
            return;
        }

        const validRows: ParsedTransaction[] = [];
        const invalidRows: ErrorRow[] = [];

        jsonData.forEach((row, index) => {
          const originalRow = index + 2; // +1 for header, +1 for 0-index
          const { Descricao, Valor, Data, Categoria } = row;

          if (!Descricao || typeof Descricao !== 'string' || Descricao.trim() === '') {
            invalidRows.push({ row: originalRow, message: "A 'Descricao' é obrigatória.", data: row });
            return;
          }

          const amount = parseFloat(Valor);
          if (isNaN(amount) || amount <= 0) {
            invalidRows.push({ row: originalRow, message: "O 'Valor' deve ser um número positivo.", data: row });
            return;
          }

          const date = new Date(Data);
          if (isNaN(date.getTime())) {
            invalidRows.push({ row: originalRow, message: "A 'Data' está em um formato inválido.", data: row });
            return;
          }

          validRows.push({
            description: Descricao.trim(),
            amount,
            date,
            category: typeof Categoria === 'string' ? Categoria.trim() : undefined,
            originalRow,
          });
        });

        setParsedData(validRows);
        setErrorRows(invalidRows);
      } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Erro ao Ler Arquivo", description: "Não foi possível processar o arquivo. Verifique se é um .xlsx válido." });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleSubmit = () => {
    if (parsedData.length === 0) return;
    
    const transactionsToSubmit = parsedData.map(p => ({
        description: p.description,
        amount: p.amount,
        date: p.date,
        category: p.category,
        projectId: project.id,
        type: 'expense' as const,
        status: 'planned' as const,
    }));
    
    onSubmit(transactionsToSubmit);
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetState();
        setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Despesas</DialogTitle>
          <DialogDescription>
            Faça o upload de um arquivo .xlsx para adicionar múltiplas despesas de uma vez.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 items-start flex-1 min-h-0">
            {/* Left Column: Instructions & Upload */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg h-full">
                <div className="space-y-2">
                    <h3 className="font-semibold">Passo 1: Baixe o Modelo</h3>
                    <p className="text-sm text-muted-foreground">Use nosso modelo para garantir que seus dados sejam importados corretamente.</p>
                    <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Modelo (.xlsx)
                    </Button>
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold">Passo 2: Envie o Arquivo</h3>
                    <p className="text-sm text-muted-foreground">Arraste ou selecione o arquivo preenchido.</p>
                     <div className="relative">
                        <Input
                            id="file-upload"
                            type="file"
                            accept=".xlsx"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                            disabled={isLoading}
                        />
                         {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}
                     </div>
                </div>
            </div>

            {/* Right Column: Preview & Errors */}
            <div className="flex flex-col gap-4 border rounded-lg h-full min-h-0">
                <div className="p-4 border-b">
                    <h3 className="font-semibold">Passo 3: Revise os Dados</h3>
                    <p className="text-sm text-muted-foreground">Verifique os dados importados antes de confirmar.</p>
                </div>
                
                {(!file) && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">A pré-visualização aparecerá aqui.</p>
                    </div>
                )}
                
                {(file && parsedData.length > 0) && (
                    <div className="px-4 pb-4 flex-1 min-h-0">
                         <Badge variant="secondary" className="mb-2 border-green-500 bg-green-50 text-green-700">
                             <CheckCircle2 className="mr-1 h-3 w-3"/>
                             {parsedData.length} transações válidas encontradas
                         </Badge>
                        <ScrollArea className="h-[250px] border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedData.map((item) => (
                                        <TableRow key={item.originalRow}>
                                            <TableCell>
                                                <p className="font-medium">{item.description}</p>
                                                <p className="text-xs text-muted-foreground">{item.date.toLocaleDateString('pt-BR')} {item.category ? `| ${item.category}`: ''}</p>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}
                
                {(file && errorRows.length > 0) && (
                     <div className="px-4 pb-4 flex-1 min-h-0">
                         <Badge variant="destructive" className="mb-2">
                             <AlertTriangle className="mr-1 h-3 w-3"/>
                             {errorRows.length} linhas com erros
                         </Badge>
                        <ScrollArea className="h-[150px] border rounded-md">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Linha</TableHead>
                                        <TableHead>Erro</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {errorRows.map((err) => (
                                        <TableRow key={err.row}>
                                            <TableCell>{err.row}</TableCell>
                                            <TableCell>{err.message}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}
                 {(file && parsedData.length === 0 && errorRows.length === 0 && !isLoading) && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <FileX2 className="h-12 w-12 text-destructive" />
                        <p className="mt-2 text-destructive font-medium">Nenhuma transação válida encontrada.</p>
                        <p className="text-sm text-muted-foreground">Verifique seu arquivo e tente novamente.</p>
                    </div>
                )}
            </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleSubmit} disabled={parsedData.length === 0 || isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar {parsedData.length > 0 ? `${parsedData.length} Transações` : ''}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}