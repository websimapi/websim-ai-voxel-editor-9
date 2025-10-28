import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import World from './World.js';
import VoxelControls from './Controls.js';
import UIManager from './UIManager.js';
import SaveManager from './SaveManager.js';

class App {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x3498db);

        const aspect = window.innerWidth / window.innerHeight;
        const d = 20;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        this.camera.position.set(50, 50, 50);
        this.camera.lookAt(this.scene.position);
        
        this.renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.setupLighting();

        this.world = new World(this.scene);
        this.uiManager = new UIManager(this.world);
        this.saveManager = new SaveManager(this.world, this.uiManager);
        
        this.world.setSaveManager(this.saveManager);
        this.uiManager.setSaveManager(this.saveManager);

        this.controls = new VoxelControls(this.camera, this.renderer.domElement, this.world, this.uiManager, this.saveManager);
        this.orbitControls = this.setupOrbitControls();

        // this.saveManager.load(); // Will be moved to async init

        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.init();
    }

    async init() {
        await this.uiManager.loadInitialTexture();
        const saves = this.saveManager.getSaves();
        if (saves.backups.length > 0) {
            console.log('Loading most recent backup.');
            await this.saveManager.load(saves.backups[0].key);
        }
        this.animate();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);
    }

    setupOrbitControls() {
        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.mouseButtons = {
            RIGHT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            LEFT: null 
        };
        controls.touches = {
            ONE: null,
            TWO: THREE.TOUCH.DOLLY_ROTATE
        };
        controls.target.set(0, 0, 0);
        controls.update();
        return controls;
    }

    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const d = 20;
        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
    }
}

new App();