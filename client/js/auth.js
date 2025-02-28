// client/js/auth.js
const API_BASE_URL = "http://127.0.0.1:5000/api/users";
let token = null;
let username = "You"; // Default, update after login

// DOM Elements (Imported from ui.js)
import { loginForm, registerForm, authModal } from './ui.js';

// Auth Functions
export async function registerUser(event) {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const credentials = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        if (!response.ok) throw new Error('Registration failed');
        const data = await response.json();
        alert('Registration successful! Please log in.');
        authModal.classList.remove('active');
    } catch (error) {
        console.error("Registration error:", error);
        alert(`Registration failed: ${error.message}`);
    }
}

export async function loginUser(event) {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        if (!response.ok) throw new Error('Login failed');
        const data = await response.json();
        token = data.token;
        username = credentials.username;
        console.log(`Logged in as ${username} with token: ${token}`);
        alert('Login successful!');
        authModal.classList.remove('active');
    } catch (error) {
        console.error("Login error:", error);
        alert(`Login failed: ${error.message}`);
    }
}

export async function updatePassword(event) {
    event.preventDefault();
    if (!token) {
        alert('Please log in first.');
        return;
    }

    const formData = new FormData(authForms[2]); // Assuming update password form is the third form
    const newPassword = formData.get('newPassword');

    try {
        const response = await fetch(`${API_BASE_URL}/update-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newPassword })
        });

        if (!response.ok) throw new Error('Password update failed');
        alert('Password updated successfully!');
    } catch (error) {
        console.error("Password update error:", error);
        alert(`Password update failed: ${error.message}`);
    }
}

export async function forgotPassword() {
    const email = prompt('Enter your email to reset your password:');
    if (!email) return;

    try {
        const response = await fetch(`${API_BASE_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!response.ok) throw new Error('Password reset request failed');
        alert('Password reset link sent to your email!');
    } catch (error) {
        console.error("Forgot password error:", error);
        alert(`Password reset failed: ${error.message}`);
    }
}

// Event Listeners for Auth Forms
loginForm.addEventListener('submit', loginUser);
registerForm.addEventListener('submit', registerUser);

// Export for use in other files
export { token, username };