import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, Copy, CheckCircle, XCircle } from 'lucide-react';
import { Match, Player, getPaymentProgress } from '@/utils/calculations';
import ProgressBar from './ProgressBar';
import { useToast } from '@/hooks/use-toast';
import UploadReceipt from './UploadReceipt';
import { cn } from '@/lib/utils';

interface MatchDetailsProps {
    match: Match;
    isOpen: boolean;
    onClose: () => void;
    onUpdatePlayerPayment: (matchId: string, playerId: string, paid: boolean, receiptUrl?: string) => Promise<void>;
}

const MatchDetails: React.FC<MatchDetailsProps> = ({
    match,
    isOpen,
    onClose,
    onUpdatePlayerPayment
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const progress = getPaymentProgress(match);
    const matchDate = new Date(match.date);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const copyPixKey = () => {
        if (!match.pixKey) {
            toast({
                title: "Chave Pix não cadastrada",
                description: "Não há uma chave Pix cadastrada para esta partida.",
                variant: "destructive"
            });
            return;
        }

        navigator.clipboard.writeText(match.pixKey).then(() => {
            setCopied(true);
            toast({
                title: "Chave Pix copiada",
                description: "A chave Pix foi copiada para a área de transferência."
            });

            setTimeout(() => setCopied(false), 3000);
        });
    };

    const handleTogglePayment = async (player: Player) => {
        setIsUpdating(true);
        try {
            await onUpdatePlayerPayment(match.id, player.id, !player.paid, player.receiptUrl);

            toast({
                title: player.paid ? "Pagamento desmarcado" : "Pagamento marcado",
                description: player.paid
                    ? "O pagamento foi desmarcado com sucesso."
                    : "O pagamento foi marcado como realizado."
            });
        } catch (error) {
            console.error('Error updating payment:', error);
            toast({
                title: "Erro ao atualizar pagamento",
                description: "Ocorreu um erro ao atualizar o pagamento. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUploadReceipt = async (matchId: string, playerId: string, receiptUrl: string) => {
        setIsUpdating(true);
        try {
            // If player has not been marked as paid yet, mark as paid with receipt
            const player = match.players.find(p => p.id === playerId);

            if (player && !player.paid) {
                await onUpdatePlayerPayment(matchId, playerId, true, receiptUrl);
            } else {
                // Just update the receipt
                await onUpdatePlayerPayment(matchId, playerId, true, receiptUrl);
            }
        } catch (error) {
            console.error('Error uploading receipt:', error);
            toast({
                title: "Erro ao enviar comprovante",
                description: "Ocorreu um erro ao enviar o comprovante. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const sortedPlayers = [...match.players].sort((a, b) => {
        // First by payment status (unpaid first)
        if (a.paid !== b.paid) return a.paid ? 1 : -1;
        // Then alphabetically by name
        return a.name.localeCompare(b.name);
    });

    // Group players by payment status
    const unpaidPlayers = sortedPlayers.filter(p => !p.paid);
    const paidPlayers = sortedPlayers.filter(p => p.paid);

    return (
        <Dialog open={isOpen} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-1.5">
                    <DialogTitle className="text-2xl">Detalhes da Partida</DialogTitle>
                    <DialogDescription className="flex flex-wrap gap-2 items-center">
                        {match.status === 'complete' ? (
                            <span className="badge-complete">Concluído</span>
                        ) : (
                            <span className="badge-pending">Pendente</span>
                        )}
                        <span className="text-sm">•</span>
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar size={14} className="text-muted-foreground" />
                            {formatDate(matchDate)}
                        </span>
                        <span className="text-sm">•</span>
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock size={14} className="text-muted-foreground" />
                            {formatTime(matchDate)}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6">
                    {/* Match Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-secondary/50 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Duração</span>
                            <p className="text-xl font-semibold mt-1">{match.totalHours} horas</p>
                        </div>

                        <div className="p-4 bg-secondary/50 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">Valor total</span>
                            <p className="text-xl font-semibold mt-1">R$ {match.courtCost.toFixed(2)}</p>
                        </div>

                        <div className="p-4 bg-secondary/50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Chave Pix</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={copyPixKey}
                                    disabled={!match.pixKey}
                                    className="h-6 px-2"
                                >
                                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                                </Button>
                            </div>
                            <p className="text-sm font-medium mt-1 truncate">{match.pixKey || "Não cadastrada"}</p>
                        </div>
                    </div>

                    {/* Payment Progress */}
                    <div>
                        <ProgressBar value={progress} />
                        <div className="mt-2 text-sm text-muted-foreground">
                            {paidPlayers.length} de {match.players.length} pagos
                            {match.status === 'complete' && match.completionDate && (
                                <> • Concluído em {new Date(match.completionDate).toLocaleString('pt-BR')}</>
                            )}
                        </div>
                    </div>

                    {/* Players List */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Jogadores</h3>

                        {/* Unpaid Players (with highlight if any) */}
                        {unpaidPlayers.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                                    <XCircle size={16} />
                                    Pendentes de pagamento
                                </h4>

                                <div className={cn(
                                    "rounded-lg border-2 border-destructive/20 overflow-hidden",
                                    "bg-destructive/5 divide-y divide-destructive/10"
                                )}>
                                    {unpaidPlayers.map((player) => (
                                        <div key={player.id} className="p-4">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div>
                                                    <h4 className="font-medium">{player.name || "Jogador sem nome"}</h4>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                                                        <span>{player.hoursPlayed}h jogadas</span>
                                                        <span>•</span>
                                                        <span>R$ {player.amount?.toFixed(2) || "0.00"}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleTogglePayment(player)}
                                                        disabled={isUpdating}
                                                        className="h-8"
                                                    >
                                                        Marcar como pago
                                                    </Button>

                                                    <UploadReceipt
                                                        player={player}
                                                        matchId={match.id}
                                                        onUpload={handleUploadReceipt}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Paid Players */}
                        {paidPlayers.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-green-600 flex items-center gap-2">
                                    <CheckCircle size={16} />
                                    Pagamentos realizados
                                </h4>

                                <div className="rounded-lg border divide-y">
                                    {paidPlayers.map((player) => (
                                        <div key={player.id} className="p-4">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div>
                                                    <h4 className="font-medium">{player.name || "Jogador sem nome"}</h4>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                                                        <span>{player.hoursPlayed}h jogadas</span>
                                                        <span>•</span>
                                                        <span>R$ {player.amount?.toFixed(2) || "0.00"}</span>
                                                        {player.paymentDate && (
                                                            <>
                                                                <span>•</span>
                                                                <span>Pago em: {new Date(player.paymentDate).toLocaleString('pt-BR')}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleTogglePayment(player)}
                                                        disabled={isUpdating}
                                                        className="h-8"
                                                    >
                                                        Desmarcar pagamento
                                                    </Button>

                                                    <UploadReceipt
                                                        player={player}
                                                        matchId={match.id}
                                                        onUpload={handleUploadReceipt}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MatchDetails;
