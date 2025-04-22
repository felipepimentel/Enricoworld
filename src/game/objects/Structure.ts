import Phaser from 'phaser';
import { DamageInfo, DamageType, STRUCTURES, StructureTypeEnum } from '../constants/GameRules';

export enum StructureType {
    WALL = 'wall',
    TOWER = 'tower',
    TRAP = 'trap'
}

export enum StructureState {
    PLACING = 'placing',
    BUILDING = 'building',
    ACTIVE = 'active',
    DAMAGED = 'damaged',
    UPGRADING = 'upgrading',
    DESTROYED = 'destroyed'
}

export interface StructureOptions {
    type: StructureType;
    x: number;
    y: number;
    scene: Phaser.Scene;
    health?: number;
    level?: number;
}

export class Structure extends Phaser.GameObjects.Sprite {
    protected type: StructureType;
    protected state: StructureState;
    protected currentHealth: number;
    protected maxHealth: number;
    protected level: number;
    protected buildProgress: number = 0;
    protected buildTime: number;
    protected damageResistance: number = 0;
    protected buildProgressBar?: Phaser.GameObjects.Graphics;
    protected healthBar?: Phaser.GameObjects.Graphics;

    constructor(options: StructureOptions) {
        const structureTypeValue = options.type as unknown as StructureTypeEnum;
        const config = STRUCTURES[structureTypeValue];
        const level = options.level || 0;
        const levelConfig = config.levels[level];

        super(options.scene, options.x, options.y, levelConfig.sprite);

        this.type = options.type;
        this.level = level;
        this.maxHealth = options.health || config.health;
        this.currentHealth = this.maxHealth;
        this.buildTime = config.buildTime;
        this.damageResistance = levelConfig.damageResistance || 0;
        this.state = StructureState.PLACING;

        this.scene.add.existing(this);
        this.createHealthBar();
    }

    public getType(): StructureType {
        return this.type;
    }

    public getState(): StructureState {
        return this.state;
    }

    public getLevel(): number {
        return this.level;
    }

    public getHealth(): number {
        return this.currentHealth;
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public startBuilding(): void {
        this.state = StructureState.BUILDING;
        this.setAlpha(0.7);
        this.createBuildProgressBar();
    }

    public update(time: number, delta: number): void {
        if (this.state === StructureState.BUILDING) {
            this.updateBuildProgress(delta);
        }

        this.updateHealthBar();
    }

    protected updateBuildProgress(delta: number): void {
        const progressIncrement = delta / this.buildTime;
        this.buildProgress += progressIncrement;

        if (this.buildProgress >= 1) {
            this.completeBuild();
        } else {
            this.updateBuildProgressBar();
        }
    }

    protected completeBuild(): void {
        this.state = StructureState.ACTIVE;
        this.setAlpha(1);
        this.buildProgress = 1;
        if (this.buildProgressBar) {
            this.buildProgressBar.destroy();
            this.buildProgressBar = undefined;
        }
        this.emit('build-complete', this);
    }

    public takeDamage(damageInfo: DamageInfo): number {
        if (this.state === StructureState.DESTROYED) return 0;

        let damage = damageInfo.amount;

        if (damageInfo.type !== DamageType.TRUE) {
            damage *= (1 - this.damageResistance);
        }

        damage = Math.max(1, Math.floor(damage));
        this.currentHealth -= damage;

        if (this.currentHealth <= 0) {
            this.destroy();
        } else {
            this.state = StructureState.DAMAGED;
            this.scene.tweens.add({
                targets: this,
                alpha: 0.6,
                duration: 100,
                yoyo: true
            });
        }

        return damage;
    }

    public repair(amount: number): void {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        if (this.currentHealth === this.maxHealth) {
            this.state = StructureState.ACTIVE;
        }
    }

    public canUpgrade(): boolean {
        const structureTypeValue = this.type as unknown as StructureTypeEnum;
        const config = STRUCTURES[structureTypeValue];
        return this.level < config.levels.length - 1;
    }

    public getUpgradeCost(): number {
        const structureTypeValue = this.type as unknown as StructureTypeEnum;
        const config = STRUCTURES[structureTypeValue];
        return this.canUpgrade() ? config.upgradeCosts[this.level] : 0;
    }

    public upgrade(): boolean {
        if (!this.canUpgrade()) return false;

        const structureTypeValue = this.type as unknown as StructureTypeEnum;
        const config = STRUCTURES[structureTypeValue];
        this.level++;
        const levelConfig = config.levels[this.level];

        try {
            const textureName = levelConfig.sprite;
            if (this.scene.textures.exists(textureName)) {
                this.setTexture(textureName);
            } else {
                this.createUpgradePlaceholder(this.type, this.level);
            }
        } catch (error) {
            console.log(`Failed to set texture for ${this.type} level ${this.level}`);
        }

        this.maxHealth = levelConfig.health || this.maxHealth;
        this.currentHealth = this.maxHealth;
        this.damageResistance = levelConfig.damageResistance || this.damageResistance;

        return true;
    }

    private createUpgradePlaceholder(type: StructureType, level: number): void {
        const textureName = `structure_${type}_${level + 1}`;

        if (this.scene.textures.exists(textureName)) {
            this.setTexture(textureName);
            return;
        }

        const baseColor = type === StructureType.WALL
            ? '#8888ff'
            : type === StructureType.TOWER
                ? '#ff8888'
                : '#88ff88';

        const brightnessAdjust = level * 0.1;
        const canvas = this.scene.textures.createCanvas(textureName, 32, 32);
        const ctx = canvas.getContext();

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 32, 32);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(0, 0, 32, 32);

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`L${level + 1}`, 16, 16);

