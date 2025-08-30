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
        this.bonusMeshes = new Map();
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
        if (!mapModel) {
            console.warn('GameView3D.renderMap: mapModel is null');
            return;
        }
        if (!this.mapRenderer) {
            console.error('GameView3D.renderMap: mapRenderer is not initialized');
            return;
        }
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
    
    updateTank(id, position, direction, hasShield = false, armorLevel = 1) {
        const tank = this.tankMeshes.get(id);
        if (tank) {
            tank.position.x = position.x - 13;
            tank.position.z = position.z - 13;
            this.modelManager.rotateTankToDirection(tank, direction);
            // Keep tank slightly above ground for 3D effect
            tank.position.y = 0.5;
            
            // Handle shield effect for players
            if (hasShield) {
                if (!tank.shield) {
                    // Create shield mesh
                    const shieldGeometry = new THREE.SphereGeometry(0.7, 16, 16);
                    const shieldMaterial = new THREE.MeshBasicMaterial({
                        color: 0x00ffff,
                        transparent: true,
                        opacity: 0.3,
                        wireframe: true
                    });
                    tank.shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
                    tank.add(tank.shield);
                }
                // Animate shield
                tank.shield.rotation.y += 0.05;
                tank.shield.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.1);
            } else if (tank.shield) {
                // Remove shield
                tank.remove(tank.shield);
                tank.shield = null;
            }
            
            // Update enemy tank color based on armor level
            if (id.startsWith('enemy_')) {
                const armorColors = {
                    1: 0x808080, // Gray - weakest
                    2: 0x00ff00, // Green
                    3: 0xffff00, // Yellow
                    4: 0xff0000  // Red - strongest
                };
                
                const color = armorColors[armorLevel] || 0x808080;
                tank.traverse((child) => {
                    if (child.isMesh && child.material) {
                        // Update material color to indicate armor level
                        if (!child.originalMaterial) {
                            child.originalMaterial = child.material.clone();
                        }
                        child.material.color.setHex(color);
                    }
                });
            }
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
        
        // Add a point light to make bullet more visible
        const light = new THREE.PointLight(0xFFAA00, 0.5, 3);
        light.position.set(0, 0, 0);
        bullet.add(light);
        
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
            bullet.position.y = 0.8; // Keep bullet at consistent height with addBullet
            bullet.position.z = position.z - 13;
            
            // Add rotation for visual effect
            bullet.rotation.x += 0.1;
            bullet.rotation.y += 0.1;
        }
    }
    
    removeBullet(id) {
        const bullet = this.bulletMeshes.get(id);
        if (bullet) {
            this.scene.remove(bullet);
            this.bulletMeshes.delete(id);
        }
    }
    
    addBonus(id, type, position) {
        // Create 3D model based on bonus type
        const bonusGroup = this.createBonus3DModel(type);
        
        bonusGroup.position.set(
            position.x - 13,
            0.4,  // Float slightly above ground
            position.z - 13
        );
        
        // Add rotation animation
        bonusGroup.userData = { 
            type: type, 
            rotationSpeed: 0.02,
            floatOffset: Math.random() * Math.PI * 2  // Random float phase
        };
        
        // Enable shadows for all children
        bonusGroup.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        this.scene.add(bonusGroup);
        this.bonusMeshes.set(id, bonusGroup);
    }
    
    updateBonus(id, visible) {
        const bonus = this.bonusMeshes.get(id);
        if (bonus) {
            bonus.visible = visible;
            
            // Animate when visible
            if (visible) {
                // Rotation animation
                bonus.rotation.y += bonus.userData.rotationSpeed;
                
                // Float animation with phase offset
                const floatTime = Date.now() * 0.003 + bonus.userData.floatOffset;
                bonus.position.y = 0.4 + Math.sin(floatTime) * 0.1;
                
                // Special animations for specific types
                if (bonus.userData.type === 'star') {
                    // Star pulses
                    const pulse = 1 + Math.sin(floatTime * 2) * 0.1;
                    bonus.scale.set(pulse, pulse, pulse);
                } else if (bonus.userData.type === 'clock') {
                    // Clock hands rotate
                    const hourHand = bonus.getObjectByName('hourHand');
                    const minuteHand = bonus.getObjectByName('minuteHand');
                    if (hourHand) hourHand.rotation.z -= 0.005;
                    if (minuteHand) minuteHand.rotation.z -= 0.02;
                }
            }
        }
    }
    
    removeBonus(id) {
        const bonus = this.bonusMeshes.get(id);
        if (bonus) {
            this.scene.remove(bonus);
            this.bonusMeshes.delete(id);
        }
    }
    
    createBonus3DModel(type) {
        const group = new THREE.Group();
        const scale = 0.5; // Scale down to fit game world
        
        switch(type) {
            case 'grenade':
                // Grenade body
                const grenadeGeom = new THREE.SphereGeometry(0.8 * scale, 16, 12);
                const grenadeMat = new THREE.MeshPhongMaterial({ 
                    color: 0x4a5c2a,
                    roughness: 0.8,
                    metalness: 0.2
                });
                const grenade = new THREE.Mesh(grenadeGeom, grenadeMat);
                group.add(grenade);
                
                // Pull ring
                const ringGeom = new THREE.TorusGeometry(0.3 * scale, 0.05 * scale, 8, 16);
                const ringMat = new THREE.MeshPhongMaterial({ 
                    color: 0xc0c0c0,
                    metalness: 0.9,
                    roughness: 0.1
                });
                const ring = new THREE.Mesh(ringGeom, ringMat);
                ring.position.y = 0.9 * scale;
                group.add(ring);
                break;
                
            case 'helmet':
                // Helmet dome
                const helmetGeom = new THREE.SphereGeometry(1 * scale, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
                const helmetMat = new THREE.MeshPhongMaterial({ 
                    color: 0x5a5a5a,
                    metalness: 0.7,
                    roughness: 0.3
                });
                const helmet = new THREE.Mesh(helmetGeom, helmetMat);
                group.add(helmet);
                
                // Chin strap
                const strapGeom = new THREE.TorusGeometry(0.95 * scale, 0.05 * scale, 8, 24);
                const strapMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
                const strap = new THREE.Mesh(strapGeom, strapMat);
                strap.position.y = -0.2 * scale;
                group.add(strap);
                break;
                
            case 'clock':
                // Clock face
                const clockGeom = new THREE.CylinderGeometry(1 * scale, 1 * scale, 0.3 * scale, 16);
                const clockMat = new THREE.MeshPhongMaterial({ 
                    color: 0xf0f0f0,
                    metalness: 0.3
                });
                const clock = new THREE.Mesh(clockGeom, clockMat);
                group.add(clock);
                
                // Clock rim
                const rimGeom = new THREE.TorusGeometry(1 * scale, 0.1 * scale, 8, 24);
                const rimMat = new THREE.MeshPhongMaterial({ 
                    color: 0xd4af37,
                    metalness: 0.8,
                    roughness: 0.2
                });
                const rim = new THREE.Mesh(rimGeom, rimMat);
                group.add(rim);
                
                // Hour hand
                const hourGeom = new THREE.BoxGeometry(0.5 * scale, 0.05 * scale, 0.05 * scale);
                const handMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
                const hourHand = new THREE.Mesh(hourGeom, handMat);
                hourHand.name = 'hourHand';
                hourHand.position.set(0.25 * scale, 0.16 * scale, 0);
                group.add(hourHand);
                
                // Minute hand
                const minuteGeom = new THREE.BoxGeometry(0.7 * scale, 0.04 * scale, 0.04 * scale);
                const minuteHand = new THREE.Mesh(minuteGeom, handMat);
                minuteHand.name = 'minuteHand';
                minuteHand.position.set(0.35 * scale, 0.17 * scale, 0);
                minuteHand.rotation.z = -0.3;
                group.add(minuteHand);
                break;
                
            case 'shovel':
                // Shovel handle
                const handleGeom = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 2 * scale);
                const handleMat = new THREE.MeshPhongMaterial({ color: 0x8b6f47 });
                const handle = new THREE.Mesh(handleGeom, handleMat);
                handle.position.y = -0.2 * scale;
                group.add(handle);
                
                // Shovel blade
                const bladeGeom = new THREE.BoxGeometry(0.6 * scale, 0.8 * scale, 0.1 * scale);
                const bladeMat = new THREE.MeshPhongMaterial({ 
                    color: 0xc0c0c0,
                    metalness: 0.8,
                    roughness: 0.3
                });
                const blade = new THREE.Mesh(bladeGeom, bladeMat);
                blade.position.y = 0.6 * scale;
                group.add(blade);
                
                // Rotate shovel for digging pose
                group.rotation.z = 0.3;
                break;
                
            case 'tank':
                // Mini tank body
                const tankBodyGeom = new THREE.BoxGeometry(1.5 * scale, 0.5 * scale, 2 * scale);
                const tankMat = new THREE.MeshPhongMaterial({ color: 0x2a6a2a });
                const tankBody = new THREE.Mesh(tankBodyGeom, tankMat);
                group.add(tankBody);
                
                // Turret
                const turretGeom = new THREE.CylinderGeometry(0.6 * scale, 0.6 * scale, 0.5 * scale);
                const turret = new THREE.Mesh(turretGeom, tankMat);
                turret.position.y = 0.5 * scale;
                group.add(turret);
                
                // Cannon
                const cannonGeom = new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 1.5 * scale);
                const cannon = new THREE.Mesh(cannonGeom, tankMat);
                cannon.rotation.x = Math.PI / 2;
                cannon.position.set(0, 0.5 * scale, 0.75 * scale);
                group.add(cannon);
                break;
                
            case 'star':
                // Create star shape using cones for points
                const starMat = new THREE.MeshPhongMaterial({ 
                    color: 0xffd700,
                    emissive: 0xffaa00,
                    emissiveIntensity: 0.3,
                    metalness: 0.8,
                    roughness: 0.2
                });
                
                // Center sphere
                const centerGeom = new THREE.SphereGeometry(0.5 * scale, 16, 12);
                const center = new THREE.Mesh(centerGeom, starMat);
                group.add(center);
                
                // Create 5 star points
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 72 - 90) * Math.PI / 180;
                    const pointGeom = new THREE.ConeGeometry(0.3 * scale, 0.8 * scale, 8);
                    const point = new THREE.Mesh(pointGeom, starMat);
                    point.position.x = Math.cos(angle) * 0.6 * scale;
                    point.position.y = Math.sin(angle) * 0.6 * scale;
                    point.rotation.z = angle + Math.PI;
                    group.add(point);
                }
                break;
                
            case 'gun':
                // Gun body
                const gunBodyGeom = new THREE.BoxGeometry(0.3 * scale, 0.4 * scale, 2 * scale);
                const gunMat = new THREE.MeshPhongMaterial({ 
                    color: 0x3a3a3a,
                    metalness: 0.7,
                    roughness: 0.3
                });
                const gunBody = new THREE.Mesh(gunBodyGeom, gunMat);
                group.add(gunBody);
                
                // Three barrels
                const barrelGeom = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 1.5 * scale);
                const barrelMat = new THREE.MeshPhongMaterial({ 
                    color: 0x2a2a2a,
                    metalness: 0.9,
                    roughness: 0.1
                });
                
                [-0.15, 0, 0.15].forEach(offset => {
                    const barrel = new THREE.Mesh(barrelGeom, barrelMat);
                    barrel.rotation.x = Math.PI / 2;
                    barrel.position.set(offset * scale, 0, 0.75 * scale);
                    group.add(barrel);
                });
                
                // Handle
                const gunHandleGeom = new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 0.5 * scale);
                const gunHandleMat = new THREE.MeshPhongMaterial({ color: 0x5a3a1a });
                const gunHandle = new THREE.Mesh(gunHandleGeom, gunHandleMat);
                gunHandle.position.set(0, -0.3 * scale, -0.5 * scale);
                gunHandle.rotation.x = 0.3;
                group.add(gunHandle);
                
                // Tilt gun
                group.rotation.z = -0.5;
                break;
                
            case 'boat':
                // Boat hull
                const hullGeom = new THREE.BoxGeometry(1.5 * scale, 0.5 * scale, 3 * scale);
                const hullMat = new THREE.MeshPhongMaterial({ color: 0x8b6f47 });
                const hull = new THREE.Mesh(hullGeom, hullMat);
                group.add(hull);
                
                // Mast
                const mastGeom = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 2.5 * scale);
                const mastMat = new THREE.MeshPhongMaterial({ color: 0x5a4a3a });
                const mast = new THREE.Mesh(mastGeom, mastMat);
                mast.position.y = 1.2 * scale;
                group.add(mast);
                
                // Sail
                const sailGeom = new THREE.PlaneGeometry(1.5 * scale, 1.8 * scale);
                const sailMat = new THREE.MeshPhongMaterial({ 
                    color: 0xffffff,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.9
                });
                const sail = new THREE.Mesh(sailGeom, sailMat);
                sail.position.set(0.02 * scale, 1.2 * scale, 0);
                sail.rotation.y = Math.PI / 2;
                group.add(sail);
                break;
                
            default:
                // Fallback to simple cube
                const defaultGeom = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                const defaultMat = new THREE.MeshPhongMaterial({ 
                    color: 0xffffff,
                    emissive: 0x404040
                });
                const defaultMesh = new THREE.Mesh(defaultGeom, defaultMat);
                group.add(defaultMesh);
        }
        
        return group;
    }
    
    getBonusColor(type) {
        // Kept for backward compatibility
        const colors = {
            'grenade': 0x4a5c2a,  // Military green
            'helmet': 0x5a5a5a,   // Steel gray
            'clock': 0xf0f0f0,    // White/silver
            'shovel': 0x8b6f47,   // Wood brown
            'tank': 0x2a6a2a,     // Tank green
            'star': 0xffd700,     // Gold
            'gun': 0x3a3a3a,      // Gun metal
            'boat': 0x8b6f47      // Wood brown
        };
        return colors[type] || 0xffffff;
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