import Phaser from 'phaser';

export enum EnemyType {
    GOBLIN = 'goblin',
    CARRIER = 'carrier',
    OGRE = 'ogre'
}

export interface EnemyConfig {
    health: number;
    speed: number;
    damage: number;
    crystalReward: number;
    scale?: number;
}

export class Enemy extends Phaser.GameObjects.Container {
    private type: EnemyType;
    private health: number;
    private maxHealth: number;
    private speed: number;
    private baseSpeed: number;
    private damage: number;
    private crystalReward: number;
    private sprite: Phaser.GameObjects.Sprite;
    private healthBar: Phaser.GameObjects.Graphics;
    private path: Phaser.Curves.Path;
    private pathFollower: { t: number };
    private isSlowed: boolean = false;
    private slowTimer?: Phaser.Time.TimerEvent;
    private pathTween?: Phaser.Tweens.Tween;
    private isDead: boolean = false;

    constructor(scene: Phaser.Scene, type: EnemyType, path: Phaser.Curves.Path, config: EnemyConfig) {
        const startPoint = path.getStartPoint();
        super(scene, startPoint.x, startPoint.y);
        scene.add.existing(this);

        this.type = type;
        this.path = path;
        this.maxHealth = config.health;
        this.health = this.maxHealth;
        this.baseSpeed = config.speed;
        this.speed = this.baseSpeed;
        this.damage = config.damage;
        this.crystalReward = config.crystalReward;

        // Create sprite
        this.sprite = scene.add.sprite(0, 0, type);
        if (config.scale) {
            this.sprite.setScale(config.scale);
        }
        this.add(this.sprite);

        // Setup animations
        this.createAnimations();

        // Create health bar
        this.healthBar = scene.add.graphics();
        this.add(this.healthBar);
        this.updateHealthBar();

        // Setup path following
        this.pathFollower = { t: 0 };
        this.setupPathFollowing();
    }

