import * as THREE from 'three';

 export class FacialExpressionSystem {

    constructor(model) {
        
        this.model = model;
        this.expressions = {};
        this.currentExpression = null;
        this.neutralPose = {};
        this.isTransitioning = false;
        this.isHolding = false;
        this.transitionProgress = 0;
        this.transitionSpeed = 0.1;
        this.holdDuration = null;
        this.holdTimer = 0;
        this.isReturningToNeutral = false;
        
        this.storeNeutralPose();
    }

    storeNeutralPose() {
        this.model.traverse((obj) => {
            if (obj.isBone) {

                if (obj.name.includes('lid') ||
                    obj.name.includes('brow') ||
                    obj.name.includes('mouth')) {
                    
                    this.neutralPose[obj.name] = {
                        rotation: obj.rotation.clone(),
                        position: obj.position.clone(),
                        scale: obj.scale.clone()
                    };
                }
            }
        });
    }
    
    defineExpression(name, boneTransforms) {
        this.expressions[name] = boneTransforms;
    }
    
    applyExpression(name, blend = 1.0) {

        if (!this.expressions[name]) {
            console.log('Expression not found: ', name);
            return;
        }
        
        const expression = this.expressions[name];
        
        for (const boneName in expression) {
            const bone = this.findBone(boneName);
            if (!bone) continue;
            
            const transform = expression[boneName];
            const neutral = this.neutralPose[boneName];
            
            if (!neutral) continue;
            
            if (transform.rotation) {
                bone.rotation.x = THREE.MathUtils.lerp(
                    neutral.rotation.x,
                    neutral.rotation.x + transform.rotation.x,
                    blend
                );
                bone.rotation.y = THREE.MathUtils.lerp(
                    neutral.rotation.y,
                    neutral.rotation.y + transform.rotation.y,
                    blend
                );
                bone.rotation.z = THREE.MathUtils.lerp(
                    neutral.rotation.z,
                    neutral.rotation.z + transform.rotation.z,
                    blend
                );
            }
            
            if (transform.position) {
                bone.position.x = THREE.MathUtils.lerp(
                    neutral.position.x,
                    neutral.position.x + transform.position.x,
                    blend
                );
                bone.position.y = THREE.MathUtils.lerp(
                    neutral.position.y,
                    neutral.position.y + transform.position.y,
                    blend
                );
                bone.position.z = THREE.MathUtils.lerp(
                    neutral.position.z,
                    neutral.position.z + transform.position.z,
                    blend
                );
            }
        }
        
        this.currentExpression = name;
    }
    
    transitionToExpression(name, transitionDuration = 0.5, holdDuration = null) {

        if (!this.expressions[name]) {
            console.log('Expression not found: ', name);
            return;
        }
        
        this.targetExpression = name;
        this.isTransitioning = true;
        this.transitionProgress = 0;
        this.transitionSpeed = 1 / (transitionDuration * 60); // 60fps
        this.holdDuration = holdDuration; 
        this.holdTimer = 0;
    }
    
    resetToNeutral(smooth = true) {

        this.isTransitioning = false;
        this.isHolding = false;
        this.targetExpression = null;
        
        if (smooth) {

            this.isReturningToNeutral = true;

        } else {

            this.isReturningToNeutral = false;
            this.transitionProgress = 0;
            this.currentExpression = null;
            
            for (const boneName in this.neutralPose) {
                const bone = this.findBone(boneName);
                if (!bone) continue;
                
                const neutral = this.neutralPose[boneName];
                bone.rotation.copy(neutral.rotation);
                bone.position.copy(neutral.position);
            }
        }
    }
    
    update(deltaTime) {

        if (this.isReturningToNeutral) {
            this.transitionProgress -= this.transitionSpeed * 1; 
            
            if (this.transitionProgress <= 0) {
                this.transitionProgress = 0;
                this.isReturningToNeutral = false;
                
                for (const boneName in this.neutralPose) {
                    const bone = this.findBone(boneName);
                    if (!bone) continue;
                    
                    const neutral = this.neutralPose[boneName];
                    bone.rotation.copy(neutral.rotation);
                    bone.position.copy(neutral.position);
                }

                return;
            }
            
            if (this.currentExpression && this.expressions[this.currentExpression]) {
                this.applyExpression(this.currentExpression, this.transitionProgress);
            }
            return;
        }
            
        if (this.isTransitioning && this.targetExpression) {
            this.transitionProgress += this.transitionSpeed;
            
            if (this.transitionProgress >= 1) {
                this.transitionProgress = 1;
                this.isTransitioning = false;
                
                if (this.holdDuration !== null) {
                    this.isHolding = true;
                    this.holdTimer = 0;
                }
            }
            
            this.applyExpression(this.targetExpression, this.transitionProgress);
        }
        
        if (this.isHolding && this.holdDuration !== null) {
            this.holdTimer += deltaTime;
            
            if (this.holdTimer >= this.holdDuration) {
                this.isHolding = false;
                this.resetToNeutral(true);
            }
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
}

export function createPresetExpressions(expressionSystem) {
    
    // Smile
    expressionSystem.defineExpression('smile', {
        'head_eyelid_upper_061': {
            rotation: { x: 0, y: 0, z: 0.8}
        },
        'head_eyebrow_062': {
            position: { x: 0, y: 0.02, z: 0}
        }
    });
    
    // Surprised
    expressionSystem.defineExpression('surprised', {
        'head_eyelid_upper_061': {
            rotation: { x: 0, y: 0, z: -0.05 } 
        },
        'head_eyebrow_062': {
            position: { x: 0, y: 0.02, z: 0 }
        }
    });
    
    // Angry
    expressionSystem.defineExpression('angry', {
        'head_eyelid_upper_061': {
            rotation: { x: 0, y: 0, z: 0.2 } 
        },
        'head_eyebrow_062': {
            position: { x: 0, y: -0.01, z: 0 }
        }
    });
}

export default FacialExpressionSystem;