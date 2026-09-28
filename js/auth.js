// User Authentication
const API_BASE_URL = 'http://localhost:3000/api';

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && user.id) {
        showLoggedInUI(user);
    } else {
        showLoggedOutUI();
    }
}

function showLoggedInUI(user) {
    document.getElementById('authButtons').style.display = 'none';
    document.getElementById('walletSection').style.display = 'flex';
    document.getElementById('profileSection').style.display = 'block';
    
    document.getElementById('profileName').textContent = user.name || 'Player';
    document.getElementById('profileId').textContent = `ID: ${user.uniqueId || user.id}`;
    document.getElementById('profileAvatar').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
    
    // Update wallet
    updateWalletDisplay(user.balance || 0);
    
    // Update withdraw modal
    document.getElementById('withdrawBalance').textContent = `₹${(user.balance || 0).toFixed(2)}`;
    document.getElementById('withdrawUpi').textContent = user.upiId || 'Not set';
}

function showLoggedOutUI() {
    document.getElementById('authButtons').style.display = 'flex';
    document.getElementById('walletSection').style.display = 'none';
    document.getElementById('profileSection').style.display = 'none';
}

// Generate unique user ID
function generateUniqueId() {
    const prefix = 'RC';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

// Login Form
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            closeModal('loginModal');
            showLoggedInUI(data.user);
            showNotification('Welcome back!', 'success');
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
});

// Signup Form
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const phone = document.getElementById('signupPhone').value;
    const upiId = document.getElementById('signupUpi').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const referralCode = document.getElementById('signupReferral').value;
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }
    
    const uniqueId = generateUniqueId();
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                phone,
                upiId,
                password,
                uniqueId,
                referralCode
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            closeModal('signupModal');
            showLoggedInUI(data.user);
            showNotification(`Welcome! Your ID: ${uniqueId}`, 'success');
        } else {
            showNotification(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showLoggedOutUI();
    showNotification('Logged out successfully', 'info');
}

function showNotification(message, type = 'info') {
    // Simple notification - you can enhance this
    alert(message);
}

// Initialize
document.addEventListener('DOMContentLoaded', checkAuth);
