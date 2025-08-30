import BrickModel from './BrickModel.js';

export default class MapModel {
    constructor(levelData = null) {
        this.width = 26;  // Standard map width in tiles
        this.height = 26; // Standard map height in tiles
        this.tileSize = 1; // Size of each tile in world units
        
        // Map data: 2D array of tile types
        this.tiles = [];
        
        // Brick objects for partial destruction
        this.bricks = new Map(); // key: "x,z", value: BrickModel
        
        // Tile types
        this.TILE_TYPES = {
            EMPTY: 0,
            BRICK: 1,
            STONE: 2,
            WATER: 3,
            ICE: 4,
            BUSH: 5,
            EAGLE: 6
        };
        
        // Eagle (base) position
        this.eaglePosition = { x: 12, z: 24 };
        this.eagleAlive = true;
        
        // Spawn points
        this.playerSpawnPoints = [
            { x: 8, z: 24 },  // Player 1
            { x: 16, z: 24 }  // Player 2
        ];
        
        this.enemySpawnPoints = [
            { x: 0, z: 0 },   // Top-left
            { x: 12, z: 0 },  // Top-center
            { x: 24, z: 0 }   // Top-right
        ];
        
        // Map bounds for collision
        this.bounds = {
            left: 0,
            right: this.width,
            top: 0,
            bottom: this.height
        };
        
        if (levelData) {
            this.loadLevel(levelData);
        } else {
            this.generateDefaultMap();
        }
    }
    
