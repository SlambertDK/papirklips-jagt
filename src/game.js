// Slambert.com - Papirklips Jagt (Game A)
// Paperclip survival game logic

// ============================================
// PAPERCLIP GAME - ENHANCED VERSION
// ============================================

// API Base URL - tom string betyder relative URLs (går gennem reverse proxy)
const API_BASE_URL = '';

// Generer eller hent persistent client ID (browser fingerprint)
function getClientId() {
    let clientId = localStorage.getItem('slambert_client_id');
    
    if (!clientId) {
        // Generer simpel browser fingerprint
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
        const canvasData = canvas.toDataURL();
        
        // Kombiner flere faktorer
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            canvasData.slice(-50) // Sidste 50 chars af canvas fingerprint
        ].join('|');
        
        // Hash til et kortere ID
        clientId = btoa(fingerprint).slice(0, 32) + Date.now().toString(36);
        localStorage.setItem('slambert_client_id', clientId);
    }
    
    return clientId;
}

// Custom notification function (erstatter alert)
function showCustomNotification(message, type = 'error') {
    const notification = document.getElementById('customNotification');
    if (!notification) return;
    
    // Remove previous type classes
    notification.classList.remove('success', 'error', 'warning', 'info');
    
    // Add new type
    notification.classList.add(type);
    
    // Set message
    notification.textContent = message;
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

let gameState = {
    active: false,
    startTime: null,
    survivalTime: 0,
    playerX: window.innerWidth / 2,
    playerY: window.innerHeight / 2,
    paperclipX: Math.random() * window.innerWidth,
    paperclipY: Math.random() * window.innerHeight,
    baseSpeed: 0.8,
    currentSpeed: 0.8,
    speedMultiplier: 1.0,
    isMobile: false,
    items: [],
    lastItemSpawn: 0,
    difficultyLevel: 1,
    hasShield: false,
    shieldTimeout: null,
    currentUserGamertag: null,
    currentUserTime: null,
    currentUserRank: null,
    sessionToken: null
};

const ITEM_TYPES = {
    SLOW: { emoji: '🐢', effect: -0.3, duration: 5000, color: '#4ecdc4', name: 'Slow Down' },
    FREEZE: { emoji: '❄️', effect: -0.8, duration: 3000, color: '#00d4ff', name: 'Freeze' },
    SPEED: { emoji: '⚡', effect: 0.4, duration: 5000, color: '#ff6b6b', name: 'Speed Up' },
    CHAOS: { emoji: '💀', effect: 0.6, duration: 4000, color: '#ff0000', name: 'Chaos Mode' },
    TELEPORT: { emoji: '🌀', effect: 0, duration: 0, color: '#ffd700', name: 'Teleport' },
    SHIELD: { emoji: '🛡️', effect: 0, duration: 8000, color: '#00ff00', name: 'Shield' }
};

// ============================================
// GAME FUNCTIONS
// ============================================

// Initialize game when called
function initPaperclipGame() {
    console.log('🎮 Initializing Paperclip Game...');
    gameState.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const startButton = document.getElementById('startGame');
    const instructions = document.getElementById('gameInstructions');
    
    if (startButton && instructions) {
        startButton.addEventListener('click', () => {
            instructions.style.display = 'none';
            startPaperclipGame();
        });
    }
    
    // Set initial player position to center
    gameState.playerX = window.innerWidth / 2;
    gameState.playerY = window.innerHeight / 2;
    
    // Load initial leaderboard data for landing page
    loadLandingPageHighscores();
}

// Load highscores for display on landing page
async function loadLandingPageHighscores() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaderboard`);
        const result = await response.json();
        
        if (result.success) {
            displayLandingPageHighscores(result.data);
        }
    } catch (error) {
        console.error('Error loading landing page highscores:', error);
        displayLandingPageHighscores([]);
    }
}

// Display highscores on landing page
function displayLandingPageHighscores(scores) {
    const gameAHighscores = document.getElementById('gameAHighscores');
    if (!gameAHighscores) return;
    
    if (scores.length === 0) {
        gameAHighscores.innerHTML = '<div class="loading">Ingen scores endnu!</div>';
        return;
    }
    
    const html = scores.slice(0, 5).map((score, index) => {
        const rank = index + 1;
        return `
            <div class="highscore-entry rank-${rank}">
                <span class="highscore-rank">${getRankEmoji(rank)}</span>
                <span class="highscore-name">${score.initials}</span>
                <span class="highscore-score">${score.survival_time}s</span>
            </div>
        `;
    }).join('');
    
    gameAHighscores.innerHTML = html;
}

function getRankEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
}

// Make functions globally available (instead of ES6 exports)
window.initPaperclipGame = initPaperclipGame;
window.startPaperclipGame = startPaperclipGame;



async function startPaperclipGame() {
    const paperclip = document.getElementById('paperclip');
    const gameHud = document.getElementById('gameHud');
    const touchIndicator = document.getElementById('touchIndicator');
    
    if (!paperclip || !gameHud) return;
    
    // Hent session token fra serveren
    try {
        const clientId = getClientId();
        
        const response = await fetch(`${API_BASE_URL}/api/start-game`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ clientId })
        });
        
        // Tjek om response er OK (ikke 404/500)
        if (!response.ok) {
            console.warn('API ikke tilgængelig, starter spil uden session tracking');
            // Start spillet alligevel uden session token
            gameState.sessionToken = null;
        } else {
            const result = await response.json();
            
            if (!result.success || !result.token) {
                console.error('Kunne ikke starte game session');
                gameState.sessionToken = null;
            } else {
                gameState.sessionToken = result.token;
            }
        }
    } catch (error) {
        console.error('Fejl ved start af game session:', error);
        console.warn('Starter spil i offline mode');
        // Lad spillet fortsætte uden session token
        gameState.sessionToken = null;
    }
    
    gameState.active = true;
    gameState.startTime = Date.now();
    gameHud.style.display = 'flex';
    
    // Random paperclip starting position (far from center)
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(window.innerWidth, window.innerHeight) * 0.8;
    gameState.paperclipX = window.innerWidth / 2 + Math.cos(angle) * distance;
    gameState.paperclipY = window.innerHeight / 2 + Math.sin(angle) * distance;
    
    if (gameState.isMobile) {
        // Mobile: Touch controls
        touchIndicator.style.display = 'block';
        updateTouchIndicator();
        
        document.addEventListener('touchstart', handleTouch);
        document.addEventListener('touchmove', handleTouch);
    } else {
        // Desktop: Mouse controls
        document.addEventListener('mousemove', handleMouse);
    }
    
    gameLoop();
}

function handleMouse(e) {
    if (!gameState.active) return;
    gameState.playerX = e.clientX;
    gameState.playerY = e.clientY;
    
    // Update shield position on desktop
    if (gameState.hasShield) {
        updateShieldPosition();
    }
}

function handleTouch(e) {
    if (!gameState.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    
    // Teleport player to touch location
    gameState.playerX = touch.clientX;
    gameState.playerY = touch.clientY;
    
    updateTouchIndicator();
}

function updateTouchIndicator() {
    const touchIndicator = document.getElementById('touchIndicator');
    if (touchIndicator) {
        touchIndicator.style.left = gameState.playerX + 'px';
        touchIndicator.style.top = gameState.playerY + 'px';
    }
}

function gameLoop() {
    if (!gameState.active) return;
    
    const currentTime = Date.now();
    gameState.survivalTime = Math.floor((currentTime - gameState.startTime) / 1000);
    
    // Update difficulty based on time
    updateDifficulty();
    
    // Update HUD
    updateHUD();
    
    // Move paperclip towards player
    updatePaperclip();
    
    // Spawn items
    spawnItems(currentTime);
    
    // Update items
    updateItems();
    
    // Check collision with paperclip
    if (checkCollision()) {
        endGame();
        return;
    }
    
    requestAnimationFrame(gameLoop);
}

function updateDifficulty() {
    // Increase difficulty every 10 seconds
    const newLevel = Math.floor(gameState.survivalTime / 10) + 1;
    
    if (newLevel > gameState.difficultyLevel) {
        gameState.difficultyLevel = newLevel;
        gameState.baseSpeed += 0.15;
        
        // Show difficulty increase
        showNotification(`Sværhedsgrad ${newLevel}! 📈`, '#ff6b6b');
    }
}

function updatePaperclip() {
    const paperclip = document.getElementById('paperclip');
    if (!paperclip) return;
    
    const dx = gameState.playerX - gameState.paperclipX;
    const dy = gameState.playerY - gameState.paperclipY;
    
    const effectiveSpeed = gameState.baseSpeed * gameState.speedMultiplier;
    
    gameState.paperclipX += dx * effectiveSpeed * 0.01;
    gameState.paperclipY += dy * effectiveSpeed * 0.01;
    
    paperclip.style.left = gameState.paperclipX + 'px';
    paperclip.style.top = gameState.paperclipY + 'px';
    
    // Rotate paperclip based on movement direction
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    paperclip.style.transform = `rotate(${angle}deg)`;
}

function spawnItems(currentTime) {
    const spawnInterval = Math.max(3000 - (gameState.difficultyLevel * 200), 1500);
    
    if (currentTime - gameState.lastItemSpawn > spawnInterval) {
        gameState.lastItemSpawn = currentTime;
        
        const itemType = getRandomItemType();
        const item = {
            type: itemType,
            x: Math.random() * (window.innerWidth - 80) + 40,
            y: Math.random() * (window.innerHeight - 80) + 40,
            id: Date.now() + Math.random(),
            element: null
        };
        
        createItemElement(item);
        gameState.items.push(item);
    }
}

function getRandomItemType() {
    const types = Object.keys(ITEM_TYPES);
    const weights = gameState.survivalTime > 20 ? [20, 10, 25, 20, 15, 10] : [30, 15, 20, 10, 15, 10];
    
    let totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < types.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return types[i];
        }
    }
    
    return types[0];
}

function createItemElement(item) {
    const container = document.getElementById('itemsContainer');
    if (!container) return;
    
    const itemData = ITEM_TYPES[item.type];
    
    const element = document.createElement('div');
    element.className = 'game-item';
    element.style.left = item.x + 'px';
    element.style.top = item.y + 'px';
    element.innerHTML = `
        <div class="item-emoji">${itemData.emoji}</div>
        <div class="item-label">${itemData.name}</div>
    `;
    element.style.borderColor = itemData.color;
    element.style.boxShadow = `0 0 20px ${itemData.color}`;
    
    element.addEventListener('click', () => handleItemClick(item));
    element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleItemClick(item);
    });
    
    item.element = element;
    container.appendChild(element);
}

function handleItemClick(item) {
    const itemData = ITEM_TYPES[item.type];
    
    // Remove item from DOM
    if (item.element) {
        item.element.remove();
    }
    
    // Remove from array
    gameState.items = gameState.items.filter(i => i.id !== item.id);
    
    // Apply effect
    applyItemEffect(item.type, itemData);
    
    showNotification(`${itemData.emoji} ${itemData.name}!`, itemData.color);
}

function applyItemEffect(type, itemData) {
    if (type === 'TELEPORT') {
        // Teleport paperclip to random location far away
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(window.innerWidth, window.innerHeight);
        gameState.paperclipX = gameState.playerX + Math.cos(angle) * distance;
        gameState.paperclipY = gameState.playerY + Math.sin(angle) * distance;
    } else if (type === 'SHIELD') {
        // Activate shield - allows one collision
        gameState.hasShield = true;
        
        // Clear any existing shield timeout
        if (gameState.shieldTimeout) {
            clearTimeout(gameState.shieldTimeout);
        }
        
        // Add shield visual effect
        addShieldVisual();
        
        // Shield expires after duration
        gameState.shieldTimeout = setTimeout(() => {
            gameState.hasShield = false;
            removeShieldVisual();
            showNotification('Shield Expired! 💔', '#ff6b6b');
        }, itemData.duration);
        
    } else {
        // Speed modification
        gameState.speedMultiplier += itemData.effect;
        
        setTimeout(() => {
            gameState.speedMultiplier -= itemData.effect;
        }, itemData.duration);
    }
}

function updateItems() {
    // Remove items that are older than 10 seconds
    const currentTime = Date.now();
    gameState.items = gameState.items.filter(item => {
        const age = currentTime - (item.id - Math.random());
        if (age > 10000) {
            if (item.element) item.element.remove();
            return false;
        }
        return true;
    });
}

function checkCollision() {
    const dx = gameState.playerX - gameState.paperclipX;
    const dy = gameState.playerY - gameState.paperclipY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 40) {
        // If has shield, use it up instead of ending game
        if (gameState.hasShield) {
            gameState.hasShield = false;
            removeShieldVisual();
            if (gameState.shieldTimeout) {
                clearTimeout(gameState.shieldTimeout);
            }
            
            // Teleport paperclip away as a reward
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.max(window.innerWidth, window.innerHeight) * 0.8;
            gameState.paperclipX = gameState.playerX + Math.cos(angle) * distance;
            gameState.paperclipY = gameState.playerY + Math.sin(angle) * distance;
            
            showNotification('Shield Protected You! 🛡️', '#00ff00');
            return false; // Continue game
        }
        
        return true; // End game
    }
    
    return false;
}

function updateHUD() {
    const timeDisplay = document.getElementById('timeDisplay');
    const speedDisplay = document.getElementById('speedDisplay');
    const statusDisplay = document.getElementById('statusDisplay');
    
    if (timeDisplay) timeDisplay.textContent = gameState.survivalTime + 's';
    if (speedDisplay) speedDisplay.textContent = (gameState.baseSpeed * gameState.speedMultiplier).toFixed(1) + 'x';
    
    let status = 'Normal';
    if (gameState.speedMultiplier < 0.5) status = '🐢 Slow';
    else if (gameState.speedMultiplier > 1.5) status = '⚡ Fast!';
    
    if (statusDisplay) statusDisplay.textContent = status;
}

function showNotification(message, color) {
    const notification = document.createElement('div');
    notification.className = 'game-notification';
    notification.textContent = message;
    notification.style.color = color;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 2000);
}

function endGame() {
    gameState.active = false;
    const gameOver = document.getElementById('gameOver');
    const gameHud = document.getElementById('gameHud');
    const touchIndicator = document.getElementById('touchIndicator');
    
    // Remove shield
    removeShieldVisual();
    if (gameState.shieldTimeout) {
        clearTimeout(gameState.shieldTimeout);
    }
    
    if (gameOver) gameOver.style.display = 'flex';
    if (gameHud) gameHud.style.display = 'none';
    if (touchIndicator) touchIndicator.style.display = 'none';
    
    // Clear all items
    gameState.items.forEach(item => {
        if (item.element) item.element.remove();
    });
    gameState.items = [];
    
    setTimeout(() => {
        showInitialsInput();
    }, 3000);
}

function showInitialsInput() {
    const gameOverContent = document.querySelector('.game-over-content');
    if (!gameOverContent) return;
    
    gameOverContent.innerHTML = `
        <div class="paperclip-big">📎</div>
        <h2>Du er nu blevet en papirklips</h2>
        <p class="survival-time">Du overlevede i ${gameState.survivalTime} sekunder!</p>
        <p class="difficulty-reached">Nåede sværhedsgrad ${gameState.difficultyLevel}</p>
        <div class="initials-form">
            <input type="text" id="gamertagInput" maxlength="20" placeholder="DinEpiskGamerTag" />
            <button id="submitScore">Gem Score</button>
        </div>
        <button id="playAgain" class="play-again-btn">Spil Igen</button>
        <div id="leaderboard-display"></div>
    `;
    
    const input = document.getElementById('gamertagInput');
    const submitBtn = document.getElementById('submitScore');
    const playAgainBtn = document.getElementById('playAgain');
    
    if (input) input.focus();
    
    if (submitBtn) {
        submitBtn.addEventListener('click', submitScore);
    }
    
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitScore();
        });
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', resetGame);
    }
    
    loadLeaderboard();
}

async function submitScore() {
    const input = document.getElementById('gamertagInput');
    if (!input) return;
    
    const gamertag = input.value.trim();
    
    if (gamertag.length < 1 || gamertag.length > 20) {
        showCustomNotification('Indtast venligst et gamertag (1-20 karakterer)', 'warning');
        return;
    }
    
    // Check om vi har en valid session token
    if (!gameState.sessionToken) {
        showCustomNotification('Advarsel: Spillet kører i offline mode. Score gemmes ikke.', 'warning');
        return;
    }
    
    try {
        const clientId = getClientId();

        const response = await fetch(`${API_BASE_URL}/api/submit-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                initials: gamertag,
                time: gameState.survivalTime,
                token: gameState.sessionToken,
                clientId: clientId
            })
        });        const result = await response.json();
        
        if (result.success) {
            // Gem brugerens gamertag og tid for at kunne highlighte deres score
            gameState.currentUserGamertag = gamertag;
            gameState.currentUserTime = gameState.survivalTime;
            gameState.currentUserRank = result.rank;
            
            showCustomNotification(`Score gemt! Du er nummer ${result.rank} 🎉`, 'success');
            
            loadLeaderboard();
            input.disabled = true;
            const submitBtn = document.getElementById('submitScore');
            if (submitBtn) submitBtn.disabled = true;
        } else {
            showCustomNotification(result.error || 'Fejl ved gemning af score', 'error');
        }
    } catch (error) {
        console.error('Error submitting score:', error);
        showCustomNotification('Kunne ikke forbinde til serveren', 'error');
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaderboard`);
        const result = await response.json();
        
        if (result.success) {
            // Hvis brugeren har et gamertag, hent også deres placering
            if (gameState.currentUserGamertag && gameState.currentUserTime !== undefined) {
                const userResponse = await fetch(`${API_BASE_URL}/api/user-rank/${encodeURIComponent(gameState.currentUserGamertag)}/${gameState.currentUserTime}`);
                const userResult = await userResponse.json();
                
                if (userResult.success) {
                    displayLeaderboard(result.data, userResult.data, userResult.rank);
                } else {
                    displayLeaderboard(result.data);
                }
            } else {
                displayLeaderboard(result.data);
            }
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function displayLeaderboard(scores, userScore = null, userRank = null) {
    const leaderboardDiv = document.getElementById('leaderboard-display');
    if (!leaderboardDiv) return;
    
    if (scores.length === 0) {
        leaderboardDiv.innerHTML = '<p class="no-scores">Ingen scores endnu!</p>';
        return;
    }
    
    // Check om brugeren er i top 10
    const userInTop10 = userScore && userRank <= 10;
    
    let html = `
        <h3 class="leaderboard-title">🏆 Top 10 Leaderboard</h3>
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Gamertag</th>
                    <th>Tid</th>
                </tr>
            </thead>
            <tbody>
                ${scores.map((score, index) => {
                    const rank = index + 1;
                    const isCurrentUser = userScore && 
                                         score.initials === userScore.initials && 
                                         score.survival_time === userScore.survival_time &&
                                         score.created_at === userScore.created_at;
                    
                    return `
                        <tr class="${index < 3 ? 'top-three' : ''} ${isCurrentUser ? 'current-user' : ''}">
                            <td>${getMedalEmoji(rank)}</td>
                            <td>${score.initials}${isCurrentUser ? ' 👈' : ''}</td>
                            <td>${score.survival_time}s</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    // Hvis brugeren ikke er i top 10, vis deres placering
    if (userScore && !userInTop10) {
        html += `
            <div class="user-score-separator">...</div>
            <table class="leaderboard-table user-score-table">
                <tbody>
                    <tr class="current-user">
                        <td>${userRank}</td>
                        <td>${userScore.initials} 👈</td>
                        <td>${userScore.survival_time}s</td>
                    </tr>
                </tbody>
            </table>
            <p class="user-rank-message">Du er nummer ${userRank}! Spil igen for at forbedre din placering! 🎮</p>
        `;
    }
    
    leaderboardDiv.innerHTML = html;
}

function getMedalEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
}

function resetGame() {
    const gameOver = document.getElementById('gameOver');
    if (gameOver) gameOver.style.display = 'none';
    
    // Remove shield visual if exists
    removeShieldVisual();
    
    // Reset game state
    gameState = {
        active: false,
        startTime: null,
        survivalTime: 0,
        playerX: window.innerWidth / 2,
        playerY: window.innerHeight / 2,
        paperclipX: Math.random() * window.innerWidth,
        paperclipY: Math.random() * window.innerHeight,
        baseSpeed: 0.8,
        currentSpeed: 0.8,
        speedMultiplier: 1.0,
        isMobile: gameState.isMobile,
        items: [],
        lastItemSpawn: 0,
        difficultyLevel: 1,
        hasShield: false,
        shieldTimeout: null
    };
    
    startPaperclipGame();
}

// Shield visual effects
function addShieldVisual() {
    // Remove existing shield if any
    removeShieldVisual();
    
    const touchIndicator = document.getElementById('touchIndicator');
    const target = gameState.isMobile ? touchIndicator : document.body;
    
    const shield = document.createElement('div');
    shield.id = 'shield-effect';
    shield.style.cssText = `
        position: fixed;
        width: 100px;
        height: 100px;
        border: 4px solid #00ff00;
        border-radius: 50%;
        pointer-events: none;
        z-index: 998;
        animation: shield-pulse 1s ease-in-out infinite;
        box-shadow: 0 0 30px #00ff00, inset 0 0 30px rgba(0, 255, 0, 0.3);
    `;
    
    if (gameState.isMobile && touchIndicator) {
        // For mobile, attach to touch indicator
        touchIndicator.appendChild(shield);
        shield.style.position = 'absolute';
        shield.style.top = '50%';
        shield.style.left = '50%';
        shield.style.transform = 'translate(-50%, -50%)';
    } else {
        // For desktop, follow mouse
        document.body.appendChild(shield);
        updateShieldPosition();
    }
}

function updateShieldPosition() {
    const shield = document.getElementById('shield-effect');
    if (shield && !gameState.isMobile) {
        shield.style.left = gameState.playerX + 'px';
        shield.style.top = gameState.playerY + 'px';
        shield.style.transform = 'translate(-50%, -50%)';
    }
}

function removeShieldVisual() {
    const shield = document.getElementById('shield-effect');
    if (shield) {
        shield.remove();
    }
}

// Add CSS animation for shield pulse
(function addShieldStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shield-pulse {
            0%, 100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.1);
                opacity: 0.8;
            }
        }
    `;
    document.head.appendChild(style);
})();
// Listen for return to landing event
window.addEventListener('returnToLanding', () => {
    console.log(' Stopping game, returning to landing...');
    
    // Stop game if active
    if (gameState.active) {
        gameState.active = false;
        gameState.gameOver = true;
        
        // Clear intervals
        if (gameState.gameLoopId) {
            cancelAnimationFrame(gameState.gameLoopId);
            gameState.gameLoopId = null;
        }
        
        // Hide game elements
        const paperclip = document.getElementById('paperclip');
        const itemsContainer = document.getElementById('itemsContainer');
        const touchIndicator = document.getElementById('touchIndicator');
        const gameHud = document.getElementById('gameHud');
        
        if (paperclip) paperclip.style.display = 'none';
        if (itemsContainer) itemsContainer.innerHTML = '';
        if (touchIndicator) touchIndicator.style.display = 'none';
        if (gameHud) gameHud.style.display = 'none';
        
        // Reset game state
        gameState.startTime = null;
        gameState.sessionToken = null;
        gameState.powerups = [];
        gameState.obstacles = [];
    }
});

// Make function globally available
window.initPaperclipGame = initPaperclipGame;

// Auto-initialize when loaded as standalone game
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaperclipGame);
} else {
    // DOMContentLoaded already fired
    initPaperclipGame();
}
