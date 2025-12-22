import * as THREE from 'three';

export class SphereCollider {
    
    constructor(bone, radius, offset = new THREE.Vector3()) {
        this.bone = bone;
        this.radius = radius;
        this.offset = offset;
        this.position = new THREE.Vector3();
    }
    
    update() {

        this.position.copy(this.bone.getWorldPosition(new THREE.Vector3()));
        this.position.add(this.offset);
    }
}

export class HairBoneChain {
    constructor(bones, stiffness = 0.15, damping = 0.85) {
        this.bones = bones;
        this.stiffness = stiffness;
        this.damping = damping;
        
        this.restRotations = bones.map(bone => bone.rotation.clone());
        
        this.velocities = bones.map(() => new THREE.Euler(0, 0, 0));
        this.targetRotations = bones.map(bone => bone.rotation.clone());
    }
    
    update(deltaTime, gravity, wind, headMovement, colliders) {
        const dt = Math.min(deltaTime, 0.016);

        for (let i = 1; i < this.bones.length; i++) {

            const bone = this.bones[i];
            const force = new THREE.Euler(0, 0, 0);

            force.z -= gravity.y * dt * 0.3;

            if (wind) {
                force.x += wind.x * dt * 0.5;
                force.y += wind.y * dt * 0.3;
                force.z += wind.z * dt * 0.5;
            }

            if (headMovement && i < 4) {
                force.x -= headMovement.x * 0.8;
                force.y -= headMovement.y * 0.8;
                force.z -= headMovement.z * 0.8;
            }

            if (colliders && colliders.length > 0) {
                const hairWorldPos = bone.getWorldPosition(new THREE.Vector3());
                
                for (const collider of colliders) {
                    const dist = hairWorldPos.distanceTo(collider.position);
                    
                    if (dist < collider.radius) {

                        const pushDir = new THREE.Vector3()
                            .subVectors(hairWorldPos, collider.position)
                            .normalize();
                        
                        const penetration = collider.radius - dist;
                        const pushStrength = penetration / collider.radius;

                        force.z += pushDir.z * pushStrength * 10.0; 
                        force.x += pushDir.x * pushStrength * 10.0;
                        force.y += pushDir.y * pushStrength * 5.0;  
                    }
                }
            }
            
            this.velocities[i].x += force.x;
            this.velocities[i].y += force.y;
            this.velocities[i].z += force.z;
            
            this.velocities[i].x *= this.damping;
            this.velocities[i].y *= this.damping;
            this.velocities[i].z *= this.damping;
            
            const offsetX = this.targetRotations[i].x - this.restRotations[i].x;
            const offsetY = this.targetRotations[i].y - this.restRotations[i].y;
            const offsetZ = this.targetRotations[i].z - this.restRotations[i].z;
            
            const newOffsetX = offsetX + this.velocities[i].x;
            const newOffsetY = offsetY + this.velocities[i].y;
            const newOffsetZ = offsetZ + this.velocities[i].z;
            
            const effectiveStiffness = this.stiffness * 2.0;
            const dampedOffsetX = THREE.MathUtils.lerp(newOffsetX, 0, effectiveStiffness);
            const dampedOffsetY = THREE.MathUtils.lerp(newOffsetY, 0, effectiveStiffness);
            const dampedOffsetZ = THREE.MathUtils.lerp(newOffsetZ, 0, effectiveStiffness);
            
            const maxBend = Math.PI / 6; // 30 degrees
            const clampedOffsetX = THREE.MathUtils.clamp(dampedOffsetX, -maxBend, maxBend);
            const clampedOffsetY = THREE.MathUtils.clamp(dampedOffsetY, -maxBend, maxBend);
            const clampedOffsetZ = THREE.MathUtils.clamp(dampedOffsetZ, -maxBend, maxBend);
            
            this.targetRotations[i].x = this.restRotations[i].x + clampedOffsetX;
            this.targetRotations[i].y = this.restRotations[i].y + clampedOffsetY;
            this.targetRotations[i].z = this.restRotations[i].z + clampedOffsetZ;
            
            const lerpFactor = 0.5;
            bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, this.targetRotations[i].x, lerpFactor);
            bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, this.targetRotations[i].y, lerpFactor);
            bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, this.targetRotations[i].z, lerpFactor);
        }
    }
}

export class HairPhysicsSystem {
    constructor() {
        this.chains = [];
        this.colliders = [];
        this.gravity = new THREE.Vector3(0, -9.8, 0);
        this.wind = new THREE.Vector3(0, 0, 0);
        this.prevHeadRotation = new THREE.Euler(0, 0, 0);
        this.headMovement = new THREE.Euler(0, 0, 0);
        this.isFirstUpdate = true;
        this.enabled = true;
    }
    
    addCollider(boneName, radius, offset = new THREE.Vector3()) {
        const bone = this.findBone(this.model, boneName);
        if (bone) {

            const modelScale = this.model.scale.x; 
            const scaledRadius = radius * modelScale;
            
            const collider = new SphereCollider(bone, scaledRadius, offset);
            this.colliders.push(collider);
            return collider;

        } else {
            return null;
        }
    }
    
