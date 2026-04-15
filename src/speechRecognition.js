export class SpeechRecognitionManager {
    constructor(audioManager, expressionSystem, movementsSystem) {
        this.audioManager = audioManager;
        this.expressionSystem = expressionSystem;
        this.movementsSystem = movementsSystem;
        this.currentRecognition = null;
        this.isListening = false;
        this.isProcessing = false;
    }

    async ask() {
        console.log('Starting speech recognition...');

        if (this.isListening) {
            console.warn('Recognition already in progress');
            return { cancelled: true };
        }

        return new Promise((resolve, reject) => {
            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.currentRecognition = recognition;
            this.isListening = true;
            this.isProcessing = false;
            
            recognition.lang = 'mn-MN';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.continuous = false;

            // Timeout after 10 seconds
            const timeout = setTimeout(() => {
                if (this.isListening && !this.isProcessing) {
                    console.log('Recognition timeout - forcing stop');
                    this.cleanup();
                    resolve({ 
                        userInput: 'Timeout', 
                        answer: 'Timeout',
                        cancelled: true,
                        timeout: true
                    });
                }
            }, 10000);

            recognition.start();

            recognition.onresult = async (event) => {
                if (this.isProcessing) {
                    console.log('Already processing, ignoring duplicate result');
                    return;
                }
                
                this.isProcessing = true;
                clearTimeout(timeout);

                try {
                    const transcript = event.results[0][0].transcript;
                    console.log('User said:', transcript);

                    if (!transcript || transcript.trim() === '') {
                        console.log('Empty transcript, playing default audio');
                        
                        // Load and play default audio
                        await this.audioManager.loadAudioFromURL('/sounds/greeting.mp3');
                        this.audioManager.play();
                        
                        // Clean up immediately
                        this.cleanup();
                        
                        resolve({ 
                            userInput: 'No speech detected',
                            answer: 'Default response',
                            cancelled: false,
                            playedDefault: true
                        });
                        return;
                    }

                    // Clean up before returning for confirmation
                    this.cleanup();

                    resolve({
                        userInput: transcript,
                        needsConfirmation: true,
                        cancelled: false
                    });

                } catch (error) {
                    console.error('Error processing result:', error);
                    this.cleanup();
                    reject(error);
                }
            };

            recognition.onerror = async (event) => {
                if (this.isProcessing) {
                    console.log('Already processing, ignoring error');
                    return;
                }

                this.isProcessing = true;
                clearTimeout(timeout);
                console.error('Speech recognition error:', event.error);

                if (event.error === 'aborted') {
                    console.log('Recognition aborted by user');
                    this.cleanup();
                    resolve({ 
                        userInput: '', 
                        answer: '', 
                        cancelled: true 
                    });
                    return;
                }

                if (event.error === 'no-speech') {
                    console.log('No speech detected, playing default audio');
                    
                    try {
                        await this.audioManager.loadAudioFromURL('/sounds/greeting.mp3');
                        this.audioManager.play();
                    } catch (err) {
                        console.error('Error playing default audio:', err);
                    }
                    
                    // Clean up immediately
                    this.cleanup();
                    
                    resolve({ 
                        userInput: 'No speech detected', 
                        answer: 'Default response',
                        cancelled: false,
                        playedDefault: true
                    });
                    return;
                }

                // For other errors
                console.error('Unhandled error type:', event.error);
                this.cleanup();
                reject(event);
            };

            recognition.onend = () => {
                clearTimeout(timeout);
                console.log('Recognition ended');
                // Don't call cleanup here - it's already called in onresult/onerror
                if (this.isListening && !this.isProcessing) {
                    this.cleanup();
                    resolve({ cancelled: true});
                }
            };
        });
    }

    async sendToAPI(transcript) {
        try {
            console.log('Sending to API:', transcript);
            
            const response = await fetch('https://backend-6w7c.vercel.app/api/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: transcript })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('API Response:', data.answer);

            this.parseAndTriggerActions(data.answer);

            await this.audioManager.loadAudioFromBase64(data.audio);
            this.audioManager.play();
            
            return {
                userInput: transcript,
                answer: data.answer
            };
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    stop() {
        if (this.currentRecognition && this.isListening) {
            console.log('Manually stopping recognition');
            this.currentRecognition.abort();
            this.cleanup();
        }
    }

    cleanup() {
        console.log('Cleaning up speech recognition');
        this.isListening = false;
        this.isProcessing = false;
        this.currentRecognition = null;
    }

    parseAndTriggerActions(text) {
        if (!text) return;

        if (text.includes('[giggles]') || text.includes('[laughs]')) {
            this.expressionSystem.transitionToExpression('smile', 0.2, 3);
        }
        if (text.includes('[sad]')) {
            this.expressionSystem.transitionToExpression('sad', 0.2, 3);
        }
        if (text.includes('[angry]')) {
            this.expressionSystem.transitionToExpression('angry', 0.3, 3);
        }

        if (text.includes('[nod]')) {
            this.movementsSystem.nod();
        }
        if (text.includes('[shake]')) {
            this.movementsSystem.shake();
        }
    }
}