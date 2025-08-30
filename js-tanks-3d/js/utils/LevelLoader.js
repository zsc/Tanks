export default class LevelLoader {
    static async loadLevel(levelNumber) {
        try {
            // Level files are numbered 1-35 (like C++)
            const response = await fetch(`assets/levels/${levelNumber}`);
            if (!response.ok) {
                throw new Error(`Failed to load level ${levelNumber}`);
            }
            
            const levelText = await response.text();
            return this.parseLevel(levelText);
        } catch (error) {
            console.error(`Error loading level ${levelNumber}:`, error);
            // Return null to use default generated map
            return null;
        }
    }
    
    static parseLevel(levelText) {
        const lines = levelText.trim().split('\n');
        const levelData = [];
        
        // C++ level format (from game.cpp:378-384):
        // . = empty
        // # = brick wall
        // @ = stone wall
        // % = bush
        // ~ = water
        // - = ice
        
        const charToTileType = {
            '.': 0, // EMPTY
            '#': 1, // BRICK
            '@': 2, // STONE
            '~': 3, // WATER
            '-': 4, // ICE
            '%': 5, // BUSH (rendered above tanks)
        };
        
        // Parse each line (should be 26 lines for 26x26 map)
        for (let z = 0; z < lines.length && z < 26; z++) {
            const line = lines[z];
            const row = [];
            
            for (let x = 0; x < line.length && x < 26; x++) {
                const char = line[x];
                const tileType = charToTileType[char] !== undefined ? charToTileType[char] : 0;
                row.push(tileType);
            }
            
            // Pad row to 26 tiles if needed
            while (row.length < 26) {
                row.push(0); // EMPTY
            }
            
            levelData.push(row);
        }
        
        // Pad to 26 rows if needed
        while (levelData.length < 26) {
            levelData.push(new Array(26).fill(0));
        }
        
        return {
            tiles: levelData,
            bushes: this.extractBushes(levelData)
        };
    }
    
    static extractBushes(levelData) {
        // Extract bush positions since they're rendered above tanks
        const bushes = [];
        for (let z = 0; z < levelData.length; z++) {
            for (let x = 0; x < levelData[z].length; x++) {
                if (levelData[z][x] === 5) { // BUSH
                    bushes.push({ x, z });
                    // Clear from main tiles since bushes are rendered separately
                    levelData[z][x] = 0;
                }
            }
        }
        return bushes;
    }
    
    // Get the total number of levels
    static getLevelCount() {
        return 35; // C++ has 35 levels
    }
    
    // Check if level number is valid
    static isValidLevel(levelNumber) {
        return levelNumber >= 1 && levelNumber <= 35;
    }
}