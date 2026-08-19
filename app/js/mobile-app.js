/**
 * 移动端应用主逻辑
 */
(function() {
    const APP_VERSION = '1.6.3';
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
    let onlineMultiplayer = null;
    let isOnlineMode = false;
    let onlinePlayerId = null;
    let onlineRoomId = null;

    document.addEventListener('DOMContentLoaded', function() {
        initGameGrid();
        initEventListeners();
        initBottomTabs();
        initDpad();
        initOnlineMultiplayer();
        initMainBgm();
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
        document.getElementById('resumeBtn')?.addEventListener('click', resumeGame);
        document.getElementById('restartBtn')?.addEventListener('click', restartGame);
        document.getElementById('exitBtn')?.addEventListener('click', goBack);
        
        // 联机事件
        document.getElementById('confirmNicknameBtn')?.addEventListener('click', confirmNickname);
        document.getElementById('nicknameCancelBtn')?.addEventListener('click', () => hideDialog('nicknameDialog'));
        document.getElementById('lobbyBackBtn')?.addEventListener('click', () => switchPage('gameSelectPage'));
        document.getElementById('createRoomBtn')?.addEventListener('click', createOnlineRoom);
        document.getElementById('joinRoomBtn')?.addEventListener('click', joinOnlineRoom);
        document.getElementById('refreshRoomListBtn')?.addEventListener('click', refreshRoomList);
        document.getElementById('roomBackBtn')?.addEventListener('click', leaveRoom);
        document.getElementById('roomCopyBtn')?.addEventListener('click', copyRoomId);
        document.getElementById('startGameBtn')?.addEventListener('click', startOnlineGame);
        document.getElementById('chatSendBtn')?.addEventListener('click', sendChatMessage);
        document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
        document.getElementById('changeNicknameBtn')?.addEventListener('click', showNicknameDialog);
        
        // 标签切换
        document.querySelectorAll('.online-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.online-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.online-panel').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                const panelId = {'roomList': 'roomListPanel', 'createRoom': 'createRoomPanel', 'joinRoom': 'joinRoomPanel'}[this.dataset.tab];
                document.getElementById(panelId)?.classList.add('active');
                if (this.dataset.tab === 'roomList') refreshRoomList();
            });
        });
        
        // 游戏页面点击显示头部
        document.getElementById('gamePage')?.addEventListener('click', function(e) {
            if (e.target.closest('.dpad-area') || e.target.closest('.action-area') || e.target.closest('.system-btns')) return;
            toggleHeader();
        });
    }

    function initBottomTabs() {
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', function() {
                const pageId = this.dataset.page;
                
                // 如果点击游戏房间tab，需要检查昵称
                if (pageId === 'onlineLobbyPage') {
                    const nickname = localStorage.getItem('playerNickname');
                    if (!nickname) {
                        showNicknameDialog();
                        return;
                    }
                }
                
                switchPage(pageId);
            });
        });
    }

    function switchPage(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageId)?.classList.add('active');
        
        // 更新tab状态
        document.querySelectorAll('.tab-item').forEach(t => {
            t.classList.toggle('active', t.dataset.page === pageId);
        });
        
        // 刷新房间列表
        if (pageId === 'onlineLobbyPage') {
            refreshRoomList();
            document.getElementById('lobbyNickname').textContent = localStorage.getItem('playerNickname') || '';
        }
        
        // 更新我的页面
        if (pageId === 'profilePage') {
            document.getElementById('profileNickname').textContent = localStorage.getItem('playerNickname') || '未设置';
        }
        
        // 隐藏底部tab（游戏页面时）
        document.getElementById('bottomTabs').style.display = pageId === 'gamePage' ? 'none' : 'flex';
    }

    function initDpad() {
        const keys = {dpadUp: 'KEY_UP', dpadDown: 'KEY_DOWN', dpadLeft: 'KEY_LEFT', dpadRight: 'KEY_RIGHT', btnA: 'KEY_A', btnB: 'KEY_B', btnSelect: 'KEY_SELECT', btnStart: 'KEY_START'};
        
        Object.entries(keys).forEach(([btnId, keyName]) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            
            const press = (e) => {
                e.preventDefault();
                if (nes && nes.keyboard) {
                    nes.keyboard.state1[nes.keyboard.keys[keyName]] = 0x41;
                }
            };
            
            const release = (e) => {
                e.preventDefault();
                if (nes && nes.keyboard) {
                    nes.keyboard.state1[nes.keyboard.keys[keyName]] = 0x40;
                }
            };
            
            btn.addEventListener('touchstart', press, {passive: false});
            btn.addEventListener('touchend', release, {passive: false});
            btn.addEventListener('touchcancel', release, {passive: false});
            btn.addEventListener('mousedown', press);
            btn.addEventListener('mouseup', release);
            btn.addEventListener('mouseleave', release);
        });
    }

    function initMainBgm() {
        mainBgm = document.getElementById('mainBgm');
        if (!mainBgm) return;
        mainBgm.volume = 0.3;
        mainBgm.play().catch(() => {});
    }

    // 联机功能
    function initOnlineMultiplayer() {
        const SUPABASE_URL = 'https://mmkptnjivwnuodzbyjuy.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_jmAUsKf5jAksds6fpIEaVQ_I8c3SNci';
        
        onlineMultiplayer = new SupabaseMultiplayer(SUPABASE_URL, SUPABASE_KEY);
        
        onlineMultiplayer.onRoomCreated = function(roomId) {
            onlineRoomId = roomId;
            showRoomPage(roomId, true);
        };
        
        onlineMultiplayer.onRoomJoined = function(data) {
            onlineRoomId = data.roomId;
            onlinePlayerId = data.playerId;
            showRoomPage(data.roomId, false);
        };
        
        onlineMultiplayer.onPlayerJoined = function(data) {
            document.getElementById('roomPlayer2').textContent = data.playerName || '玩家2';
            document.getElementById('startGameBtn').disabled = false;
            document.getElementById('startGameBtn').textContent = '开始游戏';
            addChatMessage('系统', data.playerName + ' 加入了房间', false);
        };
        
        onlineMultiplayer.onPlayerLeft = function() {
            addChatMessage('系统', '对手已离开房间', false);
            document.getElementById('roomPlayer2').textContent = '等待中...';
            document.getElementById('startGameBtn').disabled = true;
            document.getElementById('startGameBtn').textContent = '等待对手加入...';
        };
        
        onlineMultiplayer.onChatMessage = function(data) {
            addChatMessage(data.playerName, data.message, data.playerId === onlinePlayerId);
        };
        
        onlineMultiplayer.onError = function(message) {
            alert(message);
        };
    }

    function showNicknameDialog() {
        const savedName = localStorage.getItem('playerNickname') || '';
        document.getElementById('nicknameInput').value = savedName;
        document.getElementById('nicknameStatus').textContent = '';
        showDialog('nicknameDialog');
    }

    async function confirmNickname() {
        const name = document.getElementById('nicknameInput').value.trim();
        const statusEl = document.getElementById('nicknameStatus');
        
        if (!name) {
            statusEl.textContent = '请输入昵称';
            statusEl.className = 'nickname-status taken';
            return;
        }
        
        if (name.length < 2) {
            statusEl.textContent = '昵称至少2个字符';
            statusEl.className = 'nickname-status taken';
            return;
        }
        
        statusEl.textContent = '检查中...';
        statusEl.className = 'nickname-status';
        
        try {
            const connected = await onlineMultiplayer.init();
            if (!connected) {
                statusEl.textContent = '连接服务器失败';
                statusEl.className = 'nickname-status taken';
                return;
            }
            
            const available = await onlineMultiplayer.checkNickname(name);
            if (!available) {
                statusEl.textContent = '该昵称已被使用';
                statusEl.className = 'nickname-status taken';
                return;
            }
            
            const registered = await onlineMultiplayer.registerNickname(name);
            if (registered) {
                localStorage.setItem('playerNickname', name);
                onlineMultiplayer.playerName = name;
                hideDialog('nicknameDialog');
                switchPage('onlineLobbyPage');
            } else {
                statusEl.textContent = '注册失败，请重试';
                statusEl.className = 'nickname-status taken';
            }
        } catch (e) {
            statusEl.textContent = '操作失败: ' + e.message;
            statusEl.className = 'nickname-status taken';
        }
    }

    async function createOnlineRoom() {
        const gameName = document.getElementById('gameSelectOnline').value;
        const name = localStorage.getItem('playerNickname');
        
        if (!gameName) { alert('请选择游戏'); return; }
        if (!name) { showNicknameDialog(); return; }
        
        try {
            const created = await onlineMultiplayer.createRoom(gameName, name);
            if (created) {
                onlinePlayerId = 1;
                showRoomPage(onlineMultiplayer.roomId, true);
            } else {
                alert('创建房间失败');
            }
        } catch (e) {
            alert('创建房间失败: ' + e.message);
        }
    }

    async function joinOnlineRoom() {
        const roomId = document.getElementById('roomIdInput').value.toUpperCase();
        const name = localStorage.getItem('playerNickname');
        
        if (!roomId || roomId.length !== 6) { alert('请输入6位房间号'); return; }
        if (!name) { showNicknameDialog(); return; }
        
        try {
            const joined = await onlineMultiplayer.joinRoom(roomId, name);
            if (joined) {
                onlinePlayerId = 2;
                showRoomPage(roomId, false);
            } else {
                alert('加入房间失败');
            }
        } catch (e) {
            alert('加入房间失败: ' + e.message);
        }
    }

    async function refreshRoomList() {
        const roomList = document.getElementById('roomList');
        if (!roomList) return;
        roomList.innerHTML = '<div class="room-list-empty">加载中...</div>';
        
        try {
            const rooms = await onlineMultiplayer.getRoomList();
            if (!rooms || rooms.length === 0) {
                roomList.innerHTML = '<div class="room-list-empty">暂无房间，快去创建吧</div>';
                return;
            }
            
            roomList.innerHTML = rooms.map(room => `
                <div class="room-item">
                    <div class="room-item-info">
                        <div class="room-item-game">${room.game}</div>
                        <div class="room-item-host">房主: ${room.player1}</div>
                        <div class="room-item-id">房间号: ${room.id}</div>
                    </div>
                    <button class="room-item-join" onclick="window.quickJoinRoom('${room.id}')">加入</button>
                </div>
            `).join('');
        } catch (e) {
            roomList.innerHTML = '<div class="room-list-empty">加载失败</div>';
        }
    }

    window.quickJoinRoom = async function(roomId) {
        const name = localStorage.getItem('playerNickname');
        if (!name) { showNicknameDialog(); return; }
        
        const joined = await onlineMultiplayer.joinRoom(roomId, name);
        if (joined) {
            onlinePlayerId = 2;
            showRoomPage(roomId, false);
        }
    };

    function showRoomPage(roomId, isHost) {
        document.getElementById('roomIdDisplay').textContent = roomId;
        document.getElementById('roomPlayer1').textContent = localStorage.getItem('playerNickname') || '玩家1';
        document.getElementById('roomPlayer2').textContent = isHost ? '等待中...' : '玩家2';
        
        document.getElementById('startGameBtn').disabled = isHost;
        document.getElementById('startGameBtn').textContent = isHost ? '等待对手加入...' : '开始游戏';
        
        switchPage('roomPage');
        document.getElementById('chatMessages').innerHTML = '<div class="chat-system">欢迎来到房间</div>';
    }

    function copyRoomId() {
        const roomId = document.getElementById('roomIdDisplay').textContent;
        navigator.clipboard?.writeText(roomId).then(() => alert('房间号已复制')).catch(() => alert('房间号: ' + roomId));
    }

    function sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;
        
        onlineMultiplayer.sendChatMessage(message);
        addChatMessage(localStorage.getItem('playerNickname'), message, true);
        input.value = '';
    }

    function addChatMessage(name, message, isSelf) {
        const chatMessages = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.className = 'chat-message' + (isSelf ? ' self' : '');
        div.innerHTML = `<div class="chat-message-name">${name}</div><div class="chat-message-text">${message}</div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function startOnlineGame() {
        isOnlineMode = true;
        const gameName = document.getElementById('gameSelectOnline').value || '超级玛丽';
        const game = GAMES.find(g => g.name === gameName);
        if (game) startGame(game);
    }

    function leaveRoom() {
        onlineMultiplayer?.leaveRoom();
        onlineRoomId = null;
        onlinePlayerId = null;
        switchPage('onlineLobbyPage');
    }

    // 游戏相关
    function startGame(game) {
        currentGame = game;
        if (mainBgm) mainBgm.pause();
        
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('gamePage').classList.add('active');
        document.getElementById('gameTitle').textContent = game.name;
        document.getElementById('bottomTabs').style.display = 'none';
        
        // 请求横屏
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        } catch(e) {}
        
        setTimeout(() => loadROM(game.file), 100);
    }

    function goBack() {
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes) { try { nes.stop(); } catch(e) {} nes = null; }
        currentGame = null;
        isPaused = false;
        if (mainBgm) mainBgm.play().catch(() => {});
        
        // 恢复竖屏
        try { if (screen.orientation) screen.orientation.unlock(); } catch(e) {}
        
        switchPage('gameSelectPage');
    }

    function togglePause() {
        if (!nes) return;
        if (isPaused) {
            nes.start();
            isPaused = false;
            document.getElementById('pauseOverlay').classList.remove('visible');
        } else {
            nes.stop();
            isPaused = true;
            document.getElementById('pauseOverlay').classList.add('visible');
        }
    }

    function resumeGame() {
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes) { nes.start(); isPaused = false; }
    }

    function restartGame() {
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes && currentGame) {
            try { nes.reloadRom(); nes.start(); } catch(e) { loadROM(currentGame.file); }
            isPaused = false;
        }
    }

    function toggleSound() {
        if (!nes) return;
        nes.opts.emulateSound = !nes.opts.emulateSound;
    }

    function toggleHeader() {
        const header = document.getElementById('gameHeader');
        header.classList.toggle('visible');
        clearTimeout(headerTimeout);
        if (header.classList.contains('visible')) {
            headerTimeout = setTimeout(() => header.classList.remove('visible'), 3000);
        }
    }

    function showDialog(id) {
        document.getElementById(id)?.classList.add('visible');
    }

    function hideDialog(id) {
        document.getElementById(id)?.classList.remove('visible');
    }
})();
