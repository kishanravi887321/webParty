// client/js/websocket.js
let socket;
let currentRoomId = null;
let myPeerId = null;
let peerList = new Set();

export function connectWebSocket() {
    socket = new WebSocket("ws://127.0.0.1:5000");

    socket.onopen = () => {
        console.log("✅ WebSocket Connected");
        if (currentRoomId && myPeerId) {
            console.log(`Sending join with peerId: ${myPeerId}, roomId: ${currentRoomId}`);
            socket.send(JSON.stringify({ type: "join", roomId: currentRoomId, peerId: myPeerId }));
        }
    };

    socket.onclose = () => {
        console.warn("⚠️ WebSocket Disconnected! Reconnecting in 3s...");
        setTimeout(() => {
            myPeerId = null; // Reset peerId to ensure a new one on reconnect
            connectWebSocket();
        }, 3000);
    };

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("📩 Received:", { type: data.type, roomId: data.roomId, peerId: data.peerId || "N/A" });

        if (data.type === "offer") {
            await handleOffer(data);
        } else if (data.type === "answer") {
            await handleAnswer(data);
        } else if (data.type === "candidate") {
            await handleCandidate(data);
        } else if (data.type === "chat" && currentRoomId === data.roomId) {
            displayMessage(data.username, data.message, false);
        } else if (data.type === "peerList") {
            handlePeerList(data.peers);
        } else if (data.type === "newPeer") {
            handleNewPeer(data.peerId);
        } else if (data.type === "peerLeft") {
            removeParticipant(data.peerId);
            peerList.delete(data.peerId);
        } else if (data.type === "error") {
            console.error("Server error:", data.message);
            if (data.message.includes("Duplicate peerId")) {
                console.warn("Attempting to regenerate peerId due to duplicate...");
                myPeerId = null; // Reset peerId to generate a new one
                connectWebSocket(); // Reconnect with a new peerId
            }
        }
    };

    socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
    };
}

// Export WebSocket-related variables and functions
export { socket, currentRoomId, myPeerId, peerList };

// Import required functions from logic.js
import { handleOffer, handleAnswer, handleCandidate, handlePeerList, handleNewPeer, removeParticipant, displayMessage, startCallForRoom } from './logic.js';

// Get a unique, persistent peer ID for the current user
export function getMyPeerId() {
    if (!myPeerId) {
        try {
            // Try sessionStorage first
            myPeerId = sessionStorage.getItem('peerId');
            if (!myPeerId) {
                // Fallback to localStorage if sessionStorage is blocked
                myPeerId = localStorage.getItem('peerId');
                if (!myPeerId) {
                    myPeerId = `peer-${Date.now()}-${crypto.randomUUID().split('-')[0] || Math.random().toString(36).substr(2, 9)}`;
                    sessionStorage.setItem('peerId', myPeerId); // Prefer sessionStorage
                    localStorage.setItem('peerId', myPeerId); // Fallback to localStorage
                } else {
                    sessionStorage.setItem('peerId', myPeerId); // Sync to sessionStorage if possible
                }
            }
        } catch (e) {
            console.warn("Storage access blocked by tracking prevention, using fallback peerId");
            // Fallback if storage is blocked (e.g., tracking prevention)
            myPeerId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        console.log(`Generated/Retrieved persistent peerId: ${myPeerId}`);
    }
    return myPeerId;
}