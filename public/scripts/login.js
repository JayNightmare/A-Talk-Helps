// DOM Elements
const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const loginKey = document.getElementById('login-key');
const loginBtn = document.getElementById('login-btn');
const generateBtn = document.getElementById('generate-btn');
const signupBtn = document.getElementById('signup-btn');
const generatedKey = document.getElementById('generated-key');
const errorMessage = document.getElementById('error-message');

let currentGeneratedKey = null;

// Check if user is already logged in
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (data.isLoggedIn) {
            window.location.href = '/';
        }
    } catch (err) {
        console.error('Failed to check login status:', err);
    }
}

// Generate a unique image-based key
function generateImageKey() {
    const emojis = ['🌟', '🌙', '🌺', '🍀', '🌈', '🦋', '🐬', '🦉', '🦊', '🐘', '🐼', '🐯'];
    const numbers = '0123456789';
    let key = '';

    // Add 4 random emojis
    for (let i = 0; i < 4; i++) {
        key += emojis[Math.floor(Math.random() * emojis.length)];
    }

    // Add 4 random numbers
    for (let i = 0; i < 4; i++) {
        key += numbers[Math.floor(Math.random() * numbers.length)];
    }

    return key;
}

// Handle login
async function handleLogin() {
    const key = loginKey.value.trim();
    if (!key) {
        showError('Please enter your image key');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        window.location.href = '/';
    } catch (err) {
        showError(err.message);
    }
}

// Handle signup
async function handleSignup() {
    if (!currentGeneratedKey) {
        showError('Please generate an image key first');
        return;
    }

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key: currentGeneratedKey })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Signup failed');
        }

        // Auto-login after successful signup
        window.location.href = '/';
    } catch (err) {
        showError(err.message);
    }
}

// Generate new key
function handleGenerateKey() {
    currentGeneratedKey = generateImageKey();
    generatedKey.innerHTML = `
        <span class="generated">${currentGeneratedKey}</span>
        <button class="copy-btn" onclick="copyToClipboard('${currentGeneratedKey}')">📋</button>
    `;
    signupBtn.disabled = false;
}

// Copy key to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        const copyBtn = document.querySelector('.copy-btn');
        copyBtn.textContent = '✅';
        setTimeout(() => {
            copyBtn.textContent = '📋';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Toggle between login and signup sections
function showLogin() {
    loginSection.classList.remove('hidden');
    signupSection.classList.add('hidden');
    errorMessage.style.display = 'none';
}

function showSignup() {
    loginSection.classList.add('hidden');
    signupSection.classList.remove('hidden');
    errorMessage.style.display = 'none';
}

// Event listeners
loginBtn.addEventListener('click', handleLogin);
generateBtn.addEventListener('click', handleGenerateKey);
signupBtn.addEventListener('click', handleSignup);
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
});
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSignup();
});

// Enter key support for login
loginKey.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

// Initialize
checkLoginStatus();
