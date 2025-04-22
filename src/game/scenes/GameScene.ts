import Phaser from 'phaser';
import { STRUCTURES } from '../constants/GameRules';
import { Builder } from '../objects/Builder';
import { StructureType, Tower, Wall } from '../objects/Structure';
import { Trap } from '../objects/Trap';
import { WaveSystem } from '../systems/WaveSystem';

export default class GameScene extends Phaser.Scene {
    private builder!: Builder;
    private structures: Phaser.GameObjects.Group;
    private waveSystem!: WaveSystem;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private map!: Phaser.Tilemaps.Tilemap | any;
    private spawnPoints: Phaser.Math.Vector2[] = [];
    private paths: Phaser.Curves.Path[] = [];
    private selectedStructureType: StructureType | null = null;
    private crystalText!: Phaser.GameObjects.Text;
    private waveText!: Phaser.GameObjects.Text;
    private tutorialText!: Phaser.GameObjects.Text;
    private baseHealth: number = 100;
    private baseHealthText!: Phaser.GameObjects.Text;
    private effectsLayer!: Phaser.GameObjects.Container;
    private crystals: Phaser.GameObjects.Group;
    private obstaclesGroup?: Phaser.Physics.Arcade.StaticGroup;
    private structuresCollider?: Phaser.Physics.Arcade.Collider;

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Track if tilemap loading failed
        let tilemapFailed = false;

        // Create placeholder function for missing assets
        this.load.on('filecomplete', (key: string, type: string) => {
            console.log(`Loaded: ${key} (${type})`);
        });

        this.load.on('loaderror', (file: any) => {
            console.log(`Could not load: ${file.key}`);

            if (file.key === 'level1') {
                tilemapFailed = true;
                // Create and load a placeholder tilemap
                this.createPlaceholderTilemap();
            }
            else if (file.type === 'image' || file.type === 'spritesheet') {
                this.createPlaceholderTexture(file.key, file.type === 'spritesheet' ? file.config : null);
            }
        });

        // Register a callback after all assets are loaded
        this.load.on('complete', () => {
            // Ensure builder spritesheet has proper frames to avoid animation errors
            if (this.textures.exists('builder')) {
                const texture = this.textures.get('builder');
                if (!texture.has('1')) {
                    // If frames are missing, generate frames programmatically
                    const frameNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'];

                    // Check if texture frames already exist from the placeholder
                    if (texture.frames && Object.keys(texture.frames).length > 0) {
                        console.log("Builder frames exist, no need to generate");
                    } else {
                        console.log("Generating builder frames");
                        // Add frames based on spritesheet configuration
                        const config = {
                            frameWidth: 32,
                            frameHeight: 32
                        };

                        let frames = [];
                        for (let i = 0; i < 16; i++) {
                            frames.push({
                                name: i,
                                sourceIndex: 0,
                                cutX: i * config.frameWidth,
                                cutY: 0,
                                cutWidth: config.frameWidth,
                                cutHeight: config.frameHeight,
                                x: 0,
                                y: 0,
                                width: config.frameWidth,
                                height: config.frameHeight
                            });
                        }

                        this.textures.get('builder').add(frames);
                    }
                }
            }
        });

        // Load tilemap
        this.load.tilemapTiledJSON('level1', '/assets/maps/level1.json');
        this.load.image('terrain-tiles', '/assets/sprites/terrain.png');

        // Load structure sprites
        this.load.image('structure_wall', '/assets/sprites/structures/wall/level1.png');
        this.load.image('structure_tower', '/assets/sprites/structures/tower/level1.png');
        this.load.image('structure_trap', '/assets/sprites/structures/trap/level1.png');

