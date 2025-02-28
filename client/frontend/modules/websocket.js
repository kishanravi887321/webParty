// Declare socket globally so it persists across function calls
let socket = null;

export function connectWebSocket({
    currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
    displayMessage, peerConnections, peerList, initializeVideoCircles
}) {
    // ✅ Prevent accessing `socket` before it exists
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        console.warn("WebSocket already connected or connecting, skipping...");
        return socket;
    }

    // WebSocket URL for local development
    // const WEBSOCKET_URL = "wss://webparty-1.onrender.com"; // Production URL
    const WEBSOCKET_URL = "ws://127.0.0.1:5000";
    
    // ✅ Now using the global `socket` variable
    socket = new WebSocket(WEBSOCKET_URL);

    let connectTimeout;
    
    // WebSocket connection opened
    socket.onopen = () => {
        clearTimeout(connectTimeout);
        console.log("✅ WebSocket Connected to:", WEBSOCKET_URL);
        if (currentRoomId && myPeerId) {
            console.log(`Sending join with peerId: ${myPeerId}, roomId: ${currentRoomId}, roomType: ${roomType || 'private'}`);
            socket.send(JSON.stringify({ type: "join", roomId: currentRoomId, peerId: myPeerId, roomType: roomType || 'private' }));
        }
    };

    // WebSocket connection closed
    socket.onclose = () => {
        console.warn("⚠️ WebSocket Disconnected from:", WEBSOCKET_URL);
        socket = null;  // ✅ Reset socket so a new one can be created
        peerConnections.clear();
        peerList.clear();
        initializeVideoCircles();
        
        if (currentRoomId) {
            setTimeout(() => connectWebSocket({
                currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
                displayMessage, peerConnections, peerList, initializeVideoCircles
            }), 15000);
        }
    };

    // Handling incoming WebSocket messages
    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("📩 Received:", { type: data.type, roomId: data.roomId, peerId: data.peerId || "N/A", roomType: data.roomType });

        if (data.type === "offer") await handleOffer(data);
        else if (data.type === "answer") await handleAnswer(data);
        else if (data.type === "candidate") await handleCandidate(data);
        else if (data.type === "chat" && currentRoomId === data.roomId) displayMessage(data.username, data.message, false);
        else if (data.type === "peerList") handlePeerList(data.peers);
        else if (data.type === "newPeer") handleNewPeer(data.peerId);
        else if (data.type === "peerLeft") {
            removeParticipant(data.peerId);
            peerList.delete(data.peerId);
        } else if (data.type === "sfuStream" && currentRoomId === data.roomId) {
            console.log(`Received SFU stream for peer ${data.peerId} in room ${data.roomId}`);
            handleNewPeer(data.peerId);
        } else if (data.type === "error") {
            console.error("Server error:", data.message);
            if (data.message.includes("Duplicate peerId")) {
                console.warn("Regenerating peerId due to duplicate...");
                myPeerId = null;
                connectWebSocket({ currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate, displayMessage, peerConnections, peerList, initializeVideoCircles });
            } else if (data.message.includes("Private room is full")) {
                alert("This private room is full (max 2 users). Please try another room or create a new one.");
                roomModal.classList.add('active');
            }
            alert(`Server error: ${data.message}. Please try again or contact support.`);
        }
    };

    // Handling WebSocket errors
    socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
        alert(`WebSocket connection failed to ${WEBSOCKET_URL}. Please check your network or contact support if the issue persists.`);
        if (socket) {
            socket.close();
            socket = null;
            peerConnections.clear();
            peerList.clear();
            initializeVideoCircles();
            if (currentRoomId) {
                setTimeout(() => connectWebSocket({
                    currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
                    displayMessage, peerConnections, peerList, initializeVideoCircles
                }), 10000);
            }
        }
    };

    // Timeout to handle connection delays
    connectTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
            console.warn("WebSocket connection timed out, retrying...");
            socket.close();
            socket = null;
            setTimeout(() => connectWebSocket({
                currentRoomId, myPeerId, roomType, handleOffer, handleAnswer, handleCandidate,
                displayMessage, peerConnections, peerList, initializeVideoCircles
            }), 1000);
        }
    }, 1000);

    return socket;
}
