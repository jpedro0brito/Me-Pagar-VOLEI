import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
    value: number;
    className?: string;
    showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    className,
    showLabel = true
}) => {
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (progressRef.current) {
            progressRef.current.style.setProperty('--progress-value', `${value}%`);
        }
    }, [value]);

    // Determine color based on progress
    const getColorClass = () => {
        if (value < 33) return 'bg-red-500';
        if (value < 66) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className={cn("space-y-1.5", className)}>
            {showLabel && (
                <div className="flex justify-between items-center text-xs">
                    <span>Progresso de Pagamento</span>
                    <span className="font-medium">{value}%</span>
                </div>
            )}
            <div className="progress-bar">
                <div
                    ref={progressRef}
                    className={cn("progress-bar-fill", getColorClass())}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
