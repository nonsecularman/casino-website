// Wallet & Payment Functions

function updateWalletDisplay(balance) {
    document.getElementById('walletBalance').textContent = `₹${parseFloat(balance).toFixed(2)}`;
}

function openDeposit() {
    if (!localStorage.getItem('token')) {
        openLogin();
        return;
    }
    document.getElementById('depositModal').classList.add('active');
}

function openWithdraw() {
    if (!localStorage.getItem('token')) {
        openLogin();
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('withdrawBalance').textContent = `₹${(user.balance || 0).toFixed(2)}`;
    document.getElementById('withdrawUpi').textContent = user.upiId || 'Not set';
    
    document.getElementById('withdrawModal').classList.add('active');
}

function selectDeposit(amount) {
    document.getElementById('depositAmount').value = amount;
    document.querySelectorAll('.deposit-amount').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
}

// Deposit Form
document.getElementById('depositForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = document.getElementById('depositAmount').value;
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/wallet/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount })
        });
        
        const data = await response.json();
        
        if (data.success && data.paymentUrl) {
            // Redirect to payment gateway
            window.location.href = data.paymentUrl;
        } else {
            showNotification('Failed to initiate payment', 'error');
        }
    } catch (error) {
        showNotification('Network error', 'error');
    }
});

// Withdraw Form - Uses your BladePay API
document.getElementById('withdrawForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.upiId) {
        showNotification('Please set your UPI ID in profile', 'error');
        return;
    }
    
    if (amount < 100) {
        showNotification('Minimum withdrawal is ₹100', 'error');
        return;
    }
    
    if (amount > (user.balance || 0)) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/wallet/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                amount: amount,
                upiId: user.upiId,
                userName: user.name,
                userPhone: user.phone
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Withdrawal request submitted! ID: ${data.payoutId}`, 'success');
            closeModal('withdrawModal');
            
            // Update local balance
            user.balance -= amount;
            localStorage.setItem('user', JSON.stringify(user));
            updateWalletDisplay(user.balance);
        } else {
            showNotification(data.message || 'Withdrawal failed', 'error');
        }
    } catch (error) {
        showNotification('Network error', 'error');
    }
});
