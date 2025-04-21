import Phaser from 'phaser';
import { Structure, StructureType } from './Structure';

export class Wall extends Structure {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super({
            scene,
            x,
            y,
            type: StructureType.WALL
        });

        // Walls have higher health but no offensive capabilities
        this.setDepth(1); // Ensure wall is rendered above the ground
    }

    public update(time: number, delta: number): void {
        super.update(time, delta);

        // Walls don't need to do much in their update loop
        // except for what the base Structure class already handles
    }

    public upgrade(): boolean {
        const upgraded = super.upgrade();

        if (upgraded) {
            // Update wall appearance based on level
            // This could change the texture to a stronger-looking wall
            const frame = `wall_level_${this.getLevel()}`;
            if (this.scene.textures.exists('structures') &&
                this.scene.textures.get('structures').has(frame)) {
                this.setFrame(frame);
            }

            return true;
        }

        return false;
    }

    protected updateAppearance(): void {
        super.updateAppearance();

        // Add cracks based on HP percentage
        const hpPercentage = this.hp / this.maxHp;
        if (hpPercentage < 0.3) {
            this.setTexture(`structure_${this.type}_${this.level}_damaged_heavy`);
        } else if (hpPercentage < 0.6) {
            this.setTexture(`structure_${this.type}_${this.level}_damaged_medium`);
        } else if (hpPercentage < 0.9) {
            this.setTexture(`structure_${this.type}_${this.level}_damaged_light`);
        }
    }

    takeDamage(damage: { amount: number; type: 'physical' | 'explosive' }): void {
        super.takeDamage(damage);
        this.updateAppearance();
    }

    heal(amount: number): void {
        super.heal(amount);
        this.updateAppearance();
    }
} 