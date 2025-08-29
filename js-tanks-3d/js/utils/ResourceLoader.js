import * as THREE from 'three';
import X3DLoader from './X3DLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

export default class ResourceLoader {
    constructor() {
        this.textures = {};
        this.sprites = {};
        this.levels = {};
        this.models = {};  // Store 3D models
        this.loaded = false;
        this.x3dLoader = new X3DLoader();
        this.gltfLoader = new GLTFLoader();
        this.objLoader = new OBJLoader();
        this.mtlLoader = new MTLLoader();
    }
    
    async loadAll() {
        console.log('Loading game resources...');
        
        try {
            await Promise.all([
                this.loadTextures(),
                this.loadSprites(),
                this.loadLevels(),
                this.loadModels()  // Load X3D models
            ]);
            
            this.loaded = true;
            console.log('All resources loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load resources:', error);
            return false;
        }
    }
    
    async loadTextures() {
        const textureLoader = new THREE.TextureLoader();
        
        const textureList = {
            // Tanks
            player1: 'assets/images/graphics.png',
            player2: 'assets/images/graphics.png',
            enemyA: 'assets/images/enemy_a.png',
            enemyB: 'assets/images/enemy_b.png',
            enemyC: 'assets/images/enemy_c.png',
            enemyD: 'assets/images/enemy_d.png',
            
            // Map tiles
            brick: 'assets/images/brick.png',
            stone: 'assets/images/stone.png',
            water: 'assets/images/water.png',
            ice: 'assets/images/ice.png',
            bush: 'assets/images/bush.png',
            
            // Bonuses
            bonusBoat: 'assets/images/bonus_boat.png',
            bonusClock: 'assets/images/bonus_clock.png',
            bonusGrenade: 'assets/images/bonus_grenade.png',
            bonusGun: 'assets/images/bonus_gun.png',
            bonusHelmet: 'assets/images/bonus_helmet.png',
            bonusShovel: 'assets/images/bonus_shovel.png',
            bonusStar: 'assets/images/bonus_star.png',
            bonusTank: 'assets/images/bonus_tank.png',
            
            // UI
            start: 'assets/images/start.png',
            stage: 'assets/images/stage_1.png'
        };
        
        const loadPromises = Object.entries(textureList).map(([name, path]) => {
            return new Promise((resolve, reject) => {
                textureLoader.load(
                    path,
                    (texture) => {
                        // Configure texture for pixel art
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        texture.generateMipmaps = false;
                        
                        this.textures[name] = texture;
                        console.log(`Loaded texture: ${name}`);
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.warn(`Failed to load texture ${name} from ${path}:`, error);
                        // Create placeholder texture
                        const canvas = document.createElement('canvas');
                        canvas.width = 32;
                        canvas.height = 32;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#808080';
                        ctx.fillRect(0, 0, 32, 32);
                        
                        this.textures[name] = new THREE.CanvasTexture(canvas);
                        resolve(); // Continue even if texture fails
                    }
                );
            });
        });
        
        await Promise.all(loadPromises);
    }
    