    findBone(model, boneName) {
        let foundBone = null;
        model.traverse((obj) => {
            if (obj.isBone && obj.name === boneName) {
                foundBone = obj;
            }
        });
        return foundBone;
    }
    
    addHairChainsFromModel(model, preserveRestPose = true) {
        this.model = model; 
        
        const allHairBones = [];
        const processedBones = new Set();
        
        const originalRotations = new Map();
        model.traverse((obj) => {
            if (obj.isBone && obj.name.startsWith('hair_')) {
                originalRotations.set(obj, obj.rotation.clone());
            }
        });
        
        model.traverse((obj) => {
            if (obj.isBone && obj.name.startsWith('hair_') && !obj.name.includes('_end_')) {
                allHairBones.push(obj);
            }
        });

        const rootBones = allHairBones.filter(bone => {
            return bone.parent && bone.parent.name.includes('head_neck');
        });
        
        for (const rootBone of rootBones) {
            if (processedBones.has(rootBone)) continue;
            
            const chainBones = [rootBone];
            processedBones.add(rootBone);
            
            let currentBone = rootBone;
            while (true) {
                const children = currentBone.children.filter(child => 
                    child.isBone && 
                    child.name.startsWith('hair_') && 
                    !child.name.includes('_end_') &&
                    !processedBones.has(child)
                );
                
                if (children.length === 0) break;
                
                const nextBone = children[0];
                chainBones.push(nextBone);
                processedBones.add(nextBone);
                currentBone = nextBone;
                
                for (let i = 1; i < children.length; i++) {
                    const branchRoot = children[i];
                    if (!processedBones.has(branchRoot)) {
                        rootBones.push(branchRoot);
                    }
                }
            }
            
            if (chainBones.length > 1) {
                let stiffness = 0.08;
                let damping = 0.85;
                
                const boneNum = parseInt(rootBone.name.match(/hair_(\d+)_/)?.[1] || 0);
                if (boneNum <= 10) {
                    stiffness = 0.06;
                    damping = 0.82;
                } else if (boneNum >= 30) {
                    stiffness = 0.10;
                    damping = 0.87;
                }
                
                const chain = new HairBoneChain(chainBones, stiffness, damping);
                
                if (preserveRestPose) {
                    for (let i = 0; i < chainBones.length; i++) {
                        const originalRot = originalRotations.get(chainBones[i]);
                        if (originalRot) {
                            chain.restRotations[i].copy(originalRot);
                            chain.targetRotations[i].copy(originalRot);
                            chainBones[i].rotation.copy(originalRot);
                        }
                    }
                }
                
                this.chains.push(chain);
            }
        }
    }
    
    setWind(x, y, z) {
        this.wind.set(x, y, z);
    }
    
    setGravity(x, y, z) {
        this.gravity.set(x, y, z);
    }
    
    updateHeadTracking(headBone) {
        if (headBone) {
            const currentRot = headBone.rotation.clone();
            
            if (this.isFirstUpdate) {
                this.prevHeadRotation.copy(currentRot);
                this.isFirstUpdate = false;
                return;
            }
            
            this.headMovement.x = currentRot.x - this.prevHeadRotation.x;
            this.headMovement.y = currentRot.y - this.prevHeadRotation.y;
            this.headMovement.z = currentRot.z - this.prevHeadRotation.z;
            
            this.prevHeadRotation.copy(currentRot);
        }
    }
    
    update(deltaTime, headBone) {
        if (!this.enabled) return;
        
        this.updateHeadTracking(headBone);
        
        for (const collider of this.colliders) {
            collider.update();
        }
        
        for (const chain of this.chains) {
            chain.update(deltaTime, this.gravity, this.wind, this.headMovement, this.colliders);
        }
    }
    
    getChainCount() {
        return this.chains.length;
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.reset();
        }
    }
    
    reset() {
        for (const chain of this.chains) {
            for (let i = 0; i < chain.bones.length; i++) {
                chain.bones[i].rotation.copy(chain.restRotations[i]);
                chain.velocities[i].set(0, 0, 0);
                chain.targetRotations[i].copy(chain.restRotations[i]);
            }
        }
        this.isFirstUpdate = true;
    }
    
    visualizeColliders(scene) {
        const helpers = [];
        
        for (const collider of this.colliders) {
            // CRITICAL: Account for model scale when creating sphere
            const geometry = new THREE.SphereGeometry(collider.radius, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            const mesh = new THREE.Mesh(geometry, material);

            scene.add(mesh);
            helpers.push({ mesh, collider });
            
        }
        
        const updateHelpers = () => {
            helpers.forEach(({ mesh, collider }) => {
                mesh.position.copy(collider.position);
                
                if (this.model) {
                    mesh.scale.copy(this.model.scale);
                }
            });
        };
        
        return { helpers, updateHelpers };
    }
}

export default HairPhysicsSystem;