// modules/auth.js
export function setupAuth({
    loginForm,
    registerForm,
    loginBtn,
    logoutBtn,
    authModal,
    userProfile,
    userAvatar,
    dropdownUserAvatar,
    dropdownUsername,
    dropdownEmail,
    avatarUpload,
    avatarPreview,
    coverImageUpload,
    coverPreview,
  }) {
    if (!loginForm || !registerForm) {
        console.error("Login or register form not found");
        return;
    }
  
    console.log("Setting up auth module");
  
    // Login form submission
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Login form submitted");
  
        const email = loginForm.querySelector('input[name="email"]').value;
        const password = loginForm.querySelector('input[name="password"]').value;
  
        if (!email || !password) {
            alert("Please fill in all fields");
            return;
        }
  
        try {
            // Show loading indicator
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="material-icons">hourglass_top</span> Logging in...';
            submitBtn.disabled = true;
  
            const response = await fetch("https://webparty-1.onrender.com/api/users/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
                credentials: "include", // Ensures cookies are stored
            });
            console.log("heloo")
  
            const data = await response.json();
  
            // Reset button
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
  
            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }
  
            // Store accessToken and user data
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("user", JSON.stringify(data.user));
  
            // Update UI
            loginBtn.style.display = "none";
            userProfile.style.display = "block";
            userAvatar.src = data.user.avatar || "/placeholder.svg?height=40&width=40";
            dropdownUserAvatar.src = data.user.avatar || "/placeholder.svg?height=60&width=60";
            dropdownUsername.textContent = data.user.username || "User";
            dropdownEmail.textContent = data.user.email || "No email provided";
  
            // Close modal
            authModal.classList.remove("active");
  
            // Reset form
            loginForm.reset();
  
            alert("Login successful!");
            window.location.href = "out/index.html"; // Redirect after login
        } catch (error) {
            console.error("Login error:", error);
            alert(`Login failed: ${error.message}`);
        }
    });
  
    // Register form submission
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Register form submitted");
  
        const fullName = registerForm.querySelector('input[name="fullName"]').value;
        const username = registerForm.querySelector('input[name="username"]').value;
        const email = registerForm.querySelector('input[name="email"]').value;
        const password = registerForm.querySelector('input[name="password"]').value;
        const confirmPassword = registerForm.querySelector('input[name="confirmPassword"]').value;
        const avatarFile = avatarUpload.files[0];
        const coverFile = coverImageUpload.files[0];
  
        if (!fullName || !username || !email || !password || !confirmPassword) {
            alert("Please fill in all required fields");
            return;
        }
  
        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
  
        try {
            // Show loading indicator
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="material-icons">hourglass_top</span> Registering...';
            submitBtn.disabled = true;
  
            // Create FormData for file uploads
            const formData = new FormData();
            formData.append("fullName", fullName);
            formData.append("username", username);
            formData.append("email", email);
            formData.append("password", password);
  
            if (avatarFile) {
                formData.append("avatar", avatarFile);
            }
  
            if (coverFile) {
                formData.append("coverImage", coverFile);
            }
  
            const response = await fetch("https://webparty-1.onrender.com/api/users/register", {
                method: "POST",
                body: formData,
                credentials: "include",
            });
  
            // Reset button
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
  
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Registration failed");
            }
  
            const data = await response.json();
  
            // Store accessToken and user data
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("user", JSON.stringify(data.user));
  
            // Update UI
            loginBtn.style.display = "none";
            userProfile.style.display = "block";
            userAvatar.src = data.user.avatar || "/placeholder.svg?height=40&width=40";
            dropdownUserAvatar.src = data.user.avatar || "/placeholder.svg?height=60&width=60";
            dropdownUsername.textContent = data.user.username || "User";
            dropdownEmail.textContent = data.user.email || "No email provided";
  
            // Close modal
            authModal.classList.remove("active");
  
            // Reset form
            registerForm.reset();
            avatarPreview.src = "/placeholder.svg?height=100&width=100";
            coverPreview.src = "/placeholder.svg?height=200&width=400";
  
            alert("Registration successful!");
            window.location.href = "out/index.html"; // Redirect after registration
        } catch (error) {
            console.error("Registration error:", error);
            alert(`Registration failed: ${error.message}`);
        }
    });
  
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
  
            // Clear local storage
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
  
            // Update UI
            loginBtn.style.display = "block";
            userProfile.style.display = "none";
  
            // Redirect to home
            window.location.href = "/";
        });
    }
  
    // Avatar upload preview
    if (avatarUpload && avatarPreview) {
        avatarUpload.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
  
    // Cover image upload preview
    if (coverImageUpload && coverPreview) {
        coverImageUpload.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    coverPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
  }