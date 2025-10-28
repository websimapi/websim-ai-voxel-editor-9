import * as THREE from 'three';

const NAMED_SAVE_PREFIX = 'voxel-world-save-';
const AUTOSAVE_PREFIX = 'voxel-world-autosave-';
const MAX_AUTOSAVES = 10;

class SaveManager {
    constructor(world, uiManager) {
        this.world = world;
        this.uiManager = uiManager;
        this.isDirty = false;
        this.saveInterval = 5000; // 5 seconds
        this.currentSaveName = null;

        this.init();
    }

    init() {
        setInterval(() => this.autoSave(), this.saveInterval);
        window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
        if (this.uiManager && typeof this.uiManager.populateLoadMenu === 'function') {
            this.uiManager.populateLoadMenu();
        }
    }

    setDirty() {
        this.isDirty = true;
    }

    save(name) {
        if (!this.world || !this.uiManager) return;
        
        let saveKey;
        if (name) {
            saveKey = NAMED_SAVE_PREFIX + name;
            this.currentSaveName = name;
        } else {
            const timestamp = new Date().toISOString();
            const worldName = this.currentSaveName || 'New World';
            const backupName = `${worldName} - ${timestamp}`;
            saveKey = AUTOSAVE_PREFIX + backupName;
        }

        const saveData = {
            textures: [],
            voxels: []
        };

        // Save texture URLs
        saveData.textures = this.uiManager.materials.map(material => material.map.image.src);

        // Save voxels (position and material index)
        this.world.voxels.forEach(voxelMesh => {
            const materialIndex = this.uiManager.materials.indexOf(voxelMesh.material);
            if (materialIndex > -1) {
                saveData.voxels.push({
                    position: voxelMesh.position.toArray(),
                    materialIndex: materialIndex
                });
            }
        });

        localStorage.setItem(saveKey, JSON.stringify(saveData));
        this.isDirty = false; // Should be reset on any save

        if(name) {
            console.log(`World saved as '${name}'.`);
        } else {
            console.log('Autosave complete.');
            this.pruneAutoSaves();
        }

        if (this.uiManager && typeof this.uiManager.populateLoadMenu === 'function') {
            this.uiManager.populateLoadMenu();
        }
    }

    autoSave() {
        if (this.isDirty) {
            this.save(); // Save without a name for autosave
        }
    }

    async load(saveKey) {
        const savedData = localStorage.getItem(saveKey);
        if (!savedData) {
            console.error(`No save data found for key: ${saveKey}`);
            return;
        }

        if (saveKey.startsWith(NAMED_SAVE_PREFIX)) {
            this.currentSaveName = saveKey.replace(NAMED_SAVE_PREFIX, '');
        } else {
            this.currentSaveName = null;
        }

        // Clear existing world
        this.world.clear();
        this.uiManager.clearPalette();
        await this.uiManager.loadInitialTexture();

        try {
            const data = JSON.parse(savedData);
            
            // Load textures
            // The default texture is already loaded, so we skip it.
            const texturePromises = data.textures.slice(1).map(url => new THREE.TextureLoader().loadAsync(url));
            const loadedTextures = await Promise.all(texturePromises);
            loadedTextures.forEach(texture => this.uiManager.addTextureToPalette(texture, false));

            // Load voxels
            data.voxels.forEach(voxelData => {
                const position = new THREE.Vector3().fromArray(voxelData.position);
                const material = this.uiManager.materials[voxelData.materialIndex];
                if (material) {
                    this.world.addVoxel(position, material, false);
                }
            });
            this.isDirty = false;
            console.log(`World loaded from ${saveKey}.`);
        } catch (error) {
            console.error('Failed to load world data:', error);
        }
    }

    getSaves() {
        const saves = { named: [], backups: [] };
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(NAMED_SAVE_PREFIX)) {
                saves.named.push({
                    name: key.replace(NAMED_SAVE_PREFIX, ''),
                    key: key
                });
            } else if (key.startsWith(AUTOSAVE_PREFIX)) {
                const backupKey = key.replace(AUTOSAVE_PREFIX, '');
                const parts = backupKey.split(' - ');
                const timestamp = parts.pop();
                const worldName = parts.join(' - ');
                
                try {
                    const date = new Date(timestamp);
                    const formattedDate = date.toLocaleString();
                    saves.backups.push({
                        name: `${worldName} (${formattedDate})`,
                        key: key,
                        date: date
                    });
                } catch(e) {
                     // Could be an old format, just display raw
                    saves.backups.push({
                        name: backupKey,
                        key: key,
                        date: new Date(0) // push to bottom
                    });
                }
            }
        }
        // Sort backups by date, newest first
        saves.backups.sort((a, b) => b.date - a.date);
        return saves;
    }

    pruneAutoSaves() {
        const saves = this.getSaves();
        if (saves.backups.length > MAX_AUTOSAVES) {
            const savesToRemove = saves.backups.slice(MAX_AUTOSAVES);
            savesToRemove.forEach(save => {
                localStorage.removeItem(save.key);
                console.log(`Pruned old backup: ${save.key}`);
            });
        }
    }

    onBeforeUnload(event) {
        if (this.isDirty) {
            event.preventDefault();
            // Most browsers show a generic message, but this is required for it to trigger
            event.returnValue = '';

            // If the user decides to stay, save the work immediately.
            // This timeout will only execute if the page unload is cancelled.
            setTimeout(() => {
                this.save(); // This will be an autosave
                console.log('Work saved automatically after cancelling page unload.');
            }, 100);

            return '';
        }
    }
}

export default SaveManager;