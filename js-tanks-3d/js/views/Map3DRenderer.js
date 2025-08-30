import * as THREE from 'three';

export default class Map3DRenderer {
    constructor(scene, modelManager) {
        this.scene = scene;
        this.modelManager = modelManager;
        this.mapGroup = new THREE.Group();
        this.mapGroup.name = 'MapGroup';
        this.wallMeshes = [];
        this.terrainMeshes = [];
        this.eagleBase = null;
    }
    
    renderMap(mapModel) {
        // Safety check
        if (!mapModel) {
            console.error('Map3DRenderer.renderMap: mapModel is null');
            return;
        }
        
        // Additional safety checks
        if (typeof mapModel.height === 'undefined' || typeof mapModel.width === 'undefined') {
            console.error('Map3DRenderer.renderMap: mapModel missing width or height', {
                mapModel,
                hasHeight: typeof mapModel.height !== 'undefined',
                hasWidth: typeof mapModel.width !== 'undefined'
            });
            return;
        }
        
        // Clear existing map
        this.clearMap();
        
        // Add map group to scene
        this.scene.add(this.mapGroup);
        
        // Create ground plane
        this.createGroundPlane();
        
        // Render map tiles
        const tileSize = 1; // Size of each tile in 3D units
        
        for (let row = 0; row < mapModel.height; row++) {
            for (let col = 0; col < mapModel.width; col++) {
                const tileType = mapModel.getTile(col, row); // Note: getTile uses (x, z) coordinates
                const position = new THREE.Vector3(
                    col * tileSize - 13, // Center map at origin
                    0,
                    row * tileSize - 13
                );
                
                this.createTile(tileType, position, row, col);
            }
        }
        
        // Add eagle base at the bottom center
        this.createEagleBase();
    }
    
    createGroundPlane() {
        const geometry = new THREE.PlaneGeometry(30, 30);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x2a2a2a,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        ground.name = 'Ground';
        this.mapGroup.add(ground);
    }
    
    createTile(tileType, position, row, col) {
        let mesh = null;
        
        switch(tileType) {
            case 1: // Brick wall
                mesh = this.modelManager.createWall3D('brick');
                if (mesh) {
                    mesh.position.copy(position);
                    mesh.position.y = 0.5;
                    mesh.scale.set(1, 1, 1);
                    mesh.userData = { type: 'brick', row, col };
                    this.enableShadows(mesh);
                    this.wallMeshes.push(mesh);
                    this.mapGroup.add(mesh);
                }
                break;
                
            case 2: // Steel wall
                mesh = this.modelManager.createWall3D('steel');
                if (mesh) {
                    mesh.position.copy(position);
                    mesh.position.y = 0.5;
                    mesh.scale.set(1, 1, 1);
                    mesh.userData = { type: 'steel', row, col };
                    this.enableShadows(mesh);
                    this.wallMeshes.push(mesh);
                    this.mapGroup.add(mesh);
                }
                break;
                
            case 3: // Water
                mesh = this.createWaterTile();
                if (mesh) {
                    mesh.position.copy(position);
                    mesh.position.y = -0.05;
                    mesh.userData = { type: 'water', row, col };
                    this.terrainMeshes.push(mesh);
                    this.mapGroup.add(mesh);
                }
                break;
                
            case 4: // Ice
                mesh = this.createIceTile();
                if (mesh) {
                    mesh.position.copy(position);
                    mesh.position.y = 0;
                    mesh.userData = { type: 'ice', row, col };
                    this.terrainMeshes.push(mesh);
                    this.mapGroup.add(mesh);
                }
                break;
                
            case 5: // Bush/Tree
                mesh = this.createBushTile();
                if (mesh) {
                    mesh.position.copy(position);
                    mesh.position.y = 0;
                    mesh.userData = { type: 'bush', row, col };
                    this.terrainMeshes.push(mesh);
                    this.mapGroup.add(mesh);
                }
                break;
        }
    }
    
