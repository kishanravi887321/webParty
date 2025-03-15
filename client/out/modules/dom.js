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
    function initializeVideoCircles(localStream) {
        try {
            // Don’t clear the entire container; instead, remove only outdated participants
            const existingParticipants = participantsContainer.querySelectorAll('.participant');
            existingParticipants.forEach(participant => {
                if (!participant.querySelector('#localVideo') && !participant.querySelector('#remoteVideo')) {
                    participant.remove(); // Remove participants that don’t contain localVideo or remoteVideo
                }
            });
    
            let localParticipant, remoteParticipant;
    
            // Check if localVideo already exists
            let localVideoElement = document.getElementById('localVideo');
            if (!localVideoElement) {
                localParticipant = document.createElement('div');
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
                localVideoElement = localParticipant.querySelector('#localVideo');
            } else {
                localParticipant = localVideoElement.closest('.participant');
            }
    
            // Check if remoteVideo already exists
            let remoteVideoElement = document.getElementById('remoteVideo');
            if (!remoteVideoElement) {
                remoteParticipant = document.createElement('div');
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
                remoteVideoElement = remoteParticipant.querySelector('#remoteVideo');
            } else {
                remoteParticipant = remoteVideoElement.closest('.participant');
            }
    
            // Reassign the local stream if it exists
            if (localStream && localVideoElement) {
                localVideoElement.srcObject = localStream;
                localVideoElement.muted = true;
                localVideoElement.play().catch(error => {
                    console.error("Error playing local video in initializeVideoCircles:", error);
                });
            }
    
            // Ensure remoteVideo is cleared if no remote stream is present
            if (remoteVideoElement && !remoteVideoElement.srcObject) {
                remoteVideoElement.srcObject = null;
            }
    
            console.log("initializeVideoCircles executed, localVideo.srcObject:", localVideoElement.srcObject);
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