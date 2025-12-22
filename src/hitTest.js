import * as THREE from 'three';

let hitTestSource = null;
let hitTestSourceRequested = false;

export function onSelect(indicator, model) {

    if (indicator.visible) {

        model.position.setFromMatrixPosition(indicator.matrix);
        model.quaternion.setFromRotationMatrix(indicator.matrix);
        model.scale.set(0.2, 0.2, 0.2); 
        model.visible = true;

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

/*function init() {

    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    const loader = new GLTFLoader();

    // lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemiLight);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(0, 5, 5);
    scene.add(directional);

    createIndicator();

    loader.load('/models/guide.glb',  (gltf) => {

        guideChar = gltf.scene;
        guideChar.scale.set(0.1, 0.1, 0.1);

        if (gltf.animations && gltf.animations.length > 0) {
            console.warn("Disabling animations for bone test...");
            gltf.animations = [];
        }

        guideChar.traverse((obj) => {
            if (obj.isBone) {
                
                if(obj.name === "head_neck_lower_053") headLower = obj;
                if(obj.name === "head_neck_upper_054") headUpper = obj;
            }
        });

        /*guideChar.traverse((obj) => {

            if (obj.isSkinnedMesh) {
                const s = obj.skeleton;
                console.log("Total bones:", s.bones.length);

                // Find the bone with most influence on head verts
                for (let i = 0; i < s.boneInverses.length; i++) {
                    console.log("Bone index:", i, "Name:", s.bones[i].name);
                }
            }
        });

        let allBones = [];

        guideChar.traverse((obj) => {
            if (obj.isBone) allBones.push(obj);
        });

        // Rotate each bone for 0.5 seconds to see which one affects the head
        let testIndex = 0;

        function testBones() {
            if (testIndex >= allBones.length) return;

            const b = allBones[testIndex];
            console.log("Testing bone:", b.name);

            const interval = setInterval(() => {
                b.rotation.y += 0.05;
            }, 16);

            setTimeout(() => {
                clearInterval(interval);
                testIndex++;
                testBones();
            }, 500); // test next bone every 0.5s
        }

        //testBones();
    });
    // AR button
    document.body.appendChild(ARButton.createButton(renderer, { 
        requiredFeatures: ['hit-test'], 
        optionalFeatures: ['local-floor']
    }));

    controller = renderer.xr.getController(0);
    scene.add(controller);

    renderer.xr.addEventListener('sessionstart', onSessionStart);
}*/