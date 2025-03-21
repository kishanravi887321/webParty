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

    // Define the sendMessage callback once for consistency
    const sendMessageCallback = (chatInput) => sendMessage(chatInput, socket, currentRoomId, username, displayMessage, chatMessages, myPeerId);

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

    // Helper function to check if a room exists
    async function checkRoomExists(roomId) {
        return new Promise((resolve, reject) => {
            const ws = socket && socket.readyState === WebSocket.OPEN ? socket : new WebSocket(window.WEBSOCKET_URL);
            let timeoutId;

            ws.onopen = () => {
                console.log("Checking room existence for:", roomId);
                ws.send(JSON.stringify({ type: "checkRoom", roomId }));
                timeoutId = setTimeout(() => {
                    reject(new Error("Room check timeout"));
                    ws.close();
                }, 5000);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === "roomStatus" && data.roomId === roomId) {
                    clearTimeout(timeoutId);
                    resolve(data.exists);
                    if (!socket) ws.close();
                }
            };

            ws.onerror = (error) => {
                clearTimeout(timeoutId);
                reject(error);
                if (!socket) ws.close();
            };

            if (socket && socket.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "checkRoom", roomId }));
            }
        });
    }

    // Create Room
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
        // Set localVideo.srcObject after initializeVideoCircles to ensure it’s not cleared
        localVideo.srcObject = localStream;
        localVideo.play().catch(error => {
            console.error("Error playing local video:", error);
        });
        console.log("localVideo.srcObject after initializeVideoCircles:", localVideo.srcObject);

        const localParticipant = document.querySelector('.participant:nth-child(1)');
        if (localParticipant) {
            localParticipant.dataset.peerId = myPeerId;
            const localControls = localParticipant.querySelectorAll('.control-btn');
            localControls.forEach(btn => btn.dataset.peerId = myPeerId);
            addControlListeners(myPeerId);
        }

        try {
            socket = await connectWebSocket({
                currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
                displayMessage, peerConnections, peerList, initializeVideoCircles, chatMessages,
                handlePeerList, handleNewPeer, removeParticipant, localStream, action: "create"
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log("WebSocket connection delay completed, proceeding with room setup");
            await startCallForRoom(myPeerId, peerList, socket, currentRoomId, peerConnections, removeParticipant);
            enableChat(sendButton, chatInput, sendMessageCallback, chatMessages);
            console.log(`Room created successfully: ${currentRoomId}, Type: ${roomType}`);
        } catch (error) {
            console.error("Error creating room:", error);
            alert(`Failed to create room: ${error.message || 'Unknown error'}. Please check your network or contact support if the issue persists.`);
            roomModal.classList.add('active');
        }
    });

    // Join Room
    joinRoomBtn.addEventListener('click', async () => {
        console.log("Join Room button clicked");
        const selectedRoom = document.querySelector('.room-option.selected');
        if (!selectedRoom) {
            alert('Please select a room type');
            return;
        }

        const roomType = selectedRoom.dataset.type;
        const roomId = prompt('Enter room ID:');
        if (!roomId) {
            console.log("No Room ID entered, aborting join");
            return;
        }

        try {
            const roomExists = await checkRoomExists(roomId);
            if (!roomExists) {
                console.log(`Room ${roomId} does not exist`);
                alert("Room ID is incorrect or does not exist");
                return;
            }

            currentRoomId = roomId;
            document.getElementById('roomTitle').textContent = `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`;
            document.getElementById('generatedRoomId').textContent = currentRoomId;
            roomModal.classList.remove('active');

            const mediaStream = await initializeMedia();
            if (!mediaStream) {
                alert("Media access is required to join a room. Please grant camera/microphone permissions.");
                return;
            }

            localStream = mediaStream;
            myPeerId = getMyPeerId();
            initializeVideoCircles();
            // Set localVideo.srcObject after initializeVideoCircles to ensure it’s not cleared
            localVideo.srcObject = localStream;
            localVideo.play().catch(error => {
                console.error("Error playing local video:", error);
            });
            console.log("localVideo.srcObject after initializeVideoCircles:", localVideo.srcObject);

            const localParticipant = document.querySelector('.participant:nth-child(1)');
            if (localParticipant) {
                localParticipant.dataset.peerId = myPeerId;
                const localControls = localParticipant.querySelectorAll('.control-btn');
                localControls.forEach(btn => btn.dataset.peerId = myPeerId);
                addControlListeners(myPeerId);
            }

            socket = await connectWebSocket({
                currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
                displayMessage, peerConnections, peerList, initializeVideoCircles, chatMessages,
                handlePeerList, handleNewPeer, removeParticipant, localStream, action: "join"
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log("WebSocket connection delay completed, proceeding with room join");
            await startCallForRoom(myPeerId, peerList, socket, currentRoomId, peerConnections, removeParticipant);
            enableChat(sendButton, chatInput, sendMessageCallback, chatMessages);
            console.log(`Joined room successfully: ${currentRoomId}, Type: ${roomType}`);
        } catch (error) {
            console.error("Error joining room:", error);
            alert(`Failed to join room: ${error.message || 'Unknown error'}. Please check your network or try again.`);
            roomModal.classList.add('active');
        }
    });

    // Control Button Functionality with Mute and Video Toggling
    function addControlListeners(peerId) {
        console.log(`Adding control listeners for peer: ${peerId}`);
        const controls = document.querySelectorAll(`.control-btn[data-peer-id="${peerId}"]`);
        controls.forEach(button => {
            button.addEventListener('click', () => {
                const type = button.dataset.type;
                if (peerId === myPeerId) {
                    if (type === 'mic') {
                        toggleMute(peerId, button);
                    } else if (type === 'videocam') {
                        toggleVideo(peerId, button);
                    }
                } else {
                    console.log(`Cannot toggle controls for remote peer ${peerId} directly`);
                }
            });
        });
    }

    function toggleMute(peerId, button) {
        if (!localStream) {
            console.error("No local stream available to mute/unmute");
            return;
        }
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const isMuted = !audioTrack.enabled;
            button.style.opacity = isMuted ? '0.5' : '1';
            button.querySelector('span').textContent = isMuted ? 'mic_off' : 'mic'; // Update icon
            console.log(`Audio ${isMuted ? 'muted' : 'unmuted'} for peer ${peerId}`);
            broadcastMuteState('audio', isMuted);
            renegotiateConnection(); // Renegotiate to update peers
        }
    }
    
    function toggleVideo(peerId, button) {
        if (!localStream) {
            console.error("No local stream available to enable/disable video");
            return;
        }
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            const isVideoOff = !videoTrack.enabled;
            button.style.opacity = isVideoOff ? '0.5' : '1';
            button.querySelector('span').textContent = isVideoOff ? 'videocam_off' : 'videocam'; // Update icon
            console.log(`Video ${isVideoOff ? 'disabled' : 'enabled'} for peer ${peerId}`);
            broadcastMuteState('video', isVideoOff);
            renegotiateConnection(); // Renegotiate to update peers
        }
    }
    async function renegotiateConnection() {
        if (!socket || socket.readyState !== WebSocket.OPEN || !peerConnections || peerList.size <= 1) {
            console.warn("Cannot renegotiate: WebSocket not open or no peers to renegotiate with");
            return;
        }
    
        for (const peerId of peerList) {
            if (peerId !== myPeerId && peerConnections.has(peerId)) {
                const pc = peerConnections.get(peerId);
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    console.log(`Renegotiated offer created for peer ${peerId}`);
                    socket.send(JSON.stringify({
                        type: "offer",
                        offer,
                        peerId,
                        roomId: currentRoomId
                    }));
                } catch (error) {
                    console.error(`Error renegotiating with peer ${peerId}:`, error);
                }
            }
        }
    }

    function broadcastMuteState(type, state) {
        if (socket && socket.readyState === WebSocket.OPEN && currentRoomId) {
            const message = {
                type: type === 'audio' ? 'muteAudio' : 'muteVideo',
                roomId: currentRoomId,
                peerId: myPeerId,
                muted: state
            };
            socket.send(JSON.stringify(message));
            console.log(`Broadcasted ${type} state: ${state} for peer ${myPeerId}`);
        }
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

    function handlePeerList(peers) {
        console.log(`Received peerList for room ${currentRoomId}:`, peers);
        if (!myPeerId) myPeerId = getMyPeerId();
        peerList.clear();
        peerList.add(myPeerId);
        if (Array.isArray(peers)) {
            peers.forEach(peerId => {
                if (peerId !== myPeerId && !peerList.has(peerId)) {
                    peerList.add(peerId);
                }
            });
        } else {
            console.warn("No valid peers array received in peerList message");
        }
        console.log(`Updated peerList:`, Array.from(peerList));
        startCallForRoom(myPeerId, peerList, socket, currentRoomId, peerConnections, removeParticipant);
    }

    function handleNewPeer(newPeerId) {
        console.log(`New peer joined: ${newPeerId} in room ${currentRoomId}`);
        if (!myPeerId) myPeerId = getMyPeerId();
        if (!peerList.has(newPeerId)) {
            peerList.add(newPeerId);
            console.log(`Initiating connection to new peer ${newPeerId} (delayed)`);
            setTimeout(async () => {
                const pc = createPeerConnection(newPeerId, localStream, socket, currentRoomId, peerConnections, myPeerId, removeParticipant, peerList);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "offer",
                        offer,
                        peerId: newPeerId,
                        roomId: currentRoomId
                    }));
                } else {
                    console.warn("WebSocket not open, cannot send offer");
                }
            }, 2000);
        }
    }

    disableChat(sendButton, chatInput, sendMessageCallback);

    return { addDragListeners, removeParticipant, removeAllParticipants };
}