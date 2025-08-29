export default class TankModel {
    constructor(id, type = 'player1', position = {x: 0, z: 0}) {
        this.id = id;
        this.type = type; // player1, player2, enemy_a, enemy_b, enemy_c, enemy_d
        
        // Position and movement
        this.position = { x: position.x, y: 0, z: position.z };
        this.previousPosition = { ...this.position };
        this.direction = 'up'; // up, down, left, right
        this.rotation = 0; // in radians
        this.speed = this.getSpeedByType(type);
        this.velocity = { x: 0, z: 0 };
        
        // Tank properties
        this.alive = true;
        this.health = 1;
        this.powerLevel = 1;
        this.maxPowerLevel = this.type.startsWith('player') ? 4 : 1;
        
        // Shooting
        this.canFire = true;
        this.fireRate = 500; // ms between shots
        this.lastFireTime = 0;
        this.bulletSpeed = 8;
        
        // Tank size for collision
        this.size = 0.8;
        this.bounds = this.calculateBounds();
        
        // Animation
        this.animationFrame = 0;
        this.animationTimer = 0;
        
        // AI properties (for enemies)
        this.aiState = 'patrol';
        this.targetPosition = null;
        this.lastDirectionChange = 0;
        this.directionChangeInterval = 2000; // ms
    }
    
    getSpeedByType(type) {
        const speeds = {
            'player1': 3,
            'player2': 3,
            'enemy_a': 2,
            'enemy_b': 2.5,
            'enemy_c': 3,
            'enemy_d': 2
        };
        return speeds[type] || 2;
    }
    
    update(deltaTime) {
        if (!this.alive) return;
        
        this.previousPosition = { ...this.position };
        
        // Update position based on velocity
        this.position.x += this.velocity.x * deltaTime / 1000;
        this.position.z += this.velocity.z * deltaTime / 1000;
        
        // Update bounds
        this.bounds = this.calculateBounds();
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update fire cooldown
        if (!this.canFire) {
            if (Date.now() - this.lastFireTime > this.fireRate) {
                this.canFire = true;
            }
        }
    }
    
    move(direction) {
        if (!this.alive) return;
        
        this.direction = direction;
        
        switch(direction) {
            case 'up':
                this.velocity = { x: 0, z: -this.speed };
                this.rotation = 0;
                break;
            case 'down':
                this.velocity = { x: 0, z: this.speed };
                this.rotation = Math.PI;
                break;
            case 'left':
                this.velocity = { x: -this.speed, z: 0 };
                this.rotation = -Math.PI / 2;
                break;
            case 'right':
                this.velocity = { x: this.speed, z: 0 };
                this.rotation = Math.PI / 2;
                break;
        }
    }
    
    stop() {
        this.velocity = { x: 0, z: 0 };
    }
    
    fire() {
        if (!this.alive || !this.canFire) return null;
        
        this.canFire = false;
        this.lastFireTime = Date.now();
        
        // Calculate bullet spawn position
        const bulletOffset = 0.5;
        let bulletPos = { ...this.position };
        
        switch(this.direction) {
            case 'up':
                bulletPos.z -= bulletOffset;
                break;
            case 'down':
                bulletPos.z += bulletOffset;
                break;
            case 'left':
                bulletPos.x -= bulletOffset;
                break;
            case 'right':
                bulletPos.x += bulletOffset;
                break;
        }
        
        // Return bullet data for GameModel to create a bullet
        return {
            position: bulletPos,
            direction: this.direction,
            speed: this.bulletSpeed,
            power: this.powerLevel,
            owner: this.id,
            ownerType: this.type
        };
    }
    
    takeDamage(damage = 1) {
        if (!this.alive) return;
        
        this.health -= damage;
        if (this.health <= 0) {
            this.destroy();
        }
    }
    
    destroy() {
        this.alive = false;
        this.velocity = { x: 0, z: 0 };
    }
    
    respawn(position) {
        this.alive = true;
        this.health = 1;
        this.position = { ...position };
        this.previousPosition = { ...position };
        this.velocity = { x: 0, z: 0 };
        this.direction = 'up';
        this.rotation = 0;
        this.canFire = true;
        this.powerLevel = 1;
    }
    
    upgrade() {
        if (this.powerLevel < this.maxPowerLevel) {
            this.powerLevel++;
            
            // Upgrade properties based on power level
            if (this.powerLevel === 2) {
                this.bulletSpeed = 10;
            } else if (this.powerLevel === 3) {
                this.fireRate = 300;
            } else if (this.powerLevel === 4) {
                this.speed *= 1.2;
            }
        }
    }
    
    calculateBounds() {
        const halfSize = this.size / 2;
        return {
            left: this.position.x - halfSize,
            right: this.position.x + halfSize,
            top: this.position.z - halfSize,
            bottom: this.position.z + halfSize
        };
    }
    
    updateAnimation(deltaTime) {
        this.animationTimer += deltaTime;
        if (this.animationTimer > 100) { // Change frame every 100ms
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % 2;
        }
    }
    
    // AI methods for enemy tanks
    updateAI(deltaTime, playerPositions, map) {
        if (!this.type.startsWith('enemy')) return;
        
        const now = Date.now();
        
        // Change direction periodically
        if (now - this.lastDirectionChange > this.directionChangeInterval) {
            this.lastDirectionChange = now;
            this.chooseNewDirection(playerPositions);
        }
        
        // Simple AI: move in chosen direction
        if (this.aiState === 'patrol') {
            // Keep moving in current direction
            this.move(this.direction);
        } else if (this.aiState === 'chase') {
            // Move towards player (more advanced AI)
            this.chasePlayer(playerPositions);
        }
        
        // Randomly fire
        if (Math.random() < 0.01) { // 1% chance per frame
            return this.fire();
        }
        
        return null;
    }
    
    chooseNewDirection(playerPositions) {
        const directions = ['up', 'down', 'left', 'right'];
        
        // 30% chance to move towards nearest player
        if (Math.random() < 0.3 && playerPositions.length > 0) {
            const nearestPlayer = this.findNearestPlayer(playerPositions);
            if (nearestPlayer) {
                const dx = nearestPlayer.x - this.position.x;
                const dz = nearestPlayer.z - this.position.z;
                
                if (Math.abs(dx) > Math.abs(dz)) {
                    this.direction = dx > 0 ? 'right' : 'left';
                } else {
                    this.direction = dz > 0 ? 'down' : 'up';
                }
                return;
            }
        }
        
        // Otherwise random direction
        this.direction = directions[Math.floor(Math.random() * directions.length)];
    }
    
    findNearestPlayer(playerPositions) {
        let nearest = null;
        let minDistance = Infinity;
        
        playerPositions.forEach(pos => {
            const distance = Math.sqrt(
                Math.pow(pos.x - this.position.x, 2) +
                Math.pow(pos.z - this.position.z, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearest = pos;
            }
        });
        
        return nearest;
    }
    
    chasePlayer(playerPositions) {
        const nearest = this.findNearestPlayer(playerPositions);
        if (!nearest) {
            this.aiState = 'patrol';
            return;
        }
        
        const dx = nearest.x - this.position.x;
        const dz = nearest.z - this.position.z;
        
        if (Math.abs(dx) > Math.abs(dz)) {
            this.move(dx > 0 ? 'right' : 'left');
        } else {
            this.move(dz > 0 ? 'down' : 'up');
        }
    }
}