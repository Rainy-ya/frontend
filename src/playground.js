import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
//import { hitTest, createIndicator, onSelect} from './hit-test-main.js';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { HairPhysicsSystem } from './physicsSimulation.js';
import { createGifts, createSnowfall, createSnowyPlatform, createXmasTree } from './scene.js';
import { createPresetExpressions, FacialExpressionSystem } from './facialExpression.js';
import { Movements } from './movements.js';
import { AnimationController } from './animations.js';
import { ModelLoader } from './modelLoader.js';

// Global variables
let camera, scene, renderer;
let controller;

let expressionSystem;
let movementsSystem;
let animationSystem;
let modelLoader;

// Model Glabal variables
let guideCharModel;
let guideCharHeadBone;
let guideCharJawBone;
let guideCharJawBoneFisrtRotZ;
let guideCharEyelidBone;
let guideCharEyelidBoneFirztRotZ;
let guideCharEyeballBoneRight;
let guideCharEyeballBoneLeftFirstRotZ;
let guideCharEyeballBoneLeft;
let guideCharEyeballBoneRightPos;
let eyeTrackingEnabled = true;
let guideCharEyeballBoneLeftInitialRot;
let guideCharEyeballBoneRightInitialRot;
let guideCharEyebrowBone;
let guideCharShoulderLeft;
let guideCharShoulderRight;
let spineUpper;
let spineLower;
let spineMiddle;

// Smoothing variables
let smoothedPosition = new THREE.Vector3();
let smoothedQuaternion = new THREE.Quaternion();
let smoothingFactor = 0.1;
let isFirstFrame = true;

//Audio variables
let audioBuffer;
let audioCtx;
let analyser;
let audioData;

//Controls variables
let orbitControls;

//Blink animation variables
let blinkTimer = 0;
let nextBlinkTime = 2.5 + Math.random() * 3.5;
let isBlinking = false;
let blinkPhase = 0;

//Physics related variables
let hairPhysics;

let isSpeaking = false;
let lastAudioCheckTime = 0;

let clock = new THREE.Clock();
let mixers = [];

let aiResponseText = ' ';

init();
animate();

async function init() {
    //Basic scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    camera.position.set(0, 1.5, 1.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setAnimationLoop(render);
    const container = document.querySelector("#scene-container");
    container.appendChild(renderer.domElement);

    //Controls setup
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.target.set(0, 1, 0);
    orbitControls.update();

    // lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    scene.add(directional);

    //THREE.Cache.clear();
    // Guide Character Model
    modelLoader = new ModelLoader();
    await modelLoader.loadGuideCharacter(scene);

        /*let bones = [];
        guideCharModel.traverse((object) => {
            if (object.isSkinnedMesh && object.skeleton) {
                object.skeleton.bones.forEach((bone, index) => {
                    console.log(`${index}: Bone name: ${bone.name}`);
                    bones.push(bone);
                });
            }
        });
        console.log(`Total bones in guide character: ${bones.length}`);*/

    hairPhysics = new HairPhysicsSystem();
    hairPhysics.addHairChainsFromModel(modelLoader.guideCharModel);

    hairPhysics.addCollider('head_neck_upper_054', 0.07, new THREE.Vector3(0, 0.05, 0));
    hairPhysics.addCollider('arm_left_shoulder_1_099', 0.08, new THREE.Vector3(0.075, -0.03, 0));
    hairPhysics.addCollider('arm_right_shoulder_1_0122', 0.08, new THREE.Vector3(-0.075, -0.03, 0));
    hairPhysics.addCollider('spine_upper_052', 0.16, new THREE.Vector3(0, -0.025, 0));
    hairPhysics.addCollider('head_neck_lower_053', 0.04, new THREE.Vector3(0, 0, 0));

    expressionSystem = new FacialExpressionSystem(modelLoader.guideCharModel);
    createPresetExpressions(expressionSystem);

    movementsSystem = new Movements(modelLoader.guideCharModel);

    animationSystem = new AnimationController(modelLoader);
    animationSystem.setSpeed(0.3);
    animationSystem.setIntensity(0.4);

    // Scene setup
    /*const standingGround = await createSnowyPlatform();
    scene.add(standingGround);

    const { scene: xmasTree, treeMixer} = await createXmasTree();
    scene.add(xmasTree);
    mixers.push(treeMixer);

    const { scene: snowfall, snowMixer} = await createSnowfall();
    scene.add(snowfall);
    mixers.push(snowMixer);

    const gifts = await createGifts();
    scene.add(gifts);*/
    
    // audio
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    audioData = new Uint8Array(analyser.frequencyBinCount);

    window.addEventListener('resize', onWindowResize, false);
}

