import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'public', 'assets', 'maps', 'level1.json');

// Create a backup
fs.writeFileSync(`${filePath}.bak2`, fs.readFileSync(filePath));
console.log('Created backup file');

// Create a minimal valid JSON file
const validJson = {
    width: 20,
    height: 15,
    tilewidth: 32,
    tileheight: 32,
    infinite: false,
    orientation: "orthogonal",
    renderorder: "right-down",
    type: "map",
    tiledversion: "1.10.2",
    nextlayerid: 5,
    nextobjectid: 3,
    layers: [],
    tilesets: [
        {
            name: "terrain",
            tilewidth: 32,
            tileheight: 32,
            tilecount: 2,
            columns: 2,
            image: "../sprites/terrain.png",
            imagewidth: 64,
            imageheight: 32
        }
    ],
    version: 1
};

fs.writeFileSync(filePath, JSON.stringify(validJson, null, 4));
console.log('Created simplified valid JSON file'); 