document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Admin authentication elements
  const adminToggle = document.getElementById("admin-toggle");
  const adminLoginSection = document.getElementById("admin-login-section");
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminInfo = document.getElementById("admin-info");
  const adminWelcome = document.getElementById("admin-welcome");
  const adminLogout = document.getElementById("admin-logout");
  
  let isAdmin = false;
  let currentUser = null;

  // Check admin status on page load
  async function checkAdminStatus() {
    try {
      const response = await fetch("/admin/status");
      const result = await response.json();
      
      if (result.authenticated) {
        isAdmin = true;
        currentUser = result.user;
        showAdminInterface();
      } else {
        isAdmin = false;
        currentUser = null;
        hideAdminInterface();
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      isAdmin = false;
      currentUser = null;
      hideAdminInterface();
    }
  }

  // Show admin interface
  function showAdminInterface() {
    adminLoginSection.classList.add("hidden");
    adminInfo.classList.remove("hidden");
    adminWelcome.textContent = `Welcome, ${currentUser}!`;
    adminToggle.textContent = "Admin Panel";
  }

  // Hide admin interface
  function hideAdminInterface() {
    adminLoginSection.classList.add("hidden");
    adminInfo.classList.add("hidden");
    adminToggle.textContent = "Admin Login";
  }

  // Toggle admin login form
  adminToggle.addEventListener("click", () => {
    if (isAdmin) {
      // Already logged in, just show status
      return;
    }
    adminLoginSection.classList.toggle("hidden");
  });

  // Handle admin login
  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;
    
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      
      const response = await fetch("/admin/login", {
        method: "POST",
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        isAdmin = true;
        currentUser = result.user;
        showAdminInterface();
        adminLoginForm.reset();
        showMessage("Login successful!", "success");
        fetchActivities(); // Refresh to show admin controls
      } else {
        showMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  // Handle admin logout
  adminLogout.addEventListener("click", async () => {
    try {
      const response = await fetch("/admin/logout", {
        method: "POST"
      });
      
      if (response.ok) {
        isAdmin = false;
        currentUser = null;
        hideAdminInterface();
        showMessage("Logout successful!", "success");
        fetchActivities(); // Refresh to hide admin controls
      }
    } catch (error) {
      showMessage("Logout failed. Please try again.", "error");
      console.error("Error logging out:", error);
    }
  });

  // Show message helper function
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Update UI based on admin status
  function updateUIForAdminStatus() {
    const signupContainer = document.getElementById("signup-form");
    const adminNotice = document.getElementById("admin-only-notice");
    
    if (isAdmin) {
      signupContainer.classList.remove("hidden");
      adminNotice.classList.add("hidden");
    } else {
      signupContainer.classList.add("hidden");
      adminNotice.classList.remove("hidden");
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      
      // Clear activity select options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      activities.forEach((activity, index) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = activity.max_participants - activity.students.length;

        // Create participants HTML with delete icons only for admins
        const participantsHTML =
          activity.students.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${activity.students
                  .map(
                    (email) =>
                      `<li>
                        <span class="participant-email">${email}</span>
                        ${isAdmin ? `<button class="delete-btn" data-activity-id="${index}" data-email="${email}">❌</button>` : ''}
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${activity.name}</h4>
          <p>${activity.description}</p>
          <p><strong>Schedule:</strong> ${activity.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = index;
        option.textContent = activity.name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
      
      // Update UI based on admin status
      updateUIForAdminStatus();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activityId = button.getAttribute("data-activity-id");
    const email = button.getAttribute("data-email");

    try {
      const formData = new FormData();
      formData.append("name", email);
      
      const response = await fetch(`/activities/${activityId}/unregister`, {
        method: "DELETE",
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities(); // Refresh activities list to show updated participants
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activityId = document.getElementById("activity").value;

    try {
      const formData = new FormData();
      formData.append("name", email);
      
      const response = await fetch(`/activities/${activityId}/signup`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities(); // Refresh activities list to show updated participants
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  async function initializeApp() {
    await checkAdminStatus();
    await fetchActivities();
  }
  
  initializeApp();
});
