import React, { useState, useEffect } from 'react';
import { Player, Match, createNewMatch, createNewPlayer, calculatePlayerAmounts } from '@/utils/calculations';
import PlayerList from './PlayerList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Clipboard, Check, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import dbService from '@/utils/dbService';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const NewMatch: React.FC = () => {
    const [match, setMatch] = useState<Match>(createNewMatch());
    const [isCreating, setIsCreating] = useState(false);
    const [pixKeyCopied, setPixKeyCopied] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string>(
        format(new Date(), 'HH:mm')
    );
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        updateMatchDateTime();
    }, [selectedDate, selectedTime]);

    const updateMatchDateTime = () => {
        if (!selectedDate) return;

        const [hours, minutes] = selectedTime.split(':').map(Number);
        const dateTime = new Date(selectedDate);
        dateTime.setHours(hours, minutes);

        setMatch(prev => ({
            ...prev,
            date: dateTime.toISOString()
        }));
    };

    const handleCourtCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (isNaN(value) || value < 0) return;

        setMatch(prev => ({
            ...prev,
            courtCost: value
        }));
    };

    const handleTotalHoursChange = (increment: boolean) => {
        const currentHours = match.totalHours;
        const newHours = increment
            ? currentHours + 0.5
            : Math.max(0.5, currentHours - 0.5);

        setMatch(prev => {
            const updatedPlayers = prev.players.map(player => ({
                ...player,
                hoursPlayed: Math.min(player.hoursPlayed, newHours)
            }));

            return {
                ...prev,
                totalHours: newHours,
                players: updatedPlayers
            };
        });
    };

    const handlePixKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMatch(prev => ({
            ...prev,
            pixKey: e.target.value
        }));
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedTime(e.target.value);
    };

    const handleAddPlayer = () => {
        setMatch(prev => ({
            ...prev,
            players: [...prev.players, createNewPlayer()]
        }));
    };

    const handleRemovePlayer = (id: string) => {
        setMatch(prev => ({
            ...prev,
            players: prev.players.filter(player => player.id !== id)
        }));
    };

    const handlePlayerChange = (playerId: string, field: keyof Player, value: any) => {
        setMatch(prev => {
            const updatedPlayers = prev.players.map(player => {
                if (player.id === playerId) {
                    return {
                        ...player,
                        [field]: value
                    };
                }
                return player;
            });

            return {
                ...prev,
                players: updatedPlayers
            };
        });
    };

    const handleCopyPixKey = async () => {
        if (!match.pixKey) {
            toast({
                title: "Chave Pix não cadastrada",
                description: "Adicione uma chave Pix antes de copiar."
            });
            return;
        }

        try {
            await navigator.clipboard.writeText(match.pixKey);
            setPixKeyCopied(true);

            toast({
                title: "Chave Pix copiada",
                description: "A chave Pix foi copiada para a área de transferência."
            });

            setTimeout(() => setPixKeyCopied(false), 3000);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            toast({
                title: "Erro ao copiar",
                description: "Não foi possível copiar a chave Pix.",
                variant: "destructive"
            });
        }
    };

    const validateMatch = (): string | null => {
        if (match.courtCost <= 0) {
            return "O valor do aluguel da quadra deve ser maior que zero.";
        }

        if (match.totalHours <= 0) {
            return "A duração da partida deve ser maior que zero.";
        }

        if (!match.pixKey.trim()) {
            return "A chave Pix é obrigatória.";
        }

        if (match.players.length === 0) {
            return "Adicione pelo menos um jogador.";
        }

        for (const player of match.players) {
            if (!player.name.trim()) {
                return "Todos os jogadores devem ter um nome.";
            }

            if (player.hoursPlayed <= 0) {
                return "Todos os jogadores devem ter tempo de jogo maior que zero.";
            }

            if (player.hoursPlayed > match.totalHours) {
                return "O tempo de jogo de um jogador não pode ser maior que a duração total da partida.";
            }
        }

        return null;
    };

    const handleSaveMatch = async () => {
        const validationError = validateMatch();
        if (validationError) {
            toast({
                title: "Erro de validação",
                description: validationError,
                variant: "destructive"
            });
            return;
        }

        setIsCreating(true);

        try {
            const calculatedMatch = calculatePlayerAmounts(match);

            await dbService.createMatch(calculatedMatch);

            toast({
                title: "Partida criada",
                description: "A partida foi criada com sucesso."
            });

            navigate('/history');
        } catch (error) {
            console.error('Error saving match:', error);
            toast({
                title: "Erro ao criar partida",
                description: "Ocorreu um erro ao criar a partida. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleCalculateAmounts = () => {
        const validationError = validateMatch();
        if (validationError) {
            toast({
                title: "Erro de validação",
                description: validationError,
                variant: "destructive"
            });
            return;
        }

        const calculatedMatch = calculatePlayerAmounts(match);
        setMatch(calculatedMatch);

        toast({
            title: "Valores calculados",
            description: "Os valores por jogador foram calculados com sucesso."
        });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h2 className="section-title">Nova Partida de Vôlei</h2>
                <p className="section-subtitle">Preencha os dados para calcular os custos da partida</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Data da Partida</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    "flex items-center"
                                )}
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione uma data"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="match-time" className="text-sm font-medium">
                        Horário de Início
                    </Label>
                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                            id="match-time"
                            type="time"
                            value={selectedTime}
                            onChange={handleTimeChange}
                            className="flex-1"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="court-cost" className="text-sm font-medium">
                        Valor do aluguel (R$)
                    </Label>
                    <Input
                        id="court-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={match.courtCost}
                        onChange={handleCourtCostChange}
                        placeholder="0.00"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="total-hours" className="text-sm font-medium">
                        Duração Total (horas)
                    </Label>
                    <div className="input-spinner">
                        <button
                            type="button"
                            onClick={() => handleTotalHoursChange(false)}
                            disabled={match.totalHours <= 0.5}
                        >
                            -
                        </button>
                        <input
                            id="total-hours"
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={match.totalHours}
                            onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value >= 0.5) {
                                    setMatch(prev => ({
                                        ...prev,
                                        totalHours: value
                                    }));
                                }
                            }}
                            className="w-16 text-center"
                        />
                        <button
                            type="button"
                            onClick={() => handleTotalHoursChange(true)}
                        >
                            +
                        </button>
                    </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pix-key" className="text-sm font-medium">
                        Chave Pix <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex">
                        <Input
                            id="pix-key"
                            type="text"
                            value={match.pixKey}
                            onChange={handlePixKeyChange}
                            placeholder="Insira a chave Pix para recebimento"
                            className="flex-1 rounded-r-none"
                            required
                        />
                        <Button
                            type="button"
                            onClick={handleCopyPixKey}
                            disabled={!match.pixKey}
                            className="rounded-l-none"
                            variant="secondary"
                        >
                            {pixKeyCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>

            <PlayerList
                players={match.players}
                totalHours={match.totalHours}
                onAddPlayer={handleAddPlayer}
                onRemovePlayer={handleRemovePlayer}
                onPlayerChange={handlePlayerChange}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                    variant="outline"
                    onClick={handleCalculateAmounts}
                    className="flex-1 gap-2"
                >
                    <Clipboard className="h-5 w-5" />
                    Calcular Valores
                </Button>
                <Button
                    onClick={handleSaveMatch}
                    disabled={isCreating}
                    className="flex-1"
                >
                    {isCreating ? 'Salvando...' : 'Salvar Partida'}
                </Button>
            </div>
        </div>
    );
};

export default NewMatch;
