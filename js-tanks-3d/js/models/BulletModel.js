export default class BulletModel {
    constructor(data) {
        this.id = data.id || `bullet_${Date.now()}_${Math.random()}`;
        this.position = { ...data.position, y: 0.8 }; // Set y to a visible height
        this.direction = data.direction;
        this.speed = data.speed || 8;
        this.power = data.power || 1;
        this.owner = data.owner;
        this.ownerType = data.ownerType;
        this.active = true;
        
        // Set velocity based on direction
        this.velocity = this.calculateVelocity(this.direction, this.speed);
        
        // Bullet size for collision
        this.size = 0.1;
        this.bounds = this.calculateBounds();
        
        // Lifetime (destroy after certain distance/time)
        this.lifetime = 5000; // ms
        this.createdAt = Date.now();
    }
    
    calculateVelocity(direction, speed) {
        switch(direction) {
            case 'up':
                return { x: 0, z: -speed };
            case 'down':
                return { x: 0, z: speed };
            case 'left':
                return { x: -speed, z: 0 };
            case 'right':
                return { x: speed, z: 0 };
            default:
                return { x: 0, z: 0 };
        }
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        // Update position
        this.position.x += this.velocity.x * deltaTime / 1000;
        this.position.z += this.velocity.z * deltaTime / 1000;
        
        // Update bounds
        this.bounds = this.calculateBounds();
        
        // Check lifetime
        if (Date.now() - this.createdAt > this.lifetime) {
            this.destroy();
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
    
    destroy() {
        this.active = false;
    }
    
    // Check if bullet is out of bounds
    isOutOfBounds(mapBounds) {
        return (
            this.position.x < mapBounds.left ||
            this.position.x > mapBounds.right ||
            this.position.z < mapBounds.top ||
            this.position.z > mapBounds.bottom
        );
    }
}