function render(timestamp, frame) {

    if (guideCharHeadBone) {

        const headWorldPos = guideCharHeadBone.getWorldPosition(new THREE.Vector3());

        orbitControls.target.lerp(headWorldPos, 0.1);
        orbitControls.update();

        const cameraPos = camera.position.clone();
        const direction = new THREE.Vector3().subVectors(cameraPos, headWorldPos).normalize();
        
        const horizontalDist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        let yaw = Math.atan2(direction.x, direction.z);        // Left/right
        let pitch = Math.atan2(direction.y, horizontalDist);  // Up/down
        
        // Apply limits
        const maxYaw = Math.PI / 2;      // 60 degrees left/right
        const maxPitch = Math.PI / 4;    // 45 degrees up
        const minPitch = -Math.PI / 6;   // 30 degrees down
        
        yaw = THREE.MathUtils.clamp(yaw, -maxYaw, maxYaw);
        pitch = THREE.MathUtils.clamp(pitch, minPitch, maxPitch);
        
        const targetY = yaw;
        const targetZ = pitch;
        
        guideCharHeadBone.rotation.y = THREE.MathUtils.lerp(guideCharHeadBone.rotation.y, targetY, 0.15);
        guideCharHeadBone.rotation.z = THREE.MathUtils.lerp(guideCharHeadBone.rotation.z, targetZ, 0.15);
        guideCharHeadBone.rotation.x = 0; 

    }

    if (guideCharEyeballBoneLeft && guideCharEyeballBoneRight && guideCharEyeballBoneLeftInitialRot && guideCharEyeballBoneRightInitialRot){

    const cameraPos = camera.position.clone();
    
    // LEFT EYE
    const leftEyeWorldPos = guideCharEyeballBoneLeft.getWorldPosition(new THREE.Vector3());
    const leftDirection = new THREE.Vector3().subVectors(cameraPos, leftEyeWorldPos).normalize();
    
    const leftYaw = Math.atan2(leftDirection.x, leftDirection.z);
    const leftPitch = Math.atan2(leftDirection.y, 
        Math.sqrt(leftDirection.x * leftDirection.x + leftDirection.z * leftDirection.z)
    );
    
    // RIGHT EYE
    const rightEyeWorldPos = guideCharEyeballBoneRight.getWorldPosition(new THREE.Vector3());
    const rightDirection = new THREE.Vector3().subVectors(cameraPos, rightEyeWorldPos).normalize();
    
    const rightYaw = Math.atan2(rightDirection.x, rightDirection.z);
    const rightPitch = Math.atan2(rightDirection.y, 
        Math.sqrt(rightDirection.x * rightDirection.x + rightDirection.z * rightDirection.z)
    );
    
    // Limit eye movement range
    const maxYaw = Math.PI / 24;
    const maxPitch = Math.PI / 24;
    
    const clampedLeftYaw = THREE.MathUtils.clamp(leftYaw, -maxYaw, maxYaw);
    const clampedLeftPitch = THREE.MathUtils.clamp(leftPitch, -maxPitch, maxPitch);
    
    const clampedRightYaw = THREE.MathUtils.clamp(rightYaw, -maxYaw, maxYaw);
    const clampedRightPitch = THREE.MathUtils.clamp(rightPitch, -maxPitch, maxPitch);
    
    const smoothness = 0.2;
    
    // FIXED: Y is left/right, Z is up/down, and reverse the direction
    const targetLeftY = guideCharEyeballBoneLeftInitialRot.y - clampedLeftYaw;   // Reversed
    const targetLeftZ = guideCharEyeballBoneLeftInitialRot.z - clampedLeftPitch; // Z for up/down
    
    const targetRightY = guideCharEyeballBoneRightInitialRot.y - clampedRightYaw;   // Reversed
    const targetRightZ = guideCharEyeballBoneRightInitialRot.z - clampedRightPitch; // Z for up/down
    
    guideCharEyeballBoneLeft.rotation.y = THREE.MathUtils.lerp(
        guideCharEyeballBoneLeft.rotation.y, 
        targetLeftY, 
        smoothness
    );
    guideCharEyeballBoneLeft.rotation.z = THREE.MathUtils.lerp(
        guideCharEyeballBoneLeft.rotation.z, 
        targetLeftZ, 
        smoothness
    );
    
    guideCharEyeballBoneRight.rotation.y = THREE.MathUtils.lerp(
        guideCharEyeballBoneRight.rotation.y, 
        targetRightY, 
        smoothness
    );
    guideCharEyeballBoneRight.rotation.z = THREE.MathUtils.lerp(
        guideCharEyeballBoneRight.rotation.z, 
        targetRightZ, 
        smoothness
    );
}

    if (isSpeaking) 
        updateJawAnimation();
    else if (guideCharJawBone) {
        //console.log(guideCharJawBoneFisrtRotZ);
        guideCharJawBone.rotation.z = THREE.MathUtils.lerp(guideCharJawBone.rotation.z, guideCharJawBoneFisrtRotZ, 0.1);
            //guideCharJawBone.rotation.z += 0.2;
    }

    renderer.render(scene, camera);
}

