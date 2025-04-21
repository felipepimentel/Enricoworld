// This file is now redundant because we've moved the Tower class into Structure.ts
// This allows for better code organization and prevents inconsistencies.
// All Tower functionality is now in Structure.ts 

import Phaser from 'phaser';
import { DamageType, STRUCTURES, StructureTypeEnum } from '../constants/GameRules';
import { Enemy } from './Enemy';
import { Structure, StructureType } from './Structure';

export class Tower extends Structure {
    private range: number;
    private damage: number;
    private attackSpeed: number;
    private attackType: DamageType;
    private lastAttackTime: number = 0;
    private projectiles: Phaser.GameObjects.Group;
    private rangeCircle: Phaser.GameObjects.Arc;
    private target?: Enemy;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super({
            scene,
            x,
            y,
            type: StructureType.TOWER
        });

        const config = STRUCTURES[StructureTypeEnum.TOWER];
        const levelConfig = config.levels[this.getLevel()];

        // Set tower-specific properties
        this.range = levelConfig.range;
        this.damage = levelConfig.damage;
        this.attackSpeed = levelConfig.attackSpeed;
        this.attackType = levelConfig.damageType || DamageType.PHYSICAL;

        // Create projectiles group
        this.projectiles = this.scene.add.group({
            classType: Phaser.GameObjects.Image,
            defaultKey: 'projectile',
            maxSize: 10
        });

        // Create range circle (invisible by default)
        this.rangeCircle = this.scene.add.circle(this.x, this.y, this.range, 0xffffff, 0.2);
        this.rangeCircle.setStrokeStyle(2, 0xffffff, 0.8);
        this.rangeCircle.setDepth(1);
        this.rangeCircle.setVisible(false);

        // Add hover interaction
        this.setInteractive();
        this.on('pointerover', () => this.rangeCircle.setVisible(true));
        this.on('pointerout', () => this.rangeCircle.setVisible(false));
    }

    public update(time: number, delta: number, enemies: Enemy[]): void {
        super.update(time, delta);

        if (!this.isActive()) return;

        // Find the closest enemy in range
        this.findTarget(enemies);

        // Attack if we have a target and cooldown has passed
        if (this.target && (time - this.lastAttackTime >= this.attackSpeed)) {
            this.attack(time);
        }

        // Update projectiles
        this.updateProjectiles();
    }

    public upgrade(): boolean {
        const upgraded = super.upgrade();

        if (upgraded) {
            const config = STRUCTURES[StructureTypeEnum.TOWER];
            const levelConfig = config.levels[this.getLevel()];

            // Update tower-specific properties
            this.range = levelConfig.range;
            this.damage = levelConfig.damage;
            this.attackSpeed = levelConfig.attackSpeed;
            this.attackType = levelConfig.damageType || DamageType.PHYSICAL;

            // Update range circle
            this.rangeCircle.setRadius(this.range);

            return true;
        }

        return false;
    }

    private findTarget(enemies: Enemy[]): void {
        if (!enemies || enemies.length === 0) {
            this.target = undefined;
            return;
        }

        // Find closest enemy in range
        let closestDistance = this.range;
        let closestEnemy: Enemy | undefined;

        for (const enemy of enemies) {
            if (!enemy.isActive()) continue;

            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                enemy.x, enemy.y
            );

            if (distance <= this.range && distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }

        this.target = closestEnemy;
    }

    private attack(time: number): void {
        if (!this.target) return;

        // Create projectile
        const projectile = this.projectiles.get(this.x, this.y) as Phaser.GameObjects.Image;
        if (!projectile) return;

        projectile.setActive(true);
        projectile.setVisible(true);
        projectile.setData('target', this.target);
        projectile.setData('damage', this.damage);
        projectile.setData('damageType', this.attackType);

        // Update attack time
        this.lastAttackTime = time;

        // Play attack sound/animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 100,
            yoyo: true
        });
    }

    private updateProjectiles(): void {
        const projectiles = this.projectiles.getChildren();

        for (const proj of projectiles) {
            const projectile = proj as Phaser.GameObjects.Image;
            const target = projectile.getData('target') as Enemy;

            if (!target || !target.active) {
                projectile.setActive(false);
                projectile.setVisible(false);
                continue;
            }

            // Move projectile towards target
            const speed = 5;
            const angle = Phaser.Math.Angle.Between(
                projectile.x, projectile.y,
                target.x, target.y
            );

            projectile.rotation = angle;

            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            projectile.x += vx;
            projectile.y += vy;

            // Check for hit
            const distance = Phaser.Math.Distance.Between(
                projectile.x, projectile.y,
                target.x, target.y
            );

            if (distance < 10) {
                // Hit target
                const damage = projectile.getData('damage');
                const damageType = projectile.getData('damageType');

                target.takeDamage({
                    amount: damage,
                    type: damageType,
                    source: this
                });

                // Hide projectile
                projectile.setActive(false);
                projectile.setVisible(false);
            }
        }
    }

    public destroy(fromScene?: boolean): void {
        if (this.rangeCircle) this.rangeCircle.destroy();
        if (this.projectiles) {
            this.projectiles.clear(true, true);
            this.projectiles.destroy(true);
        }
        super.destroy(fromScene);
    }

    public getRange(): number {
        return this.range;
    }

    public getDamage(): number {
        return this.damage;
    }

    public getAttackSpeed(): number {
        return this.attackSpeed;
    }
} 