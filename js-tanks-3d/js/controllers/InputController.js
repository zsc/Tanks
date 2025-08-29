export default class InputController {
    constructor() {
        this.keys = {};
        this.keyBindings = {
            // Player 1: Arrow keys + Space (primary) or Slash (secondary)
            player1: {
                up: 'ArrowUp',
                down: 'ArrowDown',
                left: 'ArrowLeft',
                right: 'ArrowRight',
                fire: 'Space'  // Space is more reliable across browsers
            },
            // Player 2: WASD + Left Shift
            player2: {
                up: 'KeyW',
                down: 'KeyS',
                left: 'KeyA',
                right: 'KeyD',
                fire: 'ShiftLeft'  // Left Shift for Player 2
            },
            game: {
                pause: 'KeyP',
                restart: 'KeyR'
            }
        };
        
        this.input = {
            player1: {
                up: false,
                down: false,
                left: false,
                right: false,
                fire: false
            },
            player2: {
                up: false,
                down: false,
                left: false,
                right: false,
                fire: false
            },
            pause: false,
            restart: false
        };
        
        // Track fire button state to prevent rapid fire
        this.firePressed = {
            player1: false,
            player2: false
        };
    }
    
    init() {
        this.setupEventListeners();
        console.log('InputController initialized');
    }
    
    setupEventListeners() {
        // Keydown event
        window.addEventListener('keydown', (e) => {
            // Debug log for fire keys
            if (e.code === 'Space' || e.code === 'ShiftLeft') {
                console.log('Fire key pressed:', e.code);
            }
            
            if (!this.keys[e.code]) {
                this.keys[e.code] = true;
                this.updateInput(e.code, true);
            }
        });
        
        // Keyup event
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.updateInput(e.code, false);
        });
        
        // Prevent default for game keys
        window.addEventListener('keydown', (e) => {
            if (this.isGameKey(e.code)) {
                e.preventDefault();
            }
        });
    }
    
    updateInput(keyCode, isPressed) {
        // Player 1 controls
        if (keyCode === this.keyBindings.player1.up) {
            this.input.player1.up = isPressed;
        } else if (keyCode === this.keyBindings.player1.down) {
            this.input.player1.down = isPressed;
        } else if (keyCode === this.keyBindings.player1.left) {
            this.input.player1.left = isPressed;
        } else if (keyCode === this.keyBindings.player1.right) {
            this.input.player1.right = isPressed;
        } else if (keyCode === this.keyBindings.player1.fire) {
            // Only fire on key press, not hold
            if (isPressed && !this.firePressed.player1) {
                console.log('[DEBUG] Player 1 fire input set to TRUE');
                this.input.player1.fire = true;
                this.firePressed.player1 = true;
            } else if (!isPressed) {
                console.log('[DEBUG] Player 1 fire input set to FALSE');
                this.input.player1.fire = false;
                this.firePressed.player1 = false;
            }
        }
        
        // Player 2 controls
        if (keyCode === this.keyBindings.player2.up) {
            this.input.player2.up = isPressed;
        } else if (keyCode === this.keyBindings.player2.down) {
            this.input.player2.down = isPressed;
        } else if (keyCode === this.keyBindings.player2.left) {
            this.input.player2.left = isPressed;
        } else if (keyCode === this.keyBindings.player2.right) {
            this.input.player2.right = isPressed;
        } else if (keyCode === this.keyBindings.player2.fire) {
            // Only fire on key press, not hold
            if (isPressed && !this.firePressed.player2) {
                this.input.player2.fire = true;
                this.firePressed.player2 = true;
            } else if (!isPressed) {
                this.input.player2.fire = false;
                this.firePressed.player2 = false;
            }
        }
        
        // Game controls
        if (keyCode === this.keyBindings.game.pause) {
            this.input.pause = isPressed;
        } else if (keyCode === this.keyBindings.game.restart) {
            this.input.restart = isPressed;
        }
    }
    
    isGameKey(keyCode) {
        // Check if the key is used by the game
        const allKeys = [
            ...Object.values(this.keyBindings.player1),
            ...Object.values(this.keyBindings.player2),
            ...Object.values(this.keyBindings.game)
        ];
        return allKeys.includes(keyCode);
    }
    
    getInput() {
        // Return current input state and reset fire flags
        const currentInput = { ...this.input };
        
        // Debug log if fire is being read
        if (currentInput.player1 && currentInput.player1.fire) {
            console.log('[DEBUG] getInput() returning fire=true for player1');
            console.log('[DEBUG] Full input structure being returned:', JSON.stringify(currentInput));
        }
        
        // Reset fire flags after reading
        if (this.input.player1.fire) {
            this.input.player1.fire = false;
        }
        if (this.input.player2.fire) {
            this.input.player2.fire = false;
        }
        
        // Reset single-press game controls
        if (this.input.pause) {
            this.input.pause = false;
        }
        if (this.input.restart) {
            this.input.restart = false;
        }
        
        return currentInput;
    }
    
    reset() {
        this.keys = {};
        this.input = {
            player1: {
                up: false,
                down: false,
                left: false,
                right: false,
                fire: false
            },
            player2: {
                up: false,
                down: false,
                left: false,
                right: false,
                fire: false
            },
            pause: false,
            restart: false
        };
        this.firePressed = {
            player1: false,
            player2: false
        };
    }
}