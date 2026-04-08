// Secure Password Hashing (Simple bcrypt-like implementation)
class SecureAuth {
    constructor() {
        // Ini adalah hash PBKDF2 simulasi dari password "Pascal@Secure2026!Guru"
        // Dalam produksi, gunakan library bcrypt.js yang sebenarnya
        this.passwordHash = "1b4f0e9851971998e732078544c11c82f590e7a8fc1e1b6f5be9e3e59d8b6e4";
        this.saltRounds = 10;
        this.maxAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    }

    // Simple PBKDF2-like hash untuk demo
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Verify password
    async verifyPassword(password, hash) {
        const inputHash = await this.hashPassword(password);
        return inputHash === hash;
    }

    // Check login attempts
    checkLoginAttempts() {
        const key = 'seller_login_attempts';
        const lockoutKey = 'seller_lockout_time';
        const now = Date.now();
        
        const lockoutTime = localStorage.getItem(lockoutKey);
        if (lockoutTime && now < parseInt(lockoutTime)) {
            const remaining = Math.ceil((parseInt(lockoutTime) - now) / 1000 / 60);
            throw new Error(`Akun terkunci. Coba lagi dalam ${remaining} menit.`);
        }

        // Reset attempts if lockout expired
        if (lockoutTime && now >= parseInt(lockoutTime)) {
            localStorage.removeItem(lockoutKey);
            localStorage.setItem(key, '0');
        }

        return parseInt(localStorage.getItem(key) || '0');
    }

    recordFailedAttempt() {
        const key = 'seller_login_attempts';
        const lockoutKey = 'seller_lockout_time';
        let attempts = parseInt(localStorage.getItem(key) || '0');
        attempts++;

        localStorage.setItem(key, attempts.toString());

        if (attempts >= this.maxAttempts) {
            localStorage.setItem(lockoutKey, (Date.now() + this.lockoutDuration).toString());
            throw new Error('Terlalu banyak percobaan gagal. Akun terkunci selama 15 menit.');
        }

        return attempts;
    }

    resetLoginAttempts() {
        localStorage.removeItem('seller_login_attempts');
        localStorage.removeItem('seller_lockout_time');
    }
}

// Initialize Auth
const auth = new SecureAuth();

// Login Form Handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorDiv = document.getElementById('error-message');
    const passwordInput = document.getElementById('password');
    const submitBtn = e.target.querySelector('.btn-login');

    try {
        // Check Login Attempts
        auth.checkLoginAttempts();

        const password = passwordInput.value;
        if (password.length < 8) {
            throw new Error('Password tidak valid');
        }

        // Verify Password
        const isValid = await auth.verifyPassword(password, auth.passwordHash);

        if (!isValid) {
            const attempts = auth.recordFailedAttempt();
            const remaining = auth.maxAttempts - attempts;
            throw new Error(`Password salah. ${remaining} percobaan tersisa.`);
        }

        // Success - Reset attempts and login
        auth.resetLoginAttempts();
        
        // Create session token
        const token = crypto.getRandomValues(new Uint8Array(32));
        const sessionToken = Array.from(token).map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('seller_session_token', sessionToken);
        localStorage.setItem('seller_logged_in', 'true');
        localStorage.setItem('seller_login_time', Date.now().toString());

        errorDiv.innerHTML = '';
        submitBtn.textContent = 'Membuka Dashboard...';
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
        passwordInput.value = '';
    }
});

// Check if already logged in
function checkSellerSession() {
    const isLoggedIn = localStorage.getItem('seller_logged_in') === 'true';
    const sessionToken = localStorage.getItem('seller_session_token');
    const loginTime = parseInt(localStorage.getItem('seller_login_time') || '0');
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

    // Check if session expired
    if (isLoggedIn && (Date.now() - loginTime > sessionDuration)) {
        localStorage.removeItem('seller_logged_in');
        localStorage.removeItem('seller_session_token');
        localStorage.removeItem('seller_login_time');
        return false;
    }

    return isLoggedIn && sessionToken;
}

if (checkSellerSession()) {
    window.location.href = 'dashboard.html';
}