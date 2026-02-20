// Authentication module
const AuthModule = {
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast-container');
        toast.textContent = message;
        toast.className = 'toast-notification show';

        if (type === 'error') {
            toast.classList.add('error');
        } else {
            toast.classList.remove('error');
        }

        setTimeout(() => {
            toast.className = 'toast-notification';
        }, 3000);
    },

    checkAuth() {
        fetch('/api/auth/user')
            .then(res => res.json())
            .then(data => {
                const userNameEl = document.getElementById('user-name');
                const loginLink = document.getElementById('login-link');
                const logoutBtn = document.getElementById('logout-btn');

                if (data.user) {
                    // userNameEl.textContent = data.user; // Don't show email
                    userNameEl.style.display = 'none'; // Hide the raw text span
                    loginLink.textContent = 'ACCOUNT'; // Change Login to Account
                    loginLink.href = '/account';
                    loginLink.style.display = 'inline';
                    // logoutBtn.style.display = 'inline'; // Keep logout only on account page or dropdown? User asked to remove it from navbar
                    logoutBtn.style.display = 'none'; // User said "I am getting to see the user Email ID In the logout... remove it" - implied cleaner nav
                } else {
                    userNameEl.style.display = 'none';
                    loginLink.textContent = 'LOGIN';
                    loginLink.href = '/login';
                    loginLink.style.display = 'inline';
                    logoutBtn.style.display = 'none';
                }
            });
    },

    login(email, password) {
        return fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.showToast(data.message || 'Login successful!');
                } else {
                    this.showToast(data.error || 'Login failed', 'error');
                }
                return data;
            })
            .catch(err => {
                this.showToast('Network error', 'error');
                return { success: false, error: 'Network error' };
            });
    },

    signup(email, password) {
        return fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.showToast(data.message || 'Signup successful!');
                } else {
                    this.showToast(data.error || 'Signup failed', 'error');
                }
                return data;
            })
            .catch(err => {
                this.showToast('Network error', 'error');
                return { success: false, error: 'Network error' };
            });
    },

    logout() {
        return fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
            .then(res => res.json())
            .then(data => {
                this.checkAuth();
                this.showToast('Logged out successfully');
                return data;
            });
    }
};

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
    AuthModule.checkAuth();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AuthModule.logout().then(() => {
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            });
        });
    }
});
