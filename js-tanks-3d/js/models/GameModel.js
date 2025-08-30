import TankModel from './TankModel.js';
import BulletModel from './BulletModel.js';
import BonusModel from './BonusModel.js';
import MapModel from './MapModel.js';
import CollisionModel from './CollisionModel.js';
import GameLogger from '../utils/GameLogger.js';

export default class GameModel {
    constructor() {
        // Initialize logger
        this.logger = new GameLogger({
            enabled: true,
            logToFile: true,
            logToConsole: true,
            level: 1 // INFO level
        });
        
        // Game state
        this.gameState = 'menu'; // menu, playing, paused, gameover
        this.level = 1;
        this.score = { player1: 0, player2: 0 };
        this.lives = { player1: 10, player2: 10 }; // C++ style: 10 lives per player
        this.playerCount = 1;
        this.bonusesCollected = 0;
        
        // Game entities
        this.players = [];
        this.enemies = [];
        this.bullets = [];
        this.bonuses = [];
        
        // Eagle protection (shovel bonus)
        this.protectEagle = false;
        this.protectEagleTime = 0;
        this.maxProtectEagleTime = 20000;
        this.map = null;
        this.collisionModel = new CollisionModel();
        
        // Game config
        this.maxEnemies = 4;
        this.enemiesRemaining = 20;
        this.enemiesKilled = 0;
        
        // ID counters
        this.nextBulletId = 1;
        this.nextEnemyId = 1;
        this.nextBonusId = 1;
        
        // Enemy spawn management
        this.enemySpawnPosition = 0; // Cycles through spawn points like C++
        
        // Timing
        this.lastUpdateTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 3000; // ms
        this.victoryTimer = 0; // Delay before victory screen
    }
    
    async init(levelNumber = 1) {
        this.reset();
        await this.loadLevel(levelNumber);
        
        // Only spawn players if map loaded successfully
        if (this.map) {
            this.spawnPlayers();
        } else {
            console.error('Cannot spawn players - map not loaded');
            throw new Error('Failed to load map for level ' + levelNumber);
        }
    }
    
    reset() {
        this.players = [];
        this.enemies = [];
        this.bullets = [];
        this.bonuses = [];
        this.enemiesKilled = 0;
        this.enemiesRemaining = 20;
        this.nextBulletId = 1;
        this.nextEnemyId = 1;
        this.nextBonusId = 1;
        this.enemySpawnPosition = 0;
        this.enemySpawnTimer = 0;
        this.victoryTimer = 0;
    }
    
    async loadLevel(levelNumber) {
        // Ensure level number is valid (1-35 like C++)
        if (levelNumber < 1 || levelNumber > 35) {
            levelNumber = 1;
        }
        
        this.level = levelNumber;
        
        try {
            // Create map with level data
            this.map = new MapModel(null, levelNumber);
            
            // Wait for async level loading
            await this.map.loadLevelFromFile(levelNumber);
            
            console.log(`Level ${levelNumber} loaded successfully`, {
                width: this.map.width,
                height: this.map.height
            });
        } catch (error) {
            console.error(`Failed to load level ${levelNumber}:`, error);
            // Create a default map as fallback
            this.map = new MapModel();
            this.map.generateDefaultMap();
            console.log('Using default generated map as fallback');
        }
    }
    
