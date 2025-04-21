import { Scene } from 'phaser';
import { PLAYER } from '../constants/GameRules';
import { ParticleSystem } from './ParticleSystem';

export class DashSystem {
    private scene: Scene;
    private lastDashTime: number = 0;
    private isDashing: boolean = false;
    private dashVelocity: Phaser.Math.Vector2;
    private particleSystem?: ParticleSystem;

    constructor(scene: Scene, particleSystem?: ParticleSystem) {
        this.scene = scene;
        this.particleSystem = particleSystem;
        this.dashVelocity = new Phaser.Math.Vector2(0, 0);
    }

    canDash(): boolean {
        const now = this.scene.time.now;
        return now - this.lastDashTime >= PLAYER.DASH.COOLDOWN * 1000;
    }

    dash(gameObject: Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.Body }, direction: Phaser.Math.Vector2): void {
        if (!this.canDash() || this.isDashing) return;

        this.isDashing = true;
        this.lastDashTime = this.scene.time.now;

        // Normalize and scale the direction vector
        direction.normalize();
        this.dashVelocity.copy(direction).scale(PLAYER.DASH.SPEED * PLAYER.DASH.DISTANCE);

        // Apply velocity
        gameObject.body.setVelocity(this.dashVelocity.x, this.dashVelocity.y);

        // Create dash particles if particle system exists
        if (this.particleSystem) {
            this.particleSystem.createDashEffect(gameObject.body.position);
        }

        // Reset after dash duration
        this.scene.time.delayedCall(PLAYER.DASH.DURATION * 1000, () => {
            this.isDashing = false;
            gameObject.body.setVelocity(0, 0);
        });
    }

    getDashProgress(): number {
        if (this.canDash()) return 1;
        const now = this.scene.time.now;
        return Math.min(1, (now - this.lastDashTime) / (PLAYER.DASH.COOLDOWN * 1000));
    }

    isCurrentlyDashing(): boolean {
        return this.isDashing;
    }
} 