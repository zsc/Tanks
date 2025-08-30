export default class BonusModel {
    constructor(id, type, position) {
        this.id = id;
        this.type = type; // grenade, helmet, clock, shovel, tank, star, gun, boat
        
        // Position
        this.position = { x: position.x, y: 0, z: position.z };
        
        // State
        this.active = true;
        this.toRemove = false;
        
        // Display properties
        this.visible = true;
        this.showTime = 0;
        this.maxShowTime = 15000; // 15 seconds like C++
        this.blinkTime = 0;
        this.blinkInterval = 200; // ms between blinks
        
        // Collision
        this.size = 0.8;
        this.bounds = this.calculateBounds();
    }
    
    // Bonus types enum
    static TYPES = {
        GRENADE: 'grenade',  // Destroy all enemies
        HELMET: 'helmet',    // Shield protection
        CLOCK: 'clock',      // Freeze all enemies
        SHOVEL: 'shovel',    // Protect eagle with stone walls
        TANK: 'tank',        // Extra life
        STAR: 'star',        // Upgrade weapon by 1
        GUN: 'gun',          // Upgrade weapon to max
        BOAT: 'boat'         // Can cross water
    };
    
    update(deltaTime) {
        if (!this.active) return;
        
        // Update show time
        this.showTime += deltaTime;
        if (this.showTime >= this.maxShowTime) {
            this.toRemove = true;
            this.active = false;
            return;
        }
        
        // Blink effect (faster when about to expire)
        this.blinkTime += deltaTime;
        const blinkRate = this.showTime < this.maxShowTime * 0.75 ? 
            this.blinkInterval : this.blinkInterval / 2;
        
        if (this.blinkTime >= blinkRate) {
            this.blinkTime = 0;
            this.visible = !this.visible;
        }
    }
    
    calculateBounds() {
        const halfSize = this.size / 2;
        return {
            left: this.position.x - halfSize,
            right: this.position.x + halfSize,
            top: this.position.z - halfSize,
            bottom: this.position.z + halfSize
        };
    }
    
    // Apply bonus effect to player
    applyEffect(player, gameModel) {
        // Base score for any bonus
        const playerNum = player.type === 'player1' ? 'player1' : 'player2';
        gameModel.score[playerNum] += 300;
        
        switch(this.type) {
            case BonusModel.TYPES.GRENADE:
                // Destroy all enemies
                gameModel.enemies.forEach(enemy => {
                    if (enemy.alive) {
                        gameModel.score[playerNum] += 200;
                        // Force destroy (ignore armor)
                        enemy.livesCount = 0;
                        enemy.destroy();
                        gameModel.enemiesKilled++;
                    }
                });
                break;
                
            case BonusModel.TYPES.HELMET:
                // Give shield
                player.hasShield = true;
                player.shieldTime = 0;
                player.maxShieldTime = 10000; // 10 seconds protection
                break;
                
            case BonusModel.TYPES.CLOCK:
                // Freeze all enemies
                gameModel.enemies.forEach(enemy => {
                    if (enemy.alive) {
                        enemy.frozen = true;
                        enemy.frozenTime = 0;
                        enemy.maxFrozenTime = 10000; // 10 seconds frozen
                    }
                });
                break;
                
            case BonusModel.TYPES.SHOVEL:
                // Protect eagle with stone walls
                gameModel.protectEagle = true;
                gameModel.protectEagleTime = 0;
                gameModel.maxProtectEagleTime = 20000; // 20 seconds
                
                // Replace bricks around eagle with stone
                const eagleX = 12;
                const eagleZ = 24;
                
                // Top wall
                for (let x = eagleX - 2; x <= eagleX + 2; x++) {
                    if (x !== eagleX) {
                        gameModel.map.setTile(x, eagleZ - 2, gameModel.map.TILE_TYPES.STONE);
                    }
                }
                
                // Side walls
                for (let z = eagleZ - 1; z <= eagleZ + 1; z++) {
                    gameModel.map.setTile(eagleX - 2, z, gameModel.map.TILE_TYPES.STONE);
                    gameModel.map.setTile(eagleX + 2, z, gameModel.map.TILE_TYPES.STONE);
                }
                break;
                
            case BonusModel.TYPES.TANK:
                // Extra life
                player.livesCount++;
                break;
                
            case BonusModel.TYPES.STAR:
                // Upgrade weapon by 1 level
                player.upgrade();
                break;
                
            case BonusModel.TYPES.GUN:
                // Upgrade weapon to max (3 upgrades)
                for (let i = 0; i < 3; i++) {
                    player.upgrade();
                }
                break;
                
            case BonusModel.TYPES.BOAT:
                // Can cross water
                player.canCrossWater = true;
                player.boatTime = 0;
                player.maxBoatTime = 30000; // 30 seconds
                break;
        }
        
        // Mark for removal
        this.toRemove = true;
        this.active = false;
    }
    
    // Get sprite coordinates for this bonus type
    getSpriteCoords() {
        const spriteMap = {
            'grenade': { x: 256, y: 112 },
            'helmet': { x: 272, y: 112 },
            'clock': { x: 288, y: 112 },
            'shovel': { x: 304, y: 112 },
            'tank': { x: 256, y: 128 },
            'star': { x: 272, y: 128 },
            'gun': { x: 288, y: 128 },
            'boat': { x: 304, y: 128 }
        };
        
        return spriteMap[this.type] || spriteMap['star'];
    }
}