    createWaterTile() {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0x006994,
            transparent: true,
            opacity: 0.8,
            shininess: 100,
            specular: 0x4080ff
        });
        const water = new THREE.Mesh(geometry, material);
        water.rotation.x = -Math.PI / 2;
        water.receiveShadow = true;
        return water;
    }
    
    createIceTile() {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0xb0e0e6,
            shininess: 150,
            specular: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const ice = new THREE.Mesh(geometry, material);
        ice.rotation.x = -Math.PI / 2;
        ice.receiveShadow = true;
        return ice;
    }
    
    createBushTile() {
        const group = new THREE.Group();
        
        // Create several small bush geometries for a clustered look
        const bushGeometry = new THREE.ConeGeometry(0.3, 0.6, 6);
        const bushMaterial = new THREE.MeshPhongMaterial({
            color: 0x2d5016,
            flatShading: true
        });
        
        for (let i = 0; i < 3; i++) {
            const bush = new THREE.Mesh(bushGeometry, bushMaterial);
            bush.position.set(
                (Math.random() - 0.5) * 0.4,
                0.3,
                (Math.random() - 0.5) * 0.4
            );
            bush.scale.set(
                0.8 + Math.random() * 0.4,
                0.8 + Math.random() * 0.4,
                0.8 + Math.random() * 0.4
            );
            bush.castShadow = true;
            bush.receiveShadow = true;
            group.add(bush);
        }
        
        return group;
    }
    
    createEagleBase() {
        // Create eagle base at the bottom center of the map
        this.eagleBase = this.modelManager.createEagleBase3D();
        if (this.eagleBase) {
            this.eagleBase.position.set(0, 0, 10); // Bottom center of map
            this.enableShadows(this.eagleBase);
            this.mapGroup.add(this.eagleBase);
        }
    }
    
    enableShadows(object) {
        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
    
    updateTile(row, col, newType) {
        // Find and remove the old tile
        const oldTile = this.wallMeshes.find(mesh => 
            mesh.userData.row === row && mesh.userData.col === col
        );
        
        if (oldTile) {
            this.mapGroup.remove(oldTile);
            const index = this.wallMeshes.indexOf(oldTile);
            if (index > -1) {
                this.wallMeshes.splice(index, 1);
            }
        }
        
        // Add new tile if needed
        if (newType !== 0) {
            const position = new THREE.Vector3(
                col - 13,
                0,
                row - 13
            );
            this.createTile(newType, position, row, col);
        }
    }
    
    damageBrick(row, col, damage) {
        const brick = this.wallMeshes.find(mesh => 
            mesh.userData.type === 'brick' && 
            mesh.userData.row === row && 
            mesh.userData.col === col
        );
        
        if (brick) {
            // Visual feedback for damage
            brick.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Darken the color to show damage
                    const currentColor = child.material.color;
                    child.material.color = new THREE.Color(
                        currentColor.r * 0.8,
                        currentColor.g * 0.8,
                        currentColor.b * 0.8
                    );
                    
                    // Add some transparency for heavily damaged bricks
                    if (damage > 2) {
                        child.material.transparent = true;
                        child.material.opacity = 0.7;
                    }
                }
            });
            
            // Scale down slightly to show damage
            brick.scale.multiplyScalar(0.95);
        }
    }
    
    destroyTile(x, z) {
        // Find and remove the tile at the given position
        const tile = this.wallMeshes.find(mesh => 
            mesh.userData.col === x && mesh.userData.row === z
        );
        
        if (tile) {
            // Create explosion effect at tile position
            const explosion = this.modelManager.createExplosion3D 
                ? this.modelManager.createExplosion3D(tile.position.clone())
                : null;
            
            // Remove the tile from the scene
            this.mapGroup.remove(tile);
            
            // Remove from wallMeshes array
            const index = this.wallMeshes.indexOf(tile);
            if (index > -1) {
                this.wallMeshes.splice(index, 1);
            }
            
            // Dispose of geometry and material
            if (tile.geometry) {
                tile.geometry.dispose();
            }
            if (tile.material) {
                if (Array.isArray(tile.material)) {
                    tile.material.forEach(mat => mat.dispose());
                } else {
                    tile.material.dispose();
                }
            }
            
            return explosion;
        }
        
        return null;
    }
    
    clearMap() {
        // Remove the entire map group from the scene
        if (this.mapGroup.parent) {
            this.scene.remove(this.mapGroup);
        }
        
        // Clear the map group
        while (this.mapGroup.children.length > 0) {
            const child = this.mapGroup.children[0];
            this.mapGroup.remove(child);
            
            // Dispose of geometries and materials
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
        
        // Clear arrays
        this.wallMeshes = [];
        this.terrainMeshes = [];
        this.eagleBase = null;
    }
    
    getWallAt(row, col) {
        return this.wallMeshes.find(mesh => 
            mesh.userData.row === row && mesh.userData.col === col
        );
    }
    
    isDestructible(row, col) {
        const wall = this.getWallAt(row, col);
        return wall && wall.userData.type === 'brick';
    }
}