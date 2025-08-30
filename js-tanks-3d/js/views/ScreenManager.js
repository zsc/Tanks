export default class ScreenManager {
    constructor() {
        this.currentScreen = null;
        this.screens = {};
        this.container = null;
        this.transitionCallback = null;
    }
    
    init() {
        // Create screen container
        this.container = document.createElement('div');
        this.container.id = 'screen-manager';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
        
        // Initialize all screens
        this.createMenuScreen();
        this.createLevelStartScreen();
        this.createGameOverScreen();
        this.createScoreScreen();
        this.createPauseScreen();
        this.createLevelSelectScreen();
        this.createSettingsScreen();
    }
    
    createMenuScreen() {
        const screen = document.createElement('div');
        screen.id = 'menu-screen';
        screen.className = 'game-screen';
        screen.style.cssText = `
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, #000 0%, #1a1a1a 100%);
            color: white;
            font-family: 'Courier New', monospace;
            pointer-events: auto;
        `;
        
        screen.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                gap: 20px;
            ">
                <div class="game-logo" style="
                    font-size: 72px;
                    font-weight: bold;
                    color: #ffcc00;
                    text-shadow: 3px 3px 0 #ff6600, 6px 6px 0 #cc3300;
                    margin-bottom: 30px;
                    letter-spacing: 8px;
                    animation: logoGlow 2s ease-in-out infinite;
                ">TANKS</div>
                
                <div class="menu-options" style="
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    font-size: 24px;
                ">
                    <div class="menu-item" data-option="1player" style="
                        padding: 10px 40px;
                        cursor: pointer;
                        transition: all 0.3s;
                        position: relative;
                    ">
                        <span class="menu-indicator" style="
                            position: absolute;
                            left: -40px;
                            opacity: 0;
                        ">▶</span>
                        1 PLAYER
                    </div>
                    <div class="menu-item" data-option="2players" style="
                        padding: 10px 40px;
                        cursor: pointer;
                        transition: all 0.3s;
                        position: relative;
                    ">
                        <span class="menu-indicator" style="
                            position: absolute;
                            left: -40px;
                            opacity: 0;
                        ">▶</span>
                        2 PLAYERS
                    </div>
                    <div class="menu-item" data-option="level" style="
                        padding: 10px 40px;
                        cursor: pointer;
                        transition: all 0.3s;
                        position: relative;
                    ">
                        <span class="menu-indicator" style="
                            position: absolute;
                            left: -40px;
                            opacity: 0;
                        ">▶</span>
                        SELECT LEVEL
                    </div>
                    <div class="menu-item" data-option="settings" style="
                        padding: 10px 40px;
                        cursor: pointer;
                        transition: all 0.3s;
                        position: relative;
                    ">
                        <span class="menu-indicator" style="
                            position: absolute;
                            left: -40px;
                            opacity: 0;
                        ">▶</span>
                        SETTINGS
                    </div>
                    <div class="menu-item" data-option="exit" style="
                        padding: 10px 40px;
                        cursor: pointer;
                        transition: all 0.3s;
                        position: relative;
                    ">
                        <span class="menu-indicator" style="
                            position: absolute;
                            left: -40px;
                            opacity: 0;
                        ">▶</span>
                        EXIT
                    </div>
                </div>
                
                <div style="
                    margin-top: 50px;
                    font-size: 14px;
                    color: #888;
                ">
                    Use ARROW KEYS to select, ENTER to confirm
                </div>
            </div>
            
            <style>
                @keyframes logoGlow {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                
                .menu-item:hover {
                    color: #ffcc00;
                    transform: translateX(10px);
                }
                
                .menu-item.selected {
                    color: #ffcc00;
                }
                
                .menu-item.selected .menu-indicator {
                    opacity: 1 !important;
                    animation: blink 0.5s infinite;
                }
                
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            </style>
        `;
        
        this.screens.menu = screen;
        this.container.appendChild(screen);
        
        // Setup menu interaction
        this.setupMenuControls(screen);
    }
    
    createLevelStartScreen() {
        const screen = document.createElement('div');
        screen.id = 'level-start-screen';
        screen.className = 'game-screen';
        screen.style.cssText = `
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            color: white;
            font-family: 'Courier New', monospace;
            pointer-events: none;
        `;
        
        screen.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                font-size: 48px;
                font-weight: bold;
                letter-spacing: 4px;
                animation: fadeIn 0.5s ease-in;
            ">
                STAGE <span id="level-number">1</span>
            </div>
            
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
            </style>
        `;
        
        this.screens.levelStart = screen;
        this.container.appendChild(screen);
    }
    
    createGameOverScreen() {
        const screen = document.createElement('div');
        screen.id = 'game-over-screen';
        screen.className = 'game-screen';
        screen.style.cssText = `
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        
        screen.innerHTML = `
            <div id="game-over-text" style="
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                font-size: 64px;
                font-weight: bold;
                color: #ff0000;
                font-family: 'Courier New', monospace;
                letter-spacing: 8px;
                text-shadow: 2px 2px 0 #800000;
                white-space: nowrap;
            ">
                GAME OVER
            </div>
        `;
        
        this.screens.gameOver = screen;
        this.container.appendChild(screen);
    }
    
    createScoreScreen() {
        const screen = document.createElement('div');
        screen.id = 'score-screen';
        screen.className = 'game-screen';
        screen.style.cssText = `
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            color: white;
            font-family: 'Courier New', monospace;
            pointer-events: auto;
        `;
        
        screen.innerHTML = `
            <div style="
                padding: 50px;
                max-width: 600px;
                margin: 0 auto;
            ">
                <h2 style="
                    text-align: center;
                    font-size: 32px;
                    margin-bottom: 10px;
                    color: #ffcc00;
                ">STAGE <span id="score-level">1</span></h2>
                
                <div style="
                    border-top: 2px solid #fff;
                    margin: 20px 0;
                "></div>
                
                <div style="
                    display: flex;
                    justify-content: space-between;
                    font-size: 24px;
                    margin-bottom: 20px;
                ">
                    <div>PLAYER</div>
                    <div>SCORE</div>
                </div>
                
                <div id="player-scores" style="
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                ">
                    <!-- Player scores will be inserted here -->
                </div>
                
                <div style="
                    border-top: 2px solid #fff;
                    margin: 30px 0;
                "></div>
                
                <div id="score-details" style="
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    font-size: 18px;
                ">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Enemies Destroyed:</span>
                        <span id="enemies-killed">0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Bonuses Collected:</span>
                        <span id="bonuses-collected">0</span>
                    </div>
                </div>
                
                <div style="
                    text-align: center;
                    margin-top: 40px;
                    font-size: 16px;
                    color: #888;
                    animation: blink 1s infinite;
                ">
                    Press ENTER to continue
                </div>
            </div>
        `;
        
        this.screens.score = screen;
        this.container.appendChild(screen);
    }
    
    createPauseScreen() {
        const screen = document.createElement('div');
        screen.id = 'pause-screen';
        screen.className = 'game-screen';
        screen.style.cssText = `
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            pointer-events: none;
        `;
        
        screen.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                font-size: 48px;
                font-weight: bold;
                color: white;
                font-family: 'Courier New', monospace;
                letter-spacing: 4px;
                animation: pulse 1s infinite;
            ">
                PAUSED
            </div>
            
            <style>
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            </style>
        `;
        
        this.screens.pause = screen;
        this.container.appendChild(screen);
    }
    
    createSettingsScreen() {
        const screen = document.createElement('div');
        screen.id = 'settings-screen';
        screen.className = 'game-screen';
        screen.style.cssText = `
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, #000 0%, #1a1a1a 100%);
            color: white;
            font-family: 'Courier New', monospace;
            pointer-events: auto;
        `;
        
        screen.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 50px;
                height: 100%;
            ">
                <div style="
                    font-size: 48px;
                    font-weight: bold;
                    color: #ffcc00;
                    margin-bottom: 40px;
                    letter-spacing: 4px;
                ">SETTINGS</div>
                
                <div style="
                    background: rgba(0, 0, 0, 0.7);
                    padding: 30px;
                    border-radius: 10px;
                    border: 2px solid #444;
                    max-width: 500px;
                    width: 100%;
                ">
                    <h3 style="
                        margin: 0 0 20px 0;
                        font-size: 24px;
                        color: #4CAF50;
                        border-bottom: 2px solid #4CAF50;
                        padding-bottom: 10px;
                    ">Audio Settings</h3>
                    
                    <div class="settings-item" style="margin-bottom: 25px;">
                        <label style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            font-size: 18px;
                            margin-bottom: 10px;
                        ">
                            <span>🎵 Music Volume</span>
                            <span id="settings-music-display" style="color: #4CAF50; min-width: 60px; text-align: right;">50%</span>
                        </label>
                        <input type="range" id="settings-music-volume" min="0" max="100" value="50" style="
                            width: 100%;
                            height: 6px;
                            background: rgba(255, 255, 255, 0.2);
                            outline: none;
                            -webkit-appearance: none;
                            border-radius: 3px;
                        ">
                    </div>
                    
                    <div class="settings-item" style="margin-bottom: 25px;">
                        <label style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            font-size: 18px;
                            margin-bottom: 10px;
                        ">
                            <span>🔊 Sound Effects</span>
                            <span id="settings-sfx-display" style="color: #4CAF50; min-width: 60px; text-align: right;">70%</span>
                        </label>
                        <input type="range" id="settings-sfx-volume" min="0" max="100" value="70" style="
                            width: 100%;
                            height: 6px;
                            background: rgba(255, 255, 255, 0.2);
                            outline: none;
                            -webkit-appearance: none;
                            border-radius: 3px;
                        ">
                    </div>
                    
                    <div style="
                        display: flex;
                        gap: 20px;
                        margin-top: 30px;
                    ">
                        <button id="settings-music-toggle" style="
                            flex: 1;
                            padding: 12px;
                            background: rgba(244, 67, 54, 0.8);
                            color: white;
                            border: 2px solid rgba(244, 67, 54, 1);
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                            font-family: 'Courier New', monospace;
                            transition: all 0.3s;
                        ">🔇 Music OFF</button>
                        
                        <button id="settings-mute-all" style="
                            flex: 1;
                            padding: 12px;
                            background: rgba(76, 175, 80, 0.8);
                            color: white;
                            border: 2px solid rgba(76, 175, 80, 1);
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                            font-family: 'Courier New', monospace;
                            transition: all 0.3s;
                        ">🔊 Sound ON</button>
                    </div>
                </div>
                
                <div style="
                    margin-top: 40px;
                    font-size: 16px;
                    color: #888;
                ">
                    Press ESC to return to menu
                </div>
            </div>
            
            <style>
                #settings-music-volume::-webkit-slider-thumb,
                #settings-sfx-volume::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #4CAF50;
                    border-radius: 50%;
                    cursor: pointer;
                }
                
                #settings-music-volume::-moz-range-thumb,
                #settings-sfx-volume::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    background: #4CAF50;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
                
                #settings-music-toggle:hover,
                #settings-mute-all:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
                }
                
                #settings-music-toggle.on {
                    background: rgba(76, 175, 80, 0.8);
                    border-color: rgba(76, 175, 80, 1);
                }
                
                #settings-mute-all.muted {
                    background: rgba(244, 67, 54, 0.8);
                    border-color: rgba(244, 67, 54, 1);
                }
            </style>
        `;
        
        this.screens.settings = screen;
        this.container.appendChild(screen);
        
        // Setup settings controls
        this.setupSettingsControls(screen);
    }
    
    setupSettingsControls(screen) {
        // Get AudioManager instance
        const getAudioManager = () => {
            if (window.game && window.game.controller && window.game.controller.audioManager) {
                return window.game.controller.audioManager;
            }
            return null;
        };
        
        // Music volume slider
        const musicSlider = screen.querySelector('#settings-music-volume');
        const musicDisplay = screen.querySelector('#settings-music-display');
        
        musicSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            musicDisplay.textContent = `${e.target.value}%`;
            
            const audioManager = getAudioManager();
            if (audioManager) {
                audioManager.setMusicVolume(volume);
                this.saveAudioSettings();
            }
        });
        
        // SFX volume slider
        const sfxSlider = screen.querySelector('#settings-sfx-volume');
        const sfxDisplay = screen.querySelector('#settings-sfx-display');
        
        sfxSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            sfxDisplay.textContent = `${e.target.value}%`;
            
            const audioManager = getAudioManager();
            if (audioManager) {
                audioManager.setSFXVolume(volume);
                this.saveAudioSettings();
            }
        });
        
        // Music toggle button
        const musicToggle = screen.querySelector('#settings-music-toggle');
        
        musicToggle.addEventListener('click', () => {
            const audioManager = getAudioManager();
            if (audioManager) {
                const muted = audioManager.toggleMusicMute();
                if (muted) {
                    musicToggle.textContent = '🔇 Music OFF';
                    musicToggle.classList.remove('on');
                    musicDisplay.innerHTML = '<span style="color: #f44336;">MUTED</span>';
                } else {
                    musicToggle.textContent = '🎵 Music ON';
                    musicToggle.classList.add('on');
                    musicDisplay.textContent = `${musicSlider.value}%`;
                }
                this.saveAudioSettings();
            }
        });
        
        // Mute all button
        const muteAllButton = screen.querySelector('#settings-mute-all');
        
        muteAllButton.addEventListener('click', () => {
            const audioManager = getAudioManager();
            if (audioManager) {
                const enabled = audioManager.toggleMute();
                if (enabled) {
                    muteAllButton.textContent = '🔊 Sound ON';
                    muteAllButton.classList.remove('muted');
                } else {
                    muteAllButton.textContent = '🔇 Sound OFF';
                    muteAllButton.classList.add('muted');
                }
                this.saveAudioSettings();
            }
        });
        
        // ESC to return
        const handleKeydown = (e) => {
            if (this.currentScreen !== 'settings') return;
            
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hide('settings');
                this.show('menu');
            }
        };
        
        document.removeEventListener('keydown', this.settingsKeyHandler);
        this.settingsKeyHandler = handleKeydown;
        document.addEventListener('keydown', handleKeydown);
    }
    
    loadAudioSettings() {
        const settings = localStorage.getItem('tankGameAudioSettings');
        if (!settings) return;
        
        const parsed = JSON.parse(settings);
        const getAudioManager = () => {
            if (window.game && window.game.controller && window.game.controller.audioManager) {
                return window.game.controller.audioManager;
            }
            return null;
        };
        
        const audioManager = getAudioManager();
        if (!audioManager) return;
        
        // Update UI to match saved settings
        const musicSlider = document.querySelector('#settings-music-volume');
        const musicDisplay = document.querySelector('#settings-music-display');
        const sfxSlider = document.querySelector('#settings-sfx-volume');
        const sfxDisplay = document.querySelector('#settings-sfx-display');
        const musicToggle = document.querySelector('#settings-music-toggle');
        const muteAllButton = document.querySelector('#settings-mute-all');
        
        if (parsed.musicVolume !== undefined && musicSlider) {
            musicSlider.value = Math.round(parsed.musicVolume * 100);
            musicDisplay.textContent = `${musicSlider.value}%`;
        }
        
        if (parsed.sfxVolume !== undefined && sfxSlider) {
            sfxSlider.value = Math.round(parsed.sfxVolume * 100);
            sfxDisplay.textContent = `${sfxSlider.value}%`;
        }
        
        if (parsed.musicMuted !== undefined && musicToggle) {
            if (parsed.musicMuted) {
                musicToggle.textContent = '🔇 Music OFF';
                musicToggle.classList.remove('on');
                if (musicDisplay) musicDisplay.innerHTML = '<span style="color: #f44336;">MUTED</span>';
            } else {
                musicToggle.textContent = '🎵 Music ON';
                musicToggle.classList.add('on');
            }
        }
        
        if (parsed.muted !== undefined && muteAllButton) {
            if (parsed.muted) {
                muteAllButton.textContent = '🔇 Sound OFF';
                muteAllButton.classList.add('muted');
            } else {
                muteAllButton.textContent = '🔊 Sound ON';
                muteAllButton.classList.remove('muted');
            }
        }
    }
    
    saveAudioSettings() {
        const getAudioManager = () => {
            if (window.game && window.game.controller && window.game.controller.audioManager) {
                return window.game.controller.audioManager;
            }
            return null;
        };
        
        const audioManager = getAudioManager();
        if (!audioManager) return;
        
        const settings = {
            musicVolume: audioManager.musicVolume,
            sfxVolume: audioManager.sfxVolume,
            musicMuted: audioManager.musicMuted,
            muted: !audioManager.enabled
        };
        
        localStorage.setItem('tankGameAudioSettings', JSON.stringify(settings));
    }
    
    createLevelSelectScreen() {
        const screen = document.createElement('div');
        screen.id = 'level-select-screen';
        screen.className = 'game-screen';
        screen.style.cssText = `
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, #000 0%, #1a1a1a 100%);
            color: white;
            font-family: 'Courier New', monospace;
            pointer-events: auto;
            overflow-y: auto;
        `;
        
        // Create level grid (35 levels like C++)
        let levelGridHtml = '';
        for (let i = 1; i <= 35; i++) {
            levelGridHtml += `
                <div class="level-item" data-level="${i}" style="
                    width: 80px;
                    height: 80px;
                    border: 2px solid #444;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: rgba(0, 0, 0, 0.5);
                ">${i}</div>
            `;
        }
        
        screen.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 40px;
                min-height: 100%;
            ">
                <div style="
                    font-size: 48px;
                    font-weight: bold;
                    color: #ffcc00;
                    margin-bottom: 40px;
                    letter-spacing: 4px;
                ">SELECT LEVEL</div>
                
                <div style="
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 20px;
                    max-width: 700px;
                ">
                    ${levelGridHtml}
                </div>
                
                <div style="
                    margin-top: 40px;
                    font-size: 16px;
                    color: #888;
                ">
                    Use ARROW KEYS to select, ENTER to start, ESC to return
                </div>
            </div>
            
            <style>
                .level-item:hover,
                .level-item.selected {
                    border-color: #ffcc00 !important;
                    background: rgba(255, 204, 0, 0.2) !important;
                    transform: scale(1.1);
                }
            </style>
        `;
        
        this.screens.levelSelect = screen;
        this.container.appendChild(screen);
    }
    
    setupLevelSelectControls() {
        const screen = this.screens.levelSelect;
        const levelItems = screen.querySelectorAll('.level-item');
        let selectedIndex = 0;
        
        // Set initial selection
        levelItems[selectedIndex].classList.add('selected');
        
        // Keyboard controls
        const handleKeydown = (e) => {
            if (this.currentScreen !== 'levelSelect') return;
            
            const cols = 7; // 7 columns in grid
            const rows = Math.ceil(35 / cols);
            const currentRow = Math.floor(selectedIndex / cols);
            const currentCol = selectedIndex % cols;
            
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    if (currentRow > 0) {
                        levelItems[selectedIndex].classList.remove('selected');
                        selectedIndex -= cols;
                        levelItems[selectedIndex].classList.add('selected');
                    }
                    break;
                    
                case 'ArrowDown':
                    e.preventDefault();
                    if (currentRow < rows - 1 && selectedIndex + cols < levelItems.length) {
                        levelItems[selectedIndex].classList.remove('selected');
                        selectedIndex += cols;
                        levelItems[selectedIndex].classList.add('selected');
                    }
                    break;
                    
                case 'ArrowLeft':
                    e.preventDefault();
                    if (selectedIndex > 0) {
                        levelItems[selectedIndex].classList.remove('selected');
                        selectedIndex--;
                        levelItems[selectedIndex].classList.add('selected');
                    }
                    break;
                    
                case 'ArrowRight':
                    e.preventDefault();
                    if (selectedIndex < levelItems.length - 1) {
                        levelItems[selectedIndex].classList.remove('selected');
                        selectedIndex++;
                        levelItems[selectedIndex].classList.add('selected');
                    }
                    break;
                    
                case 'Enter':
                    const selectedLevel = parseInt(levelItems[selectedIndex].dataset.level);
                    this.selectLevel(selectedLevel);
                    break;
                    
                case 'Escape':
                    this.hide('levelSelect');
                    this.show('menu');
                    break;
            }
        };
        
        // Remove old event listener if exists
        document.removeEventListener('keydown', this.levelSelectHandler);
        this.levelSelectHandler = handleKeydown;
        document.addEventListener('keydown', handleKeydown);
        
        // Mouse controls
        levelItems.forEach((item, index) => {
            item.addEventListener('mouseenter', () => {
                levelItems[selectedIndex].classList.remove('selected');
                selectedIndex = index;
                levelItems[selectedIndex].classList.add('selected');
            });
            
            item.addEventListener('click', () => {
                const selectedLevel = parseInt(item.dataset.level);
                this.selectLevel(selectedLevel);
            });
        });
    }
    
    selectLevel(levelNumber) {
        console.log('Selected level:', levelNumber);
        this.hide('levelSelect');
        if (this.transitionCallback) {
            this.transitionCallback('startLevel', { level: levelNumber });
        }
    }
    
    setupMenuControls(screen) {
        const menuItems = screen.querySelectorAll('.menu-item');
        let selectedIndex = 0;
        
        // Set initial selection
        menuItems[selectedIndex].classList.add('selected');
        
        // Keyboard controls
        const handleKeydown = (e) => {
            if (this.currentScreen !== 'menu') return;
            
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    menuItems[selectedIndex].classList.remove('selected');
                    selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
                    menuItems[selectedIndex].classList.add('selected');
                    break;
                    
                case 'ArrowDown':
                    e.preventDefault();
                    menuItems[selectedIndex].classList.remove('selected');
                    selectedIndex = (selectedIndex + 1) % menuItems.length;
                    menuItems[selectedIndex].classList.add('selected');
                    break;
                    
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    const option = menuItems[selectedIndex].dataset.option;
                    this.handleMenuSelect(option);
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    this.handleMenuSelect('exit');
                    break;
            }
        };
        
        document.addEventListener('keydown', handleKeydown);
        
        // Mouse controls
        menuItems.forEach((item, index) => {
            item.addEventListener('mouseenter', () => {
                menuItems[selectedIndex].classList.remove('selected');
                selectedIndex = index;
                menuItems[selectedIndex].classList.add('selected');
            });
            
            item.addEventListener('click', () => {
                this.handleMenuSelect(item.dataset.option);
            });
        });
    }
    
    handleMenuSelect(option) {
        console.log('Menu selected:', option);
        
        switch(option) {
            case '1player':
                this.hide('menu');
                if (this.transitionCallback) {
                    this.transitionCallback('start1player', {});
                }
                break;
                
            case '2players':
                this.hide('menu');
                if (this.transitionCallback) {
                    this.transitionCallback('start2players', {});
                }
                break;
                
            case 'level':
                this.hide('menu');
                this.show('levelSelect');
                break;
                
            case 'settings':
                this.hide('menu');
                this.show('settings');
                this.loadAudioSettings();
                break;
                
            case 'exit':
                if (confirm('Exit game?')) {
                    window.close();
                }
                break;
        }
    }
    
    show(screenName, options = {}) {
        // Hide current screen
        if (this.currentScreen && this.screens[this.currentScreen]) {
            this.screens[this.currentScreen].style.display = 'none';
        }
        
        // Show new screen
        if (this.screens[screenName]) {
            this.screens[screenName].style.display = 'block';
            this.currentScreen = screenName;
            
            // Handle screen-specific setup
            switch(screenName) {
                case 'levelStart':
                    this.showLevelStart(options.level || 1);
                    break;
                    
                case 'gameOver':
                    this.showGameOver();
                    break;
                    
                case 'score':
                    this.showScore(options);
                    break;
                    
                case 'levelSelect':
                    this.setupLevelSelectControls();
                    break;
            }
        }
    }
    
    hide(screenName) {
        if (this.screens[screenName]) {
            this.screens[screenName].style.display = 'none';
            if (this.currentScreen === screenName) {
                this.currentScreen = null;
            }
        }
    }
    
    showLevelStart(levelNumber) {
        const levelText = this.screens.levelStart.querySelector('#level-number');
        if (levelText) {
            levelText.textContent = levelNumber;
        }
        
        // Auto-hide after 2 seconds
        setTimeout(() => {
            this.hide('levelStart');
            if (this.transitionCallback) {
                this.transitionCallback('levelStartComplete', {});
            }
        }, 2000);
    }
    
    showGameOver() {
        const gameOverText = this.screens.gameOver.querySelector('#game-over-text');
        
        // Start animation from bottom
        gameOverText.style.top = '100%';
        this.screens.gameOver.style.display = 'block';
        
        // Animate text scrolling up
        let position = window.innerHeight;
        const speed = 2; // pixels per frame
        
        const animate = () => {
            position -= speed;
            gameOverText.style.top = position + 'px';
            
            if (position > window.innerHeight / 2 - 50) {
                requestAnimationFrame(animate);
            } else {
                // Hold for a moment then transition
                setTimeout(() => {
                    this.hide('gameOver');
                    if (this.transitionCallback) {
                        this.transitionCallback('gameOverComplete', {});
                    }
                }, 2000);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    showScore(options = {}) {
        const { level = 1, players = [], enemiesKilled = 0, bonusesCollected = 0 } = options;
        
        // Update level
        const levelText = this.screens.score.querySelector('#score-level');
        if (levelText) levelText.textContent = level;
        
        // Update player scores
        const playerScoresDiv = this.screens.score.querySelector('#player-scores');
        playerScoresDiv.innerHTML = '';
        
        players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 20px;
            `;
            
            playerDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 20px;">
                    <span style="color: ${index === 0 ? '#00ff00' : '#00ffff'};">P${index + 1}</span>
                    <span>x ${player.lives || 0}</span>
                </div>
                <div class="score-counter" data-target="${player.score || 0}">0</div>
            `;
            
            playerScoresDiv.appendChild(playerDiv);
        });
        
        // Update statistics
        const enemiesText = this.screens.score.querySelector('#enemies-killed');
        const bonusesText = this.screens.score.querySelector('#bonuses-collected');
        if (enemiesText) enemiesText.textContent = enemiesKilled;
        if (bonusesText) bonusesText.textContent = bonusesCollected;
        
        // Animate score counting
        this.animateScoreCount();
        
        // Handle continue
        const handleContinue = (e) => {
            if (e.key === 'Enter') {
                document.removeEventListener('keydown', handleContinue);
                this.hide('score');
                if (this.transitionCallback) {
                    this.transitionCallback('scoreComplete', {});
                }
            }
        };
        
        document.addEventListener('keydown', handleContinue);
    }
    
    animateScoreCount() {
        const counters = this.screens.score.querySelectorAll('.score-counter');
        
        counters.forEach(counter => {
            const target = parseInt(counter.dataset.target);
            let current = 0;
            let increment = 1;
            
            const updateCounter = () => {
                // Accelerate counting for larger numbers
                if (current < 20) increment = 1;
                else if (current < 200) increment = 10;
                else if (current < 2000) increment = 100;
                else if (current < 20000) increment = 1000;
                else increment = 10000;
                
                current = Math.min(current + increment, target);
                counter.textContent = current;
                
                if (current < target) {
                    requestAnimationFrame(updateCounter);
                }
            };
            
            updateCounter();
        });
    }
    
    onTransition(callback) {
        this.transitionCallback = callback;
    }
}