// ============================================
// CONFIG — GitHub API Configuration
// ============================================
// El token NO se guarda en el código.
// Se configura desde el navegador (panel admin oculto).
// Presiona Ctrl+Shift+K para abrir el panel de admin.

const CONFIG = {
    GITHUB_TOKEN: localStorage.getItem('cyberquiz_admin_token') || '',
    GITHUB_OWNER: 'examenciberseguridad',
    GITHUB_REPO: 'examen-game',
    DATA_PATH: 'db',
    USERS_FILE: 'db/users.json',
    SCORES_FILE: 'db/scores.json',

    setToken(token) {
        localStorage.setItem('cyberquiz_admin_token', token);
        CONFIG.GITHUB_TOKEN = token;
    },

    hasToken() {
        return CONFIG.GITHUB_TOKEN && CONFIG.GITHUB_TOKEN.length > 0;
    },

    clearToken() {
        localStorage.removeItem('cyberquiz_admin_token');
        CONFIG.GITHUB_TOKEN = '';
    }
};
