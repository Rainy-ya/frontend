import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/Addons.js';
import { onSelect, hitTest, createIndicator } from './hitTest.js';
import { HairPhysicsSystem } from './physicsSimulation.js';
//import { createGifts, createSnowfall, createSnowyPlatform, createXmasTree } from './scene.js';
import { ModelLoader } from './modelLoader.js';
import { AnimationController } from './animations.js';
import { AudioManager } from './audioManager.js';
import { SpeechRecognitionManager } from './speechRecognition.js';
import { ImageTrackingManager } from './imageTracking.js';
import { createPresetExpressions, FacialExpressionSystem } from './facialExpression.js';
import { Movements } from './movements.js';

// Global variables
let camera, scene, renderer, controller;
let session = null;
let mixers = [];
let hitTestSuccess = false;
let isImageTracked;
let hasFadedIn = false;

// Managers
let modelLoader;
let animationSystem;
let audioManager;
let speechManager;
let imageTracker;
let hairPhysics;
let expressionSystem;
let movementsSystem;

// Scene objects
let indicator;
let standingGround, xmasTreeModel, gifts, snowfallModel;

let clock = new THREE.Clock();

init();
animate();

async function init() {
    // Basic scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setAnimationLoop(render);
    renderer.xr.enabled = true;
    
    const container = document.querySelector("#scene-container");
    container.appendChild(renderer.domElement);

    indicator = createIndicator();
    scene.add(indicator);

    // Session setup
    renderer.xr.addEventListener('sessionstart', () => {
        session = renderer.xr.getSession();
        console.log('AR Session started.');
        window.arUI.hideLoading();
        window.arUI.startARSession();
    });

    renderer.xr.addEventListener('sessionend', () => {
        session = null;
        imageTracker.reset();
        console.log('AR Session ended.');
        //window.location.reload();
    });

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', () => {
        if (indicator.visible && !modelLoader.guideCharModel.visible)
            hitTestSuccess = true;
    });
    scene.add(controller);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    directional.castShadow = true;
    scene.add(directional);

    // Initialize managers
    imageTracker = new ImageTrackingManager();
    const markerImgBitmap = await imageTracker.loadMarkerImage('/resources/marker_img.png');

    // AR Button
    const button = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['image-tracking', 'dom-overlay'],
        trackedImages: [{ image: markerImgBitmap, widthInMeters: 0.2 }],
        domOverlay: { root: document.body }
    });

    button.style.display = 'none';
    button.id = 'three-ar-button';
    document.body.appendChild(button);

    // Load model
    modelLoader = new ModelLoader();
    await modelLoader.loadGuideCharacter(scene);

    window.arUI.modelReady();
    
    animationSystem = new AnimationController(modelLoader);
    animationSystem.setSpeed(0.3);
    animationSystem.setIntensity(0.4);

    // Setup hair physics
    //hairPhysics = new HairPhysicsSystem();
    //hairPhysics.addHairChainsFromModel(modelLoader.guideCharModel);
    //hairPhysics.addCollider('head_neck_upper_054', 0.075, new THREE.Vector3(0, 0.01, 0.005));
    //hairPhysics.addCollider('head_neck_lower_053', 0.025, new THREE.Vector3(0, 0, 0.005));
    //hairPhysics.addCollider('arm_left_shoulder_1_099', 0.055, new THREE.Vector3(0.015, -0.006, 0));
    //hairPhysics.addCollider('arm_right_shoulder_1_0122', 0.055, new THREE.Vector3(-0.015, -0.006, 0));
    //hairPhysics.addCollider('spine_upper_052', 0.125, new THREE.Vector3(0, -0.005, 0));

    //const { helpers, updateHelpers } = hairPhysics.visualizeColliders(scene);
    //window.updateHelpers = updateHelpers;

    expressionSystem = new FacialExpressionSystem(modelLoader.guideCharModel);
    createPresetExpressions(expressionSystem);

    movementsSystem = new Movements(modelLoader.guideCharModel);

    // Audio setup
    audioManager = new AudioManager();
    await audioManager.init();
    
    speechManager = new SpeechRecognitionManager(audioManager, expressionSystem, movementsSystem);

    // Scene objects
    /*standingGround = await createSnowyPlatform();
    standingGround.visible = false;
    scene.add(standingGround);

    const { scene: xmasTree, treeMixer } = await createXmasTree();
    xmasTreeModel = xmasTree;
    xmasTreeModel.visible = false;
    scene.add(xmasTreeModel);
    mixers.push(treeMixer);

    const { scene: snowfall, snowMixer } = await createSnowfall();
    snowfallModel = snowfall;
    snowfallModel.visible = false;
    scene.add(snowfallModel);
    mixers.push(snowMixer);

    gifts = await createGifts();
    gifts.visible = false;
    scene.add(gifts);*/

    window.addEventListener('resize', onWindowResize, false);
}

