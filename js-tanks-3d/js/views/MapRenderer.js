export default class MapRenderer {
    constructor(scene, spriteManager) {
        this.scene = scene;
        this.spriteManager = spriteManager;
        this.mapGroup = new THREE.Group();
        this.tileObjects = [];
    }
    
    renderMap(mapModel) {
        // Clear existing map
        this.clearMap();
        
        // Create ground plane
        const ground = this.spriteManager.createGroundPlane(
            mapModel.width,
            mapModel.height
        );
        this.mapGroup.add(ground);
        
        // Render tiles
        for (let z = 0; z < mapModel.height; z++) {
            for (let x = 0; x < mapModel.width; x++) {
                const tileType = mapModel.getTile(x, z);
                
                if (tileType > 0) {
                    const tile = this.spriteManager.createMapTileSprite(tileType);
                    if (tile) {
                        // Convert to world coordinates (centered)
                        tile.position.x = x - mapModel.width / 2 + 0.5;
                        tile.position.z = z - mapModel.height / 2 + 0.5;
                        
                        tile.userData.tileX = x;
                        tile.userData.tileZ = z;
                        tile.userData.tileType = tileType;
                        
                        this.mapGroup.add(tile);
                        this.tileObjects.push(tile);
                    }
                }
            }
        }
        
        // Add map group to scene
        this.scene.add(this.mapGroup);
    }
    
    updateTile(x, z, newType) {
        // Find and remove existing tile
        const tileIndex = this.tileObjects.findIndex(tile => 
            tile.userData.tileX === x && tile.userData.tileZ === z
        );
        
        if (tileIndex !== -1) {
            const oldTile = this.tileObjects[tileIndex];
            this.mapGroup.remove(oldTile);
            this.tileObjects.splice(tileIndex, 1);
        }
        
        // Add new tile if not empty
        if (newType > 0) {
            const tile = this.spriteManager.createMapTileSprite(newType);
            if (tile) {
                tile.position.x = x - 13 + 0.5; // Assuming 26x26 map
                tile.position.z = z - 13 + 0.5;
                
                tile.userData.tileX = x;
                tile.userData.tileZ = z;
                tile.userData.tileType = newType;
                
                this.mapGroup.add(tile);
                this.tileObjects.push(tile);
            }
        }
    }
    
    destroyTile(x, z) {
        this.updateTile(x, z, 0);
        
        // Create destruction effect
        const worldPos = new THREE.Vector3(
            x - 13 + 0.5,
            0.5,
            z - 13 + 0.5
        );
        
        return this.spriteManager.createExplosion(worldPos);
    }
    
    clearMap() {
        // Remove all tiles from scene
        this.tileObjects.forEach(tile => {
            this.mapGroup.remove(tile);
        });
        this.tileObjects = [];
        
        // Remove map group from scene
        if (this.mapGroup.parent) {
            this.scene.remove(this.mapGroup);
        }
        
        // Clear the group
        while (this.mapGroup.children.length > 0) {
            this.mapGroup.remove(this.mapGroup.children[0]);
        }
    }
    
    highlightTile(x, z, color = 0xff0000) {
        const tile = this.tileObjects.find(t => 
            t.userData.tileX === x && t.userData.tileZ === z
        );
        
        if (tile) {
            tile.material.emissive = new THREE.Color(color);
            tile.material.emissiveIntensity = 0.5;
        }
    }
    
    getMapBounds() {
        return {
            minX: -13,
            maxX: 13,
            minZ: -13,
            maxZ: 13
        };
    }
}