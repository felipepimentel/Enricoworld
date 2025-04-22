import Phaser from 'phaser';
import { Enemy, EnemyConfigs, EnemyType } from '../objects/Enemy';

interface WaveConfig {
    enemies: {
        type: EnemyType;
        count: number;
        delay: number; // Delay between spawns in ms
        spawnSide: string;
    }[];
    breakTime: number; // Time before next wave in ms
}

export class WaveSystem {
    private scene: Phaser.Scene;
    private currentWave: number = 0;
    private waves: WaveConfig[];
    private isSpawning: boolean = false;
    private spawnPoints: Phaser.Math.Vector2[];
    private paths: Phaser.Curves.Path[];
    private activeEnemies: Enemy[] = [];
    private waveCompleteCallback?: () => void;
    private allWavesCompleteCallback?: () => void;
    private isWaveComplete: boolean = false;
    private enemyPool: Record<EnemyType, Phaser.GameObjects.Group> = {} as Record<EnemyType, Phaser.GameObjects.Group>;

    constructor(scene: Phaser.Scene, spawnPoints: Phaser.Math.Vector2[], paths: Phaser.Curves.Path[]) {
        this.scene = scene;
        this.spawnPoints = spawnPoints;
        this.paths = paths;
        this.waves = this.createWaves();
        this.initializeEnemyPool();
    }

    private initializeEnemyPool(): void {
        // Create object pools for each enemy type
        Object.values(EnemyType).forEach(type => {
            this.enemyPool[type] = this.scene.add.group({
                classType: Enemy,
                maxSize: 20,
                runChildUpdate: true
            });
        });
    }

    private createWaves(): WaveConfig[] {
        // Tutorial wave - First Wave (60-120 seconds): 4 goblins from left entrance
        const firstWave: WaveConfig = {
            enemies: [
                { type: EnemyType.GOBLIN, count: 4, delay: 2000, spawnSide: 'left' }
            ],
            breakTime: 30000 // 30 seconds for Strategic Interval (120-150 seconds)
        };

        // Second Wave (150-240 seconds): 5 goblins from left, 3 from right (simultaneous)
        const secondWave: WaveConfig = {
            enemies: [
                { type: EnemyType.GOBLIN, count: 5, delay: 1500, spawnSide: 'left' },
                { type: EnemyType.GOBLIN, count: 3, delay: 1500, spawnSide: 'right' }
            ],
            breakTime: 30000 // 30 seconds for Adaptation Phase (240-270 seconds)
        };

        // Final Wave (270-360 seconds)
        const finalWave: WaveConfig = {
            enemies: [
                { type: EnemyType.GOBLIN, count: 3, delay: 2000, spawnSide: 'left' },
                { type: EnemyType.CARRIER, count: 2, delay: 3000, spawnSide: 'right' },
                // Ogre will be spawned from the least defended entrance
                { type: EnemyType.OGRE, count: 1, delay: 5000, spawnSide: 'weakest' }
            ],
            breakTime: 0 // No break after final wave
        };

        return [firstWave, secondWave, finalWave];
    }

    public startNextWave(): void {
        if (this.isSpawning) return;

        if (this.currentWave >= this.waves.length) {
            // All waves completed
            if (this.allWavesCompleteCallback) {
                this.allWavesCompleteCallback();
            }
            this.scene.events.emit('allWavesCompleted');
            return;
        }

        this.currentWave++;
        this.isWaveComplete = false;
        this.scene.events.emit('waveStarted', this.currentWave);
        this.spawnWave(this.waves[this.currentWave - 1]);
    }

