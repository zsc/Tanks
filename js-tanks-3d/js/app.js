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
        
        // Initialize controller
        await this.controller.init();
        
        // Start game
        this.controller.start();
        
        console.log('Game started successfully!');
    }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init().catch(error => {
        console.error('Failed to initialize game:', error);
    });
});