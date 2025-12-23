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

    hideThreeJSButtons();
    
    setTimeout(() => {
        micContainer.classList.add('visible');
        arInterface.classList.add('visible');
        exitButton.classList.add('visible');
        controlButtons.classList.add('visible');
    }, 300);
}

function hideThreeJSButtons() {

    const arButtons = document.querySelectorAll('button');
    arButtons.forEach(button => {
        const buttonText = button.textContent.toUpperCase();
        
        if (buttonText.includes('START AR') || 
            buttonText.includes('STOP AR') || 
            buttonText.includes('AR')) {
            if (!button.id || !['startARButton', 'exitButton', 'clearButton', 'micButton'].includes(button.id)) {
                button.style.display = 'none';
            }
        }
    });
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

class SlideModal {
    constructor(slides, storageKey) {
        this.slides = slides;
        this.currentSlide = 0;
        this.storageKey = storageKey;
        this.modal = null;
        this.isOpen = false;
    }

    createModal() {

        this.modal = document.createElement('div');
        this.modal.className = 'slide-modal-overlay';
        this.modal.innerHTML = `
            <div class="slide-modal">
                <button class="slide-modal-close" aria-label="Close">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                
                <div class="slide-content">
                    <div class="slide-icon"></div>
                    <h2 class="slide-title"></h2>
                    <p class="slide-text"></p>
                </div>

                <div class="slide-indicators"></div>

                <div class="slide-navigation">
                    <button class="slide-btn slide-btn-back">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        Буцах
                    </button>
                    <button class="slide-btn slide-btn-next">
                        Дараах
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>

                <label class="slide-checkbox">
                    <input type="checkbox" id="dontShowAgain">
                    <span>Дахиж харуулахгүй</span>
                </label>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.attachEventListeners();
        this.updateSlide();
    }

    attachEventListeners() {
        const closeBtn = this.modal.querySelector('.slide-modal-close');
        const nextBtn = this.modal.querySelector('.slide-btn-next');
        const backBtn = this.modal.querySelector('.slide-btn-back');
        const checkbox = this.modal.querySelector('#dontShowAgain');

        closeBtn.addEventListener('click', () => this.close());
        nextBtn.addEventListener('click', () => this.next());
        backBtn.addEventListener('click', () => this.back());
        
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                localStorage.setItem(this.storageKey, 'true');
            } else {
                localStorage.removeItem(this.storageKey);
            }
        });

        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    updateSlide() {
        const slide = this.slides[this.currentSlide];
        const iconEl = this.modal.querySelector('.slide-icon');
        const titleEl = this.modal.querySelector('.slide-title');
        const textEl = this.modal.querySelector('.slide-text');
        const backBtn = this.modal.querySelector('.slide-btn-back');
        const nextBtn = this.modal.querySelector('.slide-btn-next');
        const indicators = this.modal.querySelector('.slide-indicators');

        iconEl.innerHTML = slide.icon;
        titleEl.textContent = slide.title;
        textEl.innerHTML = slide.text;

        backBtn.style.visibility = this.currentSlide === 0 ? 'hidden' : 'visible';
        
        if (this.currentSlide === this.slides.length - 1) {
            nextBtn.innerHTML = `
                Ойлголоо
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            `;
        } else {
            nextBtn.innerHTML = `
                Дараах
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            `;
        }

        indicators.innerHTML = '';
        for (let i = 0; i < this.slides.length; i++) {
            const dot = document.createElement('div');
            dot.className = `slide-dot ${i === this.currentSlide ? 'active' : ''}`;
            indicators.appendChild(dot);
        }
    }

    next() {
        if (this.currentSlide < this.slides.length - 1) {
            this.currentSlide++;
            this.updateSlide();
        } else {
            this.close();
        }
    }

    back() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.updateSlide();
        }
    }

    open() {
        if (!this.modal) {
            this.createModal();
        }
        this.currentSlide = 0;
        this.updateSlide();
        this.modal.classList.add('active');
        this.isOpen = true;
    }

    close() {
        this.modal.classList.remove('active');
        this.isOpen = false;
    }

    shouldShow() {
        return !localStorage.getItem(this.storageKey);
    }
}

const warningSlides = [
    {
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>`,
        title: 'Анхааруулга',
        text: 'Энэхүү AR хөтөчийн систем нь WebXR WebAPI нь суурилагдсан тул Google Chrome-оос өөр вэб хөтөчийг дэмжихгүй болно. Хэрэв Chrome-г ашигласан ч ажиллахгүй байвал та "chrome://flag" цэсэн дэх "WebXR Incubations" -г Enabled болгоно уу.'
    },
    {
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>`,
        title: 'Камерын зөвшөөрөл',
        text: 'AR хөтөчийн системийг эхлүүлэхийн тулд таны камерын зөвшөөрөл шаардлагатай. Та камерын хандалтыг зөвшөөрнө үү.'
    },
    {
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
        </svg>`,
        title: 'Микрофоны зөвшөөрөл',
        text: 'Дуут харилцааны үед таны микрофоны ашиглагдах болно. Та микрофоны хандалтыг зөвшөөрнө үү.'
    },
    {
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>`,
        title: 'Аюулгүй байдал',
        text: 'Таны мэдээлэл аюулгүй хадгалагдах бөгөөд гуравдагч этгээдэд дамжуулагдахгүй.'
    }
];

const tutorialSlides = [
    {
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>`,
        title: 'Тавтай морилно уу!',
        text: 'AR хөтөчийн системд тавтай морилно уу. Энэхүү заавар таныг эхлүүлэхэд тусална.'
    },
    {
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>`,
        title: '1-р алхам: AR эхлүүлэх',
        text: '"AR эхлүүлэх" товчийг дарж AR горимыг идэвхжүүлнэ үү. Камерын зөвшөөрлийг баталгаажуулна уу.'
    },
    {
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"></path>
        </svg>`,
        title: '2-р алхам: Байрлуулах',
        text: 'Та hit-test ашиглаж байгаа тохиолдолд утсыг хөдөлгөж, хөтчийг байршуулах тогтвортой гадаргууг сонгоорой. Хэт харанхуй, гэрлийн үүсвэр бага газар ажиллахгүй болохыг анхаарна уу!'
    },
    {
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
        </svg>`,
        title: '3-р алхам: Харилцах',
        text: 'Микрофоны товчийг дараад хөтөчтэй ярина уу. Хөтөчтэй ярихдаа үгээ аль болох удаан, тод хэлэхийг хичээнэ үү! Эс бөгөөс таны үг буруу сонсогдох магагдлал өндөр.'
    },
    {
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
        </svg>`,
        title: 'Бэлэн болсон!',
        text: 'Та AR туршилтыг эхлүүлэхэд бэлэн боллоо.'
    }
];

const warningModal = new SlideModal(warningSlides, 'ar-warning-seen');
const tutorialModal = new SlideModal(tutorialSlides, 'ar-tutorial-seen');

function createCornerButtons() {
    const container = document.createElement('div');
    container.className = 'corner-buttons';
    container.innerHTML = `
        <button class="corner-btn" id="warningBtn" title="Анхааруулга">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
        </button>
        <button class="corner-btn" id="tutorialBtn" title="Хэрхэн ашиглах">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
        </button>
    `;
    document.body.appendChild(container);

    // Add event listeners
    document.getElementById('warningBtn').addEventListener('click', () => {
        warningModal.open();
    });

    document.getElementById('tutorialBtn').addEventListener('click', () => {
        tutorialModal.open();
    });
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    createCornerButtons();

    // Show warning modal on first visit
    if (warningModal.shouldShow()) {
        setTimeout(() => {
            warningModal.open();
        }, 500);
    }
});

// Export for external use
window.slideModals = {
    warning: warningModal,
    tutorial: tutorialModal
};

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