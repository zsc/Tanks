import InputController from './InputController.js';
import ScreenManager from '../views/ScreenManager.js';
import { getAudioManager } from '../utils/AudioManager.js';

export default class GameController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.inputController = new InputController();
        this.screenManager = new ScreenManager();
        this.audioManager = getAudioManager();
        
        // Game loop timing (fixed timestep)
        this.targetFPS = 60;
        this.fixedTimeStep = 1000 / this.targetFPS; // 16.67ms
        this.accumulator = 0;
        this.lastTime = 0;
        this.isRunning = false;
        
        // Interpolation factor for smooth rendering
        this.alpha = 0;
        
        // Track tank movement for audio
        this.playerMoving = false;
    }
    
    async init() {
        // Initialize screen manager
        this.screenManager.init();
        
        // Setup screen transitions
        this.screenManager.onTransition((action, data) => {
            this.handleScreenTransition(action, data);
        });
        
        // Show menu with title music
        this.screenManager.show('menu');
        this.audioManager.playTitleMusic();
        
        // Initialize input controller
        this.inputController.init();
        
        console.log('GameController initialized');
    }
    
    async startGame(playerCount = 1, levelNumber = 1) {
        try {
            // Initialize game model with specified level
            this.model.playerCount = playerCount;
            await this.model.init(levelNumber);
            
            // Check if map loaded successfully
            if (!this.model.map) {
                console.error('Failed to load map');
                return;
            }
            
            // Render the initial map
            this.view.renderMap(this.model.map);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show level start screen
            this.screenManager.show('levelStart', { level: this.model.level });
        } catch (error) {
            console.error('Error starting game:', error);
        }
    }
    
    handleScreenTransition(action, data = {}) {
        console.log('Screen transition:', action, data);
        
        switch(action) {
            case 'start1player':
                this.audioManager.fadeOut(500);  // Fade out menu music
                this.startGame(1);
                break;
                
            case 'start2players':
                this.audioManager.fadeOut(500);  // Fade out menu music
                this.startGame(2);
                break;
                
            case 'startLevel':
                // Start specific level with 1 player
                this.audioManager.fadeOut(500);  // Fade out menu music
                this.startGame(1, data.level || 1);
                break;
                
            case 'levelStartComplete':
                this.start();
                this.audioManager.playBattleMusic();  // Start battle music when level begins
                break;
                
            case 'gameOverComplete':
                this.showScoreScreen();
                break;
                
            case 'scoreComplete':
                this.handleScoreComplete();
                break;
        }
    }
    
    setupEventListeners() {
        // Listen for game state changes
        this.model.onVictory = () => {
            this.audioManager.playVictory();
        };
        
        // Listen for powerup collection
        this.model.onPowerupCollected = () => {
            this.audioManager.playPowerup();
        };
        
        // Setup tank fire sound callbacks
        const setupTankSounds = (tank) => {
            tank.onFire = (position) => {
                // Get player 1 position as listener (camera follows player)
                const listener = this.model.players[0] ? this.model.players[0].position : { x: 0, z: 0 };
                this.audioManager.playBulletFire(position, listener);
            };
        };
        
        // Setup for all players
        this.model.players.forEach(player => setupTankSounds(player));
        
        // Setup for enemies as they spawn
        this.model.onEnemySpawn = (enemy) => {
            setupTankSounds(enemy);
        };
        
        // Listen for bullet hits
        this.model.onBulletHit = (position) => {
            const listener = this.model.players[0] ? this.model.players[0].position : { x: 0, z: 0 };
            this.audioManager.playBulletHit(position, listener);
        };
        
        // Listen for input events
        // These will be connected when the game logic is more complete
    }
    
    start() {
        if (this.isRunning) return;
        
        // Check if map is loaded
        if (!this.model.map) {
            console.warn('Cannot start game - map not loaded');
            return;
        }
        
        this.isRunning = true;
        this.lastTime = performance.now();
        
        // Initialize game
        this.initializeGame();
        
        // Start game loop
        this.gameLoop(this.lastTime);
        
        console.log('Game loop started');
    }
    
    initializeGame() {
        // Clear the view
        this.view.clear();
        
        // Render the map if it exists
        if (this.model.map) {
            this.view.renderMap(this.model.map);
        }
        
        // Start playing
        this.model.setState('playing', 'Game started');
        
        // Add initial tanks to view
        this.model.players.forEach(player => {
            this.view.addTank(player.id, player.type, player.position);
        });
    }
    
    stop() {
        this.isRunning = false;
    }
    
    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Add to accumulator
        this.accumulator += deltaTime;
        
        // Fixed timestep update loop
        while (this.accumulator >= this.fixedTimeStep) {
            // Process input
            this.handleInput();
            
            // Update game logic with fixed timestep
            this.update(this.fixedTimeStep);
            
            this.accumulator -= this.fixedTimeStep;
        }
        
        // Calculate interpolation factor
        this.alpha = this.accumulator / this.fixedTimeStep;
        
        // Render with interpolation
        this.render(this.alpha);
        
        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    handleInput() {
        const input = this.inputController.getInput();
        
        // Debug: log when we get input
        if (input.player1 && (input.player1.fire || input.player1.up || input.player1.down || input.player1.left || input.player1.right)) {
            console.log('[DEBUG] GameController got input:', {
                fire: input.player1.fire,
                up: input.player1.up,
                down: input.player1.down,
                left: input.player1.left,
                right: input.player1.right
            });
        }
        
        // Process player 1 input
        if (input.player1) {
            if (input.player1.fire) {
                console.log('[DEBUG] GameController: player1 fire input detected - calling handlePlayerInput');
            }
            this.model.handlePlayerInput(0, input.player1);
        }
        
        // Process player 2 input (only if player 2 exists)
        if (input.player2 && this.model.players[1]) {
            if (input.player2.fire) {
                console.log('[DEBUG] GameController: player2 fire input detected');
            }
            this.model.handlePlayerInput(1, input.player2);
        }
        
        // Process game controls
        if (input.pause) {
            this.togglePause();
        }
        
        if (input.mute) {
            const enabled = this.audioManager.toggleMute();
            console.log(`Audio ${enabled ? 'enabled' : 'muted'}`);
        }
    }
    
    update(deltaTime) {
        // Update game model
        this.model.update(deltaTime);
        
        // Update view based on model changes
        this.syncViewWithModel();
        
        // Update visual effects
        this.view.updateExplosions(deltaTime);
    }
    
    render(alpha) {
        // Render the scene
        // Alpha can be used for interpolation between frames
        this.view.render();
    }
    
    syncViewWithModel() {
        // Sync player tanks
        this.model.players.forEach(player => {
            if (player.alive) {
                if (!this.view.tankMeshes.has(player.id)) {
                    this.view.addTank(player.id, player.type, player.position);
                }
                // Always update position, rotation and shield
                this.view.updateTank(player.id, player.position, player.direction, player.hasShield);
                // Tank animation is now handled by 3D model rotation
            } else {
                if (this.view.tankMeshes.has(player.id)) {
                    this.view.removeTank(player.id);
                }
            }
        });
        
        // Sync enemy tanks
        this.model.enemies.forEach(enemy => {
            if (enemy.alive) {
                if (!this.view.tankMeshes.has(enemy.id)) {
                    this.view.addTank(enemy.id, enemy.type, enemy.position);
                }
                // Always update position, rotation and armor
                this.view.updateTank(enemy.id, enemy.position, enemy.direction, false, enemy.livesCount);
                // Tank animation is now handled by 3D model rotation
            } else {
                if (this.view.tankMeshes.has(enemy.id)) {
                    this.view.removeTank(enemy.id);
                }
            }
        });
        
        // Mark enemies for removal after explosion animation (1 second delay)
        this.model.enemies.forEach(enemy => {
            if (!enemy.alive && !enemy.removalTimer) {
                enemy.removalTimer = Date.now();
            }
            if (enemy.removalTimer && Date.now() - enemy.removalTimer > 1000) {
                enemy.toRemove = true;
            }
        });
        
        // Only remove enemies that are marked for removal
        this.model.enemies = this.model.enemies.filter(e => !e.toRemove);
        
        // Sync bullets
        this.model.bullets.forEach(bullet => {
            if (bullet.active) {
                if (!this.view.bulletMeshes.has(bullet.id)) {
                    this.view.addBullet(bullet.id, bullet.position);
                } else {
                    this.view.updateBullet(bullet.id, bullet.position);
                }
            } else {
                if (this.view.bulletMeshes.has(bullet.id)) {
                    this.view.removeBullet(bullet.id);
                }
            }
        });
        
        // Remove inactive bullets from array
        this.model.bullets = this.model.bullets.filter(b => b.active);
        
        // Sync bonuses
        this.model.bonuses.forEach(bonus => {
            if (bonus.active) {
                if (!this.view.bonusMeshes.has(bonus.id)) {
                    this.view.addBonus(bonus.id, bonus.type, bonus.position);
                }
                this.view.updateBonus(bonus.id, bonus.visible);
            } else {
                if (this.view.bonusMeshes.has(bonus.id)) {
                    this.view.removeBonus(bonus.id);
                }
            }
        });
        
        // Update map tiles if destroyed
        if (this.model.destroyedTiles && this.model.destroyedTiles.length > 0) {
            this.model.destroyedTiles.forEach(tile => {
                // Update the visual representation
                if (tile.result.destroyed) {
                    const explosion = this.view.mapRenderer.destroyTile(tile.x, tile.z);
                    if (explosion) {
                        this.view.explosions.push(explosion);
                    }
                } else if (tile.result.partial) {
                    // Handle partial destruction (for future implementation)
                    this.view.mapRenderer.updateTile(tile.x, tile.z, 0);
                }
            });
            // Clear the destroyed tiles array
            this.model.destroyedTiles = [];
        }
        
        // Update UI
        this.updateUI();
    }
    
    updateUI() {
        // Update score display
        const p1Score = document.querySelector('#player1-score span');
        const p2Score = document.querySelector('#player2-score span');
        const levelDisplay = document.querySelector('#level span');
        
        if (p1Score) p1Score.textContent = this.model.score.player1;
        if (p2Score) p2Score.textContent = this.model.score.player2;
        if (levelDisplay) levelDisplay.textContent = this.model.level;
        
        // Update game state display
        const gameStateEl = document.getElementById('game-state');
        if (gameStateEl) {
            switch(this.model.gameState) {
                case 'paused':
                    gameStateEl.textContent = 'PAUSED';
                    gameStateEl.classList.add('show');
                    break;
                case 'gameover':
                    gameStateEl.textContent = 'GAME OVER';
                    gameStateEl.classList.add('show');
                    break;
                default:
                    gameStateEl.classList.remove('show');
            }
        }
    }
    
    togglePause() {
        if (this.model.gameState === 'playing') {
            this.model.setState('paused', 'User paused');
            this.audioManager.pause();  // Pause music
            this.screenManager.show('pause');
        } else if (this.model.gameState === 'paused') {
            this.model.setState('playing', 'User resumed');
            this.audioManager.resume();  // Resume music
            this.screenManager.hide('pause');
        }
    }
    
    showGameOver() {
        this.audioManager.playGameOver();  // Play game over music
        this.screenManager.show('gameOver');
    }
    
    showScoreScreen() {
        const scoreData = {
            level: this.model.level,
            players: this.model.players.map((p, index) => ({
                lives: p.livesCount,
                score: this.model.score[`player${index + 1}`] || 0,
                type: p.type
            })),
            enemiesKilled: this.model.enemiesKilled,
            bonusesCollected: this.model.bonusesCollected || 0
        };
        
        console.log('Score data:', scoreData);
        this.screenManager.show('score', scoreData);
    }
    
    async handleScoreComplete() {
        if (this.model.gameState === 'gameover') {
            // Return to menu
            this.screenManager.show('menu');
            this.audioManager.playTitleMusic();  // Return to title music
            this.model.reset();
        } else if (this.model.gameState === 'victory') {
            // Next level
            await this.model.nextLevel();
            
            // Render the new map
            if (this.model.map) {
                this.view.renderMap(this.model.map);
            }
            
            this.screenManager.show('levelStart', { level: this.model.level });
        }
    }
    
}