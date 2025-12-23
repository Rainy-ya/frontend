import * as THREE from 'three';

export class AnimationController {

    constructor(modelLoader) {

        this.modelLoader = modelLoader;
        this.model = modelLoader.guideCharModel;
        this.blinkTimer = 0;
        this.nextBlinkTime = 2.5 + Math.random() * 3.5;
        this.isBlinking = false;
        this.blinkPhase = 0;
        this.time = 0;
        this.enabled = true;
        this.breathingSpeed = 1.0; 
        this.breathingIntensity = 1.0; 
        this.targetHeadRotation = { y: 0, z: 0 };
        this.previousCameraPos = new THREE.Vector3();
        this.smoothedCameraPos = new THREE.Vector3();
        this.cameraMovementThreshold = 0.05; // Ignore tiny camera jitters
        this.isFirstHeadTrackingFrame = true;
        
        this.findBones();
        this.storeInitialPose();
    }


    updateHeadTracking(camera, smoothingFactor = 0.15) {

        const headBone = this.modelLoader.bones.head;

        if (!headBone) {
            console.log('Bone not initialized: HeadBone');
            return;
        }

        const headWorldPos = headBone.getWorldPosition(new THREE.Vector3());
        const cameraPos = camera.position.clone();
        const direction = new THREE.Vector3().subVectors(cameraPos, headWorldPos).normalize();

        const horizontalDist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        let yaw = Math.atan2(direction.x, direction.z);
        let pitch = Math.atan2(direction.y, horizontalDist);

        // Apply limits
        const maxYaw = Math.PI / 3;
        const maxPitch = Math.PI / 4;
        const minPitch = -Math.PI / 6;

        yaw = THREE.MathUtils.clamp(yaw, -maxYaw, maxYaw);
        pitch = THREE.MathUtils.clamp(pitch, minPitch, maxPitch);

        headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, yaw, smoothingFactor);
        headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, pitch, smoothingFactor);
        headBone.rotation.x = 0;
    }

    updateEyeTracking(camera){

        const eyeballLeft = this.modelLoader.bones.eyeballLeft;
        const eyeballRight = this.modelLoader.bones.eyeballRight;
        const eyeballLeftInitialRot = this.modelLoader.boneInitialRotations.eyeballLeft;
        const eyeballRightInitialRot = this.modelLoader.boneInitialRotations.eyeballRight;

        if (!eyeballLeft && !eyeballRight){
            console.log('Bones not initialized: Eyeballs');
            return;
        }
        
        const cameraPos = camera.position.clone();
        
        const leftEyeWorldPos = eyeballLeft.getWorldPosition(new THREE.Vector3());
        const leftDirection = new THREE.Vector3().subVectors(cameraPos, leftEyeWorldPos).normalize();
        
        const leftYaw = Math.atan2(leftDirection.x, leftDirection.z);
        const leftPitch = Math.atan2(leftDirection.y, 
            Math.sqrt(leftDirection.x * leftDirection.x + leftDirection.z * leftDirection.z)
        );
        
        const rightEyeWorldPos = eyeballRight.getWorldPosition(new THREE.Vector3());
        const rightDirection = new THREE.Vector3().subVectors(cameraPos, rightEyeWorldPos).normalize();
        
        const rightYaw = Math.atan2(rightDirection.x, rightDirection.z);
        const rightPitch = Math.atan2(rightDirection.y, 
            Math.sqrt(rightDirection.x * rightDirection.x + rightDirection.z * rightDirection.z)
        );
        
        const maxYaw = Math.PI / 24;
        const maxPitch = Math.PI / 24;
        
        const clampedLeftYaw = THREE.MathUtils.clamp(leftYaw, -maxYaw, maxYaw);
        const clampedLeftPitch = THREE.MathUtils.clamp(leftPitch, -maxPitch, maxPitch);
        
        const clampedRightYaw = THREE.MathUtils.clamp(rightYaw, -maxYaw, maxYaw);
        const clampedRightPitch = THREE.MathUtils.clamp(rightPitch, -maxPitch, maxPitch);
        
        const smoothness = 0.2;
        
        const targetLeftY = eyeballLeftInitialRot.y - clampedLeftYaw;  
        const targetLeftZ = eyeballLeftInitialRot.z - clampedLeftPitch; 
        
        const targetRightY = eyeballRightInitialRot.y - clampedRightYaw;   
        const targetRightZ = eyeballRightInitialRot.z - clampedRightPitch; 
        
        eyeballLeft.rotation.y = THREE.MathUtils.lerp(
            eyeballLeft.rotation.y, 
            targetLeftY, 
            smoothness
        );
        eyeballLeft.rotation.z = THREE.MathUtils.lerp(
            eyeballLeft.rotation.z, 
            targetLeftZ, 
            smoothness
        );
        
        eyeballRight.rotation.y = THREE.MathUtils.lerp(
            eyeballRight.rotation.y, 
            targetRightY, 
            smoothness
        );
        eyeballRight.rotation.z = THREE.MathUtils.lerp(
            eyeballRight.rotation.z, 
            targetRightZ, 
            smoothness
        );
    }

    updateJawAnimation(volume) {
        const jawBone = this.modelLoader.bones.jaw;
        if (!jawBone) return;

        const initialRotZ = this.modelLoader.boneInitialRotations.jaw;
        const maxJawOpen = initialRotZ + 0.75;
        const minJawOpen = initialRotZ;
        
        const jawRotation = THREE.MathUtils.lerp(minJawOpen, maxJawOpen, volume);
        jawBone.rotation.z = jawRotation;
    }

    resetJaw() {
        const jawBone = this.modelLoader.bones.jaw;
        if (!jawBone) return;

        const initialRotZ = this.modelLoader.boneInitialRotations.jaw;
        jawBone.rotation.z = THREE.MathUtils.lerp(jawBone.rotation.z, initialRotZ, 0.1);
    }

    updateBlinkAnimation(deltaTime) {

        const eyelidBone = this.modelLoader.bones.eyelid;
        if (!eyelidBone) return;

        this.blinkTimer += deltaTime;

        const openRotation = this.modelLoader.boneInitialRotations.eyelid;
        const closedRotation = -1.18;

        if (!this.isBlinking && this.blinkTimer >= this.nextBlinkTime) {
            this.isBlinking = true;
            this.blinkPhase = 1;
        }

        if (this.isBlinking) {
            const blinkSpeed = 0.4;

            if (this.blinkPhase === 1) {
                eyelidBone.rotation.z = THREE.MathUtils.lerp(
                    eyelidBone.rotation.z,
                    closedRotation,
                    blinkSpeed
                );

                if (Math.abs(eyelidBone.rotation.z - closedRotation) < 0.05) {
                    this.blinkPhase = 2;
                }
            } else if (this.blinkPhase === 2) {
                setTimeout(() => {
                    this.blinkPhase = 3;
                }, 50);
            } else if (this.blinkPhase === 3) {
                eyelidBone.rotation.z = THREE.MathUtils.lerp(
                    eyelidBone.rotation.z,
                    openRotation,
                    blinkSpeed
                );

                if (Math.abs(eyelidBone.rotation.z - openRotation) < 0.05) {
                    this.isBlinking = false;
                    this.blinkPhase = 0;
                    this.blinkTimer = 0;
                    this.nextBlinkTime = 2.5 + Math.random() * 3.5;
                }
            }
        } else {
            eyelidBone.rotation.z = THREE.MathUtils.lerp(
                eyelidBone.rotation.z,
                openRotation,
                0.2
            );
        }
    }

    findBones() {

        this.spineLower = this.findBone('spine_lower_050');
        this.spineMiddle = this.findBone('spine_middle_051');
        this.spineUpper = this.findBone('spine_upper_052');
        this.shoulderLeft = this.findBone('arm_left_shoulder_1_099');
        this.shoulderRight = this.findBone('arm_right_shoulder_1_0122');
        
        console.log('Breathing system bones:', {
            spineLower: !!this.spineLower,
            spineMiddle: !!this.spineMiddle,
            spineUpper: !!this.spineUpper,
            shoulderLeft: !!this.shoulderLeft,
            shoulderRight: !!this.shoulderRight
        });
    }
    
    storeInitialPose() {

        this.initialPose = {};
        
        const bones = [
            this.spineLower,
            this.spineMiddle,
            this.spineUpper,
            this.shoulderLeft,
            this.shoulderRight
        ];
        
        bones.forEach(bone => {
            if (bone) {
                this.initialPose[bone.name] = {
                    position: bone.position.clone(),
                    rotation: bone.rotation.clone(),
                    scale: bone.scale.clone()
                };
            }
        });
    }
    
    updateIdling(deltaTime) {

        if (!this.enabled) return;
        
        this.time += deltaTime * this.breathingSpeed;
        
        const breathCycle = Math.sin(this.time * Math.PI * 2);
        
        this.updateSpine(breathCycle);
        this.updateShoulders(breathCycle);
    }
    
    updateSpine(breathCycle) {

        if (this.spineMiddle && this.initialPose['spine_middle_051']) {
            const initial = this.initialPose['spine_middle_051'];
            
            const movement = breathCycle * 0.008 * this.breathingIntensity;
            this.spineMiddle.position.x = initial.position.x + movement;
            
            this.spineMiddle.position.y = initial.position.y + (breathCycle * 0.003 * this.breathingIntensity);
            
        }
        
        if (this.spineUpper && this.initialPose['spine_upper_052']) {
            const initial = this.initialPose['spine_upper_052'];
            
            const movement = breathCycle * 0.006 * this.breathingIntensity;
            this.spineUpper.position.x = initial.position.x + movement;
            this.spineUpper.position.y = initial.position.y + (breathCycle * 0.004 * this.breathingIntensity);

        }
        
        if (this.spineLower && this.initialPose['spine_lower_050']) {
            const initial = this.initialPose['spine_lower_050'];
            
            const movement = breathCycle * 0.002 * this.breathingIntensity;
            this.spineLower.position.y = initial.position.y + movement;
        }
    }
    
    updateShoulders(breathCycle) {

        if (this.shoulderLeft && this.initialPose['arm_left_shoulder_1_099']) {
            const initial = this.initialPose['arm_left_shoulder_1_099'];
            
            const rise = breathCycle * 0.005 * this.breathingIntensity;
            this.shoulderLeft.position.y = initial.position.y + rise;
            
            const forward = breathCycle * 0.003 * this.breathingIntensity;
            this.shoulderLeft.position.x = initial.position.x + forward;
        }
        
        if (this.shoulderRight && this.initialPose['arm_right_shoulder_1_0122']) {
            const initial = this.initialPose['arm_right_shoulder_1_0122'];
            
            const rise = breathCycle * 0.005 * this.breathingIntensity;
            this.shoulderRight.position.y = initial.position.y + rise;
            
            const forward = breathCycle * 0.003 * this.breathingIntensity;
            this.shoulderRight.position.x = initial.position.x + forward;
        }
    }
    
    findBone(boneName) {
        let foundBone = null;
        this.model.traverse((obj) => {
            if (obj.isBone && obj.name === boneName) {
                foundBone = obj;
            }
        });
        return foundBone;
    }
    
    setIntensity(value) {
        this.breathingIntensity = THREE.MathUtils.clamp(value, 0, 2);
        console.log(`Breathing intensity: ${this.breathingIntensity.toFixed(2)}`);
    }
    
    setSpeed(value) {
        this.breathingSpeed = THREE.MathUtils.clamp(value, 0.1, 3);
        console.log(`Breathing speed: ${this.breathingSpeed.toFixed(2)} breaths/sec`);
    }
    
    reset() {
        this.time = 0;
        
        for (const boneName in this.initialPose) {
            const bone = this.findBone(boneName);
            if (!bone) continue;
            
            const initial = this.initialPose[boneName];
            bone.position.copy(initial.position);
            bone.rotation.copy(initial.rotation);
            bone.scale.copy(initial.scale);
        }
    }
}