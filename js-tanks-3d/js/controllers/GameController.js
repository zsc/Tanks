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
        this.model.setState('playing');
        
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
        
        // Process player 1 input
        if (input.player1) {
            this.model.handlePlayerInput(0, input.player1);
        }
        
        // Process player 2 input
        if (input.player2) {
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
                // Always update position, even if velocity is 0
                this.view.updateTank(player.id, player.position, player.rotation);
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
                // Always update position
                this.view.updateTank(enemy.id, enemy.position, enemy.rotation);
            } else {
                if (this.view.tankMeshes.has(enemy.id)) {
                    this.view.removeTank(enemy.id);
                }
            }
        });
        
        // Remove dead enemies from array
        this.model.enemies = this.model.enemies.filter(e => e.alive);
        
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
        // This would be triggered by collision events
        
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
            this.model.setState('paused');
        } else if (this.model.gameState === 'paused') {
            this.model.setState('playing');
        }
    }
    
}