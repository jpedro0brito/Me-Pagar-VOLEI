/**
 * Utility functions for match payment calculations
 */

export interface Player {
    id: string;
    name: string;
    hoursPlayed: number;
    paid: boolean;
    paymentDate?: string;
    receiptUrl?: string;
    amount?: number;
}

export interface Match {
    id: string;
    courtCost: number;
    totalHours: number;
    date: string;
    pixKey: string;
    players: Player[];
    status: 'pending' | 'complete';
    completionDate?: string;
}

/**
 * Calculate the payment amount for each player based on proportional time played
 */
export const calculatePlayerAmounts = (match: Match): Match => {
    const totalPlayerHours = match.players.reduce((sum, player) => sum + player.hoursPlayed, 0);

    // If no hours played yet (should be rare), return original match
    if (totalPlayerHours === 0) return match;

    const updatedPlayers = match.players.map(player => {
        // Calculate proportional payment based on hours played
        const proportion = player.hoursPlayed / totalPlayerHours;
        const amount = Math.round((proportion * match.courtCost) * 100) / 100; // Round to 2 decimal places

        return {
            ...player,
            amount
        };
    });

    return {
        ...match,
        players: updatedPlayers
    };
};

/**
 * Check if all players have paid to update match status
 */
export const updateMatchStatus = (match: Match): Match => {
    const allPaid = match.players.every(player => player.paid);

    // If all paid and status was pending, update to complete with timestamp
    if (allPaid && match.status === 'pending') {
        return {
            ...match,
            status: 'complete' as const,
            completionDate: new Date().toISOString()
        };
    }

    // If not all paid and status was complete, update to pending
    if (!allPaid && match.status === 'complete') {
        return {
            ...match,
            status: 'pending' as const,
            completionDate: undefined
        };
    }

    return match;
};

/**
 * Get payment progress percentage for a match
 */
export const getPaymentProgress = (match: Match): number => {
    if (match.players.length === 0) return 0;
    const paidPlayers = match.players.filter(player => player.paid).length;
    return Math.round((paidPlayers / match.players.length) * 100);
};

/**
 * Generate a new player with default values
 */
export const createNewPlayer = (name: string = "", hoursPlayed: number = 1): Player => ({
    id: crypto.randomUUID(),
    name,
    hoursPlayed,
    paid: false
});

/**
 * Generate a new match with default values
 */
export const createNewMatch = (): Match => ({
    id: crypto.randomUUID(),
    courtCost: 0,
    totalHours: 1,
    date: new Date().toISOString(),
    pixKey: "",
    players: [],
    status: 'pending'
});
