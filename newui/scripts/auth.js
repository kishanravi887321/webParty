// Authentication related JavaScript
document.addEventListener("DOMContentLoaded", () => {
    // Check if user is logged in
    checkAuthStatus()
  
    // Login Button
    document.getElementById("login-btn").addEventListener("click", () => {
      document.getElementById("login-modal").classList.remove("hidden")
    })
  
    // Signup Button
    document.getElementById("signup-btn").addEventListener("click", () => {
      document.getElementById("signup-modal").classList.remove("hidden")
    })
  
    // Switch between login and signup
    document.getElementById("switch-to-signup").addEventListener("click", (e) => {
      e.preventDefault()
      document.getElementById("login-modal").classList.add("hidden")
      document.getElementById("signup-modal").classList.remove("hidden")
    })
  
    document.getElementById("switch-to-login").addEventListener("click", (e) => {
      e.preventDefault()
      document.getElementById("signup-modal").classList.add("hidden")
      document.getElementById("login-modal").classList.remove("hidden")
    })
  
    // Login Form Submission
    document.getElementById("login-form").addEventListener("submit", async (event) => {
        event.preventDefault(); // Prevent form from reloading the page
      
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
      
        // Basic validation
        if (!email || !password) {
          alert("Please enter email and password");
          return;
        }
      
        try {
          const response = await fetch("http://127.0.0.1:5000/api/users/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
            // credentials: "include", // Allows sending cookies (important for auth)
          });
      
          const data = await response.json();
      
          if (!response.ok) {
            throw new Error(data.message || "Login failed");
          }
      
          // Save accessToken to localStorage
          localStorage.setItem("accessToken", data.data.accessToken);
          localStorage.setItem("user", JSON.stringify(data.data.user));
      
          console.log("User logged in successfully:", data.data.user);
      
          // Redirect or update UI after login
          alert("Login successful!");
          // window.location.href = "/dashboard.html"; // Change as needed
      
        } catch (error) {
          console.error("Login error:", error);
          alert(error.message || "Something went wrong during login");
        }
      });
    // Signup Form Submission
    document.getElementById("signup-form").addEventListener("submit", async (e) => {
        e.preventDefault();
      
        // Get form values
        const userName = document.getElementById("signup-username").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;
        const fullName = document.getElementById("signup-fullname").value;
        const avatarInput = document.getElementById("avatar-upload");
      
        // Basic validation
        if (!userName || !email || !password || !fullName) {
          alert("Please fill in all required fields");
          return;
        }
      
        // Create FormData object
        const formData = new FormData();
        formData.append("userName", userName);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("fullName", fullName);
        
        // Add avatar if it exists
        if (avatarInput.files && avatarInput.files[0]) {
          formData.append("avatar", avatarInput.files[0]);
        }
      
        try {
          const response = await fetch("http://127.0.0.1:5000/api/users/register", {
            method: "POST",
            body: formData,
          });
      
          const data = await response.json();
      
          if (!response.ok) {
            // Handle error responses from your API
            throw new Error(data.message || "Registration failed");
          }
      
          // Handle successful registration
          handleLoginResponse(data);
          
        } catch (error) {
          console.error("Registration error:", error);
          alert(error.message || "Something went wrong during registration");
        }
      });
    // Helper Functions
    function handleLoginResponse(response) {
      if (response.success) {
        // Store the access token
        localStorage.setItem("accessToken", response.accessToken)
  
        // Store user info
        localStorage.setItem("user", JSON.stringify(response.user))
  
        // Update UI
        document.getElementById("login-modal").classList.add("hidden")
        document.getElementById("signup-modal").classList.add("hidden")
  
        checkAuthStatus()
  
        // Show room selection if that's where the user was trying to go
        if (
          document.getElementById("room-selection").classList.contains("hidden") &&
          document.getElementById("room-interface").classList.contains("hidden")
        ) {
          document.getElementById("welcome-section").classList.add("hidden")
          document.getElementById("room-selection").classList.remove("hidden")
        }
      } else {
        alert("Login failed: " + (response.message || "Unknown error"))
      }
    }
  
    function checkAuthStatus() {
      const accessToken = localStorage.getItem("accessToken")
      const userJson = localStorage.getItem("user")
  
      if (accessToken && userJson) {
        // User is logged in
        const user = JSON.parse(userJson)
  
        // Show avatar, hide login/signup buttons
        document.getElementById("login-btn").classList.add("hidden")
        document.getElementById("signup-btn").classList.add("hidden")
        document.getElementById("user-avatar").classList.remove("hidden")
  
        // Set avatar image
        document.getElementById("avatar-img").src = user.avatar
      } else {
        // User is not logged in
        document.getElementById("login-btn").classList.remove("hidden")
        document.getElementById("signup-btn").classList.remove("hidden")
        document.getElementById("user-avatar").classList.add("hidden")
      }
    }
  
    document.addEventListener("click", (event) => {
      if (event.target && event.target.id === "logout-btn") {
        event.preventDefault();
        console.log("Logout button clicked!");
        logout();
      }
    });
    
    function logout() {
      console.log("Executing logout..."); // Debugging
    
      // Clear storage
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    
      // Update UI
      checkAuthStatus();
    
      // Show welcome section, hide others
      document.getElementById("room-selection")?.classList.add("hidden");
      document.getElementById("room-interface")?.classList.add("hidden");
      document.getElementById("welcome-section")?.classList.remove("hidden");
    
      console.log("User logged out successfully!");
    }
    
  
    // Add avatar preview functionality
    document.getElementById("avatar-upload").addEventListener("change", (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          document.getElementById("avatar-preview").src = e.target.result
        }
        reader.readAsDataURL(file)
      }
    })
  })
  
  