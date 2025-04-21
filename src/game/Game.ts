import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import { PERFORMANCE } from './constants/GameRules';

export class Game extends Phaser.Game {
    constructor(containerId: string) {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: containerId,
            width: 1280,
            height: 720,
            backgroundColor: '#2d2d2d',
            pixelArt: true,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: process.env.NODE_ENV === 'development'
                }
            },
            scene: GameScene,
            fps: {
                target: PERFORMANCE.TARGET_FPS,
                forceSetTimeOut: true
            }
        };

        super(config);
    }

    preload(): void {
        // Load assets
        this.loadSprites();
        this.loadAudio();
    }

    private loadSprites(): void {
        const scene = this.scene.getScene('GameScene') as GameScene;
        
        // Load terrain tileset
        scene.load.image('terrain-tiles', 'assets/sprites/terrain.png');
        
        // Load structure sprites
        ['wall', 'tower', 'trap'].forEach(type => {
            // Base structures
            scene.load.image(`structure_${type}`, `assets/sprites/structures/${type}/level1.png`);
            scene.load.image(`structure_${type}_2`, `assets/sprites/structures/${type}/level2.png`);
            scene.load.image(`structure_${type}_3`, `assets/sprites/structures/${type}/level3.png`);

            // Damaged wall states
            if (type === 'wall') {
                [1, 2, 3].forEach(level => {
                    ['light', 'medium', 'heavy'].forEach(damage => {
                        scene.load.image(
                            `structure_wall_${level}_damaged_${damage}`,
                            `assets/sprites/structures/wall/level${level}_damaged_${damage}.png`
                        );
                    });
                });
            }
        });

        // Load projectiles
        scene.load.image('projectile', 'assets/sprites/projectile.png');

        // Load particles
        scene.load.image('particle', 'assets/sprites/particle.png');

        // Load resource crystals
        scene.load.image('resource_crystal', 'assets/sprites/resource_crystal.png');

        // Load builder character
        scene.load.spritesheet('builder', 'assets/sprites/builder.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Load enemies
        ['basic', 'fast', 'tank', 'flying'].forEach(type => {
            scene.load.spritesheet(
                `enemy_${type}`,
                `assets/sprites/enemies/${type}.png`,
                { frameWidth: 32, frameHeight: 32 }
            );
        });
    }

    private loadAudio(): void {
        const scene = this.scene.getScene('GameScene') as GameScene;

        // Load sound effects
        const sfx = [
            'build',
            'destroy',
            'upgrade',
            'damage',
            'repair',
            'collect',
            'shoot',
            'hit',
            'trap',
            'wave_start',
            'wave_complete'
        ];

        sfx.forEach(sound => {
            scene.load.audio(sound, `assets/audio/sfx/${sound}.mp3`);
        });

        // Load music
        scene.load.audio('background_music', 'assets/audio/music/background.mp3');
    }
} 