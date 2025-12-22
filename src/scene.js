import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

export async function createSnowfall() {
    const gltfLoader = new GLTFLoader();

    return new Promise((resolve, reject) => {
        gltfLoader.load(
            '/models/snowfall.glb',
            (gltf) => {
                const scene = gltf.scene;

                let snowMixer = null;
                scene.scale.set(0.25, 0.25, 0.25);

                if (gltf.animations && gltf.animations.length > 0) {
                    snowMixer = new THREE.AnimationMixer(scene);
                    gltf.animations.forEach((clip) => {
                        snowMixer.clipAction(clip).play();
                    });
                }

                resolve({ scene, snowMixer });
            },
            undefined,
            reject
        );
    });
}


export function createSnowyPlatform(){
        
    const gltfLoader = new GLTFLoader();

    return new Promise((resolve, reject) => {

        gltfLoader.load(
            '/models/stone_floor.glb',
            (gltf) => {
                
                const scene = gltf.scene;
                scene.scale.set(0.2, 0.2, 0.2);
                scene.position.set(0.1, -0.01, -0.1);

                resolve(gltf.scene);
            },
            undefined,
            reject
        );
    });
}

export function createXmasTree(){
        
    const gltfLoader = new GLTFLoader();

    return new Promise((resolve, reject) => {

        gltfLoader.load(
            '/models/xmas_tree.glb',
            (gltf) => {
                
                let treeMixer = null;

                const scene = gltf.scene;
                scene.scale.set(0.15, 0.15, 0.15);
                scene.position.set(0.1, 0, -0.1);

                if (gltf.animations && gltf.animations.length > 0) {
                    treeMixer = new THREE.AnimationMixer(scene);
                    gltf.animations.forEach((clip) => {
                        treeMixer.clipAction(clip).play();
                    });
                }

                resolve({ scene, treeMixer });
            },
            undefined,
            reject
        );
    });
}

export function createGifts(){
        
    const gltfLoader = new GLTFLoader();

    return new Promise((resolve, reject) => {

        gltfLoader.load(
            '/models/gifts.glb',
            (gltf) => {
                
                const scene = gltf.scene;
                scene.position.set(0.25, 0, -0.25);
                scene.scale.set(0.25, 0.25, 0.25);
                scene.rotation.y = Math.PI / 2;

                resolve(gltf.scene);
            },
            undefined,
            reject
        );
    });
}

