import * as THREE from 'three';

export default class X3DLoader {
    constructor() {
        this.loader = new THREE.FileLoader();
        this.parser = new DOMParser();
    }

    async load(url) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (data) => {
                    try {
                        const model = this.parse(data);
                        resolve(model);
                    } catch (error) {
                        reject(error);
                    }
                },
                (progress) => {
                    // Progress callback
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    parse(x3dString) {
        const xml = this.parser.parseFromString(x3dString, 'text/xml');
        const scene = xml.querySelector('Scene');
        
        if (!scene) {
            throw new Error('No Scene found in X3D file');
        }

        const group = new THREE.Group();
        this.parseNode(scene, group);
        return group;
    }

    parseNode(node, parent) {
        for (let child of node.children) {
            switch (child.nodeName) {
                case 'Transform':
                    this.parseTransform(child, parent);
                    break;
                case 'Shape':
                    this.parseShape(child, parent);
                    break;
                case 'Group':
                    const group = new THREE.Group();
                    parent.add(group);
                    this.parseNode(child, group);
                    break;
            }
        }
    }

    parseTransform(transformNode, parent) {
        const group = new THREE.Group();
        
        // Parse translation
        const translation = transformNode.getAttribute('translation');
        if (translation) {
            const [x, y, z] = translation.split(' ').map(Number);
            group.position.set(x, y, z);
        }
        
        // Parse rotation
        const rotation = transformNode.getAttribute('rotation');
        if (rotation) {
            const [x, y, z, angle] = rotation.split(' ').map(Number);
            group.rotation.setFromAxisAngle(new THREE.Vector3(x, y, z), angle);
        }
        
        // Parse scale
        const scale = transformNode.getAttribute('scale');
        if (scale) {
            const [x, y, z] = scale.split(' ').map(Number);
            group.scale.set(x, y, z);
        }
        
        parent.add(group);
        this.parseNode(transformNode, group);
    }

    parseShape(shapeNode, parent) {
        let geometry = null;
        let material = null;
        
        // Parse geometry
        for (let child of shapeNode.children) {
            if (child.nodeName === 'Box') {
                const size = child.getAttribute('size') || '2 2 2';
                const [width, height, depth] = size.split(' ').map(Number);
                geometry = new THREE.BoxGeometry(width, height, depth);
            } else if (child.nodeName === 'Sphere') {
                const radius = parseFloat(child.getAttribute('radius') || '1');
                geometry = new THREE.SphereGeometry(radius, 16, 16);
            } else if (child.nodeName === 'Cylinder') {
                const radius = parseFloat(child.getAttribute('radius') || '1');
                const height = parseFloat(child.getAttribute('height') || '2');
                geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
            } else if (child.nodeName === 'Cone') {
                const bottomRadius = parseFloat(child.getAttribute('bottomRadius') || '1');
                const height = parseFloat(child.getAttribute('height') || '2');
                geometry = new THREE.ConeGeometry(bottomRadius, height, 16);
            } else if (child.nodeName === 'Appearance') {
                material = this.parseAppearance(child);
            }
        }
        
        if (geometry) {
            if (!material) {
                material = new THREE.MeshPhongMaterial({ color: 0x808080 });
            }
            const mesh = new THREE.Mesh(geometry, material);
            parent.add(mesh);
        }
    }

    parseAppearance(appearanceNode) {
        let material = null;
        
        for (let child of appearanceNode.children) {
            if (child.nodeName === 'Material') {
                const diffuseColor = child.getAttribute('diffuseColor') || '0.8 0.8 0.8';
                const specularColor = child.getAttribute('specularColor') || '0 0 0';
                const shininess = parseFloat(child.getAttribute('shininess') || '0.2');
                const ambientIntensity = parseFloat(child.getAttribute('ambientIntensity') || '0.2');
                
                const [dr, dg, db] = diffuseColor.split(' ').map(Number);
                const [sr, sg, sb] = specularColor.split(' ').map(Number);
                
                material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(dr, dg, db),
                    specular: new THREE.Color(sr, sg, sb),
                    shininess: shininess * 100,
                    emissive: new THREE.Color(dr * ambientIntensity, dg * ambientIntensity, db * ambientIntensity)
                });
            }
        }
        
        return material || new THREE.MeshPhongMaterial({ color: 0x808080 });
    }
}