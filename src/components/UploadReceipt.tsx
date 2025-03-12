import React, { useState } from 'react';
import { Upload, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Player } from '@/utils/calculations';
import { useToast } from '@/hooks/use-toast';

interface UploadReceiptProps {
    player: Player;
    matchId: string;
    onUpload: (matchId: string, playerId: string, receiptUrl: string) => Promise<void>;
}

const UploadReceipt: React.FC<UploadReceiptProps> = ({ player, matchId, onUpload }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(player.receiptUrl || null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validação do tipo de arquivo (imagens e PDF)
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!validTypes.includes(selectedFile.type)) {
            toast({
                title: "Tipo de arquivo inválido",
                description: "Por favor, selecione uma imagem (JPEG, PNG, GIF) ou PDF.",
                variant: "destructive"
            });
            return;
        }

        // Validação do tamanho do arquivo (máx. 5MB)
        if (selectedFile.size > 5 * 1024 * 1024) {
            toast({
                title: "Arquivo muito grande",
                description: "O tamanho máximo do arquivo é 5MB.",
                variant: "destructive"
            });
            return;
        }

        setFile(selectedFile);

        // Cria preview para imagens
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        } else if (selectedFile.type === 'application/pdf') {
            // Para PDFs, mostra um placeholder enquanto o arquivo é lido para upload
            setPreviewUrl('/placeholder.svg');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        try {
            // Simula o upload lendo o arquivo como Data URL
            const reader = new FileReader();

            reader.onloadend = async () => {
                const dataUrl = reader.result as string;
                await onUpload(matchId, player.id, dataUrl);

                toast({
                    title: "Comprovante enviado",
                    description: "O comprovante foi enviado com sucesso."
                });

                setIsUploading(false);
                setIsOpen(false);
            };

            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading receipt:', error);
            toast({
                title: "Erro ao enviar comprovante",
                description: "Ocorreu um erro ao enviar o comprovante. Tente novamente.",
                variant: "destructive"
            });
            setIsUploading(false);
        }
    };

    // Função para converter dataURL em Blob e abrir em nova aba
    const openPDF = (dataUrl: string) => {
        const arr = dataUrl.split(',');
        const mimeMatch = dataUrl.match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
    };

    const viewExistingReceipt = () => {
        if (player.receiptUrl) {
            // Se for PDF, abre via o Blob, senão exibe na dialog
            if (player.receiptUrl.includes('application/pdf')) {
                openPDF(player.receiptUrl);
            } else {
                setPreviewUrl(player.receiptUrl);
                setIsOpen(true);
            }
        }
    };

    return (
        <>
            {player.receiptUrl ? (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={viewExistingReceipt}
                    className="gap-2"
                >
                    <Check size={16} className="text-green-500" />
                    Ver comprovante
                </Button>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(true)}
                    className="gap-2"
                >
                    <Upload size={16} />
                    Enviar comprovante
                </Button>
            )}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="w-full sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Comprovante de Pagamento</DialogTitle>
                        <DialogDescription>
                            Envie uma imagem ou PDF do comprovante de pagamento.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {previewUrl && (
                            <div className="relative aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center border">
                                {previewUrl.startsWith('data:image') ? (
                                    <img
                                        src={previewUrl}
                                        alt="Preview do comprovante"
                                        className="max-h-full object-contain"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-4">
                                        <img
                                            src="/placeholder.svg"
                                            alt="PDF placeholder"
                                            className="w-16 h-16 mb-2 opacity-50"
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            Arquivo PDF
                                        </span>
                                    </div>
                                )}

                                {!player.receiptUrl && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFile(null);
                                            setPreviewUrl(null);
                                        }}
                                        className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-foreground"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        )}

                        {!player.receiptUrl && (
                            <>
                                {!previewUrl && (
                                    <div className="flex items-center justify-center w-full">
                                        <label
                                            htmlFor="receipt-upload"
                                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                                        >
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                                <p className="mb-2 text-sm text-muted-foreground">
                                                    <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    PNG, JPG, GIF ou PDF (Máx. 5MB)
                                                </p>
                                            </div>
                                            <input
                                                id="receipt-upload"
                                                type="file"
                                                className="hidden"
                                                accept="image/png,image/jpeg,image/gif,application/pdf"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={!file || isUploading}
                                    >
                                        {isUploading ? 'Enviando...' : 'Enviar comprovante'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UploadReceipt;
