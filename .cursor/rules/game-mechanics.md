# Constructor Defense - Core Game Mechanics

## Game Overview
Constructor Defense is an active tower defense game where the player controls a Builder character who must physically move around the map to construct and maintain defenses against waves of enemies.

## Core Mechanics

### Player Character (The Builder)
- Active character that must be controlled around the map
- Cannot build remotely - must be physically present at construction location
- Can repair damaged structures
- Carries a magic hammer for construction
- Can collect crystals (resources) from defeated enemies
- Unlocks special abilities as game progresses (e.g., "Builder Dash")

### Construction System
1. **Building Types:**
   - Walls: Block and slow enemy progress
   - Towers: Attack enemies at range
   - Traps: Weaken or damage passing enemies
   
2. **Building Rules:**
   - Requires builder presence at location
   - Costs crystal resources
   - Can be upgraded to higher levels
   - Can be damaged and requires repairs

### Resource Management
- Crystals as primary resource
- Obtained from:
  - Defeated enemies
  - Special carrier enemies (bonus resources)
  - Map pickups
- Used for:
  - Construction
  - Upgrades
  - Repairs

### Enemy System
1. **Enemy Types:**
   - Basic (e.g., Goblins): Weak, straightforward pathing
   - Carriers: Tougher, drops extra resources
   - Mini-bosses (e.g., Ogre): Can destroy structures quickly
   
2. **Wave System:**
   - Progressive difficulty
   - Multiple spawn points
   - Breathing periods between waves
   - Boss waves with special enemies

### Map Elements
1. **Strategic Terrain:**
   - Natural barriers (fallen logs, rocks)
   - Elevated positions (tower range bonus)
   - Multiple paths
   - Resource crystal spawns

2. **Visual Style:**
   - Colorful, welcoming atmosphere
   - Clear paths and strategic points
   - Magical forest theme
   - Visual feedback for building placement and damage

## Game Flow
1. **Pre-Wave:**
   - Resource collection
   - Strategic building placement
   - Repair and upgrade existing structures
   
2. **During Wave:**
   - Active defense management
   - Resource collection from defeated enemies
   - Emergency repairs
   - Tactical movement between defense points
   
3. **Post-Wave:**
   - Repairs and upgrades
   - Strategy adjustment
   - New building placement

## Progression System
- Level completion rewards
- New ability unlocks
- Structure upgrade paths
- Strategic element unlocks (new tower types, trap varieties)

## Technical Requirements
1. **Display:**
   - 16:9 aspect ratio
   - Minimum resolution: 960x540
   - Proper scaling for different screen sizes
   
2. **Performance:**
   - 60 FPS target
   - Smooth animations for builder movement
   - Clear visual feedback for all actions

3. **Controls:**
   - Smooth character movement
   - Quick building placement
   - Fast response to player input
   - Clear UI for resource management and building options 