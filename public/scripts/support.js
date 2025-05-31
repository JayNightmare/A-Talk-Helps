// Logout function
async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            console.error('Logout failed');
        }
    } catch (err) {
        console.error('Logout error:', err);
    }
}

// Initialize any support page specific functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Support page loaded');
});
