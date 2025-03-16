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
   
    coverPreview,
  }) {
    if (!loginForm || !registerForm) {
        console.error("Login or register form not found");
        return;
    }
  
    console.log("Setting up auth module");
  
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
            console.log("hello");
    
            const data = await response.json();
            console.log("Server response:", data); // Debug: Log the response to confirm
    
            // Reset button
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
    
            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }
    
            // Validate that data.data.user exists and has the expected properties
            if (!data.data || !data.data.user || typeof data.data.user !== "object") {
                throw new Error("User data not found in response");
            }
    
            // Store accessToken and user data
            localStorage.setItem("accessToken", data.data.accessToken);
            localStorage.setItem("user", JSON.stringify(data.data.user));
    
            // Update UI
            loginBtn.style.display = "none";
            userProfile.style.display = "block";
            userAvatar.src = data.data.user.avatar || "/placeholder.svg?height=40&width=40";
            console.log("the full data is :",data)
            console.log("the userName is :",data.data.user.fullName)
            dropdownUserAvatar.src = data.data.user.avatar || "/placeholder.svg?height=60&width=60";
            dropdownUsername.textContent = data.data.user.fullName ||data.data.user.userName || "user"; // Updated to userName
            dropdownEmail.textContent = data.data.user.email || "No email provided";
    
            // Close modal
            authModal.classList.remove("active");
    
            // Reset form
            loginForm.reset();
    
            alert("Login successful!");
            window.location.href = "./client/index.html"; // Redirect after login
        } catch (error) {
            console.error("Login error:", error);
            alert(`Login failed: ${error.message}`);
            loginForm.reset();
        } finally {
            // Ensure button reverts to original state regardless of success or failure
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
    // Register form submission
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Register form submitted");

        const fullName = registerForm.querySelector('input[name="fullName"]').value;
        const userName = registerForm.querySelector('input[name="username"]').value;
        const email = registerForm.querySelector('input[name="email"]').value;
        const password = registerForm.querySelector('input[name="password"]').value;
        const confirmPassword = registerForm.querySelector('input[name="confirmPassword"]').value;
        const avatarFile = avatarUpload.files[0];

        if (!fullName || !userName || !email || !password || !confirmPassword) {
            alert("Please fill in all required fields");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        if (avatarFile && !avatarFile.type.startsWith('image/')) {
            alert("Avatar must be an image file");
            return;
        }

        try {
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="material-icons">hourglass_top</span> Registering...';
            submitBtn.disabled = true;

            const formData = new FormData();
            formData.append("fullName", fullName);
            formData.append("userName", userName);
            formData.append("email", email);
            formData.append("password", password);

            if (avatarFile) {
                formData.append("avatar", avatarFile);
            }

            const response = await fetch("https://webparty-1.onrender.com/api/users/register", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            const data = await response.json();
            console.log("Server response:", data);

            if (!response.ok) {
                throw new Error(data.message || "Registration failed");
            }

            if (!data.user || typeof data.user !== "object") {
                throw new Error("User data not found in response");
            }

            const avatarUrl = data.user.avatar;
            console.log("Avatar URL:", avatarUrl);
            if (!avatarUrl || typeof avatarUrl !== "string") {
                console.warn("Avatar URL is invalid, using placeholder");
            }

            if (data.accessToken) {
                localStorage.setItem("accessToken", data.accessToken);
            } else {
                console.warn("No accessToken in response, skipping storage");
            }
            localStorage.setItem("user", JSON.stringify(data.user));

            loginBtn.style.display = "none";
            userProfile.style.display = "block";
            userAvatar.src = avatarUrl && typeof avatarUrl === "string" ? avatarUrl : "/placeholder.svg?height=40&width=40";
            dropdownUserAvatar.src = avatarUrl && typeof avatarUrl === "string" ? avatarUrl : "/placeholder.svg?height=60&width=60";
            dropdownUsername.textContent = data.user.userName || "User";
            dropdownEmail.textContent = data.user.email || "No email provided";

            authModal.classList.remove("active");

            registerForm.reset();
            avatarPreview.src = "/placeholder.svg?height=100&width=100";

            alert("Registration successful!");
            window.location.href = "./index.html";
        } catch (error) {
            console.error("Registration error:", error);
            
            registerForm.reset();
            alert(`Registration failed: ${error.message}`);
        } finally {
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
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
            window.location.href = "./index.html";
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
   
  }