    async loadSprites() {
        // Sprite coordinates from original C++ code (spriteconfig.cpp)
        // Note: Each tank has 8 sprites (4 directions × 2 animation frames)
        const spriteSheet = {
            // Enemy tanks - each row has 8 sprites (4 directions, 2 frames each)
            tank_a: { x: 128, y: 0, w: 32, h: 32, frames: 8 },
            tank_b: { x: 128, y: 64, w: 32, h: 32, frames: 8 },
            tank_c: { x: 128, y: 128, w: 32, h: 32, frames: 8 },
            tank_d: { x: 128, y: 192, w: 32, h: 32, frames: 8 },
            
            // Player tanks - from spriteconfig.cpp
            // Player 1 starts at x=640, Player 2 at x=768
            // Each has 8 sprites total (4 directions × 2 frames)
            player_1: { x: 640, y: 0, w: 32, h: 32, frames: 8 },
            player_2: { x: 768, y: 0, w: 32, h: 32, frames: 8 },
            
            // Map tiles
            brick_wall: { x: 928, y: 0, w: 16, h: 16, frames: 1 },
            stone_wall: { x: 928, y: 144, w: 16, h: 16, frames: 1 },
            water: { x: 928, y: 160, w: 16, h: 16, frames: 2 },
            bush: { x: 928, y: 192, w: 16, h: 16, frames: 1 },
            ice: { x: 928, y: 208, w: 16, h: 16, frames: 1 },
            
            // Bonuses
            bonus_grenade: { x: 896, y: 0, w: 32, h: 32, frames: 1 },
            bonus_helmet: { x: 896, y: 32, w: 32, h: 32, frames: 1 },
            bonus_clock: { x: 896, y: 64, w: 32, h: 32, frames: 1 },
            bonus_shovel: { x: 896, y: 96, w: 32, h: 32, frames: 1 },
            bonus_tank: { x: 896, y: 128, w: 32, h: 32, frames: 1 },
            bonus_star: { x: 896, y: 160, w: 32, h: 32, frames: 1 },
            bonus_gun: { x: 896, y: 192, w: 32, h: 32, frames: 1 },
            bonus_boat: { x: 896, y: 224, w: 32, h: 32, frames: 1 },
            
            // Effects
            shield: { x: 976, y: 0, w: 32, h: 32, frames: 2 },
            create: { x: 1008, y: 0, w: 32, h: 32, frames: 10 },
            destroy_tank: { x: 1040, y: 0, w: 64, h: 64, frames: 7 },
            destroy_bullet: { x: 1108, y: 0, w: 32, h: 32, frames: 5 },
            
            // Eagle (base)
            eagle: { x: 944, y: 0, w: 32, h: 32, frames: 1 },
            destroy_eagle: { x: 1040, y: 0, w: 64, h: 64, frames: 7 },
            flag: { x: 944, y: 32, w: 32, h: 32, frames: 1 },
            
            // Bullet
            bullet: { x: 944, y: 128, w: 8, h: 8, frames: 1 },
            
            // UI elements
            enemy_icon: { x: 944, y: 144, w: 16, h: 16, frames: 1 },
            stage_status: { x: 976, y: 64, w: 32, h: 32, frames: 1 },
            
            // Logo
            tanks_logo: { x: 0, y: 260, w: 406, h: 72, frames: 1 }
        };
        
        this.sprites = spriteSheet;
    }
    
    async loadModels() {
        const modelList = {
            // Using duck.glb for player tank!
            playerTank: 'assets/models/duck.glb',  // Duck as player tank
            enemyTank: 'assets/models/enemy_tank.x3d',
            bullet: 'assets/models/bullet.x3d',
            brickWall: 'assets/models/brick_wall.x3d',
            steelWall: 'assets/models/steel_wall.x3d',
            eagleBase: 'assets/models/chess_queen.glb',  // Chess queen as base
            // Legacy models for compatibility
            tank: 'assets/models/tank.x3d'
        };
        
        const loadPromises = Object.entries(modelList).map(([name, path]) => {
            return this.loadModelByFormat(name, path);
        });
        
        await Promise.all(loadPromises);
    }
    
    async loadModelByFormat(name, path) {
        const extension = path.split('.').pop().toLowerCase();
        
        try {
            let model = null;
            
            switch(extension) {
                case 'gltf':
                case 'glb':
                    model = await this.loadGLTF(path);
                    break;
                    
                case 'obj':
                    model = await this.loadOBJ(path);
                    break;
                    
                case 'x3d':
                    model = await this.x3dLoader.load(path);
                    break;
                    
                default:
                    console.warn(`Unknown model format: ${extension}`);
                    model = this.createPlaceholder();
            }
            
            this.models[name] = model;
            console.log(`Loaded 3D model: ${name} (${extension})`);
            
        } catch (error) {
            console.warn(`Failed to load model ${name}:`, error);
            this.models[name] = this.createPlaceholder();
        }
    }
    