function animate() {

    requestAnimationFrame(animate);

    let delta = clock.getDelta();
    if (mixers)
        mixers.forEach(mixer => mixer.update(delta));

    if (hairPhysics && guideCharHeadBone && guideCharModel && guideCharModel.visible) {
        hairPhysics.update(delta, guideCharHeadBone);

        if (window.updateBoneMarkers){
            window.updateBoneMarkers();
        }
    }

    updateBlinkAnimation(delta);

    if (expressionSystem)
        expressionSystem.update(delta);

    if (movementsSystem)
        movementsSystem.update(delta);

    if (animationSystem)
        animationSystem.updateIdling(delta);
}
    

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadFBXAnimation() {
    const fbxLoader = new FBXLoader();
    
    fbxLoader.load("/animations/standing_greeting.fbx", (fbx) => {

        if (!fbx.animations || fbx.animations.length === 0) {
            console.error('No animations found in FBX');
            return;
        }

        const clip = fbx.animations[0];
        console.log('Original animation loaded:', clip.name);

        const boneNameMap = {
            'root': '_rootJoint',
            'root_ground': 'root_ground_02',
            'root_hips': 'root_hips_03',
            'pelvis': 'pelvis_04',
            'leg_left_thigh': 'leg_left_thigh_05',
            'leg_left_knee': 'leg_left_knee_06',
            'leg_left_ankle': 'leg_left_ankle_07',
            'leg_left_toes': 'leg_left_toes_08',
            'leg_right_thigh': 'leg_right_thigh_09',
            'leg_right_knee': 'leg_right_knee_010',
            'leg_right_ankle': 'leg_right_ankle_011',
            'leg_right_toes': 'leg_right_toes_012',
            'spine_lower': 'spine_lower_050',
            'spine_middle': 'spine_middle_051',
            'spine_upper': 'spine_upper_052',
            'head_neck_lower': 'head_neck_lower_053',
            'head_neck_upper': 'head_neck_upper_054',
            'arm_left_shoulder_1': 'arm_left_shoulder_1_099',
            'arm_left_shoulder_2': 'arm_left_shoulder_2_0100',
            'arm_left_elbow': 'arm_left_elbow_0101',
            'arm_left_wrist': 'arm_left_wrist_0102',
            'arm_right_shoulder_1': 'arm_right_shoulder_1_0122',
            'arm_right_shoulder_2': 'arm_right_shoulder_2_0123',
            'arm_right_elbow': 'arm_right_elbow_0124',
            'arm_right_wrist': 'arm_right_wrist_0125',
            'head_jaw': 'head_jaw_098'
        };

        const newClip = clip.clone();
        
        const filteredTracks = [];
        
        newClip.tracks.forEach(track => {
            const parts = track.name.split('.');
            const boneName = parts[0];
            const property = parts.slice(1).join('.');
            
            if ((boneName === 'root' || boneName === 'root_ground') && property === 'position') {
                console.log(`Skipping root position track: ${track.name}`);
                return; // Don't add this track
            }

            /*if (boneName === 'root') {
                console.log(`Skipping root quaternion track: ${track.name}`);
                return; // Don't add this track
            }*/

            if (boneName === 'head_neck_upper') {
                console.log(`Skipping head bone track: ${track.name}`);
                return; // Don't add this track
            }
            
            if (boneNameMap[boneName]) {
                track.name = boneNameMap[boneName] + '.' + property;
                filteredTracks.push(track);
            } else {
                console.warn(`No mapping found for bone: ${boneName}`);
            }
        });
        
        const finalClip = new THREE.AnimationClip(newClip.name, newClip.duration, filteredTracks);

        try {
            const action = mixers.clipAction(finalClip);
            action.play();
            console.log('✅ Animation playing (root movement removed)');
        } catch (error) {
            console.error('Error playing animation:', error);
        }

    }, undefined, (error) => {
        console.error('Error loading FBX:', error);
    });
}

