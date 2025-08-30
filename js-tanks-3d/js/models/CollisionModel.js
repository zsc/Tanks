export default class CollisionModel {
    constructor() {
        // Spatial hash grid for broad phase collision detection
        this.gridSize = 2; // Size of each grid cell
        this.spatialGrid = new Map();
    }
    
    // Clear spatial grid
    clearGrid() {
        this.spatialGrid.clear();
    }
    
    // Get grid key from position
    getGridKey(x, z) {
        const gridX = Math.floor(x / this.gridSize);
        const gridZ = Math.floor(z / this.gridSize);
        return `${gridX},${gridZ}`;
    }
    
    // Get all grid cells that bounds overlaps
    getGridCells(bounds) {
        const cells = [];
        const minX = Math.floor(bounds.left / this.gridSize);
        const maxX = Math.floor(bounds.right / this.gridSize);
        const minZ = Math.floor(bounds.top / this.gridSize);
        const maxZ = Math.floor(bounds.bottom / this.gridSize);
        
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                cells.push(`${x},${z}`);
            }
        }
        
        return cells;
    }
    
    // Add entity to spatial grid
    addToGrid(entity) {
        const cells = this.getGridCells(entity.bounds);
        cells.forEach(cell => {
            if (!this.spatialGrid.has(cell)) {
                this.spatialGrid.set(cell, []);
            }
            this.spatialGrid.get(cell).push(entity);
        });
    }
    
    // Get potential collision candidates for entity
    getPotentialCollisions(entity) {
        const candidates = new Set();
        const cells = this.getGridCells(entity.bounds);
        
        cells.forEach(cell => {
            if (this.spatialGrid.has(cell)) {
                this.spatialGrid.get(cell).forEach(other => {
                    if (other !== entity) {
                        candidates.add(other);
                    }
                });
            }
        });
        
        return Array.from(candidates);
    }
    
    // AABB collision check
    checkAABB(bounds1, bounds2) {
        return !(
            bounds1.right < bounds2.left ||
            bounds1.left > bounds2.right ||
            bounds1.bottom < bounds2.top ||
            bounds1.top > bounds2.bottom
        );
    }
    
    // Circle collision check (for tanks and bullets)
    checkCircle(pos1, radius1, pos2, radius2) {
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance < (radius1 + radius2);
    }
    
    // Check tank vs tank collision
    checkTankCollision(tank1, tank2) {
        if (!tank1.alive || !tank2.alive) return false;
        return this.checkAABB(tank1.bounds, tank2.bounds);
    }
    
    // Check bullet vs tank collision
    checkBulletTankCollision(bullet, tank) {
        if (!bullet.active || !tank.alive) return false;
        
        // Don't collide with owner
        if (bullet.owner === tank.id) return false;
        
        return this.checkAABB(bullet.bounds, tank.bounds);
    }
    
    // Check bullet vs bullet collision
    checkBulletCollision(bullet1, bullet2) {
        if (!bullet1.active || !bullet2.active) return false;
        if (bullet1.id === bullet2.id) return false;
        
        return this.checkAABB(bullet1.bounds, bullet2.bounds);
    }
    
    // Check entity vs map collision
    checkMapCollision(entity, map) {
        const corners = [
            { x: entity.bounds.left, z: entity.bounds.top },
            { x: entity.bounds.right, z: entity.bounds.top },
            { x: entity.bounds.left, z: entity.bounds.bottom },
            { x: entity.bounds.right, z: entity.bounds.bottom }
        ];
        
        for (let corner of corners) {
            const tile = map.worldToTile(corner.x, corner.z);
            if (map.isSolid(tile.x, tile.z)) {
                return {
                    collided: true,
                    tileX: tile.x,
                    tileZ: tile.z,
                    tileType: map.getTile(tile.x, tile.z)
                };
            }
        }
        
        return { collided: false };
    }
    
    // Check if entity is out of map bounds
    checkBounds(entity, mapBounds) {
        return (
            entity.bounds.left < mapBounds.left ||
            entity.bounds.right > mapBounds.right ||
            entity.bounds.top < mapBounds.top ||
            entity.bounds.bottom > mapBounds.bottom
        );
    }
    
    // Resolve tank collision by pushing them apart
    resolveTankCollision(tank1, tank2) {
        // Calculate overlap
        const overlapX = Math.min(
            tank1.bounds.right - tank2.bounds.left,
            tank2.bounds.right - tank1.bounds.left
        );
        const overlapZ = Math.min(
            tank1.bounds.bottom - tank2.bounds.top,
            tank2.bounds.bottom - tank1.bounds.top
        );
        
        // Push apart along axis with smallest overlap
        if (overlapX < overlapZ) {
            // Push horizontally
            const pushX = overlapX / 2;
            if (tank1.position.x < tank2.position.x) {
                tank1.position.x -= pushX;
                tank2.position.x += pushX;
            } else {
                tank1.position.x += pushX;
                tank2.position.x -= pushX;
            }
        } else {
            // Push vertically
            const pushZ = overlapZ / 2;
            if (tank1.position.z < tank2.position.z) {
                tank1.position.z -= pushZ;
                tank2.position.z += pushZ;
            } else {
                tank1.position.z += pushZ;
                tank2.position.z -= pushZ;
            }
        }
        
        // Stop both tanks
        tank1.stop();
        tank2.stop();
        
        // Recalculate bounds
        tank1.bounds = tank1.calculateBounds();
        tank2.bounds = tank2.calculateBounds();
    }
    
    // Resolve tank vs map collision
    resolveTankMapCollision(tank, map) {
        // Revert to previous position
        tank.position = { ...tank.previousPosition };
        tank.stop();
        tank.bounds = tank.calculateBounds();
    }
    
    // Check bonus collision
    checkBonusCollision(player, bonus) {
        if (!player.alive || !bonus.active) return false;
        return this.checkAABB(player.bounds, bonus.bounds);
    }
    
    // Process all collisions for current frame
    processCollisions(gameModel) {
        const { players, enemies, bullets, map, bonuses } = gameModel;
        const allTanks = [...players, ...enemies];
        
        // Clear and rebuild spatial grid
        this.clearGrid();
        allTanks.forEach(tank => {
            if (tank.alive) this.addToGrid(tank);
        });
        bullets.forEach(bullet => {
            if (bullet.active) this.addToGrid(bullet);
        });
        
        // Tank vs Tank collisions
        for (let i = 0; i < allTanks.length; i++) {
            const tank1 = allTanks[i];
            if (!tank1.alive) continue;
            
            // Check against other tanks
            const candidates = this.getPotentialCollisions(tank1);
            candidates.forEach(tank2 => {
                if (tank2.alive && this.checkTankCollision(tank1, tank2)) {
                    this.resolveTankCollision(tank1, tank2);
                }
            });
            
            // Check against map
            const mapCollision = this.checkMapCollision(tank1, map);
            if (mapCollision.collided) {
                this.resolveTankMapCollision(tank1, map);
            }
            
            // Check map bounds
            if (this.checkBounds(tank1, map.bounds)) {
                this.resolveTankMapCollision(tank1, map);
            }
        }
        
        // Bullet collisions
        const bulletsToRemove = [];
        bullets.forEach(bullet => {
            if (!bullet.active) return;
            
            // Check bullet vs tanks
            allTanks.forEach(tank => {
                if (this.checkBulletTankCollision(bullet, tank)) {
                    // Don't hurt same team (optional)
                    const bulletOwnerType = bullet.owner ? bullet.owner.split('_')[0] : '';
                    const tankType = tank.type.split('_')[0];
                    
                    if (bulletOwnerType !== tankType || bulletOwnerType === 'enemy') {
                        tank.takeDamage(bullet.power);
                        bullet.destroy();
                        
                        // Log collision (skip enemy bullets if flag is disabled)
                        if (!bullet.owner.startsWith('enemy') || gameModel.logger.debugFlags.ENEMY_ACTIONS) {
                            gameModel.logger.logCollision('Bullet-Tank', bullet.id, tank.id, {
                                bulletOwner: bullet.owner,
                                tankType: tank.type,
                                damage: bullet.power,
                                tankDestroyed: !tank.alive
                            });
                        }
                        
                        // Update score if enemy destroyed by player
                        if (!tank.alive && tank.type.startsWith('enemy') && bulletOwnerType === 'player') {
                            const playerNum = bullet.owner.includes('1') ? 'player1' : 'player2';
                            gameModel.score[playerNum] += 100;
                            gameModel.enemiesKilled++;
                            
                            // Generate bonus if enemy had one
                            if (tank.hasBonus) {
                                gameModel.generateBonus();
                            }
                            
                            gameModel.logger.logScore(playerNum, 100, gameModel.score[playerNum]);
                            gameModel.logger.logDestroy('Enemy', tank.id, bullet.owner);
                        } else if (!tank.alive && tank.type.startsWith('player')) {
                            gameModel.logger.logDestroy('Player', tank.id, bullet.owner);
                        }
                    }
                }
            });
            
            // Check bullet vs map
            const mapCollision = this.checkMapCollision(bullet, map);
            if (mapCollision.collided) {
                // Destroy bullet
                bullet.destroy();
                
                // Log collision (skip enemy bullets if flag is disabled)
                if (!bullet.owner || !bullet.owner.startsWith('enemy') || gameModel.logger.debugFlags.ENEMY_ACTIONS) {
                    gameModel.logger.logCollision('Bullet-Map', bullet.id, 
                        `Tile(${mapCollision.tileX},${mapCollision.tileZ})`, {
                        tileType: mapCollision.tileType,
                        bulletOwner: bullet.owner,
                        bulletDirection: bullet.direction
                    });
                }
                
                // Destroy brick tiles with direction
                if (map.isDestructible(mapCollision.tileX, mapCollision.tileZ)) {
                    const result = map.destroyTile(mapCollision.tileX, mapCollision.tileZ, bullet.direction);
                    
                    // Log map change
                    gameModel.logger.logMapChange(
                        mapCollision.tileX, 
                        mapCollision.tileZ,
                        mapCollision.tileType,
                        result.destroyed ? 0 : mapCollision.tileType,
                        `Bullet from ${bullet.owner}`
                    );
                    
                    // Store destroyed tile info for view update
                    if (!gameModel.destroyedTiles) {
                        gameModel.destroyedTiles = [];
                    }
                    gameModel.destroyedTiles.push({
                        x: mapCollision.tileX,
                        z: mapCollision.tileZ,
                        result: result
                    });
                    
                    // Check if eagle was destroyed
                    if (!map.eagleAlive) {
                        gameModel.gameOver();
                        gameModel.logger.logDestroy('Eagle', 'eagle', bullet.owner);
                    }
                }
            }
            
            // Check bullet vs bullet
            bullets.forEach(otherBullet => {
                if (bullet !== otherBullet && this.checkBulletCollision(bullet, otherBullet)) {
                    bullet.destroy();
                    otherBullet.destroy();
                }
            });
            
            // Check if bullet is out of bounds
            if (bullet.isOutOfBounds(map.bounds)) {
                bullet.destroy();
            }
        });
        
        // Player vs Bonus collisions
        players.forEach(player => {
            if (!player.alive) return;
            
            bonuses.forEach(bonus => {
                if (this.checkBonusCollision(player, bonus)) {
                    // Apply bonus effect
                    bonus.applyEffect(player, gameModel);
                    
                    gameModel.logger.log('INFO', `Player ${player.id} collected ${bonus.type} bonus`);
                }
            });
        });
    }
}