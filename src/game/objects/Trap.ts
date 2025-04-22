import Phaser from 'phaser';
import { STRUCTURES, StructureTypeEnum } from '../constants/GameRules';
import { Enemy } from './Enemy';
import { Structure, StructureType } from './Structure';

export class Trap extends Structure {
    private damage: number;
    private slowFactor: number;
    private cooldown: number;
    private lastTriggerTime: number = 0;
    private trapReady: boolean = true;
    private rangeCircle: Phaser.GameObjects.Graphics;
    private range: number = 50; // Default detection range

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super({
            scene,
            x,
            y,
            type: StructureType.TRAP
        });

        const config = STRUCTURES[StructureTypeEnum.TRAP];
        const levelConfig = config.levels[this.getLevel()];

        // Set trap-specific properties
        this.damage = levelConfig.damage;
        this.slowFactor = levelConfig.slowFactor;
        this.cooldown = levelConfig.cooldown;

        // Create visual representation of range (invisible by default)
        this.rangeCircle = scene.add.graphics();
        this.rangeCircle.lineStyle(2, 0xff0000, 0.3);
        this.rangeCircle.strokeCircle(0, 0, this.range);
        this.rangeCircle.setVisible(false);
        this.rangeCircle.setPosition(this.x, this.y);

        // Add hover interaction
        this.setInteractive();
        this.on('pointerover', () => this.rangeCircle.setVisible(true));
        this.on('pointerout', () => this.rangeCircle.setVisible(false));
    }

    public update(time: number, delta: number, enemies: Enemy[]): void {
        super.update(time, delta);

        if (!this.isActive()) return;

        // Check if trap is ready to trigger
        if (this.trapReady && time - this.lastTriggerTime >= this.cooldown) {
            // Look for enemies in range
            for (const enemy of enemies) {
                if (!enemy.active) continue;

                // Calculate distance to enemy
                const distance = Phaser.Math.Distance.Between(
                    this.x, this.y,
                    enemy.x, enemy.y
                );

                // If enemy is in range, trigger the trap
                if (distance <= this.range) {
                    this.trigger(time, enemy);
                    break; // Only trigger for one enemy
                }
            }
        }
    }

    public trigger(time: number, enemy: Phaser.GameObjects.GameObject): void {
        if (!this.isActive()) return;

        if (this.trapReady && time - this.lastTriggerTime >= this.cooldown) {
            this.trapReady = false;
            this.lastTriggerTime = time;

            // Visual feedback
            this.setTint(0xff0000);

            // Emit event for damage and slow effect
            this.scene.events.emit('trapTriggered', {
                target: enemy,
                damage: this.damage,
                slowFactor: this.slowFactor,
                source: this
            });

            // Reset after cooldown
            this.scene.time.delayedCall(this.cooldown, () => {
                if (this.active) {
                    this.trapReady = true;
                    this.clearTint();
                }
            });
        }
    }

    public upgrade(): boolean {
        const upgraded = super.upgrade();

        if (upgraded) {
            const config = STRUCTURES[StructureTypeEnum.TRAP];
            const levelConfig = config.levels[this.getLevel()];

            // Update trap-specific properties
            this.damage = levelConfig.damage;
            this.slowFactor = levelConfig.slowFactor;
            this.cooldown = levelConfig.cooldown;

            return true;
        }

        return false;
    }

    public destroy(fromScene?: boolean): void {
        if (this.rangeCircle) this.rangeCircle.destroy();
        super.destroy(fromScene);
    }
} 