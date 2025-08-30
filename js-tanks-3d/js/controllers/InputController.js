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
                restart: 'KeyR',
                mute: 'KeyM'
            }
        };
        
        // Use a queue for discrete actions like firing
        this.actionQueue = [];
    }
    
    init() {
        this.setupEventListeners();
        console.log('InputController initialized');
    }
    
    setupEventListeners() {
        // Keydown event for actions
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return; // Ignore repeated events from holding a key
            
            const p1Fire = this.keyBindings.player1.fire;
            const p2Fire = this.keyBindings.player2.fire;
            const pause = this.keyBindings.game.pause;
            const mute = this.keyBindings.game.mute;
            
            if (e.code === p1Fire) {
                console.log('[DEBUG] Player 1 fire action queued');
                this.actionQueue.push('player1_fire');
            }
            if (e.code === p2Fire) {
                this.actionQueue.push('player2_fire');
            }
            if (e.code === pause) {
                this.actionQueue.push('pause');
            }
            if (e.code === mute) {
                this.actionQueue.push('mute');
            }
        });
        
        // Key state tracking for continuous movement
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Prevent default for game keys
        window.addEventListener('keydown', (e) => {
            if (this.isGameKey(e.code)) {
                e.preventDefault();
            }
        });
    }
    
    isGameKey(keyCode) {
        const allKeys = [
            ...Object.values(this.keyBindings.player1),
            ...Object.values(this.keyBindings.player2),
            ...Object.values(this.keyBindings.game)
        ];
        return allKeys.includes(keyCode);
    }
    
    getInput() {
        // Get continuous movement state
        const input = {
            player1: {
                up: this.keys[this.keyBindings.player1.up] || false,
                down: this.keys[this.keyBindings.player1.down] || false,
                left: this.keys[this.keyBindings.player1.left] || false,
                right: this.keys[this.keyBindings.player1.right] || false,
                fire: false // This will be handled by the action queue
            },
            player2: {
                up: this.keys[this.keyBindings.player2.up] || false,
                down: this.keys[this.keyBindings.player2.down] || false,
                left: this.keys[this.keyBindings.player2.left] || false,
                right: this.keys[this.keyBindings.player2.right] || false,
                fire: false
            },
            pause: false,
            mute: false
        };
        
        // Process the action queue for discrete events
        while (this.actionQueue.length > 0) {
            const action = this.actionQueue.shift(); // Get and remove action from queue
            if (action === 'player1_fire') {
                console.log('[DEBUG] Dequeuing player1_fire action');
                input.player1.fire = true;
            }
            if (action === 'player2_fire') {
                input.player2.fire = true;
            }
            if (action === 'pause') {
                input.pause = true;
            }
            if (action === 'mute') {
                input.mute = true;
            }
        }
        
        return input;
    }
    
    reset() {
        this.keys = {};
        this.actionQueue = [];
    }
}