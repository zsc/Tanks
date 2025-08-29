import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import ResourceLoader from '../utils/ResourceLoader.js';
import Model3DManager from './Model3DManager.js';
import Map3DRenderer from './Map3DRenderer.js';

export default class GameView3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        this.controls = null;
        
        // Managers - Only 3D, no sprites
        this.resourceLoader = new ResourceLoader();
        this.modelManager = null;
        this.mapRenderer = null;
        
        // Game object meshes
        this.tankMeshes = new Map();
        this.bulletMeshes = new Map();
        this.explosions = [];
        
        // Camera settings for 45-degree 2.5D view
        this.cameraDistance = 40;
        this.cameraAngle = Math.PI / 4; // 45 degrees
        this.orbitEnabled = true;
        this.currentView = 'isometric';
    }
    
    async init() {
        // Get canvas element
        this.canvas = document.getElementById('game-canvas');
        
        // Initialize Three.js components
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.initControls();
        this.setupCameraButtons();
        
        // Setup resize handler
        this.setupResizeHandler();
        
        // Load resources (only X3D models now)
        await this.resourceLoader.loadAll();
        
        // Initialize 3D managers only
        this.modelManager = new Model3DManager(this.resourceLoader);
        this.mapRenderer = new Map3DRenderer(this.scene, this.modelManager);
        
        console.log('GameView3D initialized');
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
    }
    
    initCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        
        // Perspective camera for depth perception (near big, far small)
        this.camera = new THREE.PerspectiveCamera(
            50,     // Field of view (FOV) in degrees - slightly wider for better view
            aspect, // Aspect ratio
            0.1,    // Near clipping plane
            200     // Far clipping plane
        );
        
        // Position camera for 45-degree angle view with perspective
        // Adjusted for perspective projection to show entire battlefield
        const distance = 60;  // Increased distance for perspective camera
        const angleInRadians = Math.PI / 3.5; // Slightly less than 45 degrees for better view
        this.camera.position.set(
            0,                                    // x: centered
            distance * Math.sin(angleInRadians), // y: height based on angle
            distance * Math.cos(angleInRadians)  // z: distance back based on angle
        );
        this.camera.lookAt(0, 0, -5); // Look slightly forward for better perspective
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Phase 2: Enable shadows for 3D models
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    }
    
    initLights() {
        // Phase 2: Enhanced lighting for 3D models
        
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 30, 10);
        directionalLight.target.position.set(0, 0, 0);
        
        // Enable shadows for directional light
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);
        
        // Secondary fill light
        const fillLight = new THREE.DirectionalLight(0x4169E1, 0.3);
        fillLight.position.set(-10, 20, -10);
        this.scene.add(fillLight);
        
        // Optional: Add hemisphere light for more natural lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x545454, 0.3);
        this.scene.add(hemisphereLight);
    }
    
    initControls() {
        // Initialize OrbitControls for 3D camera manipulation
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2.2; // Limit vertical rotation
        this.controls.enabled = this.orbitEnabled;
        
        // Set initial target to center of battlefield
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
    
    setupCameraButtons() {
        // Top view button
        document.getElementById('view-top').addEventListener('click', () => {
            this.setCameraView('top');
        });
        
        // Isometric view button
        document.getElementById('view-isometric').addEventListener('click', () => {
            this.setCameraView('isometric');
        });
        
        // Perspective view button
        document.getElementById('view-perspective').addEventListener('click', () => {
            this.setCameraView('perspective');
        });
        
        // Toggle orbit controls
        document.getElementById('toggle-orbit').addEventListener('click', () => {
            this.toggleOrbitControls();
        });
        
        // Set initial active button
        this.updateActiveButton('isometric');
    }
    
    setCameraView(viewType) {
        this.currentView = viewType;
        
        switch(viewType) {
            case 'top':
                // Direct top-down view
                this.camera.position.set(0, 80, 1);
                this.camera.lookAt(0, 0, 0);
                break;
                
            case 'isometric':
                // Classic isometric angle
                const isoDistance = 60;
                const isoAngle = Math.PI / 4;
                this.camera.position.set(
                    isoDistance * Math.sin(isoAngle),
                    isoDistance,
                    isoDistance * Math.cos(isoAngle)
                );
                this.camera.lookAt(0, 0, 0);
                break;
                
            case 'perspective':
                // Dynamic perspective view
                const perspDistance = 50;
                const perspAngle = Math.PI / 3;
                this.camera.position.set(
                    perspDistance * Math.sin(perspAngle) * 0.8,
                    perspDistance * 0.7,
                    perspDistance * Math.cos(perspAngle)
                );
                this.camera.lookAt(0, 0, -5);
                break;
        }
        
        // Update controls target
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
        
        this.updateActiveButton(viewType);
    }
    
    toggleOrbitControls() {
        this.orbitEnabled = !this.orbitEnabled;
        this.controls.enabled = this.orbitEnabled;
        
        const button = document.getElementById('toggle-orbit');
        if (this.orbitEnabled) {
            button.classList.add('active');
            button.textContent = 'Orbit: ON';
        } else {
            button.classList.remove('active');
            button.textContent = 'Orbit: OFF';
        }
    }
    
    updateActiveButton(viewType) {
        // Remove active class from all buttons
        document.querySelectorAll('.camera-buttons button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to current view button
        const buttonId = `view-${viewType}`;
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.add('active');
        }
        
        // Update orbit toggle button state
        const orbitButton = document.getElementById('toggle-orbit');
        if (this.orbitEnabled) {
            orbitButton.classList.add('active');
            orbitButton.textContent = 'Orbit: ON';
        } else {
            orbitButton.textContent = 'Orbit: OFF';
        }
    }
    
    renderMap(mapModel) {
        this.mapRenderer.renderMap(mapModel);
    }
    
    addTank(id, type, position) {
        // Phase 2: Use 3D models instead of sprites
        const tank = this.modelManager.createTank3D(type);
        tank.position.set(
            position.x - 13,  // Center map at origin
            0.5,  // Slightly above ground
            position.z - 13
        );
        
        // Enable shadows for the tank
        tank.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        this.scene.add(tank);
        this.tankMeshes.set(id, tank);
    }
    
    updateTank(id, position, rotation) {
        const tank = this.tankMeshes.get(id);
        if (tank) {
            tank.position.x = position.x - 13;
            tank.position.z = position.z - 13;
            tank.rotation.y = rotation;
            // Keep tank slightly above ground for 3D effect
            tank.position.y = 0.5;
        }
    }
    
    removeTank(id) {
        const tank = this.tankMeshes.get(id);
        if (tank) {
            this.scene.remove(tank);
            this.tankMeshes.delete(id);
            
            // Create explosion effect using 3D model
            const explosion = this.modelManager.createExplosion3D(tank.position);
            this.scene.add(explosion);
            this.explosions.push(explosion);
        }
    }
    
    addBullet(id, position) {
        // Phase 2: Use 3D models for bullets
        const bullet = this.modelManager.createBullet3D();
        bullet.position.set(
            position.x - 13,
            0.8, // Height for bullet flight
            position.z - 13
        );
        
        // Enable shadows for the bullet
        bullet.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = false; // Bullets don't receive shadows
            }
        });
        
        this.scene.add(bullet);
        this.bulletMeshes.set(id, bullet);
    }
    
    updateBullet(id, position) {
        const bullet = this.bulletMeshes.get(id);
        if (bullet) {
            bullet.position.x = position.x - 13;
            bullet.position.y = 0.5; // Keep bullet at fixed height
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
            // Use the Model3DManager's updateExplosion method if available
            if (this.modelManager && this.modelManager.updateExplosion) {
                const active = this.modelManager.updateExplosion(explosion, deltaTime);
                if (!active) {
                    this.scene.remove(explosion);
                }
                return active;
            }
            
            // Fallback: Simple explosion animation
            if (explosion.userData && explosion.userData.createdAt !== undefined) {
                const age = Date.now() - explosion.userData.createdAt;
                const lifeRatio = age / (explosion.userData.lifetime || 1000);
                
                if (lifeRatio >= 1) {
                    this.scene.remove(explosion);
                    return false;
                }
                
                // Scale and fade animation
                const scale = 1 + lifeRatio * 2;
                explosion.scale.set(scale, scale, scale);
                
                // Update opacity for all children
                explosion.children.forEach(child => {
                    if (child.material && child.material.opacity !== undefined) {
                        child.material.opacity = Math.max(0, 1 - lifeRatio);
                    }
                });
                
                return true;
            }
            return false;
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
        // Update orbit controls if enabled
        if (this.controls && this.controls.enabled) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    setupResizeHandler() {
        window.addEventListener('resize', () => {
            const aspect = window.innerWidth / window.innerHeight;
            
            // Update perspective camera aspect ratio
            this.camera.aspect = aspect;
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