    generateDefaultMap() {
        // Initialize empty map
        this.tiles = [];
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = this.TILE_TYPES.EMPTY;
            }
        }
        
        // Add eagle fortress
        this.createEagleFortress();
        
        // Add some random obstacles
        this.addRandomObstacles();
    }
    
    createEagleFortress() {
        const eagleX = 12;
        const eagleZ = 24;
        
        // Place eagle
        this.tiles[eagleZ][eagleX] = this.TILE_TYPES.EAGLE;
        
        // Build brick walls around eagle
        // Top wall
        for (let x = eagleX - 2; x <= eagleX + 2; x++) {
            if (x !== eagleX) {
                this.setTile(x, eagleZ - 2, this.TILE_TYPES.BRICK);
            }
        }
        
        // Side walls
        for (let z = eagleZ - 1; z <= eagleZ + 1; z++) {
            this.setTile(eagleX - 2, z, this.TILE_TYPES.BRICK);
            this.setTile(eagleX + 2, z, this.TILE_TYPES.BRICK);
        }
    }
    
    addRandomObstacles() {
        // Add random brick walls
        for (let i = 0; i < 50; i++) {
            const x = Math.floor(Math.random() * this.width);
            const z = Math.floor(Math.random() * (this.height - 6)) + 3; // Avoid spawn areas
            
            // Create small wall patterns
            const pattern = Math.floor(Math.random() * 3);
            switch(pattern) {
                case 0: // Horizontal wall
                    for (let dx = 0; dx < 3; dx++) {
                        this.setTile(x + dx, z, this.TILE_TYPES.BRICK);
                    }
                    break;
                case 1: // Vertical wall
                    for (let dz = 0; dz < 3; dz++) {
                        this.setTile(x, z + dz, this.TILE_TYPES.BRICK);
                    }
                    break;
                case 2: // L-shape
                    this.setTile(x, z, this.TILE_TYPES.BRICK);
                    this.setTile(x + 1, z, this.TILE_TYPES.BRICK);
                    this.setTile(x, z + 1, this.TILE_TYPES.BRICK);
                    break;
            }
        }
        
        // Add some stone walls
        for (let i = 0; i < 20; i++) {
            const x = Math.floor(Math.random() * this.width);
            const z = Math.floor(Math.random() * (this.height - 6)) + 3;
            this.setTile(x, z, this.TILE_TYPES.STONE);
        }
        
        // Add water areas
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * (this.width - 2));
            const z = Math.floor(Math.random() * (this.height - 8)) + 4;
            for (let dx = 0; dx < 2; dx++) {
                for (let dz = 0; dz < 2; dz++) {
                    this.setTile(x + dx, z + dz, this.TILE_TYPES.WATER);
                }
            }
        }
        
        // Add ice areas (tanks slip on ice)
        for (let i = 0; i < 3; i++) {
            const x = Math.floor(Math.random() * (this.width - 2));
            const z = Math.floor(Math.random() * (this.height - 8)) + 4;
            for (let dx = 0; dx < 2; dx++) {
                for (let dz = 0; dz < 2; dz++) {
                    this.setTile(x + dx, z + dz, this.TILE_TYPES.ICE);
                }
            }
        }
    }
    
    loadLevel(levelData) {
        // Parse level data (format depends on original game)
        // For now, just generate default map
        this.generateDefaultMap();
    }
    
    getTile(x, z) {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
            return this.TILE_TYPES.STONE; // Treat out of bounds as solid
        }
        return this.tiles[Math.floor(z)][Math.floor(x)];
    }
    
    setTile(x, z, type) {
        if (x >= 0 && x < this.width && z >= 0 && z < this.height) {
            this.tiles[Math.floor(z)][Math.floor(x)] = type;
            
            // Create BrickModel for brick tiles
            if (type === this.TILE_TYPES.BRICK) {
                const key = `${Math.floor(x)},${Math.floor(z)}`;
                if (!this.bricks.has(key)) {
                    this.bricks.set(key, new BrickModel(Math.floor(x), Math.floor(z)));
                }
            }
        }
    }
    
    destroyTile(x, z, bulletDirection) {
        const tile = this.getTile(x, z);
        
        // Handle brick partial destruction
        if (tile === this.TILE_TYPES.BRICK) {
            const key = `${Math.floor(x)},${Math.floor(z)}`;
            let brick = this.bricks.get(key);
            
            if (!brick) {
                brick = new BrickModel(Math.floor(x), Math.floor(z));
                this.bricks.set(key, brick);
            }
            
            brick.bulletHit(bulletDirection);
            
            if (brick.isDestroyed()) {
                this.setTile(x, z, this.TILE_TYPES.EMPTY);
                this.bricks.delete(key);
                return { destroyed: true, partial: false };
            } else {
                return { destroyed: false, partial: true, state: brick.getVisualState() };
            }
        }
        
        // Eagle can be destroyed
        if (tile === this.TILE_TYPES.EAGLE) {
            this.eagleAlive = false;
            this.setTile(x, z, this.TILE_TYPES.EMPTY);
            return { destroyed: true, partial: false };
        }
        
        return { destroyed: false, partial: false };
    }
    
    getBrick(x, z) {
        const key = `${Math.floor(x)},${Math.floor(z)}`;
        return this.bricks.get(key);
    }
    
    isSolid(x, z) {
        const tile = this.getTile(x, z);
        return (
            tile === this.TILE_TYPES.BRICK ||
            tile === this.TILE_TYPES.STONE ||
            tile === this.TILE_TYPES.EAGLE
        );
    }
    
    isSolidForTank(x, z, canCrossWater = false) {
        const tile = this.getTile(x, z);
        // Water is solid for tanks unless they have boat powerup
        if (tile === this.TILE_TYPES.WATER) {
            return !canCrossWater;
        }
        return (
            tile === this.TILE_TYPES.BRICK ||
            tile === this.TILE_TYPES.STONE ||
            tile === this.TILE_TYPES.EAGLE
        );
    }
    
    isSolidForBullet(x, z) {
        const tile = this.getTile(x, z);
        // Water and ice don't block bullets
        if (tile === this.TILE_TYPES.WATER || tile === this.TILE_TYPES.ICE) {
            return false;
        }
        return (
            tile === this.TILE_TYPES.BRICK ||
            tile === this.TILE_TYPES.STONE ||
            tile === this.TILE_TYPES.EAGLE
        );
    }
    
    isDestructible(x, z) {
        const tile = this.getTile(x, z);
        return tile === this.TILE_TYPES.BRICK || tile === this.TILE_TYPES.EAGLE;
    }
    
    isWater(x, z) {
        return this.getTile(x, z) === this.TILE_TYPES.WATER;
    }
    
    isIce(x, z) {
        return this.getTile(x, z) === this.TILE_TYPES.ICE;
    }
    
    // Convert world position to tile coordinates
    worldToTile(worldX, worldZ) {
        return {
            x: Math.floor(worldX / this.tileSize),
            z: Math.floor(worldZ / this.tileSize)
        };
    }
    
    // Convert tile coordinates to world position (center of tile)
    tileToWorld(tileX, tileZ) {
        return {
            x: (tileX + 0.5) * this.tileSize,
            z: (tileZ + 0.5) * this.tileSize
        };
    }
    
    // Check if a position collides with solid tiles
    checkCollision(bounds) {
        // Check corners of the bounds
        const corners = [
            { x: bounds.left, z: bounds.top },
            { x: bounds.right, z: bounds.top },
            { x: bounds.left, z: bounds.bottom },
            { x: bounds.right, z: bounds.bottom }
        ];
        
        for (let corner of corners) {
            const tile = this.worldToTile(corner.x, corner.z);
            if (this.isSolid(tile.x, tile.z)) {
                return true;
            }
        }
        
        return false;
    }
    
    getPlayerSpawnPoint(playerIndex) {
        return this.playerSpawnPoints[playerIndex] || this.playerSpawnPoints[0];
    }
    
    getRandomEnemySpawnPoint() {
        const index = Math.floor(Math.random() * this.enemySpawnPoints.length);
        return this.enemySpawnPoints[index];
    }
    
    getEnemySpawnPoint(index) {
        // Return spawn point by index (cycles through 0, 1, 2)
        return this.enemySpawnPoints[index % this.enemySpawnPoints.length];
    }
}