        if (level > 0) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = level;
            ctx.strokeRect(2, 2, 28, 28);
        }

        canvas.refresh();
        this.setTexture(textureName);
    }

    public destroy(fromScene?: boolean): void {
        this.state = StructureState.DESTROYED;
        if (this.buildProgressBar) {
            this.buildProgressBar.destroy();
        }
        if (this.healthBar) {
            this.healthBar.destroy();
        }

        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            y: this.y - 10,
            angle: Phaser.Math.Between(-20, 20),
            duration: 300,
            onComplete: () => {
                super.destroy(fromScene);
            }
        });

        this.emit('destroyed', this);
    }

    protected createBuildProgressBar(): void {
        this.buildProgressBar = this.scene.add.graphics();
        this.updateBuildProgressBar();
    }

    protected updateBuildProgressBar(): void {
        if (!this.buildProgressBar) return;

        this.buildProgressBar.clear();

        this.buildProgressBar.fillStyle(0x000000, 0.8);
        this.buildProgressBar.fillRect(this.x - 20, this.y + 20, 40, 5);

        this.buildProgressBar.fillStyle(0x00ff00, 1);
        this.buildProgressBar.fillRect(this.x - 20, this.y + 20, 40 * this.buildProgress, 5);
    }

    protected createHealthBar(): void {
        this.healthBar = this.scene.add.graphics();
        this.updateHealthBar();
    }

    protected updateHealthBar(): void {
        if (!this.healthBar || this.state === StructureState.PLACING || this.state === StructureState.BUILDING) return;

        this.healthBar.clear();

        const healthRatio = this.currentHealth / this.maxHealth;

        if (healthRatio < 1) {
            this.healthBar.fillStyle(0x000000, 0.8);
            this.healthBar.fillRect(this.x - 20, this.y + 20, 40, 5);

            const healthColor = healthRatio > 0.6 ? 0x00ff00 : healthRatio > 0.3 ? 0xffff00 : 0xff0000;
            this.healthBar.fillStyle(healthColor, 1);
            this.healthBar.fillRect(this.x - 20, this.y + 20, 40 * healthRatio, 5);
        }
    }

    public isActive(): boolean {
        return this.state === StructureState.ACTIVE || this.state === StructureState.DAMAGED;
    }

    public getPosition(): Phaser.Math.Vector2 {
        return new Phaser.Math.Vector2(this.x, this.y);
    }
}

export class Wall extends Structure {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super({ type: StructureType.WALL, x, y, scene });
    }
}

export class Tower extends Structure {
    private range: number = 200;
    private damage: number = 20;
    private attackSpeed: number = 1000;
    private lastAttackTime: number = 0;
    private rangeCircle: Phaser.GameObjects.Graphics;
    private projectiles: Phaser.GameObjects.Group;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super({ type: StructureType.TOWER, x, y, scene });

        this.rangeCircle = scene.add.graphics();
        this.rangeCircle.lineStyle(2, 0x00ff00, 0.3);
        this.rangeCircle.strokeCircle(0, 0, this.range);
        this.rangeCircle.setVisible(false);
        this.rangeCircle.setPosition(this.x, this.y);

        this.projectiles = scene.add.group({
            classType: Phaser.GameObjects.Sprite,
            defaultKey: 'projectile',
            maxSize: 20,
            runChildUpdate: true
        });

        this.setInteractive();
        this.on('pointerover', () => this.rangeCircle.setVisible(true));
        this.on('pointerout', () => this.rangeCircle.setVisible(false));
    }

    public update(time: number, enemies: Phaser.GameObjects.GameObject[] | any): void {
        if (this.state === StructureState.BUILDING) return;

        if (time - this.lastAttackTime >= this.attackSpeed) {
            if (enemies && Array.isArray(enemies) && enemies.length > 0) {
                const target = this.findTarget(enemies);
                if (target) {
                    this.attack(target);
                    this.lastAttackTime = time;
                }
            }
        }
    }

    private findTarget(enemies: Phaser.GameObjects.GameObject[]): Phaser.GameObjects.GameObject | null {
        if (!enemies || !Array.isArray(enemies) || enemies.length === 0) {
            return null;
        }

        let closestEnemy = null;
        let closestDistance = this.range;

        for (const enemy of enemies) {
            if (!enemy || typeof enemy.x !== 'number' || typeof enemy.y !== 'number') {
                continue;
            }

            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                enemy.x, enemy.y
            );

            if (distance <= closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }

        return closestEnemy;
    }

    private attack(target: Phaser.GameObjects.GameObject): void {
        const projectile = this.projectiles.get() as Phaser.GameObjects.Sprite;
        if (!projectile) return;

        projectile.setPosition(this.x, this.y);
        projectile.setActive(true);
        projectile.setVisible(true);

        this.scene.tweens.add({
            targets: projectile,
            x: target.x,
            y: target.y,
            duration: 200,
            onComplete: () => {
                projectile.setActive(false);
                projectile.setVisible(false);
                this.scene.events.emit('projectileHit', { target, damage: this.damage });
            }
        });
    }
} 