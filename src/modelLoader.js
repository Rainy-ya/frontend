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

                    if (obj.isObject3D && obj.name === "headphone") {
                        obj.visible = false;
                        console.log(`Headphone object found and hidden: ${obj.name}`);
                    }

                    if (obj.isObject3D && obj.name === "shil001") {
                        obj.visible = false;
                        console.log(`Shil object found and hidden: ${obj.name}`);
                    }
                    
                    //bone_44 - upper, bone_45 - lower heads
                    if (obj.isBone && obj.name === "bone_44") {
                        this.bones.head = obj;
                        this.boneInitialRotations.head = obj.rotation.clone();
                        console.log(`Head bone found: ${obj.name}`);
                    }

                    if (obj.isBone && obj.name === "bone_45009") {
                        this.bones.jaw = obj;
                        this.boneInitialRotations.jaw = obj.rotation.z;
                        console.log(`Jaw bone found: ${obj.name}`);
                    }

                    if (obj.isBone && obj.name === "bone_45025") {
                        this.bones.eyeballLeft = obj;
                        this.boneInitialRotations.eyeballLeft = obj.rotation.clone();
                        console.log(`Left eyeball bone found: ${obj.name}`);
                    }

                    if (obj.isBone && obj.name === "bone_45026") {
                        this.bones.eyeballRight = obj;
                        this.boneInitialRotations.eyeballRight = obj.rotation.clone();
                        console.log(`Right eyeball bone found: ${obj.name}`);
                    }
                    /*if (obj.isBone) {
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
                        if (obj.isBone &&  obj.name === 'pelvis_04') {
                            this.bones.pelvis = obj;
                        }
                        if (obj.name === 'leg_left_thigh_05') {
                            this.bones.leftThigh = obj;
                        }
                        if (obj.name === 'leg_right_thigh_09') {
                            this.bones.rightThigh = obj;
                        }
                    }*/

                    //bone_44 - upper, bone_45 - lower heads
                    if (obj.isBone && obj.name === "bone_45") {
                        this.bones.head = obj;
                        this.boneInitialRotations.head = obj.rotation.clone();
                        console.log(`Head bone found: ${obj.name}`);
                    }
                });

                this.guideCharModel.traverse((obj) => {
                    if (obj.isMesh && obj.material) {
                        obj.material.transparent = true;
                        obj.material.opacity = 0;
                    }
                }); //AR uncomment

                this.guideCharModel.wireframe = true;
                this.guideCharModel.matrixAutoUpdate = true;
                this.guideCharModel.visible = false; //AR - FALSE
                scene.add(this.guideCharModel);

                window.arUI.hideLoading(); 

                resolve(this);
            }, undefined, reject);
        });
    }
}