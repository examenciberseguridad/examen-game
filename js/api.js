// ============================================
// API — GitHub API Communication Layer
// ============================================

const GitHubAPI = (() => {
    const headers = () => ({
        'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
    });

    const apiBase = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/`;

    // Get a file from the repo
    async function getFile(path) {
        try {
            const res = await fetch(apiBase + path, { headers: headers() });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
            const data = await res.json();
            const content = JSON.parse(atob(data.content));
            return { content, sha: data.sha };
        } catch (err) {
            console.error('getFile error:', err);
            return null;
        }
    }

    // Create or update a file in the repo
    async function saveFile(path, content, sha = null, message = 'update data') {
        try {
            const body = {
                message,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
            };
            if (sha) body.sha = sha;

            const res = await fetch(apiBase + path, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || `Error ${res.status}`);
            }
            const data = await res.json();
            return { sha: data.content.sha };
        } catch (err) {
            console.error('saveFile error:', err);
            return null;
        }
    }

    // ---- USER OPERATIONS ----

    async function getUsers() {
        const result = await getFile(CONFIG.USERS_FILE);
        return result ? result : { content: [], sha: null };
    }

    async function saveUsers(users, sha) {
        return await saveFile(CONFIG.USERS_FILE, users, sha, 'update users');
    }

    async function registerUser(username, passwordHash) {
        const { content: users, sha } = await getUsers();
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, error: 'El usuario ya existe' };
        }
        users.push({
            username,
            passwordHash,
            createdAt: new Date().toISOString(),
        });
        const result = await saveUsers(users, sha);
        if (result) return { success: true };
        return { success: false, error: 'Error al guardar. Intenta de nuevo.' };
    }

    async function loginUser(username, passwordHash) {
        const { content: users } = await getUsers();
        const user = users.find(
            u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === passwordHash
        );
        if (user) return { success: true, user };
        return { success: false, error: 'Usuario o contraseña incorrectos' };
    }

    // ---- SCORE OPERATIONS ----

    async function getScores() {
        const result = await getFile(CONFIG.SCORES_FILE);
        return result ? result : { content: [], sha: null };
    }

    async function saveScore(username, sessionId, level, score, correct, total, timeUsed) {
        const { content: scores, sha } = await getScores();

        // Find existing entry for this user
        let userEntry = scores.find(s => s.username.toLowerCase() === username.toLowerCase());

        if (!userEntry) {
            userEntry = { username, totalScore: 0, sessions: {} };
            scores.push(userEntry);
        }

        const key = `${sessionId}_${level}`;
        const prevScore = userEntry.sessions[key]?.score || 0;

        // Only update if new score is higher
        if (score > prevScore) {
            userEntry.sessions[key] = {
                score,
                correct,
                total,
                timeUsed,
                date: new Date().toISOString(),
            };
            // Recalculate total
            userEntry.totalScore = Object.values(userEntry.sessions)
                .reduce((sum, s) => sum + s.score, 0);
        }

        const result = await saveFile(CONFIG.SCORES_FILE, scores, sha, `score: ${username} ${key} ${score}`);
        if (result) return { success: true };
        return { success: false };
    }

    async function getRanking() {
        const { content: scores } = await getScores();
        return scores
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 50);
    }

    async function getUserBestScores(username) {
        const { content: scores } = await getScores();
        const user = scores.find(s => s.username.toLowerCase() === username.toLowerCase());
        return user ? user.sessions : {};
    }

    // Initialize DB files if they don't exist
    async function initDB() {
        const users = await getFile(CONFIG.USERS_FILE);
        if (!users) {
            await saveFile(CONFIG.USERS_FILE, [], null, 'init users db');
        }
        const scores = await getFile(CONFIG.SCORES_FILE);
        if (!scores) {
            await saveFile(CONFIG.SCORES_FILE, [], null, 'init scores db');
        }
    }

    return {
        getFile, saveFile,
        registerUser, loginUser,
        getScores, saveScore, getRanking, getUserBestScores,
        initDB,
    };
})();