export async function ask() {

    console.log('Starting speech recognition...');

    return new Promise((resolve, reject) => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'mn-MN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();

        recognition.onresult = async (event) => {
            try {
                const transcript = event.results[0][0].transcript;

                if (!transcript || transcript.trim() === '') {
                    console.log('User said nothing. Responding with default message.');
                    
                    await loadAudioFromURL('/sounds/greeting_Rose.mp3');
                    playAudio();
                    
                    resolve({ answer: 'Default response', audio: null });
                    return;
                }
                
                console.log('User said:', transcript);

                const response = await fetch('http://localhost:3000/ask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ question: transcript })
                });

                const data = await response.json();
                aiResponseText = data.answer;
                console.log('Response: ', aiResponseText);

                parseAndTriggerActions(aiResponseText);

                await loadAudioFromBase64(data.audio);
                playAudio();
                
                resolve(data);
            } catch (error) {
                console.error('Error processing question:', error);
                reject(error);
            }
        };

        recognition.onerror = async (event) => {

            console.error('Speech recognition error:', event.error);
            reject(event.error);

            if (event.error === 'no-speech') {
                console.log('No speech detected. Playing default audio.');
                
                try {
                    await loadAudioFromURL('/sounds/greeting_Rose.mp3');
                    playAudio();
                    resolve({ answer: 'No speech detected', audio: null });
                } catch (audioError) {
                    console.error('Error playing default audio:', audioError);
                    reject(audioError);
                }
            } else {
                // For other errors, reject the promise
                reject(event.error);
            }
        };
    });
}

function parseAndTriggerActions(text) {
    if (!text) return;
    
    // Trigger expressions
    if (text.includes('[giggles]') || text.includes('[laughs]')) {
        expressionSystem?.transitionToExpression('smile', 0.2, 3);
    }
    if (text.includes('[sad]')) {
        expressionSystem?.transitionToExpression('sad', 0.2, 3);
    }
    if (text.includes('[angry]')) {
        expressionSystem?.transitionToExpression('angry', 0.3, 3);
    }
    
    // Trigger head movements
    if (text.includes('[nod]')) {
        movementsSystem?.nod();
    }
    if (text.includes('[shake]')) {
        movementsSystem?.shake();
    }
}

