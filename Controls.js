import * as THREE from 'three';

class VoxelControls {
    constructor(camera, domElement, world, uiManager, saveManager) {
        this.camera = camera;
        this.domElement = domElement;
        this.world = world;
        this.uiManager = uiManager;
        this.saveManager = saveManager;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        
        this.rollOverMesh = this.createRollOverMesh();
        this.world.scene.add(this.rollOverMesh);

        this.isShiftDown = false;

        this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this), false);
        this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this), false);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Shift') this.isShiftDown = true;
        });
        document.addEventListener('keyup', (event) => {
            if (event.key === 'Shift') this.isShiftDown = false;
        });
        
        // Prevent OrbitControls from firing on UI clicks
        const uiPanel = document.getElementById('ui-panel');
        uiPanel.addEventListener('pointerdown', (event) => event.stopPropagation());
    }

    createRollOverMesh() {
        const rollOverGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
        const edges = new THREE.EdgesGeometry(rollOverGeo);
        const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
        const mesh = new THREE.LineSegments(edges, material);
        mesh.visible = false;
        return mesh;
    }

    updatePointer(event) {
        const rect = this.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    onPointerMove(event) {
        this.updatePointer(event);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        const objectsToIntersect = [this.world.groundPlane, ...this.world.voxels.values()];
        const intersects = this.raycaster.intersectObjects(objectsToIntersect);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            if (!intersect.face) {
                this.rollOverMesh.visible = false;
                return;
            }
            this.rollOverMesh.visible = true;
            
            const newPos = new THREE.Vector3();
            if (this.isShiftDown) { // Remove mode
                if (intersect.object !== this.world.groundPlane) {
                    newPos.copy(intersect.object.position);
                } else {
                    this.rollOverMesh.visible = false;
                    return;
                }
            } else { // Add mode
                newPos.copy(intersect.point).add(intersect.face.normal.clone().multiplyScalar(0.5));
                newPos.floor().addScalar(0.5);
            }
            
            this.rollOverMesh.position.copy(newPos);
        } else {
            this.rollOverMesh.visible = false;
        }
    }

    onPointerDown(event) {
        // Only perform actions on left-click or touch
        if (event.button !== 0) {
            return;
        }
        
        // Don't do anything if we clicked on the UI
        if (event.target !== this.domElement) {
            return;
        }

        this.updatePointer(event);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        const objectsToIntersect = [this.world.groundPlane, ...this.world.voxels.values()];
        const intersects = this.raycaster.intersectObjects(objectsToIntersect);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            if (!intersect.face) {
                return;
            }
            
            if (this.isShiftDown) {
                // Remove voxel
                if (intersect.object !== this.world.groundPlane) {
                    this.world.removeVoxel(intersect.object.position);
                }
            } else {
                // Add voxel
                const newPos = new THREE.Vector3().copy(intersect.point).add(intersect.face.normal.clone().multiplyScalar(0.5));
                newPos.floor().addScalar(0.5);

                const activeMaterial = this.uiManager.getActiveMaterial();
                if (activeMaterial) {
                    this.world.addVoxel(newPos, activeMaterial);
                }
            }
        }
    }
}

export default VoxelControls;