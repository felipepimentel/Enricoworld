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
    private targetsStructures: boolean = false;
    private nearbyStructures: Phaser.GameObjects.Container[] = [];
    private structureDetectionRadius: number = 150;
    private structureAttackCooldown: number = 0;
    private structureDamage: number = 50; // Damage when attacking structures

    constructor(scene: Phaser.Scene, type: EnemyType, path: Phaser.Curves.Path, config: EnemyConfig) {
        // Check if the path has getStartPoint method, otherwise get the first point from the path
        let startPoint;
        if (path.getStartPoint) {
            startPoint = path.getStartPoint();
        } else if (path.curves && path.curves.length > 0) {
            // For paths created with lineTo, get the starting point of the first curve
            startPoint = { x: path.curves[0].p0.x, y: path.curves[0].p0.y };
        } else {
            // Fallback to a default position if no valid start point is found
            console.warn('Path does not have a valid start point, using default (0, 0)');
            startPoint = { x: 0, y: 0 };
        }

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

        // Set special behavior for ogre to target structures
        if (this.type === EnemyType.OGRE) {
            this.targetsStructures = true;
        }

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
        // Calculate path length and duration based on enemy speed
        let pathLength;
        if (typeof this.path.getLength === 'function') {
            pathLength = this.path.getLength();
        } else if (this.path.curves && this.path.curves.length > 0) {
            // Calculate length by summing curve lengths
            pathLength = this.path.curves.reduce((total, curve) => total + (curve.getLength ? curve.getLength() : 100), 0);
        } else {
            // Fallback to a default length
            pathLength = 500;
        }

        const duration = (pathLength / this.speed) * 1000;

        // Create the tween for path following
        this.pathTween = this.scene.tweens.add({
            targets: this.pathFollower,
            t: 1,
            duration: duration,
            ease: 'Linear',
            onUpdate: () => {
                // Get current position on the path
                let position;
                if (typeof this.path.getPoint === 'function') {
                    position = this.path.getPoint(this.pathFollower.t);
                } else if (this.path.curves && this.path.curves.length > 0) {
                    // Manually calculate position on the path
                    const t = this.pathFollower.t;
                    const totalCurves = this.path.curves.length;
                    const curveIndex = Math.min(Math.floor(t * totalCurves), totalCurves - 1);
                    const curveT = (t * totalCurves) % 1;
                    const curve = this.path.curves[curveIndex];

                    if (curve.getPoint) {
                        position = curve.getPoint(curveT);
                    } else {
                        // Linear interpolation fallback
                        const startX = curve.p0 ? curve.p0.x : 0;
                        const startY = curve.p0 ? curve.p0.y : 0;
                        const endX = curve.p1 ? curve.p1.x : 100;
                        const endY = curve.p1 ? curve.p1.y : 100;

                        position = {
                            x: startX + (endX - startX) * curveT,
                            y: startY + (endY - startY) * curveT
                        };
                    }
                }

                if (!position) return;

                // Get previous position to determine direction
                const prevT = Math.max(0, this.pathFollower.t - 0.01);
                let prevPos;

                if (typeof this.path.getPoint === 'function') {
                    prevPos = this.path.getPoint(prevT);
                } else {
                    // Use similar logic as above to get previous position
                    const totalCurves = this.path.curves.length;
                    const curveIndex = Math.min(Math.floor(prevT * totalCurves), totalCurves - 1);
                    const curveT = (prevT * totalCurves) % 1;
                    const curve = this.path.curves[curveIndex];

                    if (curve.getPoint) {
                        prevPos = curve.getPoint(curveT);
                    } else {
                        // Linear interpolation fallback
                        const startX = curve.p0 ? curve.p0.x : 0;
                        const startY = curve.p0 ? curve.p0.y : 0;
                        const endX = curve.p1 ? curve.p1.x : 100;
                        const endY = curve.p1 ? curve.p1.y : 100;

                        prevPos = {
                            x: startX + (endX - startX) * curveT,
                            y: startY + (endY - startY) * curveT
                        };
                    }
                }

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

    update(time?: number, delta?: number): void {
        // Skip update if enemy is dead
        if (this.isDead) return;

        // Decrement structure attack cooldown
        if (this.structureAttackCooldown > 0 && delta) {
            this.structureAttackCooldown -= delta;
        }

        // Special behavior for enemies that target structures (Ogre)
        if (this.targetsStructures) {
            // Check for nearby structures periodically
            this.detectNearbyStructures();

            // If we found structures and our cooldown is ready, attack the closest one
            if (this.nearbyStructures.length > 0 && this.structureAttackCooldown <= 0) {
                this.attackNearestStructure();

                // Set cooldown for next attack (1 second)
                this.structureAttackCooldown = 1000;
            }
        }
    }

    private detectNearbyStructures(): void {
        if (!this.targetsStructures) return;

        // Clear previous structure list
        this.nearbyStructures = [];

        // Get all structures in the scene
        const structures = this.scene.children.getChildren()
            .filter(obj =>
                obj instanceof Phaser.GameObjects.Container &&
                (obj as any).getType &&
                typeof (obj as any).getType === 'function' &&
                // Check if it has a takeDamage method (is a structure)
                (obj as any).takeDamage &&
                typeof (obj as any).takeDamage === 'function'
            ) as Phaser.GameObjects.Container[];

        // Find structures within detection radius
        for (const structure of structures) {
            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                structure.x, structure.y
            );

            if (distance <= this.structureDetectionRadius) {
                this.nearbyStructures.push(structure);
            }
        }
    }

    private attackNearestStructure(): void {
        if (this.nearbyStructures.length === 0) return;

        // Find the closest structure
        let closestStructure = this.nearbyStructures[0];
        let shortestDistance = Phaser.Math.Distance.Between(
            this.x, this.y,
            closestStructure.x, closestStructure.y
        );

        for (let i = 1; i < this.nearbyStructures.length; i++) {
            const structure = this.nearbyStructures[i];
            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                structure.x, structure.y
            );

            if (distance < shortestDistance) {
                closestStructure = structure;
                shortestDistance = distance;
            }
        }

        // Attack the structure
        if ((closestStructure as any).takeDamage) {
            // Visual feedback - tint red briefly
            this.sprite.setTint(0xff0000);
            this.scene.time.delayedCall(100, () => {
                if (this.sprite && this.sprite.active) {
                    this.sprite.clearTint();
                }
            });

            // Deal damage to the structure
            (closestStructure as any).takeDamage(this.structureDamage);

            // If attacking a structure, briefly pause movement
            if (this.pathTween && !this.pathTween.paused) {
                this.pathTween.pause();
                this.scene.time.delayedCall(500, () => {
                    if (this.pathTween && !this.isDead) {
                        this.pathTween.resume();
                    }
                });
            }
        }
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

            // Calculate remaining path length
            let remainingLength;
            if (typeof this.path.getLength === 'function') {
                remainingLength = this.path.getLength() * (1 - progress);
            } else if (this.path.curves && this.path.curves.length > 0) {
                // Calculate total path length
                const totalLength = this.path.curves.reduce((total, curve) =>
                    total + (curve.getLength ? curve.getLength() : 100), 0);
                remainingLength = totalLength * (1 - progress);
            } else {
                // Fallback
                remainingLength = 500 * (1 - progress);
            }

            // Create new tween with slower speed for remaining path
            this.pathTween = this.scene.tweens.add({
                targets: this.pathFollower,
                t: 1,
                duration: (remainingLength / newSpeed) * 1000,
                ease: 'Linear',
                onUpdate: () => {
                    let position;
                    if (typeof this.path.getPoint === 'function') {
                        position = this.path.getPoint(this.pathFollower.t);
                    } else if (this.path.curves && this.path.curves.length > 0) {
                        // Get position with manual calculation
                        const t = this.pathFollower.t;
                        const totalCurves = this.path.curves.length;
                        const curveIndex = Math.min(Math.floor(t * totalCurves), totalCurves - 1);
                        const curveT = (t * totalCurves) % 1;
                        const curve = this.path.curves[curveIndex];

                        if (curve.getPoint) {
                            position = curve.getPoint(curveT);
                        } else {
                            // Linear interpolation fallback
                            position = {
                                x: curve.p0.x + (curve.p1.x - curve.p0.x) * curveT,
                                y: curve.p0.y + (curve.p1.y - curve.p0.y) * curveT
                            };
                        }
                    }
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

                // Calculate remaining length
                let remainingLength;
                if (typeof this.path.getLength === 'function') {
                    remainingLength = this.path.getLength() * (1 - progress);
                } else if (this.path.curves && this.path.curves.length > 0) {
                    // Calculate remaining length manually
                    const totalLength = this.path.curves.reduce((total, curve) =>
                        total + (curve.getLength ? curve.getLength() : 100), 0);
                    remainingLength = totalLength * (1 - progress);
                } else {
                    // Fallback
                    remainingLength = 500 * (1 - progress);
                }

                this.pathTween = this.scene.tweens.add({
                    targets: this.pathFollower,
                    t: 1,
                    duration: (remainingLength / this.baseSpeed) * 1000,
                    ease: 'Linear',
                    onUpdate: () => {
                        let position;
                        if (typeof this.path.getPoint === 'function') {
                            position = this.path.getPoint(this.pathFollower.t);
                        } else if (this.path.curves && this.path.curves.length > 0) {
                            // Get position with manual calculation
                            const t = this.pathFollower.t;
                            const totalCurves = this.path.curves.length;
                            const curveIndex = Math.min(Math.floor(t * totalCurves), totalCurves - 1);
                            const curveT = (t * totalCurves) % 1;
                            const curve = this.path.curves[curveIndex];

                            if (curve.getPoint) {
                                position = curve.getPoint(curveT);
                            } else {
                                // Linear interpolation fallback
                                position = {
                                    x: curve.p0.x + (curve.p1.x - curve.p0.x) * curveT,
                                    y: curve.p0.y + (curve.p1.y - curve.p0.y) * curveT
                                };
                            }
                        }
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

    public getType(): EnemyType {
        return this.type;
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
        health: 50,       // HP: 50 como especificado
        speed: 100,       // Velocidade: 2 unidades/segundo (~100 em unidades Phaser)
        damage: 10,       // Dano à base: 10
        crystalReward: 5, // Recompensa: 5 recursos
        scale: 1
    },
    [EnemyType.CARRIER]: {
        health: 100,       // HP: 100 como especificado
        speed: 80,         // Velocidade: 1.6 unidades/segundo (~80 em unidades Phaser)
        damage: 15,        // Dano à base: 15
        crystalReward: 15, // Recompensa: 15 recursos
        scale: 1.2
    },
    [EnemyType.OGRE]: {
        health: 300,       // HP: 300 como especificado 
        speed: 50,         // Velocidade: 1 unidade/segundo (~50 em unidades Phaser)
        damage: 30,        // Dano à base: 30
        crystalReward: 30, // Recompensa: 30 recursos
        scale: 1.5
    }
}; 