import { useEffect, useRef } from 'react';
import { Game } from '../game/Game';

export default function GameComponent() {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameInstanceRef = useRef<Game | null>(null);

    useEffect(() => {
        if (gameContainerRef.current && !gameInstanceRef.current) {
            // Initialize game
            gameInstanceRef.current = new Game('game-container');
        }

        // Cleanup on unmount
        return () => {
            if (gameInstanceRef.current) {
                gameInstanceRef.current.destroy(true);
                gameInstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div
            id="game-container"
            ref={gameContainerRef}
            className="w-full h-full flex items-center justify-center bg-gray-900"
        />
    );
} 