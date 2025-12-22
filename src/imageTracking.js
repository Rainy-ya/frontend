import * as THREE from 'three';

export class ImageTrackingManager {
    constructor() {
        this.smoothedPosition = new THREE.Vector3();
        this.smoothedQuaternion = new THREE.Quaternion();
        this.smoothingFactor = 0.1;
        this.isFirstFrame = true;
    }

    async loadMarkerImage(path) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const imageLoadPromise = new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(new Error(`Image failed to load. Check if ${path} exists`));
        });
        
        img.src = path;
        await imageLoadPromise;
        
        if (img.width === 0 || img.height === 0) {
            throw new Error('Image has invalid dimensions');
        }

        let markerImgBitmap;
        try {
            markerImgBitmap = await createImageBitmap(img);
        } catch (bitmapError) {
            markerImgBitmap = await createImageBitmap(img, {
                resizeWidth: Math.min(img.width, 1024),
                resizeHeight: Math.min(img.height, 1024),
                resizeQuality: 'high'
            });
        }
        
        return markerImgBitmap;
    }

    updateModelPosition(model, pose) {
        model.matrix.fromArray(pose.transform.matrix);
        model.matrix.decompose(model.position, model.quaternion, model.scale);

        if (this.isFirstFrame) {
            this.smoothedPosition.copy(model.position);
            this.smoothedQuaternion.copy(model.quaternion);
            this.isFirstFrame = false;
        }

        this.smoothedPosition.lerp(model.position, this.smoothingFactor);
        this.smoothedQuaternion.slerp(model.quaternion, this.smoothingFactor);

        model.position.copy(this.smoothedPosition);
        model.quaternion.copy(this.smoothedQuaternion);
        model.scale.set(0.2, 0.2, 0.2);
    }

    reset() {
        this.isFirstFrame = true;
    }
}