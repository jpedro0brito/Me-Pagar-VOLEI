import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Match } from '@/utils/calculations';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface PendingPaymentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: Match[];
}

const PendingPaymentsModal: React.FC<PendingPaymentsModalProps> = ({
    isOpen,
    onClose,
    matches,
}) => {
    const pendingPayments = matches.flatMap(match =>
        match.players
            .filter(player => !player.paid)
            .map(player => ({
                playerName: player.name,
                amount: player.amount,
                matchDate: new Date(match.date),
                pixKey: match.pixKey,
            }))
    );

    const copyPixKey = (pixKey: string) => {
        navigator.clipboard.writeText(pixKey);
        toast({
            title: "Chave Pix copiada!",
            duration: 2000,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Pagamentos Pendentes</DialogTitle>
                </DialogHeader>

                {pendingPayments.length > 0 ? (
                    <div className="relative overflow-x-auto mt-4">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-muted">
                                <tr>
                                    <th className="px-6 py-3">Nome</th>
                                    <th className="px-6 py-3">Valor</th>
                                    <th className="px-6 py-3">Data da Partida</th>
                                    <th className="px-6 py-3">Chave Pix</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingPayments.map((payment, index) => (
                                    <tr key={index} className="border-b bg-background hover:bg-muted/50">
                                        <td className="px-6 py-4">{payment.playerName}</td>
                                        <td className="px-6 py-4">
                                            {payment.amount.toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            {format(payment.matchDate, "dd/MM/yyyy HH:mm")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate max-w-32">{payment.pixKey}</span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyPixKey(payment.pixKey)}
                                                >
                                                    Copiar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        Não há pagamentos pendentes.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PendingPaymentsModal;
