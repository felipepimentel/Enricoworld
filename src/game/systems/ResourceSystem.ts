import { Scene } from 'phaser';
import { GRID, RESOURCES } from '../constants/GameRules';
import { ParticleSystem } from './ParticleSystem';

export class ResourceSystem {
    private scene: Scene;
    private resources: number;
    private combo: number = 0;
    private lastKillTime: number = 0;
    private comboText?: Phaser.GameObjects.Text;
    private resourceText: Phaser.GameObjects.Text;
    private particleSystem?: ParticleSystem;

    constructor(scene: Scene, particleSystem?: ParticleSystem) {
        this.scene = scene;
        this.resources = RESOURCES.INITIAL;
        this.particleSystem = particleSystem;

        // Create resource display
        this.resourceText = scene.add.text(16, 16, `Resources: ${this.resources}`, {
            fontSize: '24px',
            color: '#ffffff'
        });
        this.resourceText.setScrollFactor(0);

        // Create combo display
        this.comboText = scene.add.text(16, 48, '', {
            fontSize: '20px',
            color: '#ffff00'
        });
        this.comboText.setScrollFactor(0);
        this.comboText.setAlpha(0);

        // Start combo check timer
        this.scene.time.addEvent({
            delay: 100, // Check every 100ms
            callback: this.checkCombo,
            callbackScope: this,
            loop: true
        });
    }

    private checkCombo(): void {
        const now = this.scene.time.now;
        if (this.combo > 0 && now - this.lastKillTime > RESOURCES.COMBO.WINDOW * 1000) {
            this.resetCombo();
        }
    }

    private resetCombo(): void {
        this.combo = 0;
        if (this.comboText) {
            this.scene.tweens.add({
                targets: this.comboText,
                alpha: 0,
                duration: 200
            });
        }
    }

    private updateComboDisplay(): void {
        if (this.comboText && this.combo > 1) {
            this.comboText.setText(`Combo x${this.combo} (${Math.round(this.getComboMultiplier() * 100)}%)`);
            this.comboText.setAlpha(1);
        }
    }

    getComboMultiplier(): number {
        return 1 + (this.combo - 1) * RESOURCES.COMBO.MULTIPLIER;
    }

    spawnResourcePile(x: number, y: number): void {
        const isRare = Math.random() < RESOURCES.PILES.RARE.CHANCE;
        const amount = isRare
            ? Phaser.Math.Between(RESOURCES.PILES.RARE.MIN, RESOURCES.PILES.RARE.MAX)
            : Phaser.Math.Between(RESOURCES.PILES.NORMAL.MIN, RESOURCES.PILES.NORMAL.MAX);

        // Create resource sprite
        const pile = this.scene.add.sprite(x, y, 'resource_crystal');
        pile.setScale(isRare ? 1.2 : 1);
        pile.setTint(isRare ? 0xffd700 : 0xccccff);

        // Add collection area
        const collectionArea = this.scene.add.circle(x, y, GRID.CELL_SIZE / 2);
        this.scene.physics.add.existing(collectionArea, true);

        // Add collection callback
        this.scene.physics.add.overlap(
            this.scene.builder,
            collectionArea,
            () => {
                this.addResources(amount);
                if (this.particleSystem) {
                    this.particleSystem.createResourceEffect(new Phaser.Math.Vector2(x, y));
                }
                pile.destroy();
                collectionArea.destroy();
            }
        );

        // Add floating animation
        this.scene.tweens.add({
            targets: pile,
            y: y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    addResources(amount: number): void {
        this.resources += amount;
        this.updateResourceDisplay();

        // Show floating text
        const text = this.scene.add.text(
            this.resourceText.x + 100,
            this.resourceText.y,
            `+${amount}`,
            { fontSize: '20px', color: '#00ff00' }
        );
        text.setScrollFactor(0);

        this.scene.tweens.add({
            targets: text,
            alpha: 0,
            y: text.y - 20,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    spendResources(amount: number): boolean {
        if (this.resources >= amount) {
            this.resources -= amount;
            this.updateResourceDisplay();
            return true;
        }
        return false;
    }

    onEnemyKilled(position: Phaser.Math.Vector2, reward: number): void {
        const now = this.scene.time.now;

        // Update combo
        if (now - this.lastKillTime <= RESOURCES.COMBO.WINDOW * 1000) {
            this.combo++;
        } else {
            this.combo = 1;
        }
        this.lastKillTime = now;
        this.updateComboDisplay();

        // Add resources with combo multiplier
        const finalReward = Math.floor(reward * this.getComboMultiplier());
        this.addResources(finalReward);

        // Spawn resource pile with small probability
        if (Math.random() < 0.2) { // 20% chance
            this.spawnResourcePile(position.x, position.y);
        }
    }

    private updateResourceDisplay(): void {
        this.resourceText.setText(`Resources: ${this.resources}`);
    }

    getCurrentResources(): number {
        return this.resources;
    }

    getCurrentCombo(): number {
        return this.combo;
    }

    destroy(): void {
        this.resourceText.destroy();
        if (this.comboText) {
            this.comboText.destroy();
        }
    }
} 