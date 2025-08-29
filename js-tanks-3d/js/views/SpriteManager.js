export default class SpriteManager {
    constructor(resourceLoader) {
        this.resourceLoader = resourceLoader;
        this.spriteCache = new Map();
    }
    
    createTankSprite(type, direction = 'up') {
        // Use 2D sprite on a plane
        const geometry = new THREE.PlaneGeometry(1, 1);
        
        // Map tank type to sprite name
        let spriteName;
        
        if (type === 'player1') {
            spriteName = 'player_1';
        } else if (type === 'player2') {
            spriteName = 'player_2';
        } else if (type === 'enemy_a') {
            spriteName = 'tank_a';
        } else if (type === 'enemy_b') {
            spriteName = 'tank_b';
        } else if (type === 'enemy_c') {
            spriteName = 'tank_c';
        } else if (type === 'enemy_d') {
            spriteName = 'tank_d';
        }
        
        // Calculate frame index based on direction and animation frame
        // Each direction has 2 frames: up(0,1), left(2,3), down(4,5), right(6,7)
        const directionOffsets = { 'up': 0, 'left': 2, 'down': 4, 'right': 6 };
        let frameIndex = directionOffsets[direction] || 0;
        
        // Get material from sprite sheet
        let material = null;
        if (spriteName) {
            material = this.resourceLoader.createSpriteMaterialFromSheet(spriteName, frameIndex);
        }
        
        if (!material) {
            // Fallback to colored box
            const colors = {
                'player1': 0x00ff00,
                'player2': 0x0000ff,
                'enemy_a': 0xff0000,
                'enemy_b': 0xff8800,
                'enemy_c': 0xffff00,
                'enemy_d': 0xff00ff
            };
            material = new THREE.MeshBasicMaterial({
                color: colors[type] || 0x808080,
                side: THREE.DoubleSide
            });
        }
        
        const sprite = new THREE.Mesh(geometry, material);
        sprite.rotation.x = -Math.PI / 2; // Rotate to face up
        sprite.position.y = 0.5; // Float above ground
        
        // Store animation data
        sprite.userData.animationFrame = 0;
        sprite.userData.animationTimer = 0;
        sprite.userData.spriteName = spriteName;
        sprite.userData.direction = direction;
        sprite.userData.baseFrameIndex = frameIndex;
        
        return sprite;
    }
    
    createBulletSprite() {
        const geometry = new THREE.SphereGeometry(0.05, 4, 4);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        
        const bullet = new THREE.Mesh(geometry, material);
        bullet.position.y = 0.3;
        
        return bullet;
    }
    
    createMapTileSprite(tileType, partialState = null) {
        let geometry;
        let material;
        
        switch(tileType) {
            case 1: // Brick (with partial destruction states)
                if (partialState) {
                    geometry = this.createPartialBrickGeometry(partialState);
                } else {
                    geometry = new THREE.BoxGeometry(1, 0.5, 1);
                }
                // Use sprite from sprite sheet
                material = this.resourceLoader.createSpriteMaterialFromSheet('brick_wall', 0);
                if (!material) {
                    material = new THREE.MeshBasicMaterial({
                        color: 0x8b4513
                    });
                }
                break;
            case 2: // Stone
                geometry = new THREE.BoxGeometry(1, 0.5, 1);
                material = this.resourceLoader.createSpriteMaterialFromSheet('stone_wall', 0);
                if (!material) {
                    material = new THREE.MeshBasicMaterial({ color: 0x696969 });
                }
                break;
            case 3: // Water
                geometry = new THREE.BoxGeometry(1, 0.1, 1);
                material = this.resourceLoader.createSpriteMaterialFromSheet('water', 0);
                if (!material) {
                    material = new THREE.MeshBasicMaterial({ 
                        color: 0x4169e1,
                        transparent: true,
                        opacity: 0.8
                    });
                }
                break;
            case 4: // Ice
                geometry = new THREE.BoxGeometry(1, 0.1, 1);
                material = this.resourceLoader.createSpriteMaterialFromSheet('ice', 0);
                if (!material) {
                    material = new THREE.MeshBasicMaterial({ 
                        color: 0x87ceeb,
                        transparent: true,
                        opacity: 0.9
                    });
                }
                break;
            case 5: // Bush
                geometry = new THREE.BoxGeometry(1, 0.1, 1);
                material = this.resourceLoader.createSpriteMaterialFromSheet('bush', 0);
                if (!material) {
                    material = new THREE.MeshBasicMaterial({ 
                        color: 0x228b22,
                        transparent: true,
                        opacity: 0.7
                    });
                }
                break;
            case 6: // Eagle (base)
                geometry = new THREE.BoxGeometry(1, 1, 1);
                material = this.resourceLoader.createSpriteMaterialFromSheet('eagle', 0);
                if (!material) {
                    material = new THREE.MeshBasicMaterial({
                        color: 0xffd700
                    });
                }
                const eagle = new THREE.Mesh(geometry, material);
                eagle.position.y = 0.5;
                return eagle;
            default:
                return null;
        }
        
        const tile = new THREE.Mesh(geometry, material);
        
        // Adjust height based on type
        if (tileType === 1) { // Brick
            tile.position.y = 0.25;
        } else if (tileType === 2) { // Stone  
            tile.scale.y = 10;
            tile.position.y = 0.5;
        } else if (tileType === 5) { // Bush
            tile.scale.y = 5;
            tile.position.y = 0.25;
        } else {
            tile.position.y = 0.05;
        }
        
        return tile;
    }
    
    createPartialBrickGeometry(state) {
        // Create geometry based on partial destruction state
        switch(state) {
            case 'topHalf':
                return new THREE.BoxGeometry(1, 0.5, 0.5);
            case 'bottomHalf':
                return new THREE.BoxGeometry(1, 0.5, 0.5);
            case 'leftHalf':
                return new THREE.BoxGeometry(0.5, 0.5, 1);
            case 'rightHalf':
                return new THREE.BoxGeometry(0.5, 0.5, 1);
            case 'topLeft':
                return new THREE.BoxGeometry(0.5, 0.5, 0.5);
            case 'topRight':
                return new THREE.BoxGeometry(0.5, 0.5, 0.5);
            case 'bottomLeft':
                return new THREE.BoxGeometry(0.5, 0.5, 0.5);
            case 'bottomRight':
                return new THREE.BoxGeometry(0.5, 0.5, 0.5);
            default:
                return new THREE.BoxGeometry(1, 0.5, 1);
        }
    }
    
    createExplosion(position) {
        const particleCount = 20;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.05, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(1, Math.random(), 0),
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Random velocity
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 3,
                (Math.random() - 0.5) * 5
            );
            
            particle.position.copy(position);
            particles.add(particle);
        }
        
        particles.userData.lifetime = 1000; // ms
        particles.userData.createdAt = Date.now();
        
        return particles;
    }
    
    updateTankAnimation(tank, direction, deltaTime) {
        if (!tank.userData.spriteName) return;
        
        // Update direction if changed
        if (tank.userData.direction !== direction) {
            tank.userData.direction = direction;
            tank.userData.animationFrame = 0;
            tank.userData.animationTimer = 0;
        }
        
        // Update animation timer
        tank.userData.animationTimer += deltaTime;
        
        // Switch animation frame every 100ms
        if (tank.userData.animationTimer >= 100) {
            tank.userData.animationTimer = 0;
            tank.userData.animationFrame = (tank.userData.animationFrame + 1) % 2;
            
            // Calculate new frame index
            const directionOffsets = { 'up': 0, 'left': 2, 'down': 4, 'right': 6 };
            const frameIndex = (directionOffsets[direction] || 0) + tank.userData.animationFrame;
            
            // Update material with new frame
            const material = this.resourceLoader.createSpriteMaterialFromSheet(
                tank.userData.spriteName, 
                frameIndex
            );
            if (material) {
                tank.material = material;
            }
        }
    }
    
    updateExplosion(explosion, deltaTime) {
        const age = Date.now() - explosion.userData.createdAt;
        const lifeRatio = age / explosion.userData.lifetime;
        
        if (lifeRatio >= 1) {
            return false; // Explosion finished
        }
        
        explosion.children.forEach(particle => {
            // Update position
            particle.position.add(
                particle.userData.velocity.clone().multiplyScalar(deltaTime / 1000)
            );
            
            // Apply gravity
            particle.userData.velocity.y -= 9.8 * deltaTime / 1000;
            
            // Fade out
            particle.material.opacity = 1 - lifeRatio;
            
            // Scale down
            const scale = 1 - lifeRatio * 0.5;
            particle.scale.set(scale, scale, scale);
        });
        
        return true; // Still active
    }
    
    createPowerUpSprite(type) {
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        let material;
        
        const powerUpColors = {
            'star': 0xffff00,
            'tank': 0x00ff00,
            'helmet': 0x00ffff,
            'clock': 0xff00ff,
            'shovel': 0x8b4513,
            'grenade': 0xff0000,
            'gun': 0xffa500,
            'boat': 0x0000ff
        };
        
        material = new THREE.MeshBasicMaterial({
            color: powerUpColors[type] || 0xffffff,
            emissive: powerUpColors[type] || 0xffffff,
            emissiveIntensity: 0.5
        });
        
        const powerUp = new THREE.Mesh(geometry, material);
        powerUp.position.y = 0.4;
        
        return powerUp;
    }
    
    createGroundPlane(width, height) {
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            side: THREE.DoubleSide
        });
        
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        
        return ground;
    }
    
    clearCache() {
        this.spriteCache.clear();
    }
}