async function loadAudioFromBase64(base64Audio) {
    try {

        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        audioBuffer = await audioCtx.decodeAudioData(bytes.buffer);
        console.log('Audio loaded successfully');
    } catch (error) {
        console.error('Error loading audio:', error);
    }
}

async function loadAudioFromURL(url) {
    try {

        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        console.log('Audio loaded from URL successfully');

    } catch (error) {
        console.error('Error loading audio from URL:', error);
    }
}

function playAudio(audioSource) {

    if (!audioBuffer) {
        console.error('No audio buffer loaded');
        return;
    }

    isSpeaking = true;

    if (audioSource) {
        audioSource.stop();
    }

    audioSource = audioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;

    audioSource.connect(analyser);
    analyser.connect(audioCtx.destination);

    audioSource.onended = () => {
        isSpeaking = false;
        console.log('Audio playback ended');
    };

    audioSource.start(0);
    console.log('Audio playback started');
}


function getVolume() {

    if (!analyser || !audioData) return 0;

    analyser.getByteFrequencyData(audioData);

    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i];
    }
    return sum / audioData.length / 256;
}

function updateJawAnimation() {

    if (!guideCharJawBone || !analyser) return;

    const volume = getVolume();

    const maxJawOpen = guideCharJawBoneFisrtRotZ + 0.75; // Adjust
    const minJawOpen = guideCharJawBoneFisrtRotZ; // is around -1.12...
    const jawRotation = THREE.MathUtils.lerp(
        minJawOpen,
        maxJawOpen,
        volume
    );
    //console.log('Volume: ', volume.toFixed(3), '| Jaw rot.z: ', jawRotation.toFixed(3));

    guideCharJawBone.rotation.z = jawRotation;
}

function updateBlinkAnimation(deltaTime) {

    if (!guideCharEyelidBone) return;

    blinkTimer += deltaTime;

    const openRotation = guideCharEyelidBoneFirztRotZ;  // -2.08 (open)
    const closedRotation = -1.18;                                       // -1.18 (closed)

    if (!isBlinking && blinkTimer >= nextBlinkTime) {
        isBlinking = true;
        blinkPhase = 1;
    }

    if (isBlinking) {
        const blinkSpeed = 0.4; // Higher = faster blink

        if (blinkPhase === 1) {

            guideCharEyelidBone.rotation.z = THREE.MathUtils.lerp(
                guideCharEyelidBone.rotation.z,
                closedRotation,
                blinkSpeed
            );

            if (Math.abs(guideCharEyelidBone.rotation.z - closedRotation) < 0.05) {
                blinkPhase = 2;
            }
        } 
        else if (blinkPhase === 2) {

            setTimeout(() => {
                blinkPhase = 3;
            }, 50); 
        }
        else if (blinkPhase === 3) {

            guideCharEyelidBone.rotation.z = THREE.MathUtils.lerp(
                guideCharEyelidBone.rotation.z,
                openRotation,
                blinkSpeed
            );

            if (Math.abs(guideCharEyelidBone.rotation.z - openRotation) < 0.05) {
                isBlinking = false;
                blinkPhase = 0;
                blinkTimer = 0;
                nextBlinkTime = 2.5 + Math.random() * 3.5; // Random interval
            }
        }
    } else {

        guideCharEyelidBone.rotation.z = THREE.MathUtils.lerp(
            guideCharEyelidBone.rotation.z,
            openRotation,
            0.2
        );
    }

    //console.log('Eyelid Z:', guideCharEyelidBone.rotation.z.toFixed(3));
}

window.ask = ask;
window.smile = () => expressionSystem.transitionToExpression('smile', 0.2, 3);
window.frown = () => expressionSystem.transitionToExpression('sad', 0.5, 3);
window.angry = () => expressionSystem.transitionToExpression('angry', 0.5, 3);
window.neutral = () => expressionSystem.resetToNeutral();

window.nod = () => movementsSystem.nod();      // 2 nods at speed 5
window.shake = () => movementsSystem.shake();   // 3 shakes at speed 4
window.stopGesture = () => movementsSystem.stopGesture();
