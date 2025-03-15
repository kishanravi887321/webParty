// script.js
import { setupAuth } from "./modules/auth.js";

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");

  // Check if user is already logged in
  const storedToken = localStorage.getItem("accessToken");
  const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;

  const loginBtn = document.getElementById("loginBtn");
  const userProfile = document.getElementById("userProfile");
  const userAvatar = document.getElementById("userAvatar");
  const dropdownUserAvatar = document.getElementById("dropdownUserAvatar");
  const dropdownUsername = document.getElementById("dropdownUsername");
  const dropdownEmail = document.getElementById("dropdownEmail");

  if (storedToken && storedUser) {
    console.log("User already logged in:", storedUser.username);
    // Update UI for logged-in user
    if (loginBtn) loginBtn.style.display = "none";
    if (userProfile) userProfile.style.display = "block";
    if (userAvatar) userAvatar.src = storedUser.avatar || "/placeholder.svg?height=40&width=40";
    if (dropdownUserAvatar) dropdownUserAvatar.src = storedUser.avatar || "/placeholder.svg?height=60&width=60";
    if (dropdownUsername) dropdownUsername.textContent = storedUser.username || "User";
    if (dropdownEmail) dropdownEmail.textContent = storedUser.email || "No email provided";
  }

  // Setup Authentication
  setupAuth({
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    authModal: document.getElementById("authModal"),
    userProfile: document.getElementById("userProfile"),
    userAvatar: document.getElementById("userAvatar"),
    dropdownUserAvatar: document.getElementById("dropdownUserAvatar"),
    dropdownUsername: document.getElementById("dropdownUsername"),
    dropdownEmail: document.getElementById("dropdownEmail"),
    avatarUpload: document.getElementById("avatarUpload"),
    avatarPreview: document.getElementById("avatarPreview"),
    coverImageUpload: document.getElementById("coverImageUpload"),
    coverPreview: document.getElementById("coverPreview"),
  });

  // Tab switching in auth modal
  const authTabs = document.querySelectorAll(".auth-tab");
  const authForms = document.querySelectorAll(".auth-form");
  const switchAuthLinks = document.querySelectorAll(".switch-auth");

  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;
      console.log("Switching to tab:", tabName);
      authTabs.forEach((t) => t.classList.remove("active"));
      authForms.forEach((f) => f.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`${tabName}Form`).classList.add("active");
    });
  });

  switchAuthLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tabName = link.dataset.tab;
      console.log("Switching to tab via link:", tabName);
      authTabs.forEach((t) => t.classList.remove("active"));
      authForms.forEach((f) => f.classList.remove("active"));
      document.querySelector(`.auth-tab[data-tab="${tabName}"]`).classList.add("active");
      document.getElementById(`${tabName}Form`).classList.add("active");
    });
  });

  // Close buttons for auth modal
  const closeButtons = document.querySelectorAll(".close-btn");
  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal) {
        modal.classList.remove("active");
      }
    });
  });

  // Get Started button
  document.getElementById("getStartedBtn").addEventListener("click", () => {
    const token = localStorage.getItem("accessToken"); // Updated to use accessToken
    if (token) {
      window.location.href = "./client/out/index.html"; // Redirect to out/index.html
    } else {
      document.getElementById("authModal").classList.add("active");
    }
  });

  // Rooms link
  document.getElementById("roomsLink").addEventListener("click", (e) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken"); // Updated to use accessToken
    if (token) {
      window.location.href = "./client/out/index.html"; // Redirect to out/index.html
    } else {
      alert("Please login to access rooms");
      document.getElementById("authModal").classList.add("active");
    }
  });

  // Footer Rooms link
  document.getElementById("footerRoomsLink").addEventListener("click", (e) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken"); // Updated to use accessToken
    if (token) {
      window.location.href = "./client/out/index.html"; // Redirect to out/index.html
    } else {
      alert("Please login to access rooms");
      document.getElementById("authModal").classList.add("active");
    }
  });
});