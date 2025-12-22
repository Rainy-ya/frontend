import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/Addons.js';

export class ModelLoader {

    constructor() {
        this.guideCharModel = null;
        this.bones = {};
        this.mixer = null;
        this.boneInitialRotations = {};
    }

    async loadGuideCharacter(scene) {
        const gltfLoader = new GLTFLoader();
        
        return new Promise((resolve, reject) => {
            gltfLoader.load('/models/model.glb', (gltf) => {

                this.guideCharModel = gltf.scene;

                this.guideCharModel.traverse((obj) => {
                    
                    obj.castShadow = true;
                    obj.receiveShadow = true;

                    if (obj.isBone) {
                        if (obj.name === 'head_neck_upper_054') {
                            this.bones.head = obj;
                        }
                        if (obj.name === 'head_jaw_098') {
                            this.bones.jaw = obj;
                            this.boneInitialRotations.jaw = obj.rotation.z;
                        }
                        if (obj.name === 'head_eyelid_upper_061') {
                            this.bones.eyelid = obj;
                            this.boneInitialRotations.eyelid = obj.rotation.z;
                        }
                        if (obj.name === 'head_eyeball_right_059') {
                            this.bones.eyeballRight = obj;
                            this.boneInitialRotations.eyeballRight = obj.rotation.clone();
                        }
                        if (obj.name === 'head_eyeball_left_060') {
                            this.bones.eyeballLeft = obj;
                            this.boneInitialRotations.eyeballLeft = obj.rotation.clone();
                        }
                    }
                });

                this.guideCharModel.traverse((obj) => {
                    if (obj.isMesh && obj.material) {
                        obj.material.transparent = true;
                        obj.material.opacity = 0;
                    }
                });

                this.guideCharModel.matrixAutoUpdate = true;
                this.guideCharModel.visible = false;
                scene.add(this.guideCharModel);

                window.arUI.hideLoading();

                resolve(this);
            }, undefined, reject);
        });
    }
}