import GameController from './controllers/GameController.js';
import GameModel from './models/GameModel.js';
import GameView3D from './views/GameView3D.js';

class App {
    constructor() {
        this.model = null;
        this.view = null;
        this.controller = null;
    }

    async init() {
        console.log('Initializing Tanks 3D...');
        
        // Initialize MVC components
        this.model = new GameModel();
        this.view = new GameView3D();
        this.controller = new GameController(this.model, this.view);
        
        // Initialize view (Three.js scene)
        await this.view.init();
        
        // Initialize controller (will show menu)
        await this.controller.init();
        
        // Don't auto-start, wait for menu selection
        console.log('Game initialized successfully!');
    }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    
    // Expose game instance globally for debugging and screen transitions
    window.game = {
        app: app,
        get model() { return app.model; },
        get view() { return app.view; },
        get controller() { return app.controller; }
    };
    
    app.init().catch(error => {
        console.error('Failed to initialize game:', error);
    });
});