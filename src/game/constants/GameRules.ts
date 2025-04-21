import { EnemyType } from '../objects/Enemy';

// Duplicate the enum here to avoid circular dependencies
export enum StructureTypeEnum {
    WALL = 'wall',
    TOWER = 'tower',
    TRAP = 'trap'
}

// Game Constants and Rules
export const GRID = {
    CELL_SIZE: 64,
    COLLISION_RADIUS: 20,
} as const;

export const PLAYER = {
    SPEED: {
        BASE: 5,
        ACCELERATION_TIME: 0.2,
        DECELERATION_TIME: 0.1,
    },
    DASH: {
        DISTANCE: 192, // 3 cells
        SPEED: 15,
        DURATION: 0.2,
        COOLDOWN: 3,
    },
} as const;

export const STRUCTURES = {
    [StructureTypeEnum.WALL]: {
        cost: 20,
        health: 200,
        damageResistance: 0.5,
        buildTime: 1500,
        levels: [
            { sprite: 'structure_wall', health: 200, damageResistance: 0.5 },
            { sprite: 'structure_wall_2', health: 400, damageResistance: 0.6 },
            { sprite: 'structure_wall_3', health: 600, damageResistance: 0.7 }
        ],
        upgradeCosts: [50, 100]
    },
    [StructureTypeEnum.TOWER]: {
        cost: 40,
        health: 100,
        range: 150,
        fireRate: 1000, // milliseconds between shots
        damage: 30,
        projectileSpeed: 300,
        buildTime: 2000,
        levels: [
            { sprite: 'structure_tower', range: 150, fireRate: 1000, damage: 30 },
            { sprite: 'structure_tower_2', range: 200, fireRate: 800, damage: 40 },
            { sprite: 'structure_tower_3', range: 250, fireRate: 600, damage: 50 }
        ],
        upgradeCosts: [80, 160]
    },
    [StructureTypeEnum.TRAP]: {
        cost: 30,
        health: 80,
        damage: 20,
        slowFactor: 0.5,
        duration: 2000, // slow duration in ms
        cooldown: 3000, // cooldown between triggers
        buildTime: 1000,
        levels: [
            { sprite: 'structure_trap', damage: 20, slowFactor: 0.5, cooldown: 3000 },
            { sprite: 'structure_trap_2', damage: 30, slowFactor: 0.4, cooldown: 2500 },
            { sprite: 'structure_trap_3', damage: 40, slowFactor: 0.3, cooldown: 2000 }
        ],
        upgradeCosts: [60, 120]
    },
    REPAIR: {
        COST: 15,
        HEAL: 20,
        COOLDOWN: 0.5,
    },
    UPGRADE: {
        TIME: 3,
        COSTS: [0, 100, 200], // By target level (0 is placeholder)
    },
} as const;

export const ENEMIES = {
    [EnemyType.GOBLIN]: {
        sprite: 'goblin',
        health: 100,
        speed: 80,
        damage: 10,
        attackRate: 1000,
        crystalReward: 10
    },
    [EnemyType.CARRIER]: {
        sprite: 'carrier',
        health: 60,
        speed: 120,
        damage: 5,
        attackRate: 800,
        crystalReward: 15
    },
    [EnemyType.OGRE]: {
        sprite: 'ogre',
        health: 300,
        speed: 50,
        damage: 20,
        attackRate: 1500,
        crystalReward: 25
    },
    FLYING: {
        SPEED: 2 * GRID.CELL_SIZE,
        HP: { MIN: 12, MAX: 20 },
        DAMAGE: {
            STRUCTURE: 8,
            BASE: 16,
        },
        REWARD: 25,
    },
} as const;

export const RESOURCES = {
    INITIAL: 200,
    PILES: {
        NORMAL: {
            MIN: 30,
            MAX: 50,
            CHANCE: 0.8,
        },
        RARE: {
            MIN: 60,
            MAX: 80,
            CHANCE: 0.2,
        },
    },
    COMBO: {
        WINDOW: 2, // seconds
        MULTIPLIER: 0.1, // 10% per enemy in combo
    },
} as const;

export const WAVES = [
    {
        enemies: [
            { type: EnemyType.GOBLIN, count: 10, delay: 2000 }
        ],
        delay: 5000  // Time before wave starts
    },
    {
        enemies: [
            { type: EnemyType.GOBLIN, count: 15, delay: 1800 },
            { type: EnemyType.CARRIER, count: 5, delay: 3000 }
        ],
        delay: 15000
    },
    {
        enemies: [
            { type: EnemyType.GOBLIN, count: 20, delay: 1500 },
            { type: EnemyType.CARRIER, count: 10, delay: 2500 },
            { type: EnemyType.OGRE, count: 3, delay: 5000 }
        ],
        delay: 20000
    },
    {
        enemies: [
            { type: EnemyType.GOBLIN, count: 25, delay: 1200 },
            { type: EnemyType.CARRIER, count: 15, delay: 2000 },
            { type: EnemyType.OGRE, count: 8, delay: 4000 }
        ],
        delay: 25000
    }
];

export const PARTICLES = {
    BUILD: {
        COUNT: 12,
        COLOR: 0xFFFF00,
        DURATION: 0.8,
    },
    DESTROY: {
        COUNT: 15,
        DURATION: 1,
    },
    DAMAGE: {
        COUNT: { MIN: 3, MAX: 5 },
        COLOR: 0xFF0000,
    },
    RESOURCE: {
        COUNT: 8,
        COLOR: 0xFFD700,
    },
    DASH: {
        COUNT: 5,
        COLOR: 0x0088FF,
    },
} as const;

export const SCORING = {
    MULTIPLIERS: {
        BASE_HEALTH: 2,
        MAX_COMBO: 1.5,
        STRUCTURES_ALIVE: 1.3,
    },
} as const;

export const PERFORMANCE = {
    MAX_ENTITIES: 100,
    TARGET_FPS: 60,
    UPDATE_RADIUS: 800, // Only update entities within this radius of camera
} as const;

// Game settings
export const GAME_SETTINGS = {
    startingCrystals: 100,
    baseTowerRange: 150,
    baseHealth: 100,
    buildSpeed: 1,  // Multiplier for build time
    tileSize: 32,
};

// Damage types and resistances
export enum DamageType {
    PHYSICAL = 'physical',
    MAGICAL = 'magical',
    TRUE = 'true'  // Ignores resistances
}

export interface DamageInfo {
    amount: number;
    type: DamageType;
    source?: any;
} 