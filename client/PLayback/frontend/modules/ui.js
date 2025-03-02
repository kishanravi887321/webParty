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

    let currentLeader = null; // Track current leader's peerId
    let videoPlayer = null;
    let currentVideoUrl = null;

    const videoUrlInput = document.getElementById('videoUrl');
    const submitVideoUrlBtn = document.getElementById('submitVideoUrl');
    const mainVideo = document.getElementById('mainVideo');

    const sendMessageCallback = (chatInput) => sendMessage(chatInput, socket, currentRoomId, username, displayMessage, chatMessages, myPeerId);

    // Modal controls
    loginBtn.addEventListener('click', () => {
        if (authModal) authModal.classList.add('active');
        else console.error("authModal element not found in DOM");
    });

    selectRoomBtn.addEventListener('click', () => {
        if (roomModal) roomModal.classList.add('active');
        else console.error("roomModal element not found in DOM");
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

    // Function to update and display the fixed, scrollable user list in the sidebar with a close button and show button
    function updateUserList(show = true) {
        const userListContainer = document.getElementById('userListContainer');
        const showUserListBtn = document.getElementById('showUserListBtn');
        if (!userListContainer || !showUserListBtn) {
            console.error("User list or show button not found in DOM. Check index.html for presence of #userListContainer and #showUserListBtn.");
            return;
        }

        if (show) {
            const users = Array.from(peerList);
            userListContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <p style="color: #0f0; margin: 0;">${users.length} users in room:</p>
                    <button class="close-btn" style="background: none; border: none; color: #0f0; font-size: 1.2rem; cursor: pointer; padding: 0 5px;" aria-label="Close user list">×</button>
                </div>
            `;
            users.forEach(peerId => {
                const isLeader = peerId === currentLeader;
                const displayName = peerId === myPeerId ? `${username} (You)` : peerId;
                const userItem = document.createElement('div');
                userItem.textContent = `${isLeader ? 'Host: ' : 'User: '} ${displayName}`;
                userItem.style.padding = '5px';
                userItem.style.color = '#0f0';
                if (isLeader) userItem.style.fontWeight = 'bold';
                userListContainer.appendChild(userItem);
            });
            userListContainer.style.maxHeight = '150px'; // Fixed height with scrolling
            userListContainer.style.overflowY = 'auto'; // Enable scrolling for more users
            userListContainer.style.display = 'block'; // Show the container
            showUserListBtn.style.display = 'none'; // Hide show button when list is visible

            // Add close button functionality
            const closeBtn = userListContainer.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
                userListContainer.style.display = 'none'; // Hide on close button click
                showUserListBtn.style.display = 'block'; // Show button to re-display
            });

            // Hide on click outside
            document.addEventListener('click', (e) => {
                if (!userListContainer.contains(e.target) && e.target !== closeBtn && e.target !== showUserListBtn) {
                    userListContainer.style.display = 'none'; // Hide if clicking outside
                    showUserListBtn.style.display = 'block'; // Show button to re-display
                }
            }, { capture: true });
        } else {
            userListContainer.style.display = 'none'; // Hide the container
            showUserListBtn.style.display = 'block'; // Show button to re-display
            // Ensure the show button event listener is added or re-added
            showUserListBtn.removeEventListener('click', showUserListHandler); // Remove existing to prevent duplicates
            showUserListBtn.addEventListener('click', showUserListHandler);
        }
    }

    // Handler for the show button
    const showUserListHandler = () => {
        updateUserList(true); // Show user list when "View Users" is clicked
        console.log("View Users button clicked, showing user list");
    };

    // Initialize the show button event listener immediately and ensure persistence
    document.addEventListener('DOMContentLoaded', () => {
        const showUserListBtn = document.getElementById('showUserListBtn');
        if (showUserListBtn) {
            showUserListBtn.addEventListener('click', showUserListHandler);
            console.log("Show Users button event listener initialized on DOM load");
        } else {
            console.error("Show Users button (#showUserListBtn) not found in DOM on load");
        }
    });

    // Re-check and re-apply event listener if DOM changes
    function ensureShowButtonListener(isCreator = false) {
        const showUserListBtn = document.getElementById('showUserListBtn');
        const videoUrlInput = document.getElementById('videoUrl'); // Reference to existing video URL input
        const submitVideoBtn = document.getElementById('submitVideoUrl'); // Reference to submit video button
    
        // Existing showUserListBtn logic
        if (showUserListBtn && !showUserListBtn.listenerAttached) {
            showUserListBtn.removeEventListener('click', showUserListHandler);
            showUserListBtn.addEventListener('click', showUserListHandler);
            showUserListBtn.listenerAttached = true;
            console.log("Re-applied Show Users button event listener");
        }
    
        // Handle the existing video URL input and submit button only for the room creator
        if (isCreator && myPeerId === currentLeader) {
            if (videoUrlInput) {
                // Make the input visible (in case it's hidden)
                videoUrlInput.style.display = 'block';
                // Enable the input by removing the disabled attribute
                videoUrlInput.removeAttribute('disabled');
            }

            if (submitVideoBtn) {
                // Make the button visible (in case it's hidden)
                submitVideoBtn.style.display = 'block';
                // Ensure the button is enabled (remove disabled if present)
                submitVideoBtn.removeAttribute('disabled'); // Only if it’s disabled in HTML or elsewhere
            }
            setupVideoControls(); // Ensure video controls are properly set up for the leader
        } else {
            // Hide and disable for non-creators (joiners)
            if (videoUrlInput) {
                videoUrlInput.style.display = 'none';
                videoUrlInput.setAttribute('disabled', 'disabled');
            }
            if (submitVideoBtn) {
                submitVideoBtn.style.display = 'none';
                submitVideoBtn.setAttribute('disabled', 'disabled');
            }
        }
    }
    
    // Call ensureShowButtonListener when creating or joining a room
    createRoomBtn.addEventListener('click', () => {
        ensureShowButtonListener(true); // Pass true to indicate the user is the creator
        // Automatically play video if a URL is already entered
        const url = videoUrlInput?.value?.trim();
        if (url) {
            initializeVideoPlayer(url);
        }
    });

    joinRoomBtn.addEventListener('click', async () => {
        ensureShowButtonListener(false); // Pass false to indicate the user is joining (not the creator)
        
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
            document.getElementById('roomTitle').textContent = roomType === 'private' ? 'Private Room' : 'Normal Room';
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
            currentLeader = null; // Will be updated by peerList or leaderUpdate
            updateUserList(true); // Initialize user list for all users, shown by default
            console.log(`Joined room successfully: ${currentRoomId}, Type: ${roomType}`);
        } catch (error) {
            console.error("Error joining room:", error);
            alert(`Failed to join room: ${error.message || 'Unknown error'}. Please check your network or try again.`);
            roomModal.classList.add('active');
        }
    });

    function transferLeadership(toPeerId) {
        if (myPeerId === currentLeader && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: "transferLeadership",
                roomId: currentRoomId,
                newLeaderId: toPeerId
            }));
            // Refresh user list to reflect new leadership, shown by default
            updateUserList(true);
        } else {
            console.log("Only the leader can transfer leadership or WebSocket not open.");
        }
    }

    // Handle leadership updates from the server (peerList and leaderUpdate)
    function handleLeaderUpdate(leaderPeerId) {
        currentLeader = leaderPeerId;
        updateUserList(true); // Refresh user list to reflect new leader, shown by default
        restrictVideoControls(); // Update video controls based on leadership
        ensureShowButtonListener(myPeerId === leaderPeerId); // Re-evaluate visibility of video controls
        console.log(`Leader updated to: ${leaderPeerId}`);
    }

    createRoomBtn.addEventListener('click', async () => {
        console.log("Create Room button clicked");
        const selectedRoom = document.querySelector('.room-option.selected');
        if (!selectedRoom) {
            alert('Please select a room type');
            return;
        }

        const roomType = selectedRoom.dataset.type;
        currentRoomId = generateRoomId();
        document.getElementById('roomTitle').textContent = roomType === 'private' ? 'Private Room' : 'Normal Room';
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
            socket = await connectWebSocket({
                currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
                displayMessage, peerConnections, peerList, initializeVideoCircles, chatMessages,
                handlePeerList, handleNewPeer, removeParticipant, localStream, action: "createRoom"
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log("WebSocket connection delay completed, proceeding with room setup");
            await startCallForRoom(myPeerId, peerList, socket, currentRoomId, peerConnections, removeParticipant);
            enableChat(sendButton, chatInput, sendMessageCallback, chatMessages);
            currentLeader = myPeerId; // Set creator as initial leader
            updateUserList(true); // Initialize user list for all users, shown by default
            restrictVideoControls(); // Restrict video controls to leader
            ensureShowButtonListener(true); // Show and enable video controls for the creator
            console.log(`Room created successfully: ${currentRoomId}, Type: ${roomType}`);
            
            // Automatically play video if a URL is already entered
            const url = videoUrlInput?.value?.trim();
            if (url) {
                initializeVideoPlayer(url);
            }
        } catch (error) {
            console.error("Error creating room:", error);
            alert(`Failed to create room: ${error.message || 'Unknown error'}. Please check your network or contact support if the issue persists.`);
            roomModal.classList.add('active');
        }
    });

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
            console.log(`Audio ${isMuted ? 'muted' : 'unmuted'} for peer ${peerId}`);
            broadcastMuteState('audio', isMuted);
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
            console.log(`Video ${isVideoOff ? 'disabled' : 'enabled'} for peer ${peerId}`);
            broadcastMuteState('video', isVideoOff);
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
        // Update user list after removing participant, shown by default
        updateUserList(true);
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
        // Ensure user list is updated for all users, shown by default
        updateUserList(true);
        
        // Re-evaluate visibility of video URL input and submit button based on current leadership
        ensureShowButtonListener(myPeerId === currentLeader);
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
            // Update user list for all users when a new peer joins, shown by default
            updateUserList(true);
            
            // Re-evaluate visibility of video URL input and submit button based on current leadership
            ensureShowButtonListener(myPeerId === currentLeader);
        }
    }

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
            document.getElementById('roomTitle').textContent = roomType === 'private' ? 'Private Room' : 'Normal Room';
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
            currentLeader = null; // Will be updated by peerList or leaderUpdate
            updateUserList(true); // Initialize user list for all users, shown by default
            ensureShowButtonListener(false); // Hide and disable video controls for joiners
            console.log(`Joined room successfully: ${currentRoomId}, Type: ${roomType}`);
        } catch (error) {
            console.error("Error joining room:", error);
            alert(`Failed to join room: ${error.message || 'Unknown error'}. Please check your network or try again.`);
            roomModal.classList.add('active');
        }
    });

    disableChat(sendButton, chatInput, sendMessageCallback);

    // Video playback initialization and synchronization
    function initializeVideoPlayer(url) {
        if (!url || typeof url !== 'string') {
            console.error('Invalid video URL provided:', url);
            alert('Please enter a valid video URL.');
            return;
        }

        console.log(`Attempting to initialize video player with URL: ${url}`);

        // Clear existing video
        if (videoPlayer) {
            if (videoPlayer.stopVideo) videoPlayer.stopVideo(); // For YouTube
            videoPlayer = null;
        }

        // Prepare the main video container
        if (!mainVideo) {
            console.error("Main video element not found in DOM");
            return;
        }
        
        mainVideo.innerHTML = ''; // Clear any existing content
        mainVideo.style.display = 'block'; // Show video player
        mainVideo.style.width = '100%'; // Ensure it takes full width
        mainVideo.style.height = 'auto'; // Allow height to adjust naturally

        try {
            // Handle YouTube URLs
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                loadYouTubeVideo(url);
            } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
                // Handle direct video links
                loadDirectVideo(url);
            } else if (url.includes('pcloud.link') || url.includes('iframe')) {
                // Handle pCloud iframe or similar embed links
                loadIframeVideo(url);
            } else {
                console.warn(`Unsupported video format: ${url}`);
                alert('Unsupported video format. Please provide a YouTube URL, direct MP4/WebM link, or an iframe embed link (e.g., pCloud).');
                return;
            }

            currentVideoUrl = url;
            broadcastVideoUrl(url);
            console.log(`Video player initialized successfully with: ${url}`);
        } catch (error) {
            console.error('Error initializing video player:', error);
            alert('Failed to load video. Please check the URL and try again.');
        }
    }

    // Split video loading by type for better error isolation
    function loadYouTubeVideo(url) {
        const videoId = extractYouTubeId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL or video ID could not be extracted');
        }
        
        // Check if YouTube API is already loaded
        if (typeof YT !== 'undefined' && YT.Player) {
            createYouTubePlayer(videoId);
        } else {
            // Load YouTube API if not already loaded
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            // Set callback for when API is ready
            window.onYouTubeIframeAPIReady = function() {
                createYouTubePlayer(videoId);
            };
        }
    }

    // Helper function to extract YouTube ID from various URL formats
    function extractYouTubeId(url) {
        let videoId = null;
        
        // Handle standard youtube.com URLs
        if (url.includes('youtube.com/watch')) {
            try {
                videoId = new URL(url).searchParams.get('v');
            } catch (e) {
                // If URL parsing fails, try regex
                const match = url.match(/[?&]v=([^&#]*)/);
                videoId = match && match[1];
            }
        } 
        // Handle youtu.be short URLs
        else if (url.includes('youtu.be')) {
            try {
                videoId = url.split('/').pop().split('?')[0];
            } catch (e) {
                console.error('Error extracting YouTube ID from short URL:', e);
            }
        }
        
        return videoId;
    }

    // Create YouTube player with proper event handling
    function createYouTubePlayer(videoId) {
        console.log(`Creating YouTube player with video ID: ${videoId}`);
        
        // First clear the container
        mainVideo.innerHTML = '';
        
        // Create a div for the player
        const playerDiv = document.createElement('div');
        playerDiv.id = 'youtube-player-container';
        mainVideo.appendChild(playerDiv);
        
        videoPlayer = new YT.Player(playerDiv.id, {
            height: '600',
            width: '1000',
            videoId: videoId,
            playerVars: {
                'autoplay': myPeerId === currentLeader ? 1 : 0,
                'controls': myPeerId === currentLeader ? 1 : 0,
                'rel': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': (event) => {
                    console.error('YouTube Player Error:', event.data);
                    alert('Error loading YouTube video. Please check the URL and try again.');
                }
            }
        });
    }

    // Improved direct video loading
    function loadDirectVideo(url) {
        console.log(`Loading direct video from URL: ${url}`);
        
        // Clear existing content and create a fresh video element
        mainVideo.innerHTML = '';
        const videoElement = document.createElement('video');
        videoElement.id = 'direct-video-player';
        videoElement.controls = myPeerId === currentLeader;
        videoElement.width = '100%';
        videoElement.height = 'auto';
        mainVideo.appendChild(videoElement);
        
        videoElement.onloadedmetadata = function() {
            console.log("Video metadata loaded successfully");
        };
        
        videoElement.onerror = function() {
            console.error("Error loading video:", videoElement.error);
            alert('Error loading video. The URL might be inaccessible or format not supported.');
        };
        
        // Set source and attempt to play
        videoElement.src = url;
        
        if (myPeerId === currentLeader) {
            videoElement.play().catch(error => {
                console.error("Error playing video:", error);
                alert('Autoplay was prevented. Please click play manually.');
            });
        }
        
        videoPlayer = videoElement;
        
        // Add event listeners for leader to broadcast playback state
        if (myPeerId === currentLeader) {
            videoElement.addEventListener('play', () => broadcastPlaybackState('videoPlay'));
            videoElement.addEventListener('pause', () => broadcastPlaybackState('videoPause'));
            videoElement.addEventListener('seeked', () => broadcastPlaybackState('videoSeek'));
        }
    }

    // Improved iframe video loading
    function loadIframeVideo(url) {
        console.log(`Loading iframe video from URL: ${url}`);
        
        mainVideo.innerHTML = ''; // Clear any existing content
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.width = '1000';
        iframe.height = '600';
        iframe.frameBorder = '0';
        iframe.allow = 'autoplay; encrypted-media';
        iframe.allowFullscreen = true;
        
        // Add load event to verify iframe loaded
        iframe.onload = function() {
            console.log("Iframe loaded successfully");
        };
        
        iframe.onerror = function() {
            console.error("Error loading iframe");
            alert('Error loading video iframe. The URL might be inaccessible.');
        };
        
        mainVideo.appendChild(iframe);
        videoPlayer = iframe;
    }

    // Improved player ready handler with better error handling
    function onPlayerReady(event) {
        console.log("YouTube player ready event triggered");
        
        try {
            if (myPeerId === currentLeader) {
                if (event.target.playVideo) {
                    event.target.playVideo();
                    console.log("YouTube video playback started by leader");
                } else if (event.target.play) {
                    event.target.play()
                        .then(() => console.log("Video playback started by leader"))
                        .catch(error => console.error("Error auto-playing video:", error));
                }
            } else {
                console.log("Not leader, waiting for playback commands");
            }
        } catch (error) {
            console.error("Error in onPlayerReady:", error);
        }
    }

    // Improved player state change handler
    function onPlayerStateChange(event) {
        if (myPeerId !== currentLeader) {
            console.log("Ignoring state change since not leader");
            return;
        }
        
        try {
            if (event.data === YT.PlayerState.PLAYING) {
                console.log("Leader broadcasting PLAY state");
                broadcastPlaybackState('videoPlay');
            } else if (event.data === YT.PlayerState.PAUSED) {
                console.log("Leader broadcasting PAUSE state");
                broadcastPlaybackState('videoPause');
            } else if (event.data === YT.PlayerState.ENDED) {
                console.log("Leader broadcasting video ENDED");
                broadcastPlaybackState('videoPause');
            }
        } catch (error) {
            console.error("Error in onPlayerStateChange:", error);
        }
    }

    // Improved video URL broadcast
    function broadcastVideoUrl(url) {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.error("Cannot broadcast video URL: WebSocket not connected");
            return;
        }
        
        if (myPeerId !== currentLeader) {
            console.log("Only leader can broadcast video URL");
            return;
        }
        
        try {
            socket.send(JSON.stringify({
                type: "videoURL",
                roomId: currentRoomId,
                peerId: myPeerId,
                url: url
            }));
            console.log(`Broadcasted video URL: ${url}`);
        } catch (error) {
            console.error("Error broadcasting video URL:", error);
            alert("Failed to share video with other participants. Try again or check your connection.");
        }
    }

    // Improved playback state broadcast
    function broadcastPlaybackState(action) {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.error(`Cannot broadcast ${action}: WebSocket not connected`);
            return;
        }
        
        if (myPeerId !== currentLeader) {
            console.log(`Only leader can broadcast ${action}`);
            return;
        }
        
        try {
            let time = 0;
            
            // Get current time based on player type
            if (videoPlayer) {
                if (videoPlayer.getCurrentTime) {
                    time = videoPlayer.getCurrentTime();
                } else if (videoPlayer.currentTime !== undefined) {
                    time = videoPlayer.currentTime;
                }
            }
            
            socket.send(JSON.stringify({
                type: action,
                roomId: currentRoomId,
                peerId: myPeerId,
                time: time
            }));
            console.log(`Broadcasted ${action} at time: ${time}`);
        } catch (error) {
            console.error(`Error broadcasting ${action}:`, error);
        }
    }

    // Ensure button listeners are properly set
    function setupVideoControls() {
        if (!submitVideoUrlBtn || !videoUrlInput) {
            console.error("Video URL input or submit button not found in DOM");
            return;
        }
        
        // Remove any existing listeners to prevent duplicates
        submitVideoUrlBtn.removeEventListener('click', submitVideoUrlHandler);
        submitVideoUrlBtn.addEventListener('click', submitVideoUrlHandler);
        
        // Enable or disable based on leader status
        if (myPeerId === currentLeader) {
            videoUrlInput.disabled = false;
            submitVideoUrlBtn.disabled = false;
            videoUrlInput.style.display = 'block';
            submitVideoUrlBtn.style.display = 'block';
        } else {
            videoUrlInput.disabled = true;
            submitVideoUrlBtn.disabled = true;
            videoUrlInput.style.display = 'none';
            submitVideoUrlBtn.style.display = 'none';
        }
        
        console.log(`Video controls setup complete. Leader status: ${myPeerId === currentLeader}`);
    }

    function submitVideoUrlHandler() {
        const url = videoUrlInput.value.trim();
        if (url) {
            console.log(`Submitting video URL: ${url}`);
            initializeVideoPlayer(url);
        } else {
            alert('Please enter a valid video URL.');
        }
    }

    // Better restriction of video controls with improved visibility
    function restrictVideoControls() {
        if (!mainVideo) {
            console.error("Main video element not found when restricting controls");
            return;
        }
        
        console.log(`Restricting video controls. Current user: ${myPeerId}, Leader: ${currentLeader}`);
        
        if (myPeerId !== currentLeader) {
            // Non-leader: Can view but not control
            if (videoPlayer && videoPlayer instanceof HTMLVideoElement) {
                videoPlayer.controls = false;
            }
            
            mainVideo.style.pointerEvents = 'none';
            // Important: Don't hide video for non-leaders, just disable controls
            mainVideo.style.display = 'block';
            
            // For YouTube specifically
            if (videoPlayer && videoPlayer.getOptions) {
                try {
                    videoPlayer.setOption('controls', 0);
                } catch (e) {
                    console.warn("Could not disable YouTube controls:", e);
                }
            }
        } else {
            // Leader: Full control
            if (videoPlayer && videoPlayer instanceof HTMLVideoElement) {
                videoPlayer.controls = true;
            }
            
            mainVideo.style.pointerEvents = 'auto';
            mainVideo.style.display = 'block';
            
            // For YouTube specifically
            if (videoPlayer && videoPlayer.getOptions) {
                try {
                    videoPlayer.setOption('controls', 1);
                } catch (e) {
                    console.warn("Could not enable YouTube controls:", e);
                }
            }
        }
    }

    // Improved WebSocket message handler for video events
    function handleVideoWebSocketMessage(data) {
        if (!data || !data.type || !data.roomId || data.roomId !== currentRoomId) {
            return;
        }
        
        console.log(`Received video-related WebSocket message: ${data.type}`);
        
        try {
            switch (data.type) {
                case "videoURL":
                    if (data.peerId !== myPeerId && data.url) {
                        console.log(`Received video URL from leader: ${data.url}`);
                        initializeVideoPlayer(data.url);
                    }
                    break;
                    
                case "videoPlay":
                    if (videoPlayer) {
                        if (videoPlayer.playVideo) {
                            videoPlayer.seekTo(data.time || 0, true);
                            videoPlayer.playVideo();
                        } else if (videoPlayer instanceof HTMLVideoElement) {
                            videoPlayer.currentTime = data.time || 0;
                            videoPlayer.play().catch(error => {
                                console.error("Error playing video on sync:", error);
                                alert("Autoplay was prevented. Please click to interact with the video.");
                            });
                        }
                        console.log(`Video playback synced to time: ${data.time || 0}`);
                    }
                    break;
                    
                case "videoPause":
                    if (videoPlayer) {
                        if (videoPlayer.pauseVideo) {
                            videoPlayer.pauseVideo();
                        } else if (videoPlayer instanceof HTMLVideoElement) {
                            videoPlayer.pause();
                        }
                        console.log(`Video playback paused`);
                    }
                    break;
                    
                case "videoSeek":
                    if (videoPlayer) {
                        if (videoPlayer.seekTo) {
                            videoPlayer.seekTo(data.time || 0, true);
                        } else if (videoPlayer instanceof HTMLVideoElement) {
                            videoPlayer.currentTime = data.time || 0;
                        }
                        console.log(`Video playback seeked to time: ${data.time || 0}`);
                    }
                    break;
                    
                case "leaderUpdate":
                    if (data.leaderPeerId) {
                        handleLeaderUpdate(data.leaderPeerId);
                        // Re-evaluate video controls after leader change
                        restrictVideoControls();
                        setupVideoControls();
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error handling video WebSocket message (${data.type}):`, error);
        }
    }

    // Integrate WebSocket message handling
    if (socket) {
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleVideoWebSocketMessage(data);

            // Existing message handling (offer, answer, etc.) remains unchanged
            if (data.type === "offer") {
                handleOffer(data, socket, currentRoomId, peerConnections, myPeerId, removeParticipant, peerList);
            } else if (data.type === "answer") {
                handleAnswer(data, peerConnections);
            } else if (data.type === "candidate") {
                handleCandidate(data, peerConnections);
            } else if (data.type === "chat" && currentRoomId === data.roomId) {
                displayMessage(data.username, data.message, false, chatMessages);
            } else if (data.type === "peerList" && typeof handlePeerList === 'function') {
                handlePeerList(data.peers);
                if (data.leaderPeerId) handleLeaderUpdate(data.leaderPeerId);
            } else if (data.type === "newPeer" && typeof handleNewPeer === 'function') {
                handleNewPeer(data.peerId);
            } else if (data.type === "peerLeft") {
                removeParticipant(data.peerId);
                peerList.delete(data.peerId);
            } else if (data.type === "sfuStream" && currentRoomId === data.roomId) {
                console.log(`Received SFU stream for peer ${data.peerId} in room ${data.roomId}`);
                handleNewPeer(data.peerId);
            } else if (data.type === "roomClosed") {
                console.log(`Room ${data.roomId} closed: ${data.message}`);
                alert(`Room ${data.roomId} has been closed: ${data.message}`);
                window.location.reload(); // Simple reset, adjust as needed
            } else if (data.type === "error") {
                console.error("Server error:", data.message);
                alert(`Server error: ${data.message}. Please try again or contact support.`);
            }
        };
    }

    return { addDragListeners, removeParticipant, removeAllParticipants };
}