    private createAnimations(): void {
        // Only create if they don't exist yet
        if (!this.scene.anims.exists(`${this.type}_walk`)) {
            this.scene.anims.create({
                key: `${this.type}_walk`,
                frames: this.scene.anims.generateFrameNumbers(this.type, { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });
        }

        // Play the animation
        this.sprite.play(`${this.type}_walk`);
    }

    private setupPathFollowing(): void {
        // Calculate duration based on path length and enemy speed
        const duration = (this.path.getLength() / this.speed) * 1000;

        // Create the tween for path following
        this.pathTween = this.scene.tweens.add({
            targets: this.pathFollower,
            t: 1,
            duration: duration,
            ease: 'Linear',
            onUpdate: () => {
                const position = this.path.getPoint(this.pathFollower.t);
                if (!position) return;

                // Get previous position to determine direction
                const prevT = Math.max(0, this.pathFollower.t - 0.01);
                const prevPos = this.path.getPoint(prevT);

                if (prevPos) {
                    // Update sprite direction based on movement
                    if (position.x < prevPos.x) {
                        this.sprite.setFlipX(true);
                    } else if (position.x > prevPos.x) {
                        this.sprite.setFlipX(false);
                    }
                }

                this.setPosition(position.x, position.y);
            },
            onComplete: () => {
                // Enemy reached the end of the path - do damage to base
                if (!this.isDead) {
                    this.scene.events.emit('baseAttacked', this.damage);
                    this.destroy();
                }
            }
        });
    }

    update(): void {
        // Additional update logic can go here
    }

    public takeDamage(amount: number): void {
        if (this.isDead) return;

        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();

        // Visual feedback
        this.sprite.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (this.sprite && this.sprite.active) {
                this.sprite.clearTint();
            }
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    private updateHealthBar(): void {
        this.healthBar.clear();

        // Background
        this.healthBar.fillStyle(0x000000, 0.5);
        this.healthBar.fillRect(-20, -30, 40, 5);

        // Health
        const healthPercentage = this.health / this.maxHealth;
        const color = healthPercentage > 0.5 ? 0x00ff00 : healthPercentage > 0.25 ? 0xffff00 : 0xff0000;
        this.healthBar.fillStyle(color, 1);
        this.healthBar.fillRect(-20, -30, 40 * healthPercentage, 5);
    }

    public slow(factor: number, duration: number): void {
        if (this.isSlowed || this.isDead) return;

        this.isSlowed = true;

        // Update movement speed
        const newSpeed = this.baseSpeed * factor;
        if (this.pathTween) {
            // Get current progress
            const progress = this.pathFollower.t;

            // Stop current tween
            this.pathTween.stop();

            // Calculate remaining path
            const remainingT = 1 - progress;
            const remainingLength = this.path.getLength() * remainingT;

            // Create new tween with slower speed for remaining path
            this.pathTween = this.scene.tweens.add({
                targets: this.pathFollower,
                t: 1,
                duration: (remainingLength / newSpeed) * 1000,
                ease: 'Linear',
                onUpdate: () => {
                    const position = this.path.getPoint(this.pathFollower.t);
                    if (position) {
                        this.setPosition(position.x, position.y);
                    }
                },
                onComplete: () => {
                    if (!this.isDead) {
                        this.scene.events.emit('baseAttacked', this.damage);
                        this.destroy();
                    }
                }
            });
        }

        // Visual effect for slowed enemy
        this.sprite.setTint(0x0088ff);

        // Clear previous timer if exists
        if (this.slowTimer) {
            this.slowTimer.destroy();
        }

        // Reset after duration
        this.slowTimer = this.scene.time.delayedCall(duration, () => {
            if (this.isDead) return;

            this.isSlowed = false;
            this.sprite.clearTint();

            // If there's still a path to follow, restore original speed
            if (this.pathFollower.t < 1 && this.pathTween) {
                const progress = this.pathFollower.t;
                this.pathTween.stop();

                const remainingT = 1 - progress;
                const remainingLength = this.path.getLength() * remainingT;

                this.pathTween = this.scene.tweens.add({
                    targets: this.pathFollower,
                    t: 1,
                    duration: (remainingLength / this.baseSpeed) * 1000,
                    ease: 'Linear',
                    onUpdate: () => {
                        const position = this.path.getPoint(this.pathFollower.t);
                        if (position) {
                            this.setPosition(position.x, position.y);
                        }
                    },
                    onComplete: () => {
                        if (!this.isDead) {
                            this.scene.events.emit('baseAttacked', this.damage);
                            this.destroy();
                        }
                    }
                });
            }
        });
    }

    private die(): void {
        this.isDead = true;

        // Stop path following
        if (this.pathTween) {
            this.pathTween.stop();
        }

        // Spawn crystal reward
        this.scene.events.emit('enemyDefeated', {
            x: this.x,
            y: this.y,
            crystalReward: this.crystalReward
        });

        // Death animation
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scale: 0.5,
            duration: 200,
            onComplete: () => this.destroy()
        });
    }

    public hasReachedEnd(): boolean {
        return this.pathFollower.t >= 1;
    }

    public getDamage(): number {
        return this.damage;
    }

    public getCrystalReward(): number {
        return this.crystalReward;
    }

    destroy(fromScene?: boolean): void {
        this.isDead = true;

        if (this.pathTween) {
            this.pathTween.stop();
        }

        if (this.slowTimer) {
            this.slowTimer.destroy();
        }

        super.destroy(fromScene);
    }
}

// Enemy type configurations
export const EnemyConfigs: Record<EnemyType, EnemyConfig> = {
    [EnemyType.GOBLIN]: {
        health: 50,
        speed: 100,
        damage: 10,
        crystalReward: 5,
        scale: 1
    },
    [EnemyType.CARRIER]: {
        health: 100,
        speed: 80,
        damage: 15,
        crystalReward: 15,
        scale: 1.2
    },
    [EnemyType.OGRE]: {
        health: 300,
        speed: 50,
        damage: 30,
        crystalReward: 30,
        scale: 1.5
    }
}; 