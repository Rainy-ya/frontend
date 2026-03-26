export class SpeechRecognitionManager {
    constructor(audioManager, expressionSystem, movementsSystem) {
        this.audioManager = audioManager;
        this.expressionSystem = expressionSystem;
        this.movementsSystem = movementsSystem;
        this.currentRecognition = null;
        this.isListening = false;
        this.isProcessing = false; // Add flag to prevent race conditions
    }

    async ask() {
        console.log('Starting speech recognition...');

        // Prevent multiple simultaneous recognitions
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

            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                if (this.isListening && !this.isProcessing) {
                    console.log('Recognition timeout - no speech detected');
                    recognition.stop();
                }
            }, 10000); // 10 second timeout

            recognition.start();

            recognition.onresult = async (event) => {
                // Prevent double processing
                if (this.isProcessing) {
                    console.log('Already processing, ignoring duplicate result');
                    return;
                }
                
                this.isProcessing = true;
                clearTimeout(timeout);

                try {
                    const transcript = event.results[0][0].transcript;
                    console.log('User said:', transcript);
                    this.isListening = false;

                    if (!transcript || transcript.trim() === '') {
                        console.log('Empty transcript, playing default audio');
                        await this.audioManager.loadAudioFromURL('/sounds/greeting_Rose.mp3');
                        this.audioManager.play();
                        
                        resolve({ 
                            userInput: 'No speech detected',
                            answer: 'Default response',
                            cancelled: false
                        });
                        return;
                    }

                    // Return for confirmation
                    resolve({
                        userInput: transcript,
                        needsConfirmation: true,
                        cancelled: false
                    });

                } catch (error) {
                    console.error('Error processing result:', error);
                    this.isListening = false;
                    reject(error);
                }
            };

            recognition.onerror = (event) => {
                // Prevent double processing
                if (this.isProcessing) {
                    console.log('Already processing, ignoring error');
                    return;
                }

                this.isProcessing = true;
                clearTimeout(timeout);
                console.error('Speech recognition error:', event.error);
                this.isListening = false;

                // Handle user cancellation or no speech gracefully
                if (event.error === 'aborted') {
                    console.log('Recognition aborted by user');
                    resolve({ 
                        userInput: '', 
                        answer: '', 
                        cancelled: true 
                    });
                    return;
                }

                if (event.error === 'no-speech') {
                    console.log('No speech detected, playing default audio');
                    this.audioManager.loadAudioFromURL('/sounds/greeting_Rose.mp3')
                        .then(() => this.audioManager.play())
                        .catch(err => console.error('Error playing default audio:', err));
                    
                    resolve({ 
                        userInput: 'No speech detected', 
                        answer: 'Default response',
                        cancelled: false
                    });
                    return;
                }

                // For other errors, reject
                console.error('Unhandled error type:', event.error);
                reject(event);
            };

            recognition.onend = () => {
                clearTimeout(timeout);
                this.currentRecognition = null;
                this.isListening = false;
                console.log('Recognition ended');
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

            // Parse actions from response
            this.parseAndTriggerActions(data.answer);

            // Load and play audio
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
        if (this.currentRecognition && this.isListening && !this.isProcessing) {
            console.log('Stopping recognition');
            this.isListening = false;
            this.currentRecognition.abort(); // Use abort() instead of stop()
            this.currentRecognition = null;
        }
    }

    parseAndTriggerActions(text) {
        if (!text) return;

        // Expression triggers
        if (text.includes('[giggles]') || text.includes('[laughs]')) {
            this.expressionSystem.transitionToExpression('smile', 0.2, 3);
        }
        if (text.includes('[sad]')) {
            this.expressionSystem.transitionToExpression('sad', 0.2, 3);
        }
        if (text.includes('[angry]')) {
            this.expressionSystem.transitionToExpression('angry', 0.3, 3);
        }

        // Movement triggers
        if (text.includes('[nod]')) {
            this.movementsSystem.nod();
        }
        if (text.includes('[shake]')) {
            this.movementsSystem.shake();
        }
    }
}

/*export class SpeechRecognitionManager {
    
    constructor(audioManager, expressionSystem, movementsSystem) {
        this.audioManager = audioManager;
        this.expressionSystem = expressionSystem;
        this.movementsSystem = movementsSystem;
        this.currentRecognition = null;
    }

    // In speechRecognition.js
    async ask() {
        
        console.log('Starting speech recognition...');

        return new Promise((resolve, reject) => {

            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.currentRecognition = recognition;

            recognition.lang = 'mn-MN';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.start();

            recognition.onresult = async (event) => {
                try {

                    const transcript = event.results[0][0].transcript;
                    console.log('User said:', transcript);

                    if (!transcript || transcript.trim() === '') {
                        await this.audioManager.loadAudioFromURL('/sounds/greeting_Rose.mp3');
                        this.audioManager.play();
                        
                        resolve({ 
                            userInput: 'No speech detected',
                            answer: 'Default response' 
                        });
                        return;
                    }

                    const response = await fetch('https://backend-6w7c.vercel.app/api/ask', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question: transcript })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Request failed: ${response.status} ${errorText}`);
                    }

                    const data = await response.json();
                    console.log('Answer:', data.answer);

                    this.parseAndTriggerActions(data.answer);

                    await this.audioManager.loadAudioFromBase64(data.audio);
                    this.audioManager.play();
                    
                    resolve({
                        userInput: transcript, 
                        answer: data.answer
                    });
                } catch (error) {
                    console.error('Error processing question:', error);
                    reject(error);
                }
            };

            recognition.onerror = async (event) => {

                console.error('Speech recognition error:', event.error);

                if (event.error === 'no-speech' || event.error === 'aborted') {
                    try {
                        await this.audioManager.loadAudioFromURL('/sounds/greeting_Rose.mp3');
                        this.audioManager.play();
                        resolve({ 
                            userInput: 'No speech detected',
                            answer: 'No speech detected' 
                        });
                    } catch (audioError) {
                        reject(audioError);
                    }
                } else {
                    reject(event.error);
                }
            };
        });
    }

    stop() {
        if (this.currentRecognition) {
            this.currentRecognition.stop();
            this.currentRecognition = null;
        }
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
}*/