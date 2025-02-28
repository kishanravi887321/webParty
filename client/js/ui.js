// client/js/ui.js
// DOM Elements
export const loginBtn = document.getElementById('loginBtn');
export const selectRoomBtn = document.getElementById('selectRoomBtn');
export const authModal = document.getElementById('authModal');
export const roomModal = document.getElementById('roomModal');
export const closeButtons = document.querySelectorAll('.close-btn');
export const authTabs = document.querySelectorAll('.auth-tab');
export const authForms = document.querySelectorAll('.auth-form');
export const roomOptions = document.querySelectorAll('.room-option');
export const localVideo = document.getElementById("localVideo");
export const chatInput = document.querySelector('.chat-input input');
export const sendButton = document.querySelector('.chat-input .control-btn');
export const chatMessages = document.querySelector('.chat-messages');
export const loginForm = document.getElementById('loginForm');
export const registerForm = document.getElementById('registerForm');
export const createRoomBtn = document.getElementById('createRoomBtn');
export const joinRoomBtn = document.getElementById('joinRoomBtn');
export const participantsContainer = document.querySelector('.participants');

// UI Functions
export function initializeUI() {
    // Modal controls
    loginBtn.addEventListener('click', () => {
        if (authModal) {
            console.log("Login button clicked, showing authModal");
            authModal.classList.add('active');
        } else {
            console.error("authModal element not found in DOM");
        }
    });

    selectRoomBtn.addEventListener('click', () => {
        if (roomModal) {
            console.log("Select Room button clicked, showing roomModal");
            roomModal.classList.add('active');
        } else {
            console.error("roomModal element not found in DOM");
        }
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            authModal.classList.remove('active');
            roomModal.classList.remove('active');
        });
    });

    // Auth tabs
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetForm = tab.dataset.tab;
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            authForms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${targetForm}Form`) form.classList.add('active');
            });
        });
    });

    // Room selection
    roomOptions.forEach(option => {
        option.addEventListener('click', () => {
            roomOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            console.log(`Selected room type: ${option.dataset.type}`);
        });
    });
}

// Draggable participants
export function addDragListeners(participant) {
    let isDragging = false;
    let currentX = 0, currentY = 0;
    let initialX = 0, initialY = 0;
    let xOffset = 0, yOffset = 0;

    participant.addEventListener('pointerdown', dragStart);
    document.addEventListener('pointermove', drag);
    document.addEventListener('pointerup', dragEnd);

    function dragStart(e) {
        e.preventDefault();
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
        participant.style.zIndex = "1000";
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        participant.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }

    function dragEnd() {
        isDragging = false;
        participant.style.zIndex = "1";
    }
}

// Room ID Generation
export function generateRoomId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 5; i++) {
        roomId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return roomId;
}

// Color Picker and UI Updates
export function setupColorPicker() {
    const colorPickerBtn = document.getElementById('colorPickerBtn');
    
    // Create a hidden color input dynamically
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.style.display = 'none';
    document.body.appendChild(colorInput);

    // Show color picker when button is clicked
    colorPickerBtn.addEventListener('click', () => {
        colorInput.click();
    });

    // Update room background color and related elements when a new color is selected
    colorInput.addEventListener('change', (e) => {
        const newColor = e.target.value;
        // Update the background colors for the entire screen
        document.body.style.backgroundColor = newColor;
        document.querySelector('.nav').style.backgroundColor = `rgba(${hexToRgb(newColor).r}, ${hexToRgb(newColor).g}, ${hexToRgb(newColor).b}, 0.8)`;
        document.querySelector('.sidebar').style.backgroundColor = newColor;
        document.querySelector('.main-content').style.backgroundColor = newColor;
        document.querySelector('.video-container').style.backgroundColor = newColor;
        document.querySelector('.chat-input').style.backgroundColor = `rgba(255, 255, 255, 0.05)`;
        document.querySelector('.modal-content').style.backgroundColor = newColor;
        
        // Keep icons and neon elements unaffected (you can adjust this as needed)
    });

    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}

// Export UI-related variables for use in other files
export { localVideo, participantsContainer, chatInput, sendButton, chatMessages };