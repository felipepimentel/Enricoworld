# Magic Defense Arena

A tower defense game with merge mechanics built with Phaser 3.94, React 19, and Vite 6.0.

## Features

- Tower defense gameplay with merge mechanics
- Squad selection before each battle
- Multiple character types and rarities
- Procedurally generated waves of enemies
- Economy system for purchasing and upgrading characters
- Path system for enemy movement
- Merge system for combining same-type characters

## Tech Stack

- Phaser 3.94 for the game engine
- React 19 for UI and menus
- TypeScript 5.7 for type safety
- Vite 6.0 for fast development and bundling
- Tailwind CSS 4.0 for UI styling

## Project Structure

- `src/game/scenes/` - Phaser scenes (Preload, Game, HUD)
- `src/game/objects/` - Game objects (Character, Enemy)
- `src/game/systems/` - Game systems (Path, Wave, Economy, Merge)
- `src/components/` - React components
- `src/assets/` - Game assets (sprites, audio)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd magic-defense-arena
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Game Mechanics

### Tower Defense

- Place characters strategically on the map to defend your castle
- Characters attack automatically when enemies are in range
- Each character has different stats based on type, rarity, and level

### Merge System

- Combine two characters of the same type and level to create a more powerful character
- Merged characters have increased damage, range, and reduced attack cooldown
- Maximum level for characters is 3

### Wave System

- Defeat waves of enemies to progress
- Each level has 10-15 waves with increasing difficulty
- Earn coins for defeating enemies and completing waves

### Economy

- Spend coins to place characters on the field
- Earn coins by defeating enemies and completing waves
- Strategic resource management is key to success

## Development Roadmap

- [x] Basic game setup
- [x] Path and grid system
- [x] Character and enemy classes
- [x] Wave generation
- [x] Economy system
- [x] Merge mechanics
- [ ] Additional character types and abilities
- [ ] Better enemy AI
- [ ] Visual effects and animations
- [ ] Sound effects and music
- [ ] Save/load game progress
- [ ] Campaign mode with story

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Phaser.io for the awesome game framework
- React team for the UI library
- Vite team for the fast build tool
