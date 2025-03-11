import React from 'react';
import { Player } from '@/utils/calculations';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PlayerListProps {
    players: Player[];
    totalHours: number;
    onAddPlayer: () => void;
    onRemovePlayer: (id: string) => void;
    onPlayerChange: (playerId: string, field: keyof Player, value: any) => void;
    readOnly?: boolean;
}

const PlayerList: React.FC<PlayerListProps> = ({
    players,
    totalHours,
    onAddPlayer,
    onRemovePlayer,
    onPlayerChange,
    readOnly = false
}) => {
    const handleTimeChange = (playerId: string, increment: boolean) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        let newHours = increment
            ? player.hoursPlayed + 0.5
            : Math.max(0.5, player.hoursPlayed - 0.5);

        // Ensure player hours don't exceed total match hours
        newHours = Math.min(newHours, totalHours);

        onPlayerChange(playerId, 'hoursPlayed', newHours);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Participantes</h3>
                {!readOnly && (
                    <Button
                        onClick={onAddPlayer}
                        variant="outline"
                        size="sm"
                        className="transition-all hover:bg-primary hover:text-primary-foreground"
                    >
                        Adicionar Jogador
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {players.map((player) => (
                    <div
                        key={player.id}
                        className="p-4 border border-border/60 rounded-lg bg-white transition-all hover:border-border animate-slide-in"
                    >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            {/* Player Name */}
                            <div className="flex-1">
                                <Label htmlFor={`player-name-${player.id}`} className="text-sm font-medium mb-1 block">
                                    Nome
                                </Label>
                                <Input
                                    id={`player-name-${player.id}`}
                                    type="text"
                                    value={player.name}
                                    onChange={(e) => onPlayerChange(player.id, 'name', e.target.value)}
                                    placeholder="Nome do jogador"
                                    disabled={readOnly}
                                    className="w-full"
                                />
                            </div>

                            {/* Hours Played */}
                            <div className="w-full md:w-auto">
                                <Label htmlFor={`player-hours-${player.id}`} className="text-sm font-medium mb-1 block">
                                    Tempo jogado (horas)
                                </Label>
                                <div className="input-spinner">
                                    <button
                                        type="button"
                                        onClick={() => handleTimeChange(player.id, false)}
                                        disabled={player.hoursPlayed <= 0.5 || readOnly}
                                        className="rounded-l-md"
                                    >
                                        -
                                    </button>
                                    <input
                                        id={`player-hours-${player.id}`}
                                        type="text"
                                        value={player.hoursPlayed}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (!isNaN(value) && value >= 0.5 && value <= totalHours) {
                                                onPlayerChange(player.id, 'hoursPlayed', value);
                                            }
                                        }}
                                        disabled={readOnly}
                                        className="w-16 text-center"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleTimeChange(player.id, true)}
                                        disabled={player.hoursPlayed >= totalHours || readOnly}
                                        className="rounded-r-md"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Paid Status */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`player-paid-${player.id}`}
                                    checked={player.paid}
                                    onCheckedChange={(checked) => {
                                        onPlayerChange(player.id, 'paid', !!checked);
                                    }}
                                    disabled={readOnly}
                                />
                                <Label
                                    htmlFor={`player-paid-${player.id}`}
                                    className="text-sm font-medium cursor-pointer"
                                >
                                    Pagamento realizado
                                </Label>
                            </div>

                            {/* Amount - Only shown when calculated */}
                            {player.amount !== undefined && (
                                <div className="w-full md:w-auto">
                                    <span className="text-sm font-medium block mb-1">Valor</span>
                                    <div className="py-2 px-3 bg-secondary rounded-md text-sm font-medium">
                                        R$ {player.amount.toFixed(2)}
                                    </div>
                                </div>
                            )}

                            {/* Delete button */}
                            {!readOnly && players.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => onRemovePlayer(player.id)}
                                    className="icon-button text-destructive/70 hover:text-destructive"
                                    aria-label="Remover jogador"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        {/* Payment date (if paid) */}
                        {player.paid && player.paymentDate && (
                            <div className="mt-2 text-xs text-muted-foreground">
                                Pago em: {new Date(player.paymentDate).toLocaleString('pt-BR')}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerList;
