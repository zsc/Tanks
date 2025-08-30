import * as THREE from 'three';

export default class Model3DManager {
    constructor(resourceLoader) {
        this.resourceLoader = resourceLoader;
        this.tankColors = {
            player1: new THREE.Color(0x4169E1), // Royal Blue
            player2: new THREE.Color(0x32CD32), // Lime Green
            enemy_a: new THREE.Color(0x8B4513), // Saddle Brown
            enemy_b: new THREE.Color(0xDC143C), // Crimson
            enemy_c: new THREE.Color(0xFF8C00), // Dark Orange
            enemy_d: new THREE.Color(0x4B0082)  // Indigo
        };
    }
    
    createTank3D(type = 'player1') {
        // Use new detailed models
        let modelName = (type === 'player1' || type === 'player2') ? 'playerTank' : 'enemyTank';
        let tankModel = this.resourceLoader.getModel(modelName);
        
        if (!tankModel) {
            // Fallback to legacy tank model
            tankModel = this.resourceLoader.getModel('tank');
            if (!tankModel) {
                // Final fallback to basic geometry
                return this.createBasicTank(type);
            }
        }
        
        // For player tanks, we keep the original colors from the model
        // For enemy tanks, we might want to tint them based on type
        if (type.startsWith('enemy')) {
            const color = this.tankColors[type] || new THREE.Color(0x808080);
            this.applyColorToModel(tankModel, color);
        }
        
        tankModel.scale.set(0.4, 0.4, 0.4);
        
        return tankModel;
    }
    