    private async spawnWave(wave: WaveConfig): Promise<void> {
        this.isSpawning = true;

        for (const enemyGroup of wave.enemies) {
            for (let i = 0; i < enemyGroup.count; i++) {
                // Choose spawn point based on side or find the weakest side
                let spawnIndex = 0;

                if (enemyGroup.spawnSide === 'left') {
                    // Left side spawn (first spawn point)
                    spawnIndex = 0;
                } else if (enemyGroup.spawnSide === 'right') {
                    // Right side spawn (second spawn point)
                    spawnIndex = Math.min(1, this.spawnPoints.length - 1); // Ensure we have at least 2 spawn points
                } else if (enemyGroup.spawnSide === 'weakest') {
                    // For the ogre, find the least defended entrance
                    spawnIndex = this.findLeastDefendedEntrance();
                    console.log(`Spawning ogre at the least defended entrance: ${spawnIndex === 0 ? 'left' : 'right'}`);
                } else {
                    // Random spawn point as fallback
                    spawnIndex = Math.floor(Math.random() * this.spawnPoints.length);
                }

                // Ensure spawnIndex is within range
                spawnIndex = Math.min(spawnIndex, this.spawnPoints.length - 1);

                const spawnPoint = this.spawnPoints[spawnIndex];
                const path = this.paths[spawnIndex];

                // Create enemy - try to get from pool first
                let enemy: Enemy;
                const pooledEnemy = this.enemyPool[enemyGroup.type].get() as Enemy;

                if (pooledEnemy) {
                    // Reuse pooled enemy
                    enemy = pooledEnemy;
                    enemy.setActive(true);
                    enemy.setVisible(true);
                } else {
                    // Create new enemy if pool is empty
                    enemy = new Enemy(
                        this.scene,
                        enemyGroup.type,
                        path,
                        EnemyConfigs[enemyGroup.type]
                    );
                }

                this.activeEnemies.push(enemy);

                // Wait for delay before next spawn
                if (enemyGroup.delay > 0 && i < enemyGroup.count - 1) {
                    await new Promise(resolve => this.scene.time.delayedCall(enemyGroup.delay, resolve));
                }
            }
        }

        this.isSpawning = false;

        // Start break timer if not the last wave
        if (wave.breakTime > 0) {
            this.scene.time.delayedCall(wave.breakTime, () => {
                this.checkWaveCompletion();
            });
        }
    }

    /**
     * Find the least defended entrance by checking for nearby structures
     * @returns The index of the spawn point with fewest defenses nearby
     */
    private findLeastDefendedEntrance(): number {
        // Get all structure GameObjects
        const structures = this.scene.children.getChildren()
            .filter(obj => obj instanceof Phaser.GameObjects.Container &&
                (obj as any).getType &&
                typeof (obj as any).getType === 'function');

        // Count structures near each spawn point
        const defenseCount: number[] = [];

        for (const spawnPoint of this.spawnPoints) {
            let count = 0;

            for (const structure of structures) {
                const distance = Phaser.Math.Distance.Between(
                    spawnPoint.x, spawnPoint.y,
                    structure.x, structure.y
                );

                // Count structures within 200 units of the spawn
                if (distance < 200) {
                    count++;
                }
            }

            defenseCount.push(count);
        }

        // Find the spawn point with the lowest defense count
        let weakestIndex = 0;
        let lowestCount = Number.MAX_SAFE_INTEGER;

        for (let i = 0; i < defenseCount.length; i++) {
            if (defenseCount[i] < lowestCount) {
                lowestCount = defenseCount[i];
                weakestIndex = i;
            }
        }

        return weakestIndex;
    }

    private checkWaveCompletion(): void {
        // If all enemies are defeated and we're not spawning anymore
        if (!this.isSpawning && this.activeEnemies.length === 0 && !this.isWaveComplete) {
            this.isWaveComplete = true;
            this.scene.events.emit('waveCompleted', this.currentWave);

            if (this.currentWave < this.waves.length) {
                this.scene.time.delayedCall(5000, () => this.startNextWave());
            } else {
                this.scene.events.emit('allWavesCompleted');
                if (this.allWavesCompleteCallback) {
                    this.allWavesCompleteCallback();
                }
            }
        }
    }

    public update(): void {
        // Clean up defeated enemies
        this.activeEnemies = this.activeEnemies.filter(enemy => {
            if (!enemy.active) {
                // Return inactive enemies to the pool
                this.enemyPool[enemy.getType()]?.add(enemy);
                return false;
            }
            return true;
        });

        // Update enemies
        this.activeEnemies.forEach(enemy => enemy.update());

        // Check if wave is complete
        if (!this.isSpawning && this.activeEnemies.length === 0) {
            this.checkWaveCompletion();
        }
    }

    public onWaveComplete(callback: () => void): void {
        this.waveCompleteCallback = callback;
    }

    public onAllWavesComplete(callback: () => void): void {
        this.allWavesCompleteCallback = callback;
    }

    public getCurrentWave(): number {
        return this.currentWave;
    }

    public getTotalWaves(): number {
        return this.waves.length;
    }

    public getActiveEnemies(): Enemy[] {
        return this.activeEnemies;
    }

    public isWaveInProgress(): boolean {
        return this.isSpawning || this.activeEnemies.length > 0;
    }
} 