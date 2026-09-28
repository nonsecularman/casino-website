// UI Functions

function openLogin() {
    document.getElementById('loginModal').classList.add('active');
}

function openSignup() {
    document.getElementById('signupModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function switchModal(closeId, openId) {
    closeModal(closeId);
    setTimeout(() => {
        document.getElementById(openId).classList.add('active');
    }, 100);
}

function startPlaying() {
    if (!localStorage.getItem('token')) {
        openSignup();
    } else {
        document.querySelector('.games-section').scrollIntoView({ behavior: 'smooth' });
    }
}

function openGame(gameType) {
    if (!localStorage.getItem('token')) {
        openLogin();
        return;
    }
    showNotification(`Loading ${gameType}...`, 'info');
    // Implement game loading logic
}

function showProfile() {
    showNotification('Profile page coming soon!', 'info');
}

function showTransactions() {
    showNotification('Transaction history coming soon!', 'info');
}

// Close modal on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}