        // Load structure level upgrades
        this.load.image('structure_wall_2', '/assets/sprites/structures/wall/level2.png');
        this.load.image('structure_wall_3', '/assets/sprites/structures/wall/level3.png');
        this.load.image('structure_tower_2', '/assets/sprites/structures/tower/level2.png');
        this.load.image('structure_tower_3', '/assets/sprites/structures/tower/level3.png');
        this.load.image('structure_trap_2', '/assets/sprites/structures/trap/level2.png');
        this.load.image('structure_trap_3', '/assets/sprites/structures/trap/level3.png');

        // Load builder and tools
        this.load.spritesheet('builder', '/assets/sprites/builder.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.image('hammer', '/assets/sprites/hammer.png');

        // Load enemy sprites
        this.load.spritesheet('goblin', '/assets/sprites/enemies/basic_enemy.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.spritesheet('carrier', '/assets/sprites/enemies/carrier.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.spritesheet('ogre', '/assets/sprites/enemies/ogre.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Load projectile and effects
        this.load.image('projectile', '/assets/sprites/projectile.png');
        this.load.image('particle', '/assets/sprites/particle.png');
        this.load.image('crystal', '/assets/sprites/resource_crystal.png');
    }

    private createPlaceholderTexture(key: string, spriteConfig: any = null): void {
        console.log(`Creating placeholder for: ${key}`);

        // Extract type from key for color selection
        let color = '#ffffff';
        if (key.includes('wall')) color = '#8888ff';
        if (key.includes('tower')) color = '#ff8888';
        if (key.includes('trap')) color = '#88ff88';
        if (key.includes('enemy') || key.includes('goblin') || key.includes('carrier') || key.includes('ogre')) color = '#ff0000';
        if (key.includes('projectile')) color = '#ffff00';
        if (key.includes('crystal')) color = '#00ffff';
        if (key.includes('particle')) color = '#ff00ff';
        if (key.includes('builder')) color = '#00ff00';
        if (key.includes('hammer')) color = '#888888';

        if (spriteConfig) {
            // Create placeholder spritesheet
            const width = spriteConfig.frameWidth;
            const height = spriteConfig.frameHeight;
            const maxFrames = 16; // Arbitrary limit

            const canvas = this.textures.createCanvas(key, width * maxFrames, height);
            const ctx = canvas.getContext();

            // Draw different frames
            for (let i = 0; i < maxFrames; i++) {
                ctx.fillStyle = color;
                ctx.fillRect(i * width, 0, width, height);
                ctx.strokeStyle = '#000000';
                ctx.strokeRect(i * width, 0, width, height);

                // Add frame number
                ctx.fillStyle = '#000000';
                ctx.font = `${Math.floor(width / 3)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(i.toString(), i * width + width / 2, height / 2);
            }

            canvas.refresh();

            // Add spritesheet data
            this.textures.get(key).setFrames([
                ...Array(maxFrames).fill(0).map((_, i) => ({
                    name: i,
                    sourceIndex: 0,
                    cutX: i * width,
                    cutY: 0,
                    cutWidth: width,
                    cutHeight: height,
                    x: 0,
                    y: 0,
                    width,
                    height
                }))
            ]);
        } else {
            // Create placeholder image
            const canvas = this.textures.createCanvas(key, 32, 32);
            const ctx = canvas.getContext();

            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 32, 32);
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(0, 0, 32, 32);

            // Add first character of the key
            ctx.fillStyle = '#000000';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(key.charAt(0).toUpperCase(), 16, 16);

            canvas.refresh();
        }
    }

    private createPlaceholderTilemap(): void {
        console.log('Creating placeholder tilemap JSON');

        // Create a simple placeholder tilemap - minimal valid tilemap JSON
        const placeholderTilemap = {
            width: 30,
            height: 20,
            tilewidth: 32,
            tileheight: 32,
            type: "map",
            version: 1.2,
            infinite: false,
            orientation: "orthogonal",
            renderorder: "right-down",
            tiledversion: "1.3.4",
            layers: [
                {
                    id: 1,
                    name: "ground",
                    width: 30,
                    height: 20,
                    type: "tilelayer",
                    visible: true,
                    opacity: 1,
                    x: 0,
                    y: 0,
                    data: Array(30 * 20).fill(1)
                },
                {
                    id: 2,
                    name: "obstacles",
                    width: 30,
                    height: 20,
                    type: "tilelayer",
                    visible: true,
                    opacity: 1,
                    x: 0,
                    y: 0,
                    data: Array(30 * 20).fill(0).map((_, i) => {
                        const x = i % 30;
                        const y = Math.floor(i / 30);

                        // Add obstacles around edges
                        if (x === 0 || y === 0 || x === 29 || y === 19) {
                            return 2;
                        }

                        // Add some random obstacles
                        if (Math.random() < 0.05 && x > 2 && y > 2 && x < 27 && y < 17) {
                            return 2;
                        }

                        return 0;
                    })
                },
                {
                    id: 3,
                    name: "spawns",
                    type: "objectgroup",
                    visible: true,
                    opacity: 1,
                    objects: [
                        {
                            id: 1,
                            name: "spawn1",
                            x: 0,
                            y: 192,
                            width: 0,
                            height: 0,
                            point: true
                        },
                        {
                            id: 2,
                            name: "spawn2",
                            x: 0,
                            y: 384,
                            width: 0,
                            height: 0,
                            point: true
                        }
                    ]
                },
                {
                    id: 4,
                    name: "paths",
                    type: "objectgroup",
                    visible: true,
                    opacity: 1,
                    objects: [
                        {
                            id: 3,
                            name: "path1",
                            x: 0,
                            y: 192,
                            width: 0,
                            height: 0,
                            polyline: [
                                { x: 0, y: 0 },
                                { x: 480, y: 0 },
                                { x: 480, y: 128 },
                                { x: 960, y: 128 }
                            ]
                        },
                        {
                            id: 4,
                            name: "path2",
                            x: 0,
                            y: 384,
                            width: 0,
                            height: 0,
                            polyline: [
                                { x: 0, y: 0 },
                                { x: 480, y: 0 },
                                { x: 480, y: -64 },
                                { x: 960, y: -64 }
                            ]
                        }
                    ]
                }
            ],
            tilesets: [
                {
                    name: "terrain",
                    firstgid: 1,
                    tilewidth: 32,
                    tileheight: 32,
                    tilecount: 2,
                    columns: 2,
                    image: "terrain-tiles"
                }
            ],
            properties: {
                isPlaceholder: true
            }
        };

        // Add the tilemap to the cache
        this.cache.tilemap.add('level1', { data: placeholderTilemap, format: Phaser.Tilemaps.Formats.TILED_JSON });
    }

    private create(): void {
        // Create the game map
        this.createMap();

        // Create the builder (player character)
        this.builder = new Builder(
            this,
            this.game.scale.width / 2,
            this.game.scale.height / 2
        );

        // Setup physics
        if (this.map.getLayer) { // Check if it's a real tilemap
            const obstaclesLayer = this.map.getLayer('obstacles')?.tilemapLayer;
            if (obstaclesLayer) {
                this.physics.add.collider(this.builder, obstaclesLayer);
            }
        } else if (this.obstaclesGroup) {
            // Use the obstacles group for collisions in development mode
            this.physics.add.collider(this.builder, this.obstaclesGroup);
        }

        // Setup groups to track game objects
        this.structures = this.add.group();
        this.crystals = this.add.group();

        // Set up input handling
        this.setupInput();

        // Create game elements
        this.createSpawnPointsAndPaths();

        // Make sure we have spawn points and paths
        if (this.spawnPoints.length === 0) {
            console.warn("No spawn points found, creating default spawn points");
            this.createDefaultSpawnsAndPaths();
        }

        // Setup wave system
        this.waveSystem = new WaveSystem(this, this.spawnPoints, this.paths);

        // Setup physics
        this.setupPhysics();

        // Create UI elements
        this.createUI();

        // Setup event listeners
        this.setupEventListeners();

        // Start tutorial sequence
        this.startTutorial();
    }

    private setupPhysics(): void {
        // Setup collision between builder and crystals
        this.physics.add.overlap(
            this.builder,
            this.crystals,
            this.collectCrystal,
            undefined,
            this
        );
    }

    private collectCrystal(builder: any, crystal: any): void {
        const amount = crystal.getData('amount') || 10;
        this.builder.collectCrystals(amount);

        // Create pickup effect
        this.createEffect('pickup', crystal.x, crystal.y);

        // Destroy crystal
        crystal.destroy();
    }

    private spawnCrystal(x: number, y: number, amount: number = 10): void {
        const crystal = this.physics.add.sprite(x, y, 'crystal');
        crystal.setData('amount', amount);
        crystal.setScale(0.75);

        // Add to crystal group
        this.crystals.add(crystal);

        // Add floating animation
        this.tweens.add({
            targets: crystal,
            y: y - 10,
            duration: 1500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    private createEffect(type: string, x: number, y: number): void {
        switch (type) {
            case 'pickup':
                // Create particles for pickup effect
                const particles = this.add.particles('particle');
                const emitter = particles.createEmitter({
                    x,
                    y,
                    speed: { min: 50, max: 100 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.5, end: 0 },
                    lifespan: 500,
                    quantity: 10,
                    tint: 0xffff00
                });

                // Stop emitting after 100ms and destroy after all particles are gone
                this.time.delayedCall(100, () => {
                    emitter.stop();
                    this.time.delayedCall(500, () => {
                        particles.destroy();
                    });
                });
                break;

            case 'build':
                // Create particles for build effect
                const buildParticles = this.add.particles('particle');
                const buildEmitter = buildParticles.createEmitter({
                    x,
                    y,
                    speed: { min: 30, max: 80 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.3, end: 0 },
                    lifespan: 800,
                    quantity: 15,
                    tint: 0x00ffff
                });

                // Stop emitting after 100ms and destroy after all particles are gone
                this.time.delayedCall(100, () => {
                    buildEmitter.stop();
                    this.time.delayedCall(800, () => {
                        buildParticles.destroy();
                    });
                });
                break;
        }
    }

    private createMap(): void {
        try {
            // Try to load the map from the provided tilemap
            this.map = this.make.tilemap({ key: 'level1' });

            // Try to add tileset
            try {
                const tiles = this.map.addTilesetImage('terrain', 'terrain-tiles');

                // Create layers
                if (tiles) {
                    const groundLayer = this.map.createLayer('ground', tiles);
                    const obstaclesLayer = this.map.createLayer('obstacles', tiles);

                    // Set collision on obstacles layer
                    if (obstaclesLayer) {
                        obstaclesLayer.setCollisionByExclusion([-1]);
                    }
                } else {
                    throw new Error("Failed to load tileset");
                }
            } catch (error) {
                console.error("Error creating layers:", error);
                throw new Error("Failed to create map layers");
            }
        } catch (error) {
            console.log("Creating development map as fallback");
            this.createDevelopmentMap();
        }
    }

    private createDevelopmentMap(): void {
        // Define map dimensions
        const mapWidth = 30;
        const mapHeight = 20;
        const tileSize = 32;

        // Create graphics for obstacles
        this.obstaclesGroup = this.physics.add.staticGroup();

        // Create a simple development environment
        for (let x = 0; x < mapWidth; x++) {
            for (let y = 0; y < mapHeight; y++) {
                // Add border walls
                if (x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1) {
                    const obstacle = this.add.rectangle(
                        x * tileSize + tileSize / 2,
                        y * tileSize + tileSize / 2,
                        tileSize,
                        tileSize,
                        0x888888
                    );
                    this.physics.add.existing(obstacle, true);
                    this.obstaclesGroup.add(obstacle);
                }
                // Add some random obstacles
                else if (Math.random() < 0.05 && x > 2 && y > 2 && x < mapWidth - 3 && y < mapHeight - 3) {
                    const obstacle = this.add.rectangle(
                        x * tileSize + tileSize / 2,
                        y * tileSize + tileSize / 2,
                        tileSize,
                        tileSize,
                        0x888888
                    );
                    this.physics.add.existing(obstacle, true);
                    this.obstaclesGroup.add(obstacle);
                }
            }
        }

        // Create a map-like object for development that supports basic operations
        this.map = {
            getObjectLayer: null, // We'll handle this in createSpawnPointsAndPaths
            getLayer: null,
            width: mapWidth,
            height: mapHeight,
            tileWidth: tileSize,
            tileHeight: tileSize
        };
    }

    update(time: number, delta: number): void {
        // Update the builder
        if (this.builder) {
            this.builder.update(time, delta);
        }

        // Update the wave system
        if (this.waveSystem) {
            this.waveSystem.update();
        }

        // Update structures
        if (this.structures && this.structures.getChildren().length > 0) {
            const enemies = this.waveSystem ? this.waveSystem.getActiveEnemies() : [];

            this.structures.getChildren().forEach((structure: any) => {
                if (structure.update) {
                    if (structure.getType() === StructureType.TRAP) {
                        structure.update(time, delta, enemies);
                    } else if (structure.getType() === StructureType.TOWER) {
                        structure.update(time, enemies);
                    } else {
                        structure.update(time, delta);
                    }
                }
            });
        }

        // Update UI elements
        this.updateUI();
    }

    private updateUI(): void {
        // Update crystal count display
        if (this.crystalText && this.builder) {
            this.crystalText.setText(`Crystals: ${this.builder.getCrystals()}`);
        }

        // Update wave information
        if (this.waveText && this.waveSystem) {
            const currentWave = this.waveSystem.getCurrentWave();
            const totalWaves = this.waveSystem.getTotalWaves();
            const status = this.waveSystem.isWaveInProgress() ? 'In Progress' : 'Preparing';
            this.waveText.setText(`Wave: ${currentWave}/${totalWaves} (${status})`);
        }

        // Update base health
        if (this.baseHealthText) {
            this.baseHealthText.setText(`Base: ${this.baseHealth}%`);
        }
    }

    private setupInput(): void {
        // Setup keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // Setup structure selection keys
        this.input.keyboard.on('keydown-ONE', () => {
            this.selectedStructureType = StructureType.WALL;
            console.log('Selected Wall');
        });

        this.input.keyboard.on('keydown-TWO', () => {
            this.selectedStructureType = StructureType.TOWER;
            console.log('Selected Tower');
        });

        this.input.keyboard.on('keydown-THREE', () => {
            this.selectedStructureType = StructureType.TRAP;
            console.log('Selected Trap');
        });

        // Setup clicks for building
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.selectedStructureType !== null) {
                this.tryBuildStructure(pointer.worldX, pointer.worldY);
            }
        });
    }

    private createSpawnPointsAndPaths(): void {
        // If we have a valid tilemap with objects
        if (this.map.getObjectLayer) {
            try {
                // Get spawn points from the map
                const spawnLayer = this.map.getObjectLayer('spawns');
                if (spawnLayer && spawnLayer.objects) {
                    spawnLayer.objects.forEach(spawnObj => {
                        this.spawnPoints.push(new Phaser.Math.Vector2(spawnObj.x, spawnObj.y));
                    });
                }

                // Get paths from the map
                const pathsLayer = this.map.getObjectLayer('paths');
                if (pathsLayer && pathsLayer.objects) {
                    pathsLayer.objects.forEach(pathObj => {
                        if (pathObj.polyline) {
                            const path = new Phaser.Curves.Path(pathObj.x, pathObj.y);
                            pathObj.polyline.forEach((point: any, index: number) => {
                                if (index === 0) return; // Skip the first point as it's the starting point
                                path.lineTo(pathObj.x + point.x, pathObj.y + point.y);
                            });
                            this.paths.push(path);
                        }
                    });
                }
            } catch (error) {
                console.error("Error loading spawn points or paths:", error);
                this.createDefaultSpawnsAndPaths();
            }
        } else {
            // Create default spawn points and paths for development
            this.createDefaultSpawnsAndPaths();
        }
    }

    private createDefaultSpawnsAndPaths(): void {
        console.log("No spawn points found, creating default spawn points");

        // Get screen dimensions
        const width = this.game.scale.width;
        const height = this.game.scale.height;

        // Base position (center-top)
        const baseX = width / 2;
        const baseY = height * 0.15; // 15% from top

        // Create spawn points (left and right sides)
        this.spawnPoints = [
            new Phaser.Math.Vector2(0, height * 0.4),  // Left entrance
            new Phaser.Math.Vector2(width, height * 0.4)  // Right entrance
        ];

        // Construct paths in H-shape
        // Left path: from left side to the base
        const leftPath = new Phaser.Curves.Path(0, height * 0.4);  // Left entrance
        leftPath.lineTo(width * 0.25, height * 0.4);               // Horizontal to left vertical
        leftPath.lineTo(width * 0.25, height * 0.6);               // Down to central horizontal
        leftPath.lineTo(width * 0.5, height * 0.6);                // Horizontal to center
        leftPath.lineTo(width * 0.5, height * 0.15);               // Up to base

        // Right path: from right side to the base
        const rightPath = new Phaser.Curves.Path(width, height * 0.4);  // Right entrance
        rightPath.lineTo(width * 0.75, height * 0.4);                   // Horizontal to right vertical
        rightPath.lineTo(width * 0.75, height * 0.6);                   // Down to central horizontal
        rightPath.lineTo(width * 0.5, height * 0.6);                    // Horizontal to center
        rightPath.lineTo(width * 0.5, height * 0.15);                   // Up to base

        this.paths = [leftPath, rightPath];

        // Create a visual representation of the base
        const baseGraphics = this.add.graphics();
        baseGraphics.fillStyle(0xff0000, 0.5);
        baseGraphics.fillCircle(baseX, baseY, 30);
        baseGraphics.lineStyle(2, 0xff0000, 1);
        baseGraphics.strokeCircle(baseX, baseY, 30);

        // Set builder initial position (center-bottom)
        const builderX = width * 0.5;
        const builderY = height * 0.8;
        if (this.builder) {
            this.builder.setPosition(builderX, builderY);
        }

        // Optional: create initial towers near the bottom as specified in level-1.md
        // Only create if we haven't already placed towers
        const existingTowers = this.structures ? this.structures.getChildren().filter(
            (s: any) => s.getType && s.getType() === StructureType.TOWER
        ) : [];

        if (existingTowers.length === 0 && this.structures) {
            // Create 4 initial towers at the bottom
            const towerPositions = [
                { x: width * 0.4, y: height * 0.75 },
                { x: width * 0.45, y: height * 0.75 },
                { x: width * 0.55, y: height * 0.75 },
                { x: width * 0.6, y: height * 0.75 }
            ];

            towerPositions.forEach(pos => {
                const tower = new Tower(this, pos.x, pos.y);
                this.structures.add(tower);
                tower.setActive(true);
                tower.setVisible(true);
            });

            console.log("Created 4 initial towers at the bottom entrance");
        }
    }

    private tryBuildStructure(x: number, y: number): void {
        if (!this.selectedStructureType) return;

        // Check if builder has enough crystals
        const structureTypeValue = this.selectedStructureType as unknown as any;
        const config = STRUCTURES[structureTypeValue];
        const cost = config.cost;

        if (this.builder.getCrystals() < cost) {
            console.log('Not enough crystals!');
            return;
        }

        // Create the structure
        let structure;
        switch (this.selectedStructureType) {
            case StructureType.WALL:
                structure = new Wall(this, x, y);
                break;
            case StructureType.TOWER:
                structure = new Tower(this, x, y);
                break;
            case StructureType.TRAP:
                structure = new Trap(this, x, y);
                break;
        }

        if (structure) {
            // Add to structures group
            this.structures.add(structure);

            // Deduct crystals
            this.builder.spendCrystals(cost);

            // Start building
            structure.startBuilding();

            // Create build effect
            this.createEffect('build', x, y);

            console.log(`Built ${this.selectedStructureType} at (${x}, ${y})`);
        }
    }

    private createUI(): void {
        // Create crystal count display
        this.crystalText = this.add.text(16, 16, 'Crystals: 0', {
            fontSize: '18px',
            color: '#ffffff'
        });
        this.crystalText.setScrollFactor(0);

        // Create wave info display
        this.waveText = this.add.text(16, 48, 'Wave: 0/0', {
            fontSize: '18px',
            color: '#ffffff'
        });
        this.waveText.setScrollFactor(0);

        // Create base health display
        this.baseHealthText = this.add.text(16, 80, 'Base: 100%', {
            fontSize: '18px',
            color: '#ffffff'
        });
        this.baseHealthText.setScrollFactor(0);

        // Create tutorial text
        this.tutorialText = this.add.text(
            this.game.scale.width / 2,
            this.game.scale.height - 100,
            '',
            {
                fontSize: '20px',
                color: '#ffffff',
                align: 'center',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }
        );
        this.tutorialText.setOrigin(0.5);
        this.tutorialText.setScrollFactor(0);
        this.tutorialText.setAlpha(0);
    }

    private setupEventListeners(): void {
        // Listen for crystal collection
        this.events.on('crystalCollected', (amount: number) => {
            this.builder.collectCrystals(amount);
        });

        // Listen for wave events
        this.events.on('waveStarted', (waveNumber: number) => {
            console.log(`Wave ${waveNumber} started`);
        });

        this.events.on('waveCompleted', (waveNumber: number) => {
            console.log(`Wave ${waveNumber} completed`);

            // Spawn some bonus crystals
            for (let i = 0; i < 3; i++) {
                const x = Phaser.Math.Between(100, this.game.scale.width - 100);
                const y = Phaser.Math.Between(100, this.game.scale.height - 100);
                this.spawnCrystal(x, y, 15);
            }
        });

        // Listen for trap triggers
        this.events.on('trapTriggered', (data: any) => {
            const target = data.target;
            const damage = data.damage;
            const slowFactor = data.slowFactor;

            if (target && target.takeDamage) {
                target.takeDamage({
                    amount: damage,
                    type: 'physical',
                    source: data.source
                });

                if (target.slowDown) {
                    target.slowDown(slowFactor, 2000); // Slow for 2 seconds
                }
            }
        });
    }

    private showMessage(message: string, duration: number = 3000): void {
        // Show tutorial message
        this.tutorialText.setText(message);

        // Fade in
        this.tweens.add({
            targets: this.tutorialText,
            alpha: 1,
            duration: 300,
            onComplete: () => {
                // Wait for duration then fade out
                this.time.delayedCall(duration, () => {
                    this.tweens.add({
                        targets: this.tutorialText,
                        alpha: 0,
                        duration: 300
                    });
                });
            }
        });
    }

    private startTutorial(): void {
        // Sequence of tutorial messages
        const messages = [
            'Welcome to the Tower Defense game!',
            'Use arrow keys to move the builder.',
            'Press 1, 2, or 3 to select a structure type.',
            'Click to build the selected structure.',
            'Defend your base from the incoming waves!'
        ];

        // Show messages in sequence
        let delay = 1000;
        messages.forEach((message, index) => {
            this.time.delayedCall(delay, () => {
                this.showMessage(message, 3000);
            });
            delay += 4000; // 3s display + 1s between messages
        });

        // Start first wave after tutorial
        this.time.delayedCall(delay, () => {
            this.waveSystem.startNextWave();
        });
    }
} 