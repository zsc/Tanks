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
        this.livesCount = this.type.startsWith('player') ? 10 : 1; // Player has 10 lives, enemies have 1-4 armor
        
        // Shield properties (for players)
        this.hasShield = false;
        this.shieldTime = 0;
        this.maxShieldTime = 3000; // 3 seconds of shield after respawn
        
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
        this.directionChangeInterval = this.getRandomDirectionInterval(); // ms
        this.lastSpeedChange = 0;
        this.speedChangeInterval = Math.random() * 300; // 0-300ms like C++
        this.lastFireTime = 0;
        this.fireInterval = this.getFireInterval(); // ms
        this.isBlocked = false;
        this.blockCheckTimer = 0;
    }
    
    getSpeedByType(type) {
        const speeds = {
            'player1': 3,
            'player2': 3,
            'enemy_a': 2,
            'enemy_b': 2.5,  // Tank B is 30% faster in C++
            'enemy_c': 3,
            'enemy_d': 2
        };
        return speeds[type] || 2;
    }
    
    getRandomDirectionInterval() {
        // C++ uses rand() % 800 + 100, so 100-900ms
        return Math.random() * 800 + 100;
    }
    
    getFireInterval() {
        if (this.type === 'enemy_d') {
            return Math.random() * 400; // 0-400ms for tank D
        } else if (this.type === 'enemy_c') {
            return Math.random() * 800; // 0-800ms for tank C  
        } else {
            return Math.random() * 1000; // 0-1000ms for tanks A & B
        }
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
        
        // Update shield timer
        if (this.hasShield) {
            this.shieldTime += deltaTime;
            if (this.shieldTime >= this.maxShieldTime) {
                this.hasShield = false;
                this.shieldTime = 0;
            }
        }
        
        // Update fire cooldown
        if (!this.canFire) {
            const timeSinceFire = Date.now() - this.lastFireTime;
            if (this.type.startsWith('player')) {
                console.log(`[DEBUG] Player ${this.id} cooldown check - time since fire: ${timeSinceFire}ms, fireRate: ${this.fireRate}ms`);
            }
            if (timeSinceFire > this.fireRate) {
                this.canFire = true;
                if (this.type.startsWith('player')) {
                    console.log(`[DEBUG] Player ${this.id} can fire again!`);
                }
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
        // Only log for players, not enemies
        if (this.type.startsWith('player')) {
            console.log(`[DEBUG] Player ${this.id} fire() - alive: ${this.alive}, canFire: ${this.canFire}, lastFireTime: ${this.lastFireTime}`);
        }
        if (!this.alive || !this.canFire) {
            if (this.type.startsWith('player')) {
                console.log(`[DEBUG] Player cannot fire - canFire: ${this.canFire}, timeSince: ${Date.now() - this.lastFireTime}ms, fireRate: ${this.fireRate}ms`);
            }
            return null;
        }
        
        this.canFire = false;
        this.lastFireTime = Date.now();
        if (this.type.startsWith('player')) {
            console.log(`[DEBUG] Player ${this.id} fired! Setting canFire=false, lastFireTime=${this.lastFireTime}`);
        }
        
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
        
        // Shield protects from damage
        if (this.hasShield && this.type.startsWith('player')) {
            return; // No damage when shielded
        }
        
        this.health -= damage;
        if (this.health <= 0) {
            this.destroy();
        }
    }
    
    destroy() {
        // For enemies, reduce armor/lives
        if (this.type.startsWith('enemy')) {
            this.livesCount--;
            if (this.livesCount > 0) {
                // Enemy has more armor, just damaged not destroyed
                this.health = 1;
                return;
            }
        }
        
        this.alive = false;
        this.velocity = { x: 0, z: 0 };
        this.toRemove = false; // Don't immediately remove, wait for explosion animation
        
        // For players, trigger respawn after explosion
        if (this.type.startsWith('player')) {
            this.needsRespawn = true;
        }
    }
    
    respawn(position) {
        // Check if player has lives left
        if (this.type.startsWith('player')) {
            this.livesCount--;
            if (this.livesCount <= 0) {
                this.toRemove = true;
                return false; // No more lives
            }
        }
        
        this.alive = true;
        this.health = 1;
        this.position = { ...position };
        this.previousPosition = { ...position };
        this.velocity = { x: 0, z: 0 };
        this.direction = 'up';
        this.rotation = 0;
        this.canFire = true;
        this.powerLevel = 1;
        this.needsRespawn = false;
        
        // Add shield for players (like C++)
        if (this.type.startsWith('player')) {
            this.hasShield = true;
            this.shieldTime = 0;
            // C++ gives half shield time on respawn
            this.maxShieldTime = 1500; // 1.5 seconds
        }
        
        return true;
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
        
        // Store previous position to detect if blocked
        const prevX = this.position.x;
        const prevZ = this.position.z;
        
        // Check if blocked (hasn't moved much)
        if (Math.abs(this.position.x - this.previousPosition.x) < 0.01 && 
            Math.abs(this.position.z - this.previousPosition.z) < 0.01 &&
            (this.velocity.x !== 0 || this.velocity.z !== 0)) {
            this.blockCheckTimer += deltaTime;
            if (this.blockCheckTimer > 100) { // If blocked for 100ms
                this.isBlocked = true;
                this.blockCheckTimer = 0;
            }
        } else {
            this.blockCheckTimer = 0;
            this.isBlocked = false;
        }
        
        // Change direction periodically or when blocked
        if (now - this.lastDirectionChange > this.directionChangeInterval || this.isBlocked) {
            this.lastDirectionChange = now;
            this.directionChangeInterval = this.getRandomDirectionInterval();
            
            // Find nearest player for targeting
            const nearestPlayer = this.findNearestPlayer(playerPositions);
            if (nearestPlayer) {
                this.targetPosition = nearestPlayer;
            }
            
            this.chooseNewDirection(playerPositions);
            this.isBlocked = false;
        }
        
        // Change speed periodically (like C++ m_try_to_go_time)
        if (now - this.lastSpeedChange > this.speedChangeInterval) {
            this.lastSpeedChange = now;
            this.speedChangeInterval = Math.random() * 300;
            // Always try to move (speed = default_speed in C++)
            this.move(this.direction);
        }
        
        // Keep moving continuously (important!)
        if (!this.isBlocked) {
            this.move(this.direction);
        }
        
        // Fire based on timing (like C++)
        if (now - this.lastFireTime > this.fireInterval) {
            this.lastFireTime = now;
            this.fireInterval = this.getFireInterval();
            
            // Tank D has smart firing (aims at player)
            if (this.type === 'enemy_d' && this.targetPosition) {
                const dx = this.targetPosition.x - this.position.x;
                const dz = this.targetPosition.z - this.position.z;
                
                // Only fire if player is in line of sight
                const threshold = 0.8; // Tank width
                let shouldFire = false;
                
                switch(this.direction) {
                    case 'up':
                        shouldFire = dz < 0 && Math.abs(dx) < threshold;
                        break;
                    case 'down':
                        shouldFire = dz > 0 && Math.abs(dx) < threshold;
                        break;
                    case 'left':
                        shouldFire = dx < 0 && Math.abs(dz) < threshold;
                        break;
                    case 'right':
                        shouldFire = dx > 0 && Math.abs(dz) < threshold;
                        break;
                }
                
                if (shouldFire || this.isBlocked) {
                    return this.fire();
                }
            } else {
                // Other tanks just fire randomly
                return this.fire();
            }
        }
        
        return null;
    }
    
    chooseNewDirection(playerPositions) {
        const directions = ['up', 'down', 'left', 'right'];
        
        // Different targeting probability based on tank type
        // Tank A: 80% chance to target player (less aggressive)
        // Other tanks: 50% chance to target player
        const targetChance = this.type === 'enemy_a' ? 0.8 : 0.5;
        
        if (Math.random() < targetChance && this.targetPosition) {
            const dx = this.targetPosition.x - this.position.x;
            const dz = this.targetPosition.z - this.position.z;
            
            // 70% chance to choose the most direct path
            if (Math.random() < 0.7) {
                if (Math.abs(dx) > Math.abs(dz)) {
                    this.direction = dx > 0 ? 'right' : 'left';
                } else {
                    this.direction = dz > 0 ? 'down' : 'up';
                }
            } else {
                // 30% chance to choose the secondary axis (for flanking)
                if (Math.abs(dx) > Math.abs(dz)) {
                    this.direction = dz > 0 ? 'down' : 'up';
                } else {
                    this.direction = dx > 0 ? 'right' : 'left';
                }
            }
        } else {
            // Random direction
            this.direction = directions[Math.floor(Math.random() * directions.length)];
        }
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
