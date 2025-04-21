import { Scene } from 'phaser';
import { STRUCTURES } from '../constants/GameRules';
import { Structure } from '../objects/Structure';
import { ParticleSystem } from './ParticleSystem';
import { ResourceSystem } from './ResourceSystem';

export class UpgradeSystem {
    private scene: Scene;
    private resourceSystem: ResourceSystem;
    private particleSystem?: ParticleSystem;
    private upgradingStructures: Map<Structure, number> = new Map();
    private progressBars: Map<Structure, Phaser.GameObjects.Graphics> = new Map();

    constructor(scene: Scene, resourceSystem: ResourceSystem, particleSystem?: ParticleSystem) {
        this.scene = scene;
        this.resourceSystem = resourceSystem;
        this.particleSystem = particleSystem;
    }

    canUpgrade(structure: Structure): boolean {
        if (structure.level >= 3 || this.upgradingStructures.has(structure)) {
            return false;
        }

        const nextLevel = structure.level + 1;
        const cost = STRUCTURES.UPGRADE.COSTS[nextLevel];
        return this.resourceSystem.getCurrentResources() >= cost;
    }

    startUpgrade(structure: Structure): boolean {
        if (!this.canUpgrade(structure)) {
            return false;
        }

        const nextLevel = structure.level + 1;
        const cost = STRUCTURES.UPGRADE.COSTS[nextLevel];

        if (!this.resourceSystem.spendResources(cost)) {
            return false;
        }

        // Start upgrade progress
        this.upgradingStructures.set(structure, 0);
        this.createProgressBar(structure);

        // Create upgrade effect
        if (this.particleSystem) {
            this.particleSystem.createBuildEffect(structure.getPosition());
        }

        return true;
    }

    private createProgressBar(structure: Structure): void {
        const bar = this.scene.add.graphics();
        this.progressBars.set(structure, bar);
        this.updateProgressBar(structure, 0);
    }

    private updateProgressBar(structure: Structure, progress: number): void {
        const bar = this.progressBars.get(structure);
        if (!bar) return;

        const width = 50;
        const height = 6;
        const x = structure.x - width / 2;
        const y = structure.y - 40;

        bar.clear();

        // Background
        bar.fillStyle(0x000000, 0.8);
        bar.fillRect(x, y, width, height);

        // Progress
        bar.fillStyle(0x00ff00, 1);
        bar.fillRect(x, y, width * progress, height);
    }

    update(delta: number): void {
        this.upgradingStructures.forEach((progress, structure) => {
            const newProgress = progress + (delta / 1000) / STRUCTURES.UPGRADE.TIME;

            if (newProgress >= 1) {
                // Complete upgrade
                this.completeUpgrade(structure);
            } else {
                // Update progress
                this.upgradingStructures.set(structure, newProgress);
                this.updateProgressBar(structure, newProgress);
            }
        });
    }

    private completeUpgrade(structure: Structure): void {
        structure.upgrade();
        this.upgradingStructures.delete(structure);

        // Remove progress bar
        const bar = this.progressBars.get(structure);
        if (bar) {
            bar.destroy();
            this.progressBars.delete(structure);
        }

        // Create completion effect
        if (this.particleSystem) {
            this.particleSystem.createBuildEffect(structure.getPosition());
        }
    }

    cancelUpgrade(structure: Structure): void {
        if (!this.upgradingStructures.has(structure)) {
            return;
        }

        // Refund cost
        const nextLevel = structure.level + 1;
        const cost = STRUCTURES.UPGRADE.COSTS[nextLevel];
        this.resourceSystem.addResources(cost);

        // Clean up
        this.upgradingStructures.delete(structure);
        const bar = this.progressBars.get(structure);
        if (bar) {
            bar.destroy();
            this.progressBars.delete(structure);
        }
    }

    isUpgrading(structure: Structure): boolean {
        return this.upgradingStructures.has(structure);
    }

    getUpgradeProgress(structure: Structure): number {
        return this.upgradingStructures.get(structure) || 0;
    }

    destroy(): void {
        this.progressBars.forEach(bar => bar.destroy());
        this.progressBars.clear();
        this.upgradingStructures.clear();
    }
} 