function render(timestamp, frame) {
    if (frame) {
        const results = frame.getImageTrackingResults();
        isImageTracked = false;

        if (results && results.length > 0) {
            for (const result of results) {
                if (result.trackingState === 'tracked') {
                    isImageTracked = true;
                    break;
                }
            }
        }

        if (isImageTracked) {
            // Image tracking mode
            indicator.visible = false;

            for (const result of results) {
                const referenceSpace = renderer.xr.getReferenceSpace();
                const pose = frame.getPose(result.imageSpace, referenceSpace);

                if (result.trackingState === 'tracked' && modelLoader.guideCharModel) {
                    imageTracker.updateModelPosition(modelLoader.guideCharModel, pose);
                    
                    if (!modelLoader.guideCharModel.visible) {
                        modelLoader.guideCharModel.visible = true;
                        
                        if (!hasFadedIn) {
                            hasFadedIn = true;
                            fadeInModel(modelLoader.guideCharModel, 1000);
                        }
                    }
                }
            }
        } else {

            if (hasFadedIn && !modelLoader.guideCharModel.visible) {
                hasFadedIn = false;
            }
            
            // Hit-test mode
            if (session && modelLoader.guideCharModel) {
                if (!modelLoader.guideCharModel.visible) {
                    hitTest(session, frame, indicator, renderer);
                    onSelect(indicator, modelLoader.guideCharModel, camera, scene);
                }
            }
        }

        // Update scene objects and animations
        if (modelLoader.guideCharModel && hitTestSuccess || isImageTracked) {

            /*standingGround.position.setFromMatrixPosition(indicator.matrix);
            xmasTreeModel.position.setFromMatrixPosition(indicator.matrix);
            snowfallModel.position.setFromMatrixPosition(indicator.matrix);
            gifts.position.setFromMatrixPosition(indicator.matrix);

            standingGround.visible = true;
            xmasTreeModel.visible = true;
            snowfallModel.visible = true;
            gifts.visible = true;*/

            // Update animations
            animationSystem.updateHeadTracking(camera, 0.15);
            animationSystem.updateEyeTracking(camera);

            if (audioManager.isSpeaking) {
                const volume = audioManager.getVolume();
                animationSystem.updateJawAnimation(volume);
            } else {
                animationSystem.resetJaw();
            }
        }

        renderer.render(scene, camera);
    }
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    
    // Update other mixers
    if (mixers) {
        mixers.forEach(mixer => mixer.update(delta));
    }

    // Update blink animation
    if (animationSystem) {
        animationSystem.updateBlinkAnimation(delta);
        animationSystem.updateIdling(delta);
    }

    // Update hair physics
    if (hairPhysics && modelLoader && modelLoader.bones.head && modelLoader.guideCharModel?.visible) {
        hairPhysics.update(delta, modelLoader.bones.head);

        if(window.updateHelpers)
            window.updateHelpers();
    }

    if (expressionSystem)
        expressionSystem.update(delta);

    if (movementsSystem)
        movementsSystem.update(delta);

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function fadeInModel(model, duration) {
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        model.traverse((obj) => {
            if (obj.isMesh && obj.material) {
                obj.material.opacity = progress;
            }
        });
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Export for use in HTML
window.ask = () => speechManager.ask();
window.renderer = renderer;