    createBullet3D() {
        const bulletModel = this.resourceLoader.getModel('bullet');
        if (!bulletModel) {
            // Fallback to basic geometry with better visibility
            const geometry = new THREE.SphereGeometry(0.2, 8, 8);
            const material = new THREE.MeshPhongMaterial({ 
                color: 0xFFD700,
                emissive: 0xFFD700,
                emissiveIntensity: 0.8
            });
            return new THREE.Mesh(geometry, material);
        }
        
        // Scale bullet larger for better visibility
        bulletModel.scale.set(0.5, 0.5, 0.5);
        
        // Make bullet material emissive for better visibility
        bulletModel.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.emissive = new THREE.Color(0xFFAA00);
                child.material.emissiveIntensity = 0.5;
            }
        });
        
        return bulletModel;
    }
    
    createWall3D(type = 'brick') {
        let modelName = type === 'brick' ? 'brickWall' : 'steelWall';
        const wallModel = this.resourceLoader.getModel(modelName);
        
        if (!wallModel) {
            // Fallback to basic geometry
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshPhongMaterial({ 
                color: type === 'brick' ? 0x8B4513 : 0x696969
            });
            return new THREE.Mesh(geometry, material);
        }
        
        return wallModel;
    }
    
    createBasicTank(type) {
        const group = new THREE.Group();
        
        // Tank body
        const bodyGeometry = new THREE.BoxGeometry(1.2, 0.4, 1.6);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: this.tankColors[type] || 0x4169E1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);
        
        // Tank turret
        const turretGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.8);
        const turretMaterial = new THREE.MeshPhongMaterial({ 
            color: this.tankColors[type] || 0x4169E1
        });
        const turret = new THREE.Mesh(turretGeometry, turretMaterial);
        turret.position.y = 0.3;
        turret.position.z = -0.1;
        group.add(turret);
        
        // Tank barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.2);
        const barrelMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2F4F4F
        });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.y = 0.35;
        barrel.position.z = -0.7;
        group.add(barrel);
        
        // Tracks
        const trackGeometry = new THREE.BoxGeometry(0.2, 0.3, 1.8);
        const trackMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1C1C1C
        });
        
        const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        leftTrack.position.x = -0.65;
        leftTrack.position.y = -0.15;
        group.add(leftTrack);
        
        const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        rightTrack.position.x = 0.65;
        rightTrack.position.y = -0.15;
        group.add(rightTrack);
        
        return group;
    }
    
    createEagleBase3D() {
        const eagleModel = this.resourceLoader.getModel('eagleBase');
        if (!eagleModel) {
            // Fallback to basic geometry
            const group = new THREE.Group();
            
            // Base platform
            const baseGeometry = new THREE.BoxGeometry(2, 0.2, 2);
            const baseMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x808080
            });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            group.add(base);
            
            // Eagle statue (simplified)
            const eagleGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
            const eagleMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xFFD700
            });
            const eagle = new THREE.Mesh(eagleGeometry, eagleMaterial);
            eagle.position.y = 1;
            group.add(eagle);
            
            return group;
        }
        
        eagleModel.scale.set(2, 2, 2);  // Make it prominent as the base to protect
        
        /*
        // Add lighting effects while keeping original colors
        eagleModel.traverse((child) => {
            if (child.isMesh && child.material) {
                // Keep original color but add emissive glow
                const originalColor = child.material.color ? child.material.color.clone() : new THREE.Color(0xffffff);
                
                // Create new material with enhanced lighting
                child.material = new THREE.MeshPhongMaterial({
                    color: originalColor,  // Keep original color
                    emissive: originalColor,  // Emit same color as base
                    emissiveIntensity: 0.3,  // Subtle glow
                    shininess: 100,  // Make it shiny
                    specular: new THREE.Color(0xffffff),  // White specular highlights
                });
                
                // Make sure it casts and receives shadows
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        */
        
        // Add a point light to the queen to make it glow
        const light = new THREE.PointLight(0xffffff, 0.5, 5);
        light.position.set(0, 1, 0);
        eagleModel.add(light);
        
        return eagleModel;
    }
    
    createExplosion3D(position) {
        const particles = new THREE.Group();
        
        // Create explosion particles
        for (let i = 0; i < 20; i++) {
            const geometry = new THREE.SphereGeometry(Math.random() * 0.2 + 0.1, 4, 4);
            const material = new THREE.MeshBasicMaterial({ 
                color: new THREE.Color().setHSL(0.1 * Math.random(), 1, 0.5),
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(geometry, material);
            
            // Random position around explosion center
            particle.position.set(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            );
            
            // Store velocity for animation
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.1 + 0.05,
                (Math.random() - 0.5) * 0.1
            );
            
            particles.add(particle);
        }
        
        particles.position.copy(position);
        particles.userData.lifetime = 1000; // 1 second
        particles.userData.createdAt = Date.now();
        
        return particles;
    }
    
    updateExplosion(explosion, deltaTime) {
        const age = Date.now() - explosion.userData.createdAt;
        const lifeRatio = age / explosion.userData.lifetime;
        
        if (lifeRatio >= 1) {
            return false; // Explosion finished
        }
        
        // Update each particle
        explosion.children.forEach(particle => {
            // Move particle
            particle.position.add(particle.userData.velocity);
            
            // Apply gravity
            particle.userData.velocity.y -= 0.001 * deltaTime;
            
            // Fade out
            particle.material.opacity = 0.8 * (1 - lifeRatio);
            
            // Scale down
            particle.scale.setScalar(1 - lifeRatio * 0.5);
        });
        
        return true; // Continue animation
    }
    
    applyColorToModel(model, color) {
        model.traverse((child) => {
            if (child.isMesh) {
                // Preserve material properties but change color
                if (child.material) {
                    child.material = child.material.clone();
                    child.material.color = color;
                }
            }
        });
    }
    
    rotateTankToDirection(tankMesh, direction) {
        switch(direction) {
            case 'up':
                tankMesh.rotation.y = 0 + Math.PI;
                break;
            case 'down':
                tankMesh.rotation.y = Math.PI + Math.PI;
                break;
            case 'left':
                tankMesh.rotation.y = Math.PI / 2 + Math.PI;
                break;
            case 'right':
                tankMesh.rotation.y = -Math.PI / 2 + Math.PI;
                break;
        }
    }
}
