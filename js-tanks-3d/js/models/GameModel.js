import TankModel from './TankModel.js';
import BulletModel from './BulletModel.js';
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
        
        // Game entities
        this.players = [];
        this.enemies = [];
        this.bullets = [];
        this.bonuses = [];
        this.map = null;
        this.collisionModel = new CollisionModel();
        
        // Game config
        this.maxEnemies = 4;
        this.enemiesRemaining = 20;
        this.enemiesKilled = 0;
        
        // ID counters
        this.nextBulletId = 1;
        this.nextEnemyId = 1;
        
        // Timing
        this.lastUpdateTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 3000; // ms
    }
    
    init(levelIndex = 0) {
        this.reset();
        this.loadLevel(levelIndex);
        this.spawnPlayers();
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
        this.enemySpawnTimer = 0;
    }
    
    loadLevel(levelIndex) {
        // Create map (using default for now)
        this.map = new MapModel(null);
    }
    
    spawnPlayers() {
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
        
        // Update all entities
        this.updatePlayers(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateBullets(deltaTime);
        this.updateBonuses(deltaTime);
        
        // Check collisions
        this.checkCollisions();
        
        // Spawn enemies if needed
        this.spawnEnemies();
        
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
            return bonus.active;
        });
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
            
            // Choose random spawn point
            const spawnPoint = this.map.getRandomEnemySpawnPoint();
            
            // Choose enemy type
            const types = ['enemy_a', 'enemy_b', 'enemy_c', 'enemy_d'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            // Create enemy
            const enemyId = `enemy_${this.nextEnemyId++}`;
            const enemy = new TankModel(enemyId, type, spawnPoint);
            
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
    
    checkGameStatus() {
        // Check if all enemies are defeated
        if (this.enemiesKilled >= 20 && this.enemies.length === 0) {
            this.nextLevel();
        }
        
        // Check if player lost all lives
        // Only game over if player is dead AND has no more lives left (toRemove = true)
        const allPlayersOutOfLives = this.players.every(p => p.toRemove);
        if (allPlayersOutOfLives) {
            this.gameOver();
        }
    }
    
    nextLevel() {
        this.level++;
        this.gameState = 'levelComplete';
        // Trigger level complete event
    }
    
    gameOver() {
        this.gameState = 'gameover';
        // Trigger game over event
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