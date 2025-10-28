import * as THREE from 'three';

const VOXEL_SIZE = 1;

class World {
    constructor(scene) {
        this.scene = scene;
        this.voxels = new Map();
        this.voxelGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
        this.saveManager = null;

        this.addGroundPlane();
    }

    setSaveManager(manager) {
        this.saveManager = manager;
    }

    addGroundPlane() {
        const gridSize = 100;
        const gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x888888, 0x444444);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);

        const planeGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
        planeGeometry.rotateX(-Math.PI / 2);
        this.groundPlane = new THREE.Mesh(
            planeGeometry,
            new THREE.MeshBasicMaterial({ visible: false })
        );
        this.groundPlane.position.y = 0;
        this.scene.add(this.groundPlane);
    }

    addVoxel(position, material, markDirty = true) {
        const posKey = `${position.x},${position.y},${position.z}`;
        if (this.voxels.has(posKey)) return;

        const voxelMesh = new THREE.Mesh(this.voxelGeometry, material);
        voxelMesh.position.copy(position);
        
        this.scene.add(voxelMesh);
        this.voxels.set(posKey, voxelMesh);

        if (markDirty && this.saveManager) {
            this.saveManager.setDirty();
        }
    }

    removeVoxel(position) {
        const posKey = `${position.x},${position.y},${position.z}`;
        if (this.voxels.has(posKey)) {
            const voxelMesh = this.voxels.get(posKey);
            this.scene.remove(voxelMesh);
            this.voxels.delete(posKey);
            if (this.saveManager) {
                this.saveManager.setDirty();
            }
        }
    }

    clear() {
        this.voxels.forEach(voxelMesh => {
            this.scene.remove(voxelMesh);
        });
        this.voxels.clear();
    }
}

export default World;