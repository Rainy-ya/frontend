const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const welcomeScreen = document.getElementById('welcomeScreen');
const startARButton = document.getElementById('startARButton');
const arInterface = document.getElementById('arInterface');
const micContainer = document.getElementById('micContainer');
const micButton = document.getElementById('micButton');
const micLabel = document.getElementById('micLabel');
const controlButtons = document.getElementById('controlButtons');
const userBubble = document.getElementById('userBubble');
const userText = document.getElementById('userText');
const assistantBubble = document.getElementById('assistantBubble');
const assistantText = document.getElementById('assistantText');
const clearButton = document.getElementById('clearButton');
const exitButton = document.getElementById('exitButton');

let isRecording = false;
let isARActive = false;

function showLoading(text = 'Уншиж байна...') {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showUserMessage(text) {
    userText.textContent = text;
    userBubble.classList.remove('hidden');
    setTimeout(() => userBubble.classList.add('visible'), 10);
}

function showAssistantMessage(text) {
    assistantText.textContent = text;
    assistantBubble.classList.remove('hidden');
    setTimeout(() => assistantBubble.classList.add('visible'), 10);
}

function hideMessages() {
    userBubble.classList.remove('visible');
    assistantBubble.classList.remove('visible');
    setTimeout(() => {
        userBubble.classList.add('hidden');
        assistantBubble.classList.add('hidden');
    }, 400);
}

startARButton.addEventListener('click', async () => {

    showLoading('AR эхлүүлж байна...');
    welcomeScreen.classList.add('hidden');

    await new Promise(resolve => setTimeout(resolve, 300));
    
    const threeARButton = document.getElementById('three-ar-button');
    if (threeARButton) {
        threeARButton.click();
    } else {
        console.error('Three.js AR button not found');
        hideLoading();
    }
});

function startARSession() {
    isARActive = true;
    document.body.classList.add('ar-mode');
    arInterface.classList.add('active');
    exitButton.classList.add('active');
    
    setTimeout(() => {
        micContainer.classList.add('visible');
        arInterface.classList.add('visible');
        exitButton.classList.add('visible');
        controlButtons.classList.add('visible');
    }, 300);
}

function modelReady() {

    console.log('Model loaded, showing mic button');
    if (!isARActive)
        micContainer.classList.add('visible');

}

micButton.addEventListener('click', async () => {

    if (isRecording) return;

    isRecording = true;
    micButton.classList.add('recording');
    micLabel.textContent = 'Listening...';

    try {

        if (window.ask) {
            const result = await window.ask();
            
            if (result.userInput) {
                showUserMessage(result.userInput);
            }
            
            if (result.answer) {
                showAssistantMessage(result.answer);
            }
            
            setTimeout(hideMessages, 10000);
        }
    } catch (error) {
        console.error('Error:', error);
        showAssistantMessage('Sorry, there was an error processing your request.');
    } finally {
        isRecording = false;
        micButton.classList.remove('recording');
        micLabel.textContent = 'Энд дарж ярина уу.';
    }
});

clearButton.addEventListener('click', () => {
    hideMessages();
});

exitButton.addEventListener('click', () => {

    if (window.renderer && window.renderer.xr) {
        const session = window.renderer.xr.getSession();
        if (session) {
            session.end();
        }
    }
    
    isARActive = false;
    document.body.classList.remove('ar-mode');
    arInterface.classList.remove('active');
    micContainer.classList.remove('visible');
    controlButtons.classList.remove('visible');
    hideMessages();
    welcomeScreen.classList.remove('hidden');
});

window.arUI = {
    showLoading,
    hideLoading,
    startARSession,
    showUserMessage,
    showAssistantMessage,
    hideMessages,
    modelReady,
    exitButton
};