    spawnPlayers() {
        // Safety check
        if (!this.map) {
            console.error('Cannot spawn players - map is null');
            return;
        }
        
        // Spawn player 1
        const p1Spawn = this.map.getPlayerSpawnPoint(0);
        const player1 = new TankModel('player1', 'player1', p1Spawn);
        // C++ style: Start with 11 lives, first respawn reduces to 10
        player1.livesCount = 11;
        // Initial spawn with shield
        player1.hasShield = true;
        player1.shieldTime = 0;
        player1.maxShieldTime = 1500; // 1.5 seconds initial shield
        this.players.push(player1);
        this.logger.logSpawn('Player', 'player1', p1Spawn);
        
        // Spawn player 2 (optional)
        // const p2Spawn = this.map.getPlayerSpawnPoint(1);
        // const player2 = new TankModel('player2', 'player2', p2Spawn);
        // player2.livesCount = 11;
        // player2.hasShield = true;
        // player2.shieldTime = 0;
        // player2.maxShieldTime = 1500;
        // this.players.push(player2);
        // this.logger.logSpawn('Player', 'player2', p2Spawn);
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Spawn enemies first (before updates) so they participate in collision detection
        this.spawnEnemies();
        
        // Update all entities
        this.updatePlayers(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateBullets(deltaTime);
        this.updateBonuses(deltaTime);
        
        // Check collisions (will handle spawn overlaps)
        this.checkCollisions();
        
        // Check win/lose conditions
        this.checkGameStatus();
    }
    
    updatePlayers(deltaTime) {
        this.players.forEach((player, index) => {
            if (player.alive) {
                if (index === 0 && !player.canFire) {
                    console.log(`[DEBUG] Updating player ${index} with deltaTime: ${deltaTime}ms`);
                }
                player.update(deltaTime);
            } else if (player.needsRespawn && !player.toRemove) {
                // Respawn player after a delay (for explosion animation)
                if (!player.respawnTimer) {
                    player.respawnTimer = 0;
                }
                player.respawnTimer += deltaTime;
                
                if (player.respawnTimer > 1000) { // 1 second delay for explosion
                    const spawnPoint = this.map.getPlayerSpawnPoint(index);
                    const respawned = player.respawn(spawnPoint);
                    
                    if (respawned) {
                        this.logger.logRespawn('Player', player.id, {
                            ...spawnPoint,
                            livesLeft: player.livesCount
                        });
                        player.respawnTimer = 0;
                    } else {
                        // No more lives, game over for this player
                        this.logger.log('INFO', `Player ${player.id} has no more lives!`);
                        player.toRemove = true;
                    }
                }
            }
        });
        
        // Remove players with no lives
        this.players = this.players.filter(p => !p.toRemove);
    }
    
    updateEnemies(deltaTime) {
        const playerPositions = this.players
            .filter(p => p.alive)
            .map(p => p.position);
        
        this.enemies.forEach(enemy => {
            if (enemy.alive) {
                enemy.update(deltaTime);
                
                // Update AI and check if enemy wants to fire
                const bulletData = enemy.updateAI(deltaTime, playerPositions, this.map);
                if (bulletData) {
                    this.createBullet(bulletData);
                }
            }
        });
    }
    
    updateBullets(deltaTime) {
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);
            return bullet.active;
        });
    }
    
    updateBonuses(deltaTime) {
        this.bonuses = this.bonuses.filter(bonus => {
            bonus.update(deltaTime);
            return !bonus.toRemove;
        });
        
        // Update eagle protection timer
        if (this.protectEagle) {
            this.protectEagleTime += deltaTime;
            if (this.protectEagleTime >= this.maxProtectEagleTime) {
                this.protectEagle = false;
                this.protectEagleTime = 0;
                // Restore brick walls around eagle
                this.restoreEagleWalls();
            }
        }
    }
    
    checkCollisions() {
        // Use collision model to process all collisions
        this.collisionModel.processCollisions(this);
    }
    
    spawnEnemies() {
        this.enemySpawnTimer += 16.67; // Assuming 60 FPS
        
        if (this.enemySpawnTimer >= this.enemySpawnInterval &&
            this.enemies.length < this.maxEnemies && 
            this.enemiesRemaining > 0) {
            
            this.enemySpawnTimer = 0;
            
            // Use rotating spawn point like C++ to avoid clustering
            const spawnPoint = this.map.getEnemySpawnPoint(this.enemySpawnPosition);
            this.enemySpawnPosition = (this.enemySpawnPosition + 1) % 3; // Cycle through 3 spawn points
            
            // Check if spawn point is occupied (like C++)
            if (this.checkSpawnPointOccupied(spawnPoint)) {
                // Skip this spawn attempt, will retry next frame
                return;
            }
            
            // Choose enemy type
            const types = ['enemy_a', 'enemy_b', 'enemy_c', 'enemy_d'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            // Create enemy
            const enemyId = `enemy_${this.nextEnemyId++}`;
            const enemy = new TankModel(enemyId, type, spawnPoint);
            
            // Trigger enemy spawn event for audio setup
            if (this.onEnemySpawn) {
                this.onEnemySpawn(enemy);
            }
            
            // Set random armor level (1-4 hits to destroy) like C++
            const armorRoll = Math.random();
            if (armorRoll < 0.5) {
                enemy.livesCount = 1; // 50% chance
            } else if (armorRoll < 0.75) {
                enemy.livesCount = 2; // 25% chance
            } else if (armorRoll < 0.9) {
                enemy.livesCount = 3; // 15% chance
            } else {
                enemy.livesCount = 4; // 10% chance - strongest armor
            }
            
            // 12% chance to carry a bonus (like C++)
            if (Math.random() < 0.12) {
                enemy.hasBonus = true;
            }
            
            // Start enemy moving immediately (like C++)
            enemy.direction = 'down'; // C++ starts with D_DOWN
            enemy.move(enemy.direction);
            
            this.enemies.push(enemy);
            this.enemiesRemaining--;
            
            this.logger.logSpawn('Enemy', enemyId, {
                ...spawnPoint,
                type: type,
                remaining: this.enemiesRemaining
            });
        }
    }
    
    createBullet(bulletData) {
        console.log(`[DEBUG] createBullet called with data:`, bulletData);
        const bulletId = `bullet_${this.nextBulletId++}`;
        const newBulletData = {
            ...bulletData,
            id: bulletId
        };
        const bullet = new BulletModel(newBulletData);
        console.log(`[DEBUG] Bullet created:`, bullet);
        this.bullets.push(bullet);
        console.log(`[DEBUG] Total bullets in array: ${this.bullets.length}`);
        return bullet;
    }
    
    handlePlayerInput(playerIndex, input) {
        const player = this.players[playerIndex];
        if (!player || !player.alive) {
            return;
        }
        
        // Handle movement
        let action = null;
        if (input.up) {
            player.move('up');
            action = 'move_up';
        } else if (input.down) {
            player.move('down');
            action = 'move_down';
        } else if (input.left) {
            player.move('left');
            action = 'move_left';
        } else if (input.right) {
            player.move('right');
            action = 'move_right';
        } else {
            player.stop();
        }
        
        // Log movement (debounced)
        if (action) {
            this.logger.logPlayerInput(playerIndex + 1, action, {
                position: player.position,
                direction: player.direction
            });
        }
        
        // Handle firing
        if (input.fire) {
            console.log(`[DEBUG] GameModel: Player ${playerIndex} fire command received`);
            
            const bulletData = player.fire();
            if (bulletData) {
                console.log(`[DEBUG] Bullet created for player ${playerIndex}`);
                const bullet = this.createBullet(bulletData);
                
                this.logger.logPlayerInput(playerIndex + 1, 'fire', {
                    bulletId: bullet.id,
                    position: bullet.position,
                    direction: bullet.direction
                });
            } else {
                console.log(`[DEBUG] Player ${playerIndex} fire() returned null`);
            }
        }
    }
    
    checkSpawnPointOccupied(spawnPoint) {
        // Check if any tank is at this spawn point (like C++)
        const threshold = 1.5; // Tank size + margin
        
        const allTanks = [...this.players, ...this.enemies];
        for (let tank of allTanks) {
            if (!tank.alive || tank.spawning) continue; // Ignore dead or spawning tanks
            
            const dx = Math.abs(tank.position.x - spawnPoint.x);
            const dz = Math.abs(tank.position.z - spawnPoint.z);
            
            if (dx < threshold && dz < threshold) {
                return true; // Spawn point occupied
            }
        }
        
        return false;
    }
    
    generateBonus() {
        // Choose random bonus type
        const types = Object.values(BonusModel.TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Find random position avoiding eagle
        let position;
        let attempts = 0;
        do {
            position = {
                x: Math.random() * (this.map.width - 2) + 1,
                z: Math.random() * (this.map.height - 6) + 3  // Avoid spawn areas
            };
            attempts++;
        } while (this.map.isSolid(Math.floor(position.x), Math.floor(position.z)) && attempts < 50);
        
        const bonusId = `bonus_${this.nextBonusId++}`;
        const bonus = new BonusModel(bonusId, type, position);
        this.bonuses.push(bonus);
        
        this.logger.logSpawn('Bonus', bonusId, {
            ...position,
            type: type
        });
    }
    
    restoreEagleWalls() {
        // Restore brick walls around eagle
        const eagleX = 12;
        const eagleZ = 24;
        
        // Top wall
        for (let x = eagleX - 2; x <= eagleX + 2; x++) {
            if (x !== eagleX) {
                this.map.setTile(x, eagleZ - 2, this.map.TILE_TYPES.BRICK);
            }
        }
        
        // Side walls
        for (let z = eagleZ - 1; z <= eagleZ + 1; z++) {
            this.map.setTile(eagleX - 2, z, this.map.TILE_TYPES.BRICK);
            this.map.setTile(eagleX + 2, z, this.map.TILE_TYPES.BRICK);
        }
    }
    
    checkGameStatus() {
        // C++ style victory/defeat conditions:
        // Victory: All 20 enemies spawned (enemiesRemaining <= 0) AND none left on map
        // Defeat: All players dead OR eagle destroyed
        
        // Check victory condition
        if (this.enemiesRemaining <= 0 && this.enemies.length === 0) {
            // Add a small delay before victory (like C++ level_end_time)
            if (!this.victoryTimer) {
                this.victoryTimer = 0;
            }
            this.victoryTimer += 16.67; // Assuming 60 FPS
            
            if (this.victoryTimer > 1000) { // 1 second delay
                this.victory();
            }
        }
        
        // Check game over conditions (C++ style)
        // Game over if:
        // 1. All players are out of lives
        // 2. Eagle is destroyed
        const allPlayersOutOfLives = this.players.every(p => p.toRemove);
        const eagleDestroyed = this.map && !this.map.eagleAlive;
        
        if (allPlayersOutOfLives || eagleDestroyed) {
            this.gameOver();
        }
    }
    
    async nextLevel() {
        this.level++;
        
        // Wrap around levels (1-35 like C++)
        if (this.level > 35) {
            this.level = 1;
        }
        
        // Save cumulative stats before reset
        const savedScore = { ...this.score };
        const savedLives = { ...this.lives };
        const totalEnemiesKilled = this.enemiesKilled;
        const totalBonusesCollected = this.bonusesCollected;
        
        // Reset for new level (but preserve player progress)
        this.reset();
        
        // Restore cumulative stats
        this.score = savedScore;
        this.lives = savedLives;
        // Note: enemiesKilled resets to 0 for the new level (counts per level)
        // But we could track a totalEnemiesKilled if needed
        this.bonusesCollected = totalBonusesCollected; // Keep bonuses cumulative
        
        // Load new level
        await this.loadLevel(this.level);
        
        // Only spawn players if map loaded
        if (this.map) {
            this.spawnPlayers();
        }
        
        this.gameState = 'playing';
    }
    
    gameOver() {
        this.gameState = 'gameover';
        this.logger.log('INFO', 'GAME OVER');
        
        // Trigger game over screen in controller
        if (window.game && window.game.controller) {
            setTimeout(() => {
                window.game.controller.showGameOver();
            }, 500);
        }
    }
    
    victory() {
        this.gameState = 'victory';
        this.logger.log('INFO', 'VICTORY - Level Complete', {
            score: this.score,
            enemiesKilled: this.enemiesKilled,
            bonusesCollected: this.bonusesCollected
        });
        
        // Trigger victory event for audio
        if (this.onVictory) {
            this.onVictory();
        }
        
        // Trigger score screen in controller  
        if (window.game && window.game.controller) {
            setTimeout(() => {
                window.game.controller.showScoreScreen();
            }, 1000);
        }
    }
    
    setState(newState, reason = '') {
        const oldState = this.gameState;
        this.gameState = newState;
        this.logger.logStateChange(oldState, newState, reason);
    }
    
    getState() {
        return this.gameState;
    }
}