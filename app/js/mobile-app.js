/**
 * 移动端应用主逻辑
 */
(function() {
    const APP_VERSION = '1.5.1';
    const GAMES = [
        { name: '超级玛丽', file: 'Super Mario Bros. (JU) (PRG0) [!].nes', icon: '🍄' },
        { name: '魂斗罗', file: 'hun.nes', icon: '🔫' },
        { name: '忍者龙剑传', file: 'Kage.nes', icon: '🥷' },
        { name: '赤色要塞', file: 'emc.nes', icon: '🚗' },
        { name: '双截龙2', file: 'Double Dragon2.nes', icon: '👊' },
        { name: '沙罗曼蛇', file: 'Life Force [!].nes', icon: '🚀' },
        { name: '坦克大战', file: 'tanke.nes', icon: '🎖️' },
        { name: '冒险岛', file: 'maoxiandao.nes', icon: '🏝️' },
        { name: '忍者蛙', file: 'xueren.nes', icon: '🐸' },
        { name: '忍者神龟', file: 'sg1.nes', icon: '🐢' },
        { name: '忍者神龟格斗', file: 'sg4.nes', icon: '🐢' },
        { name: '淘金者', file: 'lkr.nes', icon: '💎' },
        { name: '雪人兄弟', file: 'ppl2.nes', icon: '⛄' },
        { name: '炸弹人', file: 'zhadan.nes', icon: '💣' },
        { name: '越野摩托', file: 'Motor.nes', icon: '🏍️' },
        { name: '功夫', file: '(J) (V1.2) Yie Ar Kung-Fu [!].nes', icon: '🥋' },
        { name: '中国象棋', file: 'Zhong Guo Xiang Qi.nes', icon: '♟️' },
        { name: '西游记', file: 'xyj1.nes', icon: '🐒' },
        { name: '马戏团', file: 'ma.nes', icon: '🎪' },
        { name: '忍者蛙与双截龙', file: 'rjbq.nes', icon: '🐉' },
        { name: '洛克人', file: '3.nes', icon: '🤖' }
    ];

    let nes = null;
    let touchController = null;
    let currentGame = null;
    let headerTimeout = null;
    let isPaused = false;
    let audioContext = null;
    let mainBgm = null;
    let pausedForBackground = false;
    let onlineMultiplayer = null;
    let isOnlineMode = false;
    let onlinePlayerId = null;
    let onlineRoomId = null;

    document.addEventListener('DOMContentLoaded', function() {
        initGameGrid();
        initEventListeners();
        restoreScreenMargin();
        initMainBgm();
        checkForUpdates();
        initOnlineMultiplayer();
    });

    function initGameGrid() {
        const grid = document.getElementById('gameGrid');
        if (!grid) return;

        GAMES.forEach(game => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <div class="game-icon">${game.icon}</div>
                <div class="game-name">${game.name}</div>
            `;
            card.addEventListener('click', () => startGame(game));
            grid.appendChild(card);
        });
    }

    function initEventListeners() {
        document.getElementById('backBtn')?.addEventListener('click', goBack);
        document.getElementById('pauseBtn')?.addEventListener('click', togglePause);
        document.getElementById('soundBtn')?.addEventListener('click', toggleSound);
        document.getElementById('settingsBtn')?.addEventListener('click', toggleSettings);
        document.getElementById('settingsClose')?.addEventListener('click', toggleSettings);
        document.getElementById('screenMarginRange')?.addEventListener('input', updateScreenMargin);
        document.getElementById('updateDismiss')?.addEventListener('click', dismissUpdate);
        document.addEventListener('pointerdown', unlockMainBgm, { once: true, passive: true });
        window.addEventListener('pagehide', saveMainBgmPosition);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.getElementById('resumeBtn')?.addEventListener('click', resumeGame);
        document.getElementById('restartBtn')?.addEventListener('click', restartGame);
        document.getElementById('exitBtn')?.addEventListener('click', goBack);
        
        document.getElementById('gamePage')?.addEventListener('click', function(e) {
            if (e.target.closest('.joystick-area') || 
                e.target.closest('.action-area') || 
                e.target.closest('.game-header') ||
                e.target.closest('.pause-overlay')) {
                return;
            }
            toggleHeader();
        });
    }

    function initMainBgm() {
        mainBgm = document.getElementById('mainBgm');
        if (!mainBgm) return;
        mainBgm.volume = 0.35;
        const savedPosition = Number(localStorage.getItem('classicfc-main-bgm-position') || 0);
        mainBgm.addEventListener('loadedmetadata', () => {
            if (savedPosition > 0 && savedPosition < mainBgm.duration) mainBgm.currentTime = savedPosition;
        }, { once: true });
        mainBgm.addEventListener('timeupdate', saveMainBgmPosition);
        mainBgm.play().catch(() => {});
    }

    function saveMainBgmPosition() {
        if (mainBgm && Number.isFinite(mainBgm.currentTime)) {
            localStorage.setItem('classicfc-main-bgm-position', String(mainBgm.currentTime));
        }
    }

    function unlockMainBgm() {
        if (mainBgm && !currentGame) mainBgm.play().catch(() => {});
    }

    function checkForUpdates() {
        const remoteManifest = 'https://raw.githubusercontent.com/zyf-coder/classic-fc-games/main/app/version.json';
        fetch(`${remoteManifest}?t=${Date.now()}`, { cache: 'no-store' })
            .then(response => response.ok ? response.json() : null)
            .then(remote => {
                if (!remote || compareVersions(remote.version, APP_VERSION) <= 0) return;
                const dismissed = localStorage.getItem(`update-dismissed-${remote.version}`);
                if (dismissed) return;
                const banner = document.getElementById('updateBanner');
                const version = document.getElementById('updateVersion');
                const notes = document.getElementById('updateNotes');
                const action = banner?.querySelector('.update-action');
                if (!banner) return;
                version.textContent = `v${remote.version}`;
                if (notes && remote.notes) notes.textContent = remote.notes;
                if (action && remote.downloadUrl) action.href = remote.downloadUrl;
                banner.classList.add('visible');
            })
            .catch(() => {});
    }

    function compareVersions(left, right) {
        const a = String(left).split('.').map(Number);
        const b = String(right).split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
        }
        return 0;
    }

    function dismissUpdate() {
        const banner = document.getElementById('updateBanner');
        const version = document.getElementById('updateVersion')?.textContent.replace(/^v/, '');
        banner?.classList.remove('visible');
        if (version) localStorage.setItem(`update-dismissed-${version}`, '1');
    }


    // 联机功能初始化
    function initOnlineMultiplayer() {
        // Supabase 配置
        const SUPABASE_URL = 'https://mmkptnjivwnuodzbyjuy.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_jmAUsKf5jAksds6fpIEaVQ_I8c3SNci';
        
        onlineMultiplayer = new SupabaseMultiplayer(SUPABASE_URL, SUPABASE_KEY);
        
        // 设置回调
        onlineMultiplayer.onRoomCreated = function(roomId) {
            onlineRoomId = roomId;
            showWaitingPanel(roomId);
        };
        
        onlineMultiplayer.onRoomJoined = function(data) {
            onlineRoomId = data.roomId;
            onlinePlayerId = data.playerId;
            showConnectedPanel();
        };
        
        onlineMultiplayer.onPlayerJoined = function(data) {
            document.getElementById('player2Name').textContent = data.playerName || '玩家2';
            showConnectedPanel();
        };
        
        onlineMultiplayer.onPlayerLeft = function() {
            alert('对手已离开房间');
            hideOnlineDialog();
            disconnectOnline();
        };
        
        onlineMultiplayer.onError = function(message) {
            alert(message);
        };
        
        // 绑定联机UI事件
        document.getElementById('onlineEntryBtn')?.addEventListener('click', showOnlineDialog);
        document.getElementById('onlineDialogClose')?.addEventListener('click', hideOnlineDialog);
        document.getElementById('createRoomBtn')?.addEventListener('click', createOnlineRoom);
        document.getElementById('joinRoomBtn')?.addEventListener('click', joinOnlineRoom);
        document.getElementById('copyRoomIdBtn')?.addEventListener('click', copyRoomId);
        document.getElementById('cancelWaitingBtn')?.addEventListener('click', hideOnlineDialog);
        document.getElementById('startOnlineGameBtn')?.addEventListener('click', startOnlineGame);
        document.getElementById('leaveRoomBtn')?.addEventListener('click', leaveOnlineRoom);
        document.getElementById('onlineDisconnectBtn')?.addEventListener('click', disconnectOnline);
        
        // 标签切换
        document.querySelectorAll('.online-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.online-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.online-panel').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                document.getElementById(this.dataset.tab === 'create' ? 'createRoomPanel' : 'joinRoomPanel').classList.add('active');
            });
        });
    }
    
    // 显示联机对话框
    function showOnlineDialog() {
        // 填充游戏选择
        const gameSelect = document.getElementById('gameSelectOnline');
        if (gameSelect && gameSelect.options.length === 0) {
            GAMES.forEach(game => {
                const option = document.createElement('option');
                option.value = game.name;
                option.textContent = game.name;
                gameSelect.appendChild(option);
            });
        }
        
        document.getElementById('onlineDialog').classList.add('visible');
        showPanel('createRoomPanel');
    }
    
    // 隐藏联机对话框
    function hideOnlineDialog() {
        document.getElementById('onlineDialog').classList.remove('visible');
    }
    
    // 显示指定面板
    function showPanel(panelId) {
        document.querySelectorAll('.online-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(panelId)?.classList.add('active');
    }
    
    // 创建房间
    async function createOnlineRoom() {
        const playerName = document.getElementById('playerNameCreate').value || '玩家1';
        const gameName = document.getElementById('gameSelectOnline').value;
        
        if (!gameName) {
            alert('请选择游戏');
            return;
        }
        
        try {
            // 初始化连接
            const connected = await onlineMultiplayer.init();
            if (!connected) {
                alert('连接服务器失败');
                return;
            }
            
            // 创建房间
            await onlineMultiplayer.createRoom(gameName, playerName);
            onlinePlayerId = 1;
            
            document.getElementById('player1Name').textContent = playerName;
        } catch (e) {
            alert('连接服务器失败: ' + e.message);
        }
    }
    
    // 加入房间
    async function joinOnlineRoom() {
        const playerName = document.getElementById('playerNameJoin').value || '玩家2';
        const roomId = document.getElementById('roomIdInput').value.toUpperCase();
        
        if (!roomId || roomId.length !== 6) {
            alert('请输入6位房间号');
            return;
        }
        
        try {
            // 初始化连接
            const connected = await onlineMultiplayer.init();
            if (!connected) {
                alert('连接服务器失败');
                return;
            }
            
            // 加入房间
            const joined = await onlineMultiplayer.joinRoom(roomId, playerName);
            if (joined) {
                onlinePlayerId = 2;
                document.getElementById('player2Name').textContent = playerName;
            }
        } catch (e) {
            alert('连接服务器失败: ' + e.message);
        }
    }
    
    // 显示等待面板
    function showWaitingPanel(roomId) {
        document.getElementById('waitingRoomId').textContent = roomId;
        showPanel('waitingPanel');
    }
    
    // 显示已连接面板
    function showConnectedPanel() {
        showPanel('connectedPanel');
    }
    
    // 复制房间号
    function copyRoomId() {
        const roomId = document.getElementById('waitingRoomId').textContent;
        navigator.clipboard.writeText(roomId).then(() => {
            alert('房间号已复制');
        }).catch(() => {
            //  fallback
            const input = document.createElement('input');
            input.value = roomId;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            alert('房间号已复制');
        });
    }
    
    // 开始联机游戏
    function startOnlineGame() {
        isOnlineMode = true;
        hideOnlineDialog();
        
        // 显示联机状态栏
        document.getElementById('onlineStatusBar').style.display = 'flex';
        
        // 查找游戏
        const gameName = document.getElementById('gameSelectOnline').value;
        const game = GAMES.find(g => g.name === gameName);
        
        if (game) {
            startGame(game);
            
            // 设置输入同步
            if (onlinePlayerId === 1) {
                // 玩家1使用本地输入
            } else {
                // 玩家2接收输入
                onlineMultiplayer.onPlayerInput = function(input, fromPlayer) {
                    if (fromPlayer !== onlinePlayerId && nes) {
                        // 应用对手的输入
                        applyRemoteInput(input);
                    }
                };
            }
        }
    }
    
    // 应用远程输入
    function applyRemoteInput(input) {
        if (!nes || !nes.keyboard) return;
        
        // 更新键盘状态
        const keys = nes.keyboard.keys;
        if (input.up !== undefined) nes.keyboard.state1[keys.KEY_UP] = input.up ? 0x41 : 0x40;
        if (input.down !== undefined) nes.keyboard.state1[keys.KEY_DOWN] = input.down ? 0x41 : 0x40;
        if (input.left !== undefined) nes.keyboard.state1[keys.KEY_LEFT] = input.left ? 0x41 : 0x40;
        if (input.right !== undefined) nes.keyboard.state1[keys.KEY_RIGHT] = input.right ? 0x41 : 0x40;
        if (input.a !== undefined) nes.keyboard.state1[keys.KEY_A] = input.a ? 0x41 : 0x40;
        if (input.b !== undefined) nes.keyboard.state1[keys.KEY_B] = input.b ? 0x41 : 0x40;
        if (input.select !== undefined) nes.keyboard.state1[keys.KEY_SELECT] = input.select ? 0x41 : 0x40;
        if (input.start !== undefined) nes.keyboard.state1[keys.KEY_START] = input.start ? 0x41 : 0x40;
    }
    
    // 离开房间
    function leaveOnlineRoom() {
        onlineMultiplayer.leaveRoom();
        hideOnlineDialog();
        disconnectOnline();
    }
    
    // 断开联机
    function disconnectOnline() {
        isOnlineMode = false;
        onlineRoomId = null;
        onlinePlayerId = null;
        
        if (onlineMultiplayer) {
            onlineMultiplayer.disconnect();
        }
        
        document.getElementById('onlineStatusBar').style.display = 'none';
    }
    function startGame(game) {
        currentGame = game;
        activateGameAudio();
        if (mainBgm) { saveMainBgmPosition(); mainBgm.pause(); }
        document.getElementById('gameSelectPage').classList.remove('active');
        document.getElementById('gamePage').classList.add('active');
        document.getElementById('gameTitle').textContent = game.name;

        setTimeout(() => {
            loadROM(game.file);
        }, 100);
    }

    function activateGameAudio() {
        try {
            audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
            audioContext.resume();
        } catch (error) {
            console.warn('无法启动游戏声音:', error);
        }
    }

    function loadROM(romFile) {
        if (nes) {
            try { nes.stop(); } catch(e) {}
        }

        const emulator = document.getElementById('emulator');
        emulator.innerHTML = '';

        // JSNES expects a UI constructor here. The real canvas UI is attached below.
        nes = new JSNES({
            ui: JSNES.DummyUI,
            swfPath: 'js/'
        });

        try {
            audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('当前设备不支持 WebAudio:', error);
        }
        nes.opts.emulateSound = true;
        if (audioContext?.state === 'suspended') audioContext.resume();

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 240;
        canvas.className = 'nes-screen';
        canvas.style.imageRendering = 'pixelated';
        canvas.style.imageRendering = 'crisp-edges';
        emulator.appendChild(canvas);

        nes.ui = {
            writeFrame: function(buffer, prevBuffer) {
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, 256, 240);
                const data = imageData.data;

                for (let i = 0; i < 256 * 240; i++) {
                    const pixel = buffer[i];
                    if (pixel !== prevBuffer[i]) {
                        const j = i * 4;
                        data[j] = pixel & 0xFF;
                        data[j + 1] = (pixel >> 8) & 0xFF;
                        data[j + 2] = (pixel >> 16) & 0xFF;
                        data[j + 3] = 0xFF;
                        prevBuffer[i] = pixel;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            },
            writeAudio: function(samples) {
                if (!audioContext || !samples || !samples.length) return;
                if (audioContext.state === 'suspended') audioContext.resume();
                const frames = Math.floor(samples.length / 2);
                const buffer = audioContext.createBuffer(2, frames, 44100);
                const left = buffer.getChannelData(0);
                const right = buffer.getChannelData(1);
                for (let i = 0; i < frames; i++) {
                    left[i] = Math.max(-1, samples[i * 2] / 32767);
                    right[i] = Math.max(-1, samples[i * 2 + 1] / 32767);
                }
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start();
            },
            updateStatus: function() {},
            enable: function() {}
        };

        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'roms/' + encodeURIComponent(romFile), true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
                try {
                    const bytes = new Uint8Array(xhr.response);
                    let romData = '';
                    const chunkSize = 0x8000;
                    for (let i = 0; i < bytes.length; i += chunkSize) {
                        romData += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
                    }
                    nes.loadRom(romData);
                    nes.start();
                    
                    if (touchController) {
                        touchController = null;
                    }
                    touchController = new TouchController(nes);
                    
                    requestFullscreen();
                    showHeader();
                } catch(e) {
                    console.error('ROM加载失败:', e);
                    alert('游戏加载失败，请重试');
                }
            } else {
                console.error('ROM请求失败:', xhr.status, romFile);
                alert('游戏文件加载失败，请返回后重试');
            }
        };
        xhr.onerror = function() {
            console.error('ROM网络请求失败:', romFile);
            alert('游戏文件加载失败，请检查应用资源');
        };
        xhr.send();
    }

    function requestFullscreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }

    function showHeader() {
        const header = document.getElementById('gameHeader');
        header.classList.add('visible');
        
        if (headerTimeout) clearTimeout(headerTimeout);
        headerTimeout = setTimeout(() => {
            header.classList.remove('visible');
        }, 3000);
    }

    function toggleHeader() {
        const header = document.getElementById('gameHeader');
        if (header.classList.contains('visible')) {
            header.classList.remove('visible');
            if (headerTimeout) clearTimeout(headerTimeout);
        } else {
            showHeader();
        }
    }

    function togglePause() {
        if (!nes) return;
        
        if (isPaused) {
            nes.start();
            isPaused = false;
        } else {
            nes.stop();
            isPaused = true;
            document.getElementById('pauseOverlay').classList.add('visible');
        }
    }

    function resumeGame() {
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes) {
            nes.start();
            isPaused = false;
        }
    }

    function restartGame() {
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes && currentGame) {
            try { nes.reloadRom(); nes.start(); } catch(e) {
                loadROM(currentGame.file);
            }
            isPaused = false;
        }
    }

    function toggleSound() {
        if (!nes) return;
        nes.opts.emulateSound = !nes.opts.emulateSound;
        if (nes.opts.emulateSound && audioContext?.state === 'suspended') audioContext.resume();
        
        const soundBtn = document.getElementById('soundBtn');
        if (nes.opts.emulateSound) {
            soundBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/></svg>';
        } else {
            soundBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/></svg>';
        }
    }

    function toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        if (!panel) return;
        const visible = panel.classList.toggle('visible');
        panel.setAttribute('aria-hidden', String(!visible));
    }

    function updateScreenMargin(event) {
        const value = Number(event.target.value);
        document.documentElement.style.setProperty('--side-margin', `${value}px`);
        document.getElementById('screenMarginValue').textContent = `${value}px`;
        localStorage.setItem('classicfc-side-margin-v3', String(value));
    }

    function restoreScreenMargin() {
        const value = Number(localStorage.getItem('classicfc-side-margin-v3') || 44);
        const range = document.getElementById('screenMarginRange');
        if (!range) return;
        range.value = value;
        range.dispatchEvent(new Event('input'));
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            saveMainBgmPosition();
            if (mainBgm) mainBgm.pause();
            if (nes && nes.isRunning) {
                nes.stop();
                pausedForBackground = true;
            }
            if (audioContext?.state === 'running') audioContext.suspend();
            return;
        }

        if (audioContext?.state === 'suspended' && currentGame) audioContext.resume();
        if (!currentGame && mainBgm) mainBgm.play().catch(() => {});
        pausedForBackground = false;
    }

    function goBack() {
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes) {
            try { nes.stop(); } catch(e) {}
            nes = null;
        }
        touchController = null;
        currentGame = null;
        if (mainBgm) mainBgm.play().catch(() => {});
        isPaused = false;
        
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        } catch(e) {}
        
        document.getElementById('gamePage').classList.remove('active');
        document.getElementById('gameSelectPage').classList.add('active');
    }
})();



















