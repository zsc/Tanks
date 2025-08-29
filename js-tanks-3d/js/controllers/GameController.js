import InputController from './InputController.js';

export default class GameController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.inputController = new InputController();
        
        // Game loop timing (fixed timestep)
        this.targetFPS = 60;
        this.fixedTimeStep = 1000 / this.targetFPS; // 16.67ms
        this.accumulator = 0;
        this.lastTime = 0;
        this.isRunning = false;
        
        // Interpolation factor for smooth rendering
        this.alpha = 0;
    }
    
    async init() {
        // Initialize input controller
        this.inputController.init();
        
        // Initialize game model
        this.model.init();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('GameController initialized');
    }
    
    setupEventListeners() {
        // Listen for game state changes
        // Listen for input events
        // These will be connected when the game logic is more complete
    }
    
    start() {
        if (this.isRunning) return;
        
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
        
        // Render the map
        this.view.renderMap(this.model.map);
        
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
                // Always update position and rotation
                this.view.updateTank(player.id, player.position, player.direction);
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
                // Always update position and rotation
                this.view.updateTank(enemy.id, enemy.position, enemy.direction);
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
        } else if (this.model.gameState === 'paused') {
            this.model.setState('playing', 'User resumed');
        }
    }
    
}