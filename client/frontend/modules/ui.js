// modules/ui.js
export function setupUI(domElements, {
    connectWebSocket, initializeMedia, createPeerConnection, handleOffer, handleAnswer, handleCandidate,
    startCallForRoom, sendMessage, displayMessage, enableChat, disableChat, generateRoomId,
    localStream, username, token, currentRoomId, peerConnections, peerList, myPeerId, socket
}) {
    const {
        loginBtn, selectRoomBtn, authModal, roomModal, closeButtons, authTabs, authForms,
        roomOptions, localVideo, chatInput, sendButton, chatMessages, loginForm, registerForm,
        createRoomBtn, joinRoomBtn, participantsContainer, initializeVideoCircles, getMyPeerId
    } = domElements;

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

    // Room selection
    roomOptions.forEach(option => {
        option.addEventListener('click', () => {
            roomOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            console.log(`Selected room type: ${option.dataset.type}`);
        });
    });

    // Draggable participants
    function addDragListeners(participant) {
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

    // Create/Join Room
    createRoomBtn.addEventListener('click', async () => {
        console.log("Create Room button clicked");
        const selectedRoom = document.querySelector('.room-option.selected');
        if (!selectedRoom) {
            alert('Please select a room type');
            return;
        }

        const roomType = selectedRoom.dataset.type;
        currentRoomId = generateRoomId();
        document.getElementById('roomTitle').textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
        document.getElementById('generatedRoomId').textContent = currentRoomId;
        roomModal.classList.remove('active');

        const mediaStream = await initializeMedia();
        if (!mediaStream) {
            alert("Media access is required to create a room. Please grant camera/microphone permissions.");
            return;
        }

        localStream = mediaStream;
        myPeerId = getMyPeerId();
        initializeVideoCircles();
        const localParticipant = document.querySelector('.participant:nth-child(1)');
        if (localParticipant) {
            localParticipant.dataset.peerId = myPeerId;
            const localControls = localParticipant.querySelectorAll('.control-btn');
            localControls.forEach(btn => btn.dataset.peerId = myPeerId);
            addControlListeners(myPeerId);
        }

        try {
            socket = connectWebSocket({
                currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
                displayMessage, peerConnections, peerList, initializeVideoCircles
            });
            await startCallForRoom(myPeerId, peerList, socket, currentRoomId);
            enableChat(sendButton, chatInput, () => sendMessage(chatInput, socket, currentRoomId, username, displayMessage));
            console.log(`Room created successfully: ${currentRoomId}, Type: ${roomType}`);
        } catch (error) {
            console.error("Error creating room:", error);
            alert(`Failed to create room. Please check your network or contact support if the issue persists.`);
            roomModal.classList.add('active');
        }
    });

    // Add missing function
    function addControlListeners(peerId) {
        console.log(`Adding control listeners for peer: ${peerId}`);
        const controls = document.querySelectorAll(`.control-btn[data-peer-id="${peerId}"]`);

        controls.forEach(control => {
            control.addEventListener('click', (event) => {
                console.log(`Control clicked: ${event.target.dataset.action} for peer ${peerId}`);
                
                if (event.target.dataset.action === "mute") {
                    toggleMute(peerId);
                } else if (event.target.dataset.action === "video") {
                    toggleVideo(peerId);
                }
            });
        });
    }

    function toggleMute(peerId) {
        console.log(`Toggling mute for ${peerId}`);
        // Logic to mute/unmute the peer
    }

    function toggleVideo(peerId) {
        console.log(`Toggling video for ${peerId}`);
        // Logic to enable/disable video
    }

    function removeParticipant(peerId) {
        console.log(`Removing participant with peerId: ${peerId}`);
        const participant = participantsContainer.querySelector(`[data-peer-id="${peerId}"]`);
        if (participant) participant.remove();
        if (peerConnections.has(peerId)) {
            const pc = peerConnections.get(peerId);
            if (pc) pc.close();
            peerConnections.delete(peerId);
        }
        peerList.delete(peerId);
        if (peerId !== myPeerId) {
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) remoteVideo.srcObject = null;
        }
    }

    function removeAllParticipants() {
        participantsContainer.innerHTML = '';
        peerConnections.clear();
        peerList.clear();
        initializeVideoCircles();
    }
    joinRoomBtn.addEventListener('click', async () => {
        console.log("Join Room button clicked");

        const roomIdInput = document.getElementById('roomIdInput');
        if (!roomIdInput || !roomIdInput.value.trim()) {
            alert('Please enter a valid Room ID');
            return;
        }

        currentRoomId = roomIdInput.value.trim();
        document.getElementById('roomTitle').textContent = `Room: ${currentRoomId}`;
        roomModal.classList.remove('active');

        const mediaStream = await initializeMedia();
        if (!mediaStream) {
            alert("Media access is required to join a room. Please grant camera/microphone permissions.");
            return;
        }

        localStream = mediaStream;
        myPeerId = getMyPeerId();
        initializeVideoCircles();

        const localParticipant = document.querySelector('.participant:nth-child(1)');
        if (localParticipant) {
            localParticipant.dataset.peerId = myPeerId;
            const localControls = localParticipant.querySelectorAll('.control-btn');
            localControls.forEach(btn => btn.dataset.peerId = myPeerId);
            addControlListeners(myPeerId);
        }

        try {
            socket = connectWebSocket({
                currentRoomId, myPeerId, roomType: "public", // Assuming public for now
                handleOffer, handleAnswer, handleCandidate,
                displayMessage, peerConnections, peerList, initializeVideoCircles
            });

            await startCallForRoom(myPeerId, peerList, socket, currentRoomId);
            enableChat(sendButton, chatInput, () => sendMessage(chatInput, socket, currentRoomId, username, displayMessage));
            console.log(`Joined room successfully: ${currentRoomId}`);
        } catch (error) {
            console.error("Error joining room:", error);
            alert("Failed to join room. Please check your network or try again.");
            roomModal.classList.add('active');
        }
    });

    return { addDragListeners, removeParticipant, removeAllParticipants };
}
