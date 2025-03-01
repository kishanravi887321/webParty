// modules/dom.js
export function setupDOM() {
    const loginBtn = document.getElementById('loginBtn');
    const selectRoomBtn = document.getElementById('selectRoomBtn');
    const authModal = document.getElementById('authModal');
    const roomModal = document.getElementById('roomModal');
    const closeButtons = document.querySelectorAll('.close-btn');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const roomOptions = document.querySelectorAll('.room-option');
    const localVideo = document.getElementById("localVideo");
    const chatInput = document.querySelector('.chat-input input');
    const sendButton = document.querySelector('.chat-input .control-btn');
    const chatMessages = document.querySelector('.chat-messages');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const participantsContainer = document.querySelector('.participants');

    // Check if all required DOM elements exist
    if (!createRoomBtn || !joinRoomBtn || !roomModal || !participantsContainer) {
        console.error("One or more DOM elements not found:", {
            createRoomBtn, joinRoomBtn, roomModal, participantsContainer
        });
        alert("An error occurred loading the page. Please refresh or check the console for details.");
        return null;
    }

    // Initialize two static video circles for local and remote users
    function initializeVideoCircles() {
        try {
            participantsContainer.innerHTML = '';

            const localParticipant = document.createElement('div');
            localParticipant.classList.add('participant');
            localParticipant.dataset.peerId = '';
            localParticipant.draggable = true;
            localParticipant.innerHTML = `
                <video id="localVideo" autoplay muted></video>
                <div class="controls">
                    <button class="control-btn" data-peer-id="" data-type="mic"><span class="material-icons">mic</span></button>
                    <button class="control-btn" data-peer-id="" data-type="videocam"><span class="material-icons">videocam</span></button>
                </div>
            `;
            participantsContainer.appendChild(localParticipant);

            const remoteParticipant = document.createElement('div');
            remoteParticipant.classList.add('participant');
            remoteParticipant.dataset.peerId = '';
            remoteParticipant.draggable = true;
            remoteParticipant.innerHTML = `
                <video id="remoteVideo" autoplay></video>
                <div class="controls">
                    <button class="control-btn" data-peer-id="" data-type="mic"><span class="material-icons">mic</span></button>
                    <button class="control-btn" data-peer-id="" data-type="videocam"><span class="material-icons">videocam</span></button>
                </div>
            `;
            participantsContainer.appendChild(remoteParticipant);

            return { localParticipant, remoteParticipant };
        } catch (error) {
            console.error("Error initializing video circles:", error);
            alert("Failed to initialize video interface. Please refresh the page.");
            return null;
        }
    }

    // Get a unique, persistent peer ID
    function getMyPeerId() {
        let peerId = sessionStorage.getItem('peerId');
        if (!peerId) {
            peerId = localStorage.getItem('peerId');
            if (!peerId) {
                peerId = `peer-${Date.now()}-${crypto.randomUUID?.().split('-')[0] || Math.random().toString(36).substr(2, 9)}`;
                sessionStorage.setItem('peerId', peerId);
                localStorage.setItem('peerId', peerId);
            } else {
                sessionStorage.setItem('peerId', peerId);
            }
        }
        console.log(`Generated/Retrieved persistent peerId: ${peerId}`);
        return peerId;
    }

    return {
        loginBtn, selectRoomBtn, authModal, roomModal, closeButtons, authTabs, authForms,
        roomOptions, localVideo, chatInput, sendButton, chatMessages, loginForm, registerForm,
        createRoomBtn, joinRoomBtn, participantsContainer, initializeVideoCircles, getMyPeerId
    };
}