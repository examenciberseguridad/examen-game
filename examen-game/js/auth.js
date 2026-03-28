// ============================================
// AUTH — Login / Register / Session
// ============================================

const Auth = (() => {
    let currentUser = null;

    // Simple hash function (NOT for production security — just for demo)
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + '_cyberquiz_salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function getSession() {
        try {
            const session = localStorage.getItem('cyberquiz_session');
            if (session) {
                currentUser = JSON.parse(session);
                return currentUser;
            }
        } catch (e) {}
        return null;
    }

    function saveSession(user) {
        currentUser = { username: user.username };
        localStorage.setItem('cyberquiz_session', JSON.stringify(currentUser));
    }

    function clearSession() {
        currentUser = null;
        localStorage.removeItem('cyberquiz_session');
    }

    function isLoggedIn() {
        return currentUser !== null;
    }

    function getUser() {
        return currentUser;
    }

    async function login(username, password) {
        if (!username || !password) return { success: false, error: 'Completa todos los campos' };
        const hash = await hashPassword(password);
        const result = await GitHubAPI.loginUser(username, hash);
        if (result.success) {
            saveSession(result.user);
        }
        return result;
    }

    async function register(username, password, passwordConfirm) {
        if (!username || !password || !passwordConfirm) {
            return { success: false, error: 'Completa todos los campos' };
        }
        if (username.length < 3) {
            return { success: false, error: 'El usuario debe tener al menos 3 caracteres' };
        }
        if (password.length < 4) {
            return { success: false, error: 'La contraseña debe tener al menos 4 caracteres' };
        }
        if (password !== passwordConfirm) {
            return { success: false, error: 'Las contraseñas no coinciden' };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { success: false, error: 'Solo letras, números y guión bajo' };
        }
        const hash = await hashPassword(password);
        const result = await GitHubAPI.registerUser(username, hash);
        if (result.success) {
            saveSession({ username });
        }
        return result;
    }

    function logout() {
        clearSession();
    }

    // Init on load
    getSession();

    return { login, register, logout, isLoggedIn, getUser, getSession };
})();
