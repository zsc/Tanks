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
        const tankModel = this.resourceLoader.getModel('tank');
        if (!tankModel) {
            // Fallback to basic geometry
            return this.createBasicTank(type);
        }
        
        // Apply color based on tank type
        const color = this.tankColors[type] || new THREE.Color(0x808080);
        this.applyColorToModel(tankModel, color);
        
        // Scale the model appropriately
        tankModel.scale.set(0.8, 0.8, 0.8);
        
        return tankModel;
    }
    
    createBullet3D() {
        const bulletModel = this.resourceLoader.getModel('bullet');
        if (!bulletModel) {
            // Fallback to basic geometry
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshPhongMaterial({ 
                color: 0xFFD700,
                emissive: 0xFFD700,
                emissiveIntensity: 0.5
            });
            return new THREE.Mesh(geometry, material);
        }
        
        // Scale bullet appropriately
        bulletModel.scale.set(0.5, 0.5, 0.5);
        
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
                tankMesh.rotation.y = 0;
                break;
            case 'down':
                tankMesh.rotation.y = Math.PI;
                break;
            case 'left':
                tankMesh.rotation.y = -Math.PI / 2;
                break;
            case 'right':
                tankMesh.rotation.y = Math.PI / 2;
                break;
        }
    }
}