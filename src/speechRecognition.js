export class SpeechRecognitionManager {
    
    constructor(audioManager, expressionSystem, movementsSystem) {
        this.audioManager = audioManager;
        this.expressionSystem = expressionSystem;
        this.movementsSystem = movementsSystem;
    }

    // In speechRecognition.js
async ask() {
    
    console.log('Starting speech recognition...');

    return new Promise((resolve, reject) => {

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
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

                const response = await fetch('http://10.150.34.28:3000/ask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ question: transcript })
                });

                const data = await response.json();
                console.log('Answer:', data.answer);

                this.parseAndTriggerActions(data.answer);

                await this.audioManager.loadAudioFromBase64(data.audio);
                this.audioManager.play();
                
                // IMPORTANT: Return both userInput and answer
                resolve({
                    userInput: transcript,  // ADD THIS
                    answer: data.answer
                });
            } catch (error) {
                console.error('Error processing question:', error);
                reject(error);
            }
        };

        recognition.onerror = async (event) => {

            console.error('Speech recognition error:', event.error);

            if (event.error === 'no-speech') {
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