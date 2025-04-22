import Phaser from 'phaser';

export class Builder extends Phaser.Physics.Arcade.Sprite {
    private speed: number = 200;
    private crystals: number = 150; // Start with 150 resources as per level-1.md
    private hammer: Phaser.GameObjects.Sprite;
    private isBuilding: boolean = false;
    private buildingPreview?: Phaser.GameObjects.Sprite;
    private currentBuildType?: string;
    private structureCosts: Record<string, number> = {
        'wall': 30,
        'tower': 75,
        'trap': 50
    };

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'builder');

        // Add builder to the scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Set builder properties
        this.setCollideWorldBounds(true);
        this.setSize(24, 24); // Smaller collision box
        this.setOffset(4, 8); // Adjust offset for collision box

        // Create hammer sprite that follows the builder
        try {
            this.hammer = scene.add.sprite(x, y, 'hammer');
            this.hammer.setOrigin(0.5, 0.5);
            this.hammer.setVisible(false);
            this.hammer.setDepth(1); // Ensure hammer renders above other objects
        } catch (error) {
            console.log("Error creating hammer sprite, creating placeholder");
            // Create a placeholder sprite
            const hammerCanvas = scene.textures.createCanvas('hammer_placeholder', 24, 24);
            const ctx = hammerCanvas.getContext();
            ctx.fillStyle = '#888888';
            ctx.fillRect(0, 0, 24, 24);
            ctx.fillStyle = '#333333';
            ctx.fillRect(8, 4, 8, 20);
            hammerCanvas.refresh();

            this.hammer = scene.add.sprite(x, y, 'hammer_placeholder');
            this.hammer.setOrigin(0.5, 0.5);
            this.hammer.setVisible(false);
            this.hammer.setDepth(1);
        }

        // Initialize animations
        this.createAnimations();

        // Emit initial crystal count
        this.scene.events.emit('crystalsUpdated', this.crystals);
    }

    private createAnimations(): void {
        const { anims } = this.scene;

        try {
            // Only create animations if they don't exist yet
            if (!anims.exists('walk-down')) {
                // Walking animations - use only frame 0 to avoid errors
                anims.create({
                    key: 'walk-down',
                    frames: [{ key: 'builder', frame: 0 }],
                    frameRate: 10,
                    repeat: -1
                });

                anims.create({
                    key: 'walk-up',
                    frames: [{ key: 'builder', frame: 0 }],
                    frameRate: 10,
                    repeat: -1
                });

                anims.create({
                    key: 'walk-side',
                    frames: [{ key: 'builder', frame: 0 }],
                    frameRate: 10,
                    repeat: -1
                });

                // Building animation
                anims.create({
                    key: 'build',
                    frames: [{ key: 'builder', frame: 0 }],
                    frameRate: 10,
                    repeat: 0
                });
            }
        } catch (error) {
            console.log("Creating development animations for builder");

            // Create fallback animations with single frame
            if (!anims.exists('walk-down')) {
                anims.create({
                    key: 'walk-down',
                    frames: [{ key: 'builder', frame: 0 }],
                    frameRate: 10,
                    repeat: -1
                });

                anims.create({
                    key: 'walk-up',
                    frames: [{ key: 'builder', frame: 0 }],
                    frameRate: 10,
                    repeat: -1
                });

                anims.create({
                    key: 'walk-side',
                    frames: [{ key: 'builder', frame: 0 }],
                    frameRate: 10,
                    repeat: -1
                });

                anims.create({
                    key: 'build',
                    frames: [{ key: 'builder', frame: 0 }],
                    frameRate: 10,
                    repeat: 0
                });
            }
        }

        // Set default frame
        this.setFrame(0);
    }

    update(time?: number, delta?: number): void {
        // Get the cursors from the scene if they weren't passed directly
        const cursors = (this.scene as any).cursors;

        if (!cursors) {
            // If cursors are not available, don't attempt movement
            return;
        }

        if (this.isBuilding) {
            // Update building preview to follow mouse
            const pointer = this.scene.input.activePointer;
            const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

            if (this.buildingPreview) {
                this.buildingPreview.setPosition(worldPoint.x, worldPoint.y);

                // Check if we can build here (close enough to builder and enough crystals)
                const distance = Phaser.Math.Distance.Between(this.x, this.y, worldPoint.x, worldPoint.y);
                const cost = this.currentBuildType ? this.structureCosts[this.currentBuildType] : 0;

                const canBuild = distance <= 100 && this.crystals >= cost;
                this.buildingPreview.setAlpha(canBuild ? 0.7 : 0.3);
                this.buildingPreview.setTint(canBuild ? 0xffffff : 0xff0000);
            }

            // Update hammer position and show it
            this.hammer.setPosition(this.x, this.y - 16);
            this.hammer.setVisible(true);
            return;
        }

        // Hide hammer when not building
        this.hammer.setVisible(false);

        // Movement
        const speed = this.speed;
        let velocityX = 0;
        let velocityY = 0;

        if (cursors.left.isDown) {
            velocityX = -speed;
            this.setFlipX(true);
            this.anims.play('walk-side', true);
        } else if (cursors.right.isDown) {
            velocityX = speed;
            this.setFlipX(false);
            this.anims.play('walk-side', true);
        }

        if (cursors.up.isDown) {
            velocityY = -speed;
            if (velocityX === 0) this.anims.play('walk-up', true);
        } else if (cursors.down.isDown) {
            velocityY = speed;
            if (velocityX === 0) this.anims.play('walk-down', true);
        }

        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= Math.SQRT1_2;
            velocityY *= Math.SQRT1_2;
        }

        this.setVelocity(velocityX, velocityY);

        // Stop animations if not moving
        if (velocityX === 0 && velocityY === 0) {
            this.anims.stop();
        }
    }

    startBuilding(buildType: string): void {
        // Don't start building if we don't have enough crystals
        const cost = this.structureCosts[buildType];
        if (this.crystals < cost) {
            // Show error message
            this.scene.events.emit('showMessage', 'Not enough crystals!', 1500);
            return;
        }

        this.isBuilding = true;
        this.currentBuildType = buildType;
        this.anims.play('build');

        // Create building preview
        if (this.buildingPreview) {
            this.buildingPreview.destroy();
        }

        const previewTexture = `structure_${buildType}`;

        if (this.scene.textures.exists(previewTexture)) {
            this.buildingPreview = this.scene.add.sprite(this.x, this.y, previewTexture);
        } else {
            // Create placeholder preview if texture doesn't exist
            const placeholderKey = `structure_${buildType}_preview`;

            if (!this.scene.textures.exists(placeholderKey)) {
                const canvas = this.scene.textures.createCanvas(placeholderKey, 32, 32);
                const ctx = canvas.getContext();

                // Color based on structure type
                let color = '#8888ff';
                if (buildType === 'tower') color = '#ff8888';
                if (buildType === 'trap') color = '#88ff88';

                ctx.fillStyle = color;
                ctx.fillRect(0, 0, 32, 32);
                ctx.strokeStyle = '#ffffff';
                ctx.strokeRect(0, 0, 32, 32);

                // Add structure type label
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(buildType.charAt(0).toUpperCase(), 16, 16);

                canvas.refresh();
            }

            this.buildingPreview = this.scene.add.sprite(this.x, this.y, placeholderKey);
        }

        this.buildingPreview.setAlpha(0.7);
        this.buildingPreview.setDepth(1);
    }

    stopBuilding(): void {
        this.isBuilding = false;
        this.currentBuildType = undefined;
        if (this.buildingPreview) {
            this.buildingPreview.destroy();
            this.buildingPreview = undefined;
        }
        this.hammer.setVisible(false);
    }

    build(x: number, y: number): boolean {
        if (!this.isBuilding || !this.currentBuildType) return false;

        // Check if builder is close enough to build
        const distance = Phaser.Math.Distance.Between(this.x, this.y, x, y);
        if (distance > 100) {
            // Too far away
            this.scene.events.emit('showMessage', 'Too far to build!', 1500);
            return false;
        }

        // Check if we have enough crystals
        const cost = this.structureCosts[this.currentBuildType];
        if (this.crystals < cost) {
            this.scene.events.emit('showMessage', 'Not enough crystals!', 1500);
            return false;
        }

        // Spend crystals
        this.spendCrystals(cost);

        // Trigger build animation
        this.anims.play('build');

        // Add build effects
        this.scene.time.delayedCall(150, () => {
            // Create particle effect at build location
            this.scene.events.emit('buildEffect', { x, y });
        });

        return true;
    }

    collectCrystals(amount: number): void {
        this.crystals += amount;
        // Emit event for UI update
        this.scene.events.emit('crystalsUpdated', this.crystals);
    }

    getCrystals(): number {
        return this.crystals;
    }

    getStructureCost(type: string): number {
        return this.structureCosts[type] || 0;
    }

    spendCrystals(amount: number): boolean {
        if (this.crystals >= amount) {
            this.crystals -= amount;
            // Emit event for UI update
            this.scene.events.emit('crystalsUpdated', this.crystals);
            return true;
        }
        return false;
    }

    destroy(fromScene?: boolean): void {
        if (this.hammer) this.hammer.destroy();
        if (this.buildingPreview) {
            this.buildingPreview.destroy();
        }
        super.destroy(fromScene);
    }
} 