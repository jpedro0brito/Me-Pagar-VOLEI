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
            <DialogContent className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Pagamentos Pendentes</DialogTitle>
                </DialogHeader>

                {pendingPayments.length > 0 ? (
                    <>
                        {/* Layout para desktop (tabela) */}
                        <div className="hidden sm:block relative overflow-x-auto mt-4">
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
                                                    <span className="truncate max-w-[8rem]">{payment.pixKey}</span>
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

                        {/* Layout para mobile (cards) */}
                        <div className="block sm:hidden mt-4 space-y-4">
                            {pendingPayments.map((payment, index) => (
                                <div key={index} className="p-4 border rounded-lg bg-background shadow-sm">
                                    <div className="mb-2">
                                        <span className="font-semibold">Nome:</span>
                                        <p>{payment.playerName}</p>
                                    </div>
                                    <div className="mb-2">
                                        <span className="font-semibold">Valor:</span>
                                        <p>
                                            {payment.amount.toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            })}
                                        </p>
                                    </div>
                                    <div className="mb-2">
                                        <span className="font-semibold">Data da Partida:</span>
                                        <p>{format(payment.matchDate, "dd/MM/yyyy HH:mm")}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold">Chave Pix:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="truncate max-w-[8rem]">{payment.pixKey}</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => copyPixKey(payment.pixKey)}
                                            >
                                                Copiar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
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
