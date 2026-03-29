// ============================================
// APP — Main Application Controller
// ============================================

const App = (() => {
    // ---- DOM refs ----
    const screens = {
        home: document.getElementById('screen-home'),
        levels: document.getElementById('screen-levels'),
        quiz: document.getElementById('screen-quiz'),
        results: document.getElementById('screen-results'),
    };
    const sessionsGrid = document.getElementById('sessionsGrid');
    const levelsGrid = document.getElementById('levelsGrid');
    const levelSessionTitle = document.getElementById('levelSessionTitle');
    const guestNotice = document.getElementById('guestNotice');
    const userBtn = document.getElementById('userBtn');
    const userName = document.getElementById('userName');
    const trophyBtn = document.getElementById('trophyBtn');

    // Auth modal
    const authModal = document.getElementById('authModal');
    const authClose = document.getElementById('authClose');
    const modalTabs = document.querySelectorAll('.modal-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');

    // Ranking modal
    const rankingModal = document.getElementById('rankingModal');
    const rankingClose = document.getElementById('rankingClose');

    // Results buttons
    const retryBtn = document.getElementById('retryBtn');
    const backToLevelsBtn = document.getElementById('backToLevelsBtn');
    const backHomeBtn = document.getElementById('backHomeBtn');
    const backToHome = document.getElementById('backToHome');

    let sessionsIndex = null;
    let selectedSessionId = null;

    // ---- SCREEN MANAGEMENT ----
    function showScreen(name) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        if (screens[name]) screens[name].classList.add('active');
    }

    // ---- TOAST ----
    function toast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    // ---- UI UPDATE ----
    function updateAuthUI() {
        if (Auth.isLoggedIn()) {
            userName.textContent = Auth.getUser().username;
            userBtn.classList.add('logged-in');
            userBtn.title = 'Cerrar Sesión';
            guestNotice.classList.add('hidden');
        } else {
            userName.textContent = '';
            userBtn.classList.remove('logged-in');
            userBtn.title = 'Iniciar Sesión';
            guestNotice.classList.remove('hidden');
        }
    }

    // ---- RENDER SESSIONS ----
    function renderSessions() {
        if (!sessionsIndex) return;

        sessionsGrid.innerHTML = sessionsIndex.sessions.map((session, idx) => {
            const isLocked = !Auth.isLoggedIn() && idx > 0;

            return `
                <div class="session-card ${isLocked ? 'locked' : ''}" 
                     data-session="${session.id}" data-index="${idx}">
                    ${isLocked ? `
                        <div class="session-lock">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                    ` : ''}
                    <div class="session-icon">${session.icon}</div>
                    <h3 class="session-title">${session.title}</h3>
                    <p class="session-desc">${session.description}</p>
                    <div class="session-meta">
                        <span>3 niveles</span>
                        <span>24 preguntas</span>
                    </div>
                </div>
            `;
        }).join('');

        // Bind clicks
        sessionsGrid.querySelectorAll('.session-card:not(.locked)').forEach(card => {
            card.addEventListener('click', () => {
                selectedSessionId = card.dataset.session;
                renderLevels(selectedSessionId);
                showScreen('levels');
            });
        });

        sessionsGrid.querySelectorAll('.session-card.locked').forEach(card => {
            card.addEventListener('click', () => {
                toast('Inicia sesión para desbloquear este tema', 'error');
            });
        });
    }

    // ---- RENDER LEVELS ----
    async function renderLevels(sessionId) {
        const sessionMeta = sessionsIndex.sessions.find(s => s.id === sessionId);
        if (!sessionMeta) return;

        // Load the full session data
        const session = await Quiz.loadSession(sessionId);
        if (!session) {
            toast('Error al cargar la sesión', 'error');
            return;
        }

        levelSessionTitle.textContent = session.title;

        let bestScores = {};
        if (Auth.isLoggedIn()) {
            bestScores = await GitHubAPI.getUserBestScores(Auth.getUser().username);
        }

        const levelOrder = ['facil', 'medio', 'dificil'];
        levelsGrid.innerHTML = levelOrder.map(key => {
            const level = session.levels[key];
            const isLocked = !Auth.isLoggedIn() && key !== 'facil';
            const bestKey = `${sessionId}_${key}`;
            const best = bestScores[bestKey];

            return `
                <div class="level-card ${key} ${isLocked ? 'locked' : ''}" 
                     data-level="${key}" data-session="${sessionId}">
                    <div class="level-info">
                        <h3 style="color: ${level.color}">${level.label}</h3>
                        <p>${level.questions.length} preguntas · ${level.pointsPerQuestion} pts c/u · ${level.timePerQuestion}s</p>
                    </div>
                    <div class="level-right">
                        ${best ? `
                            <div class="level-best">
                                <div style="color: var(--cyan); font-weight: 600;">${best.score} pts</div>
                                <div>${best.correct}/${best.total} correctas</div>
                            </div>
                        ` : ''}
                        ${isLocked ? `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        ` : `
                            <div class="level-arrow">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        // Bind clicks
        levelsGrid.querySelectorAll('.level-card:not(.locked)').forEach(card => {
            card.addEventListener('click', async () => {
                await Quiz.start(card.dataset.session, card.dataset.level);
                showScreen('quiz');
            });
        });

        levelsGrid.querySelectorAll('.level-card.locked').forEach(card => {
            card.addEventListener('click', () => {
                toast('Inicia sesión para desbloquear este nivel', 'error');
            });
        });
    }

    // ---- AUTH MODAL ----
    function openAuthModal() {
        if (Auth.isLoggedIn()) {
            Auth.logout();
            updateAuthUI();
            renderSessions();
            toast('Sesión cerrada', 'info');
            return;
        }
        authModal.classList.add('active');
    }

    function closeAuthModal() {
        authModal.classList.remove('active');
        document.getElementById('loginError').textContent = '';
        document.getElementById('regError').textContent = '';
    }

    function switchTab(tab) {
        modalTabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        loginForm.classList.toggle('hidden', tab !== 'login');
        registerForm.classList.toggle('hidden', tab !== 'register');
    }

    // ---- EVENT BINDINGS ----
    function bindEvents() {
        // User button
        userBtn.addEventListener('click', openAuthModal);

        // Auth modal
        authClose.addEventListener('click', closeAuthModal);
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeAuthModal();
        });
        modalTabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Login
        loginBtn.addEventListener('click', async () => {
            if (!CONFIG.hasToken()) {
                document.getElementById('loginError').textContent = 'Admin debe configurar el token primero (Ctrl+Shift+K)';
                return;
            }
            const user = document.getElementById('loginUser').value.trim();
            const pass = document.getElementById('loginPass').value;
            loginBtn.disabled = true;
            loginBtn.textContent = 'Cargando...';

            const result = await Auth.login(user, pass);
            loginBtn.disabled = false;
            loginBtn.textContent = 'Entrar';

            if (result.success) {
                closeAuthModal();
                updateAuthUI();
                renderSessions();
                toast(`¡Bienvenido, ${user}!`, 'success');
            } else {
                document.getElementById('loginError').textContent = result.error;
            }
        });

        // Register
        registerBtn.addEventListener('click', async () => {
            if (!CONFIG.hasToken()) {
                document.getElementById('regError').textContent = 'Admin debe configurar el token primero (Ctrl+Shift+K)';
                return;
            }
            const user = document.getElementById('regUser').value.trim();
            const pass = document.getElementById('regPass').value;
            const passConfirm = document.getElementById('regPassConfirm').value;
            registerBtn.disabled = true;
            registerBtn.textContent = 'Cargando...';

            const result = await Auth.register(user, pass, passConfirm);
            registerBtn.disabled = false;
            registerBtn.textContent = 'Crear Cuenta';

            if (result.success) {
                closeAuthModal();
                updateAuthUI();
                renderSessions();
                toast(`¡Cuenta creada! Bienvenido, ${user}`, 'success');
            } else {
                document.getElementById('regError').textContent = result.error;
            }
        });

        // Enter key on forms
        document.getElementById('loginPass').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });
        document.getElementById('regPassConfirm').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') registerBtn.click();
        });

        // Trophy / Ranking
        trophyBtn.addEventListener('click', () => {
            rankingModal.classList.add('active');
            Ranking.load();
        });
        rankingClose.addEventListener('click', () => rankingModal.classList.remove('active'));
        rankingModal.addEventListener('click', (e) => {
            if (e.target === rankingModal) rankingModal.classList.remove('active');
        });

        // Navigation
        backToHome.addEventListener('click', () => showScreen('home'));
        retryBtn.addEventListener('click', async () => {
            await Quiz.start(Quiz.getCurrentSession().id, Quiz.getCurrentLevel());
            showScreen('quiz');
        });
        backToLevelsBtn.addEventListener('click', () => {
            renderLevels(Quiz.getCurrentSession().id);
            showScreen('levels');
        });
        backHomeBtn.addEventListener('click', () => showScreen('home'));

        // ---- ADMIN PANEL (Ctrl+Shift+K) ----
        const adminModal = document.getElementById('adminModal');
        const adminClose = document.getElementById('adminClose');
        const adminSaveBtn = document.getElementById('adminSaveBtn');
        const adminClearBtn = document.getElementById('adminClearBtn');
        const adminToken = document.getElementById('adminToken');
        const adminStatus = document.getElementById('adminStatus');

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'K') {
                e.preventDefault();
                adminToken.value = CONFIG.GITHUB_TOKEN || '';
                adminStatus.textContent = CONFIG.hasToken() ? '✅ Token configurado' : '';
                adminStatus.style.color = 'var(--green)';
                adminModal.classList.add('active');
            }
        });

        adminClose.addEventListener('click', () => adminModal.classList.remove('active'));
        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) adminModal.classList.remove('active');
        });

        adminSaveBtn.addEventListener('click', async () => {
            const token = adminToken.value.trim();
            if (!token) {
                adminStatus.textContent = 'Ingresa un token';
                adminStatus.style.color = 'var(--red)';
                return;
            }
            adminSaveBtn.disabled = true;
            adminSaveBtn.textContent = 'Verificando...';

            try {
                const res = await fetch(`https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}`, {
                    headers: { 'Authorization': `token ${token}` }
                });
                if (res.ok) {
                    CONFIG.setToken(token);
                    adminStatus.textContent = '✅ Token guardado y verificado';
                    adminStatus.style.color = 'var(--green)';
                    GitHubAPI.initDB();
                    toast('Token configurado correctamente', 'success');
                } else {
                    adminStatus.textContent = '❌ Token inválido o sin permisos';
                    adminStatus.style.color = 'var(--red)';
                }
            } catch (err) {
                adminStatus.textContent = '❌ Error de conexión';
                adminStatus.style.color = 'var(--red)';
            }
            adminSaveBtn.disabled = false;
            adminSaveBtn.textContent = 'Guardar Token';
        });

        adminClearBtn.addEventListener('click', () => {
            CONFIG.clearToken();
            adminToken.value = '';
            adminStatus.textContent = 'Token eliminado';
            adminStatus.style.color = 'var(--yellow)';
            toast('Token eliminado', 'info');
        });
    }

    // ---- INIT ----
    async function init() {
        Particles.init();
        bindEvents();
        updateAuthUI();

        sessionsIndex = await Quiz.loadSessionsIndex();
        renderSessions();

        // Try to init DB if token is configured
        if (CONFIG.hasToken()) {
            GitHubAPI.initDB();
        }
    }

    // Start app
    document.addEventListener('DOMContentLoaded', init);

    return { showScreen, toast };
})();