    loadGLTF(path) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf) => {
                    // GLTF models come with a scene, animations, etc.
                    // We typically want the scene
                    resolve(gltf.scene);
                },
                (progress) => {
                    // Progress callback
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }
    
    loadOBJ(path) {
        return new Promise((resolve, reject) => {
            // Check if there's an MTL file (materials)
            const mtlPath = path.replace('.obj', '.mtl');
            
            // Try to load MTL first
            this.mtlLoader.load(
                mtlPath,
                (materials) => {
                    materials.preload();
                    this.objLoader.setMaterials(materials);
                    this.loadOBJWithMaterials(path, resolve, reject);
                },
                (progress) => {
                    // Progress callback
                },
                (error) => {
                    // No MTL file, load OBJ without materials
                    console.log('No MTL file found, loading OBJ without materials');
                    this.loadOBJWithMaterials(path, resolve, reject);
                }
            );
        });
    }
    
    loadOBJWithMaterials(path, resolve, reject) {
        this.objLoader.load(
            path,
            (object) => {
                resolve(object);
            },
            (progress) => {
                // Progress callback
            },
            (error) => {
                reject(error);
            }
        );
    }
    
    createPlaceholder() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
        return new THREE.Mesh(geometry, material);
    }
    
    async loadLevels() {
        // Load level data files
        const levelPromises = [];
        
        for (let i = 0; i <= 35; i++) {
            levelPromises.push(
                fetch(`assets/levels/${i}`)
                    .then(response => response.text())
                    .then(data => {
                        this.levels[i] = this.parseLevel(data);
                        console.log(`Loaded level ${i}`);
                    })
                    .catch(error => {
                        console.warn(`Failed to load level ${i}:`, error);
                        this.levels[i] = null; // Use default map
                    })
            );
        }
        
        await Promise.all(levelPromises);
    }
    
    parseLevel(levelData) {
        // Parse the level format from the original game
        // Each level is a 26x26 grid
        const lines = levelData.trim().split('\n');
        const map = [];
        
        for (let i = 0; i < 26; i++) {
            map[i] = [];
            for (let j = 0; j < 26; j++) {
                if (lines[i] && lines[i][j]) {
                    const char = lines[i][j];
                    map[i][j] = this.charToTileType(char);
                } else {
                    map[i][j] = 0; // Empty
                }
            }
        }
        
        return map;
    }
    
    charToTileType(char) {
        // Convert level file characters to tile types
        const mapping = {
            ' ': 0, // Empty
            '.': 0, // Empty
            '#': 1, // Brick
            '@': 2, // Stone
            '~': 3, // Water
            '-': 4, // Ice
            'T': 5, // Bush/Tree
            'E': 6  // Eagle
        };
        
        return mapping[char] || 0;
    }
    
    getTexture(name) {
        return this.textures[name] || null;
    }
    
    getSprite(name) {
        return this.sprites[name] || null;
    }
    
    getLevel(index) {
        return this.levels[index] || null;
    }
    
    getModel(name) {
        if (!this.models[name]) {
            console.warn(`Model ${name} not found`);
            return null;
        }
        // Return a clone of the model so each instance can be positioned independently
        return this.models[name].clone();
    }
    
    createSpriteMaterial(textureName, transparent = true) {
        const texture = this.getTexture(textureName);
        if (!texture) {
            console.warn(`Texture ${textureName} not found`);
            return new THREE.MeshBasicMaterial({ color: 0x808080 });
        }
        
        return new THREE.MeshBasicMaterial({
            map: texture,
            transparent: transparent,
            side: THREE.DoubleSide,
            alphaTest: 0.5
        });
    }
    
    // Extract sprite from sprite sheet (graphics.png)
    extractSpriteTexture(spriteName, frameIndex = 0) {
        const spriteData = this.sprites[spriteName];
        if (!spriteData) {
            console.warn(`Sprite ${spriteName} not found`);
            return null;
        }
        
        // Get the main texture (graphics.png)
        const mainTexture = this.textures.player1; // graphics.png
        if (!mainTexture) {
            return null;
        }
        
        // Clone texture and set UV coordinates for the sprite
        const texture = mainTexture.clone();
        texture.needsUpdate = true;
        
        // Calculate UV coordinates (normalized 0-1)
        const textureWidth = 1232; // graphics.png width
        const textureHeight = 332;  // graphics.png height
        
        // Calculate sprite position with frame offset
        const frameWidth = spriteData.w;
        const offsetX = spriteData.x + (frameIndex * frameWidth);
        const offsetY = spriteData.y;
        
        // Set texture repeat and offset for correct UV mapping
        // Repeat defines how much of the texture to use (sprite size / texture size)
        texture.repeat.set(
            spriteData.w / textureWidth,
            spriteData.h / textureHeight
        );
        
        // Offset defines where to start in the texture (sprite position / texture size)
        // Note: Three.js uses bottom-left origin for textures, so we need to invert Y
        texture.offset.set(
            offsetX / textureWidth,
            1 - ((offsetY + spriteData.h) / textureHeight)
        );
        
        // Ensure wrapping is set correctly
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }
    
    // Create material from sprite sheet
    createSpriteMaterialFromSheet(spriteName, frameIndex = 0) {
        const texture = this.extractSpriteTexture(spriteName, frameIndex);
        if (!texture) {
            return new THREE.MeshBasicMaterial({ color: 0x808080 });
        }
        
        return new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.5
        });
    }
}