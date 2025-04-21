import Phaser from 'phaser';
import { Enemy, EnemyConfigs, EnemyType } from '../objects/Enemy';

interface WaveConfig {
    enemies: {
        type: EnemyType;
        count: number;
        delay: number; // Delay between spawns in ms
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
        // Tutorial wave
        const tutorialWave: WaveConfig = {
            enemies: [
                { type: EnemyType.GOBLIN, count: 3, delay: 2000 }
            ],
            breakTime: 10000
        };

        // First real wave
        const wave1: WaveConfig = {
            enemies: [
                { type: EnemyType.GOBLIN, count: 5, delay: 1500 }
            ],
            breakTime: 15000
        };

        // Second wave with carrier
        const wave2: WaveConfig = {
            enemies: [
                { type: EnemyType.GOBLIN, count: 5, delay: 1500 },
                { type: EnemyType.CARRIER, count: 1, delay: 3000 }
            ],
            breakTime: 20000
        };

        // Final wave with ogre
        const wave3: WaveConfig = {
            enemies: [
                { type: EnemyType.GOBLIN, count: 8, delay: 1000 },
                { type: EnemyType.CARRIER, count: 2, delay: 2000 },
                { type: EnemyType.OGRE, count: 1, delay: 0 }
            ],
            breakTime: 0 // No break after final wave
        };

        return [tutorialWave, wave1, wave2, wave3];
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
                // Choose random spawn point and corresponding path
                const spawnIndex = Math.floor(Math.random() * this.spawnPoints.length);
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