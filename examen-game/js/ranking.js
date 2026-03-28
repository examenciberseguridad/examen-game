// ============================================
// RANKING — Global Ranking System
// ============================================

const Ranking = (() => {
    const rankingList = document.getElementById('rankingList');
    const trophyBadge = document.getElementById('trophyBadge');

    async function load() {
        rankingList.innerHTML = '<div class="ranking-loading">Cargando ranking...</div>';
        try {
            const data = await GitHubAPI.getRanking();
            render(data);
            trophyBadge.textContent = data.length;
        } catch (err) {
            rankingList.innerHTML = '<div class="ranking-loading">Error al cargar el ranking</div>';
        }
    }

    function render(data) {
        if (!data || data.length === 0) {
            rankingList.innerHTML = '<div class="ranking-loading">Aún no hay puntajes registrados. ¡Sé el primero!</div>';
            return;
        }

        rankingList.innerHTML = data.map((entry, i) => {
            const pos = i + 1;
            let posClass = '';
            let medal = '';
            if (pos === 1) { posClass = 'gold'; medal = '🥇'; }
            else if (pos === 2) { posClass = 'silver'; medal = '🥈'; }
            else if (pos === 3) { posClass = 'bronze'; medal = '🥉'; }

            const isCurrentUser = Auth.isLoggedIn() &&
                entry.username.toLowerCase() === Auth.getUser().username.toLowerCase();

            return `
                <div class="ranking-item" style="${isCurrentUser ? 'background: rgba(34,211,238,0.05);' : ''}">
                    <span class="ranking-pos ${posClass}">${medal || pos}</span>
                    <span class="ranking-user">${entry.username}${isCurrentUser ? ' (tú)' : ''}</span>
                    <span class="ranking-score">${entry.totalScore.toLocaleString()} pts</span>
                </div>
            `;
        }).join('');
    }

    return { load };
})();
