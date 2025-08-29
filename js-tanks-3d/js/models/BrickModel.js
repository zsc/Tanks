export default class BrickModel {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.collisionCount = 0;
        this.stateCode = 0;
        this.destroyed = false;
        
        // Collision rectangle for partial destruction
        this.bounds = {
            left: x,
            right: x + 1,
            top: z,
            bottom: z + 1
        };
        
        // Visual representation state
        this.visualState = 'full'; // full, top, bottom, left, right, topLeft, topRight, bottomLeft, bottomRight
    }
    
    // Handle bullet hit based on direction
    bulletHit(bulletDirection) {
        // Direction mapping: 0=up, 1=right, 2=down, 3=left
        const bd = this.getDirectionCode(bulletDirection);
        this.collisionCount++;
        
        if (this.collisionCount === 1) {
            this.stateCode = bd + 1;
        } else if (this.collisionCount === 2) {
            const sumSquare = (this.stateCode - 1) * (this.stateCode - 1) + bd * bd;
            if (sumSquare % 2 === 1) {
                this.stateCode = Math.floor((sumSquare + 19.0) / 4.0);
            } else {
                this.stateCode = 9;
                this.destroyed = true;
            }
        } else {
            this.stateCode = 9;
            this.destroyed = true;
        }
        
        this.updateCollisionRect();
        this.updateVisualState();
    }
    
    getDirectionCode(direction) {
        const dirMap = {
            'up': 0,
            'right': 1,
            'down': 2,
            'left': 3
        };
        return dirMap[direction] || 0;
    }
    
    updateCollisionRect() {
        const halfSize = 0.5;
        
        switch(this.stateCode) {
            case 1: // Top half destroyed
                this.bounds = {
                    left: this.x,
                    right: this.x + 1,
                    top: this.z,
                    bottom: this.z + halfSize
                };
                break;
            case 2: // Right half destroyed
                this.bounds = {
                    left: this.x + halfSize,
                    right: this.x + 1,
                    top: this.z,
                    bottom: this.z + 1
                };
                break;
            case 3: // Bottom half destroyed
                this.bounds = {
                    left: this.x,
                    right: this.x + 1,
                    top: this.z + halfSize,
                    bottom: this.z + 1
                };
                break;
            case 4: // Left half destroyed
                this.bounds = {
                    left: this.x,
                    right: this.x + halfSize,
                    top: this.z,
                    bottom: this.z + 1
                };
                break;
            case 5: // Top-right quarter remains
                this.bounds = {
                    left: this.x + halfSize,
                    right: this.x + 1,
                    top: this.z,
                    bottom: this.z + halfSize
                };
                break;
            case 6: // Bottom-right quarter remains
                this.bounds = {
                    left: this.x + halfSize,
                    right: this.x + 1,
                    top: this.z + halfSize,
                    bottom: this.z + 1
                };
                break;
            case 7: // Top-left quarter remains
                this.bounds = {
                    left: this.x,
                    right: this.x + halfSize,
                    top: this.z,
                    bottom: this.z + halfSize
                };
                break;
            case 8: // Bottom-left quarter remains
                this.bounds = {
                    left: this.x,
                    right: this.x + halfSize,
                    top: this.z + halfSize,
                    bottom: this.z + 1
                };
                break;
            case 9: // Completely destroyed
                this.bounds = {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                };
                break;
        }
    }
    
    updateVisualState() {
        const stateMap = {
            0: 'full',
            1: 'bottomHalf',    // Top destroyed, bottom remains
            2: 'leftHalf',      // Right destroyed, left remains
            3: 'topHalf',       // Bottom destroyed, top remains
            4: 'rightHalf',     // Left destroyed, right remains
            5: 'topRight',
            6: 'bottomRight',
            7: 'topLeft',
            8: 'bottomLeft',
            9: 'destroyed'
        };
        
        this.visualState = stateMap[this.stateCode] || 'full';
    }
    
    isDestroyed() {
        return this.destroyed;
    }
    
    getVisualState() {
        return this.visualState;
    }
    
    checkCollision(bounds) {
        return !(
            bounds.right < this.bounds.left ||
            bounds.left > this.bounds.right ||
            bounds.bottom < this.bounds.top ||
            bounds.top > this.bounds.bottom
        );
    }
}