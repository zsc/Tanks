import ResourceLoader from '../utils/ResourceLoader.js';
import SpriteManager from './SpriteManager.js';
import MapRenderer from './MapRenderer.js';

export default class GameView3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        
        // Managers
        this.resourceLoader = new ResourceLoader();
        this.spriteManager = null;
        this.mapRenderer = null;
        
        // Game object meshes
        this.tankMeshes = new Map();
        this.bulletMeshes = new Map();
        this.explosions = [];
        
        // Camera settings
        this.cameraDistance = 30;
        this.cameraHeight = 40;
    }
    
    async init() {
        // Get canvas element
        this.canvas = document.getElementById('game-canvas');
        
        // Initialize Three.js components
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        
        // Setup resize handler
        this.setupResizeHandler();
        
        // Load resources
        await this.resourceLoader.loadAll();
        
        // Initialize managers
        this.spriteManager = new SpriteManager(this.resourceLoader);
        this.mapRenderer = new MapRenderer(this.scene, this.spriteManager);
        
        console.log('GameView3D initialized');
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
    }
    
    initCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 30;
        
        // Orthographic camera for 2.5D view (Phase 1)
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            100
        );
        
        // Position camera for top-down view with slight angle
        this.camera.position.set(0, this.cameraHeight, 20);
        this.camera.lookAt(0, 0, 0);
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Disable shadows for Phase 1 (2D sprites)
        this.renderer.shadowMap.enabled = false;
    }
    
    initLights() {
        // Ambient light for basic visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);
        
        // No directional lights needed for Phase 1 (using MeshBasicMaterial)
    }
    
    renderMap(mapModel) {
        this.mapRenderer.renderMap(mapModel);
    }
    
    addTank(id, type, position) {
        const tank = this.spriteManager.createTankSprite(type);
        tank.position.set(
            position.x - 13,  // Center map at origin
            tank.position.y,
            position.z - 13
        );
        this.scene.add(tank);
        this.tankMeshes.set(id, tank);
    }
    
    updateTank(id, position, rotation) {
        const tank = this.tankMeshes.get(id);
        if (tank) {
            tank.position.x = position.x - 13;
            tank.position.z = position.z - 13;
            tank.rotation.y = rotation;
        }
    }
    
    removeTank(id) {
        const tank = this.tankMeshes.get(id);
        if (tank) {
            this.scene.remove(tank);
            this.tankMeshes.delete(id);
            
            // Create explosion effect
            const explosion = this.spriteManager.createExplosion(tank.position);
            this.scene.add(explosion);
            this.explosions.push(explosion);
        }
    }
    
    addBullet(id, position) {
        const bullet = this.spriteManager.createBulletSprite();
        bullet.position.set(
            position.x - 13,
            bullet.position.y,
            position.z - 13
        );
        this.scene.add(bullet);
        this.bulletMeshes.set(id, bullet);
    }
    
    updateBullet(id, position) {
        const bullet = this.bulletMeshes.get(id);
        if (bullet) {
            bullet.position.x = position.x - 13;
            bullet.position.z = position.z - 13;
        }
    }
    
    removeBullet(id) {
        const bullet = this.bulletMeshes.get(id);
        if (bullet) {
            this.scene.remove(bullet);
            this.bulletMeshes.delete(id);
        }
    }
    
    updateExplosions(deltaTime) {
        this.explosions = this.explosions.filter(explosion => {
            const active = this.spriteManager.updateExplosion(explosion, deltaTime);
            if (!active) {
                this.scene.remove(explosion);
            }
            return active;
        });
    }
    
    destroyMapTile(x, z) {
        const explosion = this.mapRenderer.destroyTile(x, z);
        if (explosion) {
            this.scene.add(explosion);
            this.explosions.push(explosion);
        }
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    setupResizeHandler() {
        window.addEventListener('resize', () => {
            const aspect = window.innerWidth / window.innerHeight;
            const frustumSize = 30;
            
            // Update camera
            this.camera.left = frustumSize * aspect / -2;
            this.camera.right = frustumSize * aspect / 2;
            this.camera.top = frustumSize / 2;
            this.camera.bottom = frustumSize / -2;
            this.camera.updateProjectionMatrix();
            
            // Update renderer
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    clear() {
        // Clear all game objects from scene
        this.tankMeshes.forEach(tank => this.scene.remove(tank));
        this.tankMeshes.clear();
        
        this.bulletMeshes.forEach(bullet => this.scene.remove(bullet));
        this.bulletMeshes.clear();
        
        this.explosions.forEach(explosion => this.scene.remove(explosion));
        this.explosions = [];
        
        if (this.mapRenderer) {
            this.mapRenderer.clearMap();
        }
    }
}