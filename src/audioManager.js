export class AudioManager {
    constructor() {
        this.audioCtx = null;
        this.analyser = null;
        this.audioData = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.isSpeaking = false;
    }

    async init() {
        this.audioCtx = new AudioContext();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.audioData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    async loadAudioFromBase64(base64Audio) {
        try {
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            this.audioBuffer = await this.audioCtx.decodeAudioData(bytes.buffer);
            console.log('Audio loaded successfully');
        } catch (error) {
            console.error('Error loading audio:', error);
        }
    }

    async loadAudioFromURL(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            console.log('Audio loaded from URL successfully');
        } catch (error) {
            console.error('Error loading audio from URL:', error);
        }
    }

    play() {
        if (!this.audioBuffer) {
            console.error('No audio buffer loaded');
            return;
        }

        this.isSpeaking = true;

        if (this.audioSource) {
            this.audioSource.stop();
        }

        this.audioSource = this.audioCtx.createBufferSource();
        this.audioSource.buffer = this.audioBuffer;

        this.audioSource.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);

        this.audioSource.onended = () => {
            this.isSpeaking = false;
            console.log('Audio playback ended');
        };

        this.audioSource.start(0);
        console.log('Audio playback started');
    }

    getVolume() {
        if (!this.analyser || !this.audioData) return 0;

        this.analyser.getByteFrequencyData(this.audioData);

        let sum = 0;
        for (let i = 0; i < this.audioData.length; i++) {
            sum += this.audioData[i];
        }
        return sum / this.audioData.length / 256;
    }
}