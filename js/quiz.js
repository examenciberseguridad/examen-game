// ============================================
// QUIZ — Core Game Logic
// ============================================

const Quiz = (() => {
    let currentSession = null;
    let currentLevel = null;
    let questions = [];
    let currentIndex = 0;
    let score = 0;
    let correctCount = 0;
    let timer = null;
    let timeLeft = 0;
    let totalTimeUsed = 0;
    let startTime = 0;
    let sessionsIndex = null;
    let loadedSessions = {};

    // DOM refs
    const quizQuestion = document.getElementById('quizQuestion');
    const quizOptions = document.getElementById('quizOptions');
    const quizTimer = document.getElementById('quizTimer');
    const quizScore = document.getElementById('quizScore');
    const quizProgress = document.getElementById('quizProgress');
    const quizProgressBar = document.getElementById('quizProgressBar');
    const quizLevelBadge = document.getElementById('quizLevelBadge');
    const quizSessionName = document.getElementById('quizSessionName');
    const quizFeedback = document.getElementById('quizFeedback');
    const feedbackIcon = document.getElementById('feedbackIcon');
    const feedbackText = document.getElementById('feedbackText');

    // Load the sessions index (list of all sessions)
    async function loadSessionsIndex() {
        if (sessionsIndex) return sessionsIndex;
        try {
            const res = await fetch('data/sessions.json');
            sessionsIndex = await res.json();
            return sessionsIndex;
        } catch (err) {
            console.error('Error loading sessions index:', err);
            return null;
        }
    }

    // Load a specific session's questions
    async function loadSession(sessionId) {
        if (loadedSessions[sessionId]) return loadedSessions[sessionId];
        try {
            const sessionMeta = sessionsIndex.sessions.find(s => s.id === sessionId);
            if (!sessionMeta) throw new Error('Session not found: ' + sessionId);
            const res = await fetch(sessionMeta.file);
            const data = await res.json();
            loadedSessions[sessionId] = data;
            return data;
        } catch (err) {
            console.error('Error loading session:', err);
            return null;
        }
    }

    // Get sessions index for rendering
    function getSessionsIndex() {
        return sessionsIndex;
    }

    async function start(sessionId, level) {
        const session = await loadSession(sessionId);
        if (!session) return;

        currentSession = session;
        currentLevel = level;
        const levelData = session.levels[level];
        questions = shuffleArray([...levelData.questions]);
        currentIndex = 0;
        score = 0;
        correctCount = 0;
        totalTimeUsed = 0;

        // Setup header
        quizLevelBadge.textContent = levelData.label;
        quizLevelBadge.style.background = levelData.color + '22';
        quizLevelBadge.style.color = levelData.color;
        quizLevelBadge.style.border = `1px solid ${levelData.color}`;
        quizSessionName.textContent = session.title;
        quizScore.textContent = '0';

        showQuestion();
    }

    function showQuestion() {
        if (currentIndex >= questions.length) {
            endQuiz();
            return;
        }

        const q = questions[currentIndex];
        const levelData = currentSession.levels[currentLevel];

        quizQuestion.textContent = q.question;
        quizProgress.textContent = `${currentIndex + 1}/${questions.length}`;
        quizProgressBar.style.width = `${((currentIndex) / questions.length) * 100}%`;

        // Shuffle options but track correct answer
        const optionIndices = q.options.map((_, i) => i);
        const shuffled = shuffleArray(optionIndices);

        const letters = ['A', 'B', 'C', 'D'];
        quizOptions.innerHTML = shuffled.map((origIdx, displayIdx) => `
            <button class="quiz-option" data-index="${displayIdx}" data-correct="${origIdx === q.correct}">
                <span class="option-letter">${letters[displayIdx]}</span>
                <span>${q.options[origIdx]}</span>
            </button>
        `).join('');

        // Bind click events
        quizOptions.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', () => handleAnswer(btn));
        });

        // Start timer
        startTimer(levelData.timePerQuestion);
        startTime = Date.now();
    }

    function startTimer(seconds) {
        clearInterval(timer);
        timeLeft = seconds;
        quizTimer.textContent = timeLeft;
        quizTimer.classList.remove('timer-warning');

        timer = setInterval(() => {
            timeLeft--;
            quizTimer.textContent = timeLeft;

            if (timeLeft <= 5) {
                quizTimer.classList.add('timer-warning');
            }
            if (timeLeft <= 0) {
                clearInterval(timer);
                timeOut();
            }
        }, 1000);
    }

    function timeOut() {
        quizOptions.querySelectorAll('.quiz-option').forEach(btn => {
            btn.classList.add('disabled');
            if (btn.dataset.correct === 'true') {
                btn.classList.add('correct');
            }
        });

        showFeedback(false, '⏱️ ¡Tiempo agotado!');
        totalTimeUsed += (currentSession.levels[currentLevel].timePerQuestion);

        setTimeout(() => {
            hideFeedback();
            currentIndex++;
            showQuestion();
        }, 1800);
    }

    function handleAnswer(btn) {
        clearInterval(timer);
        const elapsed = (Date.now() - startTime) / 1000;
        totalTimeUsed += elapsed;

        const isCorrect = btn.dataset.correct === 'true';

        quizOptions.querySelectorAll('.quiz-option').forEach(b => {
            b.classList.add('disabled');
            if (b.dataset.correct === 'true') b.classList.add('correct');
        });

        if (isCorrect) {
            btn.classList.add('correct');
            const levelData = currentSession.levels[currentLevel];
            const timeBonus = Math.round(timeLeft * 0.5);
            const points = levelData.pointsPerQuestion + timeBonus;
            score += points;
            correctCount++;
            quizScore.textContent = score;
            showFeedback(true, `+${points} puntos (${timeBonus} bonus por tiempo)`);
        } else {
            btn.classList.add('wrong');
            showFeedback(false, 'Respuesta incorrecta');
        }

        setTimeout(() => {
            hideFeedback();
            currentIndex++;
            showQuestion();
        }, 1800);
    }

    function showFeedback(correct, text) {
        feedbackIcon.textContent = correct ? '✅' : '❌';
        feedbackText.textContent = text;
        quizFeedback.className = 'quiz-feedback show ' + (correct ? 'correct' : 'wrong');
    }

    function hideFeedback() {
        quizFeedback.className = 'quiz-feedback';
    }

    async function endQuiz() {
        clearInterval(timer);
        quizProgressBar.style.width = '100%';

        const total = questions.length;
        const percentage = (correctCount / total) * 100;

        const resultsIcon = document.getElementById('resultsIcon');
        const resultsTitle = document.getElementById('resultsTitle');
        const resultsSubtitle = document.getElementById('resultsSubtitle');
        const resultScore = document.getElementById('resultScore');
        const resultCorrect = document.getElementById('resultCorrect');
        const resultTime = document.getElementById('resultTime');

        resultScore.textContent = score;
        resultCorrect.textContent = `${correctCount}/${total}`;
        resultTime.textContent = `${Math.round(totalTimeUsed)}s`;

        if (percentage >= 90) {
            resultsIcon.textContent = '🏆';
            resultsTitle.textContent = '¡EXCELENTE!';
            resultsTitle.style.color = '#fbbf24';
            resultsSubtitle.textContent = 'Dominas este tema como un experto en ciberseguridad.';
        } else if (percentage >= 70) {
            resultsIcon.textContent = '🌟';
            resultsTitle.textContent = '¡MUY BIEN!';
            resultsTitle.style.color = 'var(--green)';
            resultsSubtitle.textContent = 'Buen conocimiento, pero aún puedes mejorar.';
        } else if (percentage >= 50) {
            resultsIcon.textContent = '📚';
            resultsTitle.textContent = 'PUEDES MEJORAR';
            resultsTitle.style.color = 'var(--yellow)';
            resultsSubtitle.textContent = 'Repasa el material e intenta de nuevo.';
        } else {
            resultsIcon.textContent = '💪';
            resultsTitle.textContent = 'SIGUE PRACTICANDO';
            resultsTitle.style.color = 'var(--red)';
            resultsSubtitle.textContent = 'No te rindas, estudia el tema y vuelve a intentarlo.';
        }

        if (Auth.isLoggedIn()) {
            await GitHubAPI.saveScore(
                Auth.getUser().username,
                currentSession.id,
                currentLevel,
                score,
                correctCount,
                total,
                Math.round(totalTimeUsed)
            );
        }

        App.showScreen('results');
    }

    function getCurrentSession() { return currentSession; }
    function getCurrentLevel() { return currentLevel; }

    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    return { loadSessionsIndex, loadSession, getSessionsIndex, start, getCurrentSession, getCurrentLevel };
})();
