import * as THREE from 'three';

export class Movements{
    
    constructor(model) {
        
        this.isNodding = false;
        this.isShaking = false;
        this.isReturningToNeutral = false;
        this.gestureProgress = 0;
        this.gestureSpeed = 5;
        this.gestureCycles = 2;
        this.currentCycle = 0;
        this.headBone = null;
        this.headNeutralRotation = null;
        this.headTargetRotation = { x: 0, y: 0, z: 0 }; 
        this.gestureSmoothness = 0.15; 
        this.model = model;
        
        this.findHeadBone();
    }

    findHeadBone() {
        this.model.traverse((obj) => {
            if (obj.isBone && obj.name === 'head_neck_upper_054') {
                this.headBone = obj;
                this.headNeutralRotation = {
                    x: obj.rotation.x,
                    y: obj.rotation.y,
                    z: obj.rotation.z
                };
            }
        });
    }

    nod(cycles = 1, speed = 2) {

        if (!this.headBone) {
            console.log('Head bone not found');
            return;
        }
        
        // Store current rotation as "neutral" so we return to head tracking position
        this.headNeutralRotation = {
            x: this.headBone.rotation.x,
            y: this.headBone.rotation.y,
            z: this.headBone.rotation.z
        };
        
        this.isNodding = true;
        this.isShaking = false;
        this.isReturningToNeutral = false;
        this.gestureProgress = 0;
        this.gestureSpeed = speed;
        this.gestureCycles = cycles;
        this.currentCycle = 0;
        
    }

    shake(cycles = 1, speed = 2) {

        if (!this.headBone) {
            console.log('Head bone not found');
            return;
        }
        
        // Store current rotation as "neutral" so we return to head tracking position
        this.headNeutralRotation = {
            x: this.headBone.rotation.x,
            y: this.headBone.rotation.y,
            z: this.headBone.rotation.z
        };
        
        this.isShaking = true;
        this.isNodding = false;
        this.isReturningToNeutral = false;
        this.gestureProgress = 0;
        this.gestureSpeed = speed;
        this.gestureCycles = cycles;
        this.currentCycle = 0;
        
    }

    update(deltaTime) {

        if (!this.headBone || !this.headNeutralRotation) return;
    
        if (this.isNodding) {

            this.gestureProgress += deltaTime * this.gestureSpeed;
            
            const angle = Math.sin(this.gestureProgress * Math.PI * 2) * 0.3;
            this.headTargetRotation.z = this.headNeutralRotation.x + angle;
            this.headTargetRotation.y = this.headNeutralRotation.y;

            this.headBone.rotation.z = THREE.MathUtils.lerp(
                this.headBone.rotation.z,
                this.headTargetRotation.z,
                this.gestureSmoothness
            );
            this.headBone.rotation.y = THREE.MathUtils.lerp(
                this.headBone.rotation.y,
                this.headTargetRotation.y,
                this.gestureSmoothness
            );
            
            if (this.gestureProgress >= 1) {
                this.currentCycle++;
                this.gestureProgress = 0;
                
                if (this.currentCycle >= this.gestureCycles) {
                    this.isNodding = false;
                    this.isReturningToNeutral = true; // Start returning
                    this.headTargetRotation.z = this.headNeutralRotation.z;
                }
            }
        }
    
        if (this.isShaking) {

            this.gestureProgress += deltaTime * this.gestureSpeed;
            
            const angle = Math.sin(this.gestureProgress * Math.PI * 2) * 0.4;
            this.headTargetRotation.z = this.headNeutralRotation.z;
            this.headTargetRotation.y = this.headNeutralRotation.y + angle;
            
            this.headBone.rotation.x = THREE.MathUtils.lerp(
                this.headBone.rotation.z,
                this.headTargetRotation.z,
                this.gestureSmoothness
            );
            this.headBone.rotation.y = THREE.MathUtils.lerp(
                this.headBone.rotation.y,
                this.headTargetRotation.y,
                this.gestureSmoothness
            );
        
            if (this.gestureProgress >= 1) {
                this.currentCycle++;
                this.gestureProgress = 0;
                
                if (this.currentCycle >= this.gestureCycles) {
                    this.isShaking = false;
                    this.isReturningToNeutral = true; // Start returning
                    this.headTargetRotation.y = this.headNeutralRotation.y;
                }
            }
        }
    
        // ONLY return to neutral if just finished a gesture
        if (this.isReturningToNeutral) {
            this.headBone.rotation.z = THREE.MathUtils.lerp(
                this.headBone.rotation.z,
                this.headNeutralRotation.z,
                this.gestureSmoothness
            );
            this.headBone.rotation.y = THREE.MathUtils.lerp(
                this.headBone.rotation.y,
                this.headNeutralRotation.y,
                this.gestureSmoothness
            );
            
            // Check if close enough to neutral
            const rotDiff = Math.abs(this.headBone.rotation.z - this.headNeutralRotation.z) +
                           Math.abs(this.headBone.rotation.y - this.headNeutralRotation.y);
            
            if (rotDiff < 0.01) {
                this.isReturningToNeutral = false; // Done returning, head tracking can take over
            }
        }
    }

    stopGesture() {

        this.isNodding = false;
        this.isShaking = false;
        this.isReturningToNeutral = false; // Stop returning too
        this.currentCycle = 0;
        this.gestureProgress = 0;

        if (this.headBone && this.headNeutralRotation) {
            this.headTargetRotation.z = this.headNeutralRotation.z;
            this.headTargetRotation.y = this.headNeutralRotation.y;
        }
    }

    setSmoothness(value) {

        this.gestureSmoothness = THREE.MathUtils.clamp(value, 0.01, 1.0);

    }
}