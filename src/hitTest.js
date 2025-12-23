import * as THREE from 'three';

let hitTestSource = null;
let hitTestSourceRequested = false;

export function onSelect(indicator, model) {

    if (indicator.visible) {

        model.position.setFromMatrixPosition(indicator.matrix);
        model.quaternion.setFromRotationMatrix(indicator.matrix);
        model.scale.set(0.2, 0.2, 0.2); 
        model.visible = true;
        fadeInModel(model, 2000);

        indicator.visible = false;
        console.log('Model placed at hit-test location: ', model.position);
    }
}

export function createIndicator() {

    const geometry = new THREE.RingGeometry(0.015, 0.025, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const indicator = new THREE.Mesh(geometry, material);
    indicator.matrixAutoUpdate = false;
    indicator.visible = false;
    
    return indicator;
}

export function hitTest(session, frame, indicator, renderer) {

    if (!session) {
        console.warn('No AR session.');
        return;
    }

    const referenceSpace = renderer.xr.getReferenceSpace();
    
    if (!hitTestSourceRequested) {

        session.requestReferenceSpace('viewer').then((viewerSpace) => {
            session.requestHitTestSource({ space: viewerSpace }).then((source) => {
                hitTestSource = source;
                console.log('Hit-test source created');
            }).catch((err) => {
                console.error('Error creating hit-test source:', err);
            });
        }).catch((err) => {
            console.error('Error requesting viewer space:', err);
        });

        session.addEventListener('end', () => {
            hitTestSourceRequested = false;
            hitTestSource = null;
            console.log('Hit-test source cleared');
        });

        hitTestSourceRequested = true;
    }

    if (hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);

        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            if (pose) {
                indicator.visible = true;
                indicator.matrix.fromArray(pose.transform.matrix);
            }
        } else {
            indicator.visible = false;
        }
    }
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