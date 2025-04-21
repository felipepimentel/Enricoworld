import { Scene } from 'phaser';
import { PARTICLES } from '../constants/GameRules';

export class ParticleSystem {
    private scene: Scene;
    private emitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter>;

    constructor(scene: Scene) {
        this.scene = scene;
        this.emitters = new Map();
        this.initializeEmitters();
    }

    private initializeEmitters(): void {
        // Build particles
        this.createEmitter('build', {
            tint: PARTICLES.BUILD.COLOR,
            scale: { start: 1, end: 0 },
            speed: { min: 50, max: 100 },
            angle: { min: 0, max: 360 },
            lifespan: PARTICLES.BUILD.DURATION * 1000,
            blendMode: 'ADD'
        });

        // Damage particles
        this.createEmitter('damage', {
            tint: PARTICLES.DAMAGE.COLOR,
            scale: { start: 0.5, end: 0 },
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            lifespan: 500,
            blendMode: 'ADD'
        });

        // Resource particles
        this.createEmitter('resource', {
            tint: PARTICLES.RESOURCE.COLOR,
            scale: { start: 0.5, end: 0 },
            speed: { min: 50, max: 100 },
            angle: { min: 0, max: 360 },
            lifespan: 800,
            blendMode: 'ADD'
        });

        // Dash particles
        this.createEmitter('dash', {
            tint: PARTICLES.DASH.COLOR,
            scale: { start: 0.3, end: 0 },
            speed: { min: 0, max: 20 },
            lifespan: 300,
            blendMode: 'ADD',
            frequency: 50
        });
    }

    private createEmitter(key: string, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig): void {
        const particles = this.scene.add.particles('particle');
        this.emitters.set(key, particles.createEmitter({
            ...config,
            on: false
        }));
    }

    createBuildEffect(position: Phaser.Math.Vector2): void {
        const emitter = this.emitters.get('build');
        if (emitter) {
            emitter.setPosition(position.x, position.y);
            emitter.explode(PARTICLES.BUILD.COUNT);
        }
    }

    createDestroyEffect(position: Phaser.Math.Vector2, tint: number): void {
        const emitter = this.emitters.get('build'); // Reuse build emitter with different color
        if (emitter) {
            emitter.setTint(tint);
            emitter.setPosition(position.x, position.y);
            emitter.explode(PARTICLES.DESTROY.COUNT);
            emitter.setTint(PARTICLES.BUILD.COLOR); // Reset color
        }
    }

    createDamageEffect(position: Phaser.Math.Vector2, amount: number): void {
        const emitter = this.emitters.get('damage');
        if (emitter) {
            const count = Phaser.Math.Between(PARTICLES.DAMAGE.COUNT.MIN, PARTICLES.DAMAGE.COUNT.MAX);
            emitter.setPosition(position.x, position.y);
            emitter.explode(count);

            // Create damage number
            const text = this.scene.add.text(position.x, position.y - 20, amount.toString(), {
                fontSize: '16px',
                color: '#ff0000'
            });
            text.setOrigin(0.5);

            this.scene.tweens.add({
                targets: text,
                y: text.y - 30,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => text.destroy()
            });
        }
    }

    createDashEffect(position: Phaser.Math.Vector2): void {
        const emitter = this.emitters.get('dash');
        if (emitter) {
            emitter.setPosition(position.x, position.y);
            emitter.start();
            this.scene.time.delayedCall(PARTICLES.DASH.DURATION * 1000, () => {
                emitter.stop();
            });
        }
    }

    createResourceEffect(position: Phaser.Math.Vector2): void {
        const emitter = this.emitters.get('resource');
        if (emitter) {
            emitter.setPosition(position.x, position.y);
            emitter.explode(PARTICLES.RESOURCE.COUNT);
        }
    }

    destroy(): void {
        this.emitters.forEach(emitter => {
            emitter.stop();
            emitter.remove();
        });
        this.emitters.clear();
    }
} 