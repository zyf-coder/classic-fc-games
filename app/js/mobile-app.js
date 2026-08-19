/**
 * 移动端应用主逻辑 v1.6.5
 */
(function() {
    const APP_VERSION = '1.6.5';
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
    let currentGame = null;
    let isPaused = false;
    let mainBgm = null;
    let onlineMultiplayer = null;
    let isOnlineMode = false;
    let onlinePlayerId = null;
    let onlineRoomId = null;
    let headerTimeout = null;

    // 生成设备唯一ID
    function getDeviceId() {
        let id = localStorage.getItem('device-id');
        if (!id) {
            const s = screen.width + 'x' + screen.height;
            const t = new Date().getTimezoneOffset();
            const l = navigator.language;
            const p = navigator.platform;
            id = btoa(s + t + l + p).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
            localStorage.setItem('device-id', id);
        }
        return id;
    }

    const DEVICE_ID = getDeviceId();

    // El-Message 样式提示
    function showMessage(text, type) {
        type = type || 'info';
        var icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        var msg = document.createElement('div');
        msg.className = 'el-message el-message--' + type;
        msg.innerHTML = '<span class="el-message-icon">' + icons[type] + '</span><span>' + text + '</span>';
        document.body.appendChild(msg);
        setTimeout(function() {
            msg.style.opacity = '0';
            setTimeout(function() { msg.remove(); }, 300);
        }, 2500);
    }

    // 初始化
    document.addEventListener('DOMContentLoaded', function() {
        initGameGrid();
        initEventListeners();
        initBottomTabs();
        initDpad();
        initOnlineMultiplayer();
        initMainBgm();
    });

    function initGameGrid() {
        var grid = document.getElementById('gameGrid');
        if (!grid) return;
        GAMES.forEach(function(game) {
            var card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = '<div class="game-icon">' + game.icon + '</div><div class="game-name">' + game.name + '</div>';
            card.addEventListener('click', function() { startGame(game); });
            grid.appendChild(card);
        });
    }

    function initEventListeners() {
        // 游戏控制
        bindClick('backBtn', goBack);
        bindClick('pauseBtn', togglePause);
        bindClick('soundBtn', toggleSound);
        bindClick('resumeBtn', resumeGame);
        bindClick('restartBtn', restartGame);
        bindClick('exitBtn', goBack);
        
        // 联机控制
        bindClick('confirmNicknameBtn', confirmNickname);
        bindClick('nicknameCancelBtn', function() { hideDialog('nicknameDialog'); });
        bindClick('lobbyBackBtn', function() { switchPage('gameSelectPage'); });
        bindClick('createRoomBtn', createOnlineRoom);
        bindClick('joinRoomBtn', joinOnlineRoom);
        bindClick('refreshRoomListBtn', refreshRoomList);
        bindClick('roomBackBtn', leaveRoom);
        bindClick('roomCopyBtn', copyRoomId);
        bindClick('startGameBtn', startOnlineGame);
        bindClick('chatSendBtn', sendChatMessage);
        bindClick('changeNicknameBtn', showNicknameDialog);
        
        // 聊天回车
        var chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') sendChatMessage();
            });
        }
        
        // 联机大厅标签切换
        document.querySelectorAll('.online-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.online-tab').forEach(function(t) { t.classList.remove('active'); });
                document.querySelectorAll('.online-panel').forEach(function(p) { p.classList.remove('active'); });
                this.classList.add('active');
                var panelId = this.dataset.tab === 'roomList' ? 'roomListPanel' : 
                              this.dataset.tab === 'createRoom' ? 'createRoomPanel' : 'joinRoomPanel';
                document.getElementById(panelId).classList.add('active');
                if (this.dataset.tab === 'roomList') refreshRoomList();
            });
        });
        
        // 游戏页面点击显示头部
        var gamePage = document.getElementById('gamePage');
        if (gamePage) {
            gamePage.addEventListener('click', function(e) {
                if (e.target.closest('.dpad-area') || e.target.closest('.action-area') || e.target.closest('.system-btns')) return;
                toggleHeader();
            });
        }
    }

    function bindClick(id, fn) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    }

    function initBottomTabs() {
        document.querySelectorAll('.tab-item').forEach(function(tab) {
            tab.addEventListener('click', function() {
                var pageId = this.dataset.page;
                if (pageId === 'onlineLobbyPage' && !localStorage.getItem('playerNickname')) {
                    showNicknameDialog();
                    return;
                }
                switchPage(pageId);
            });
        });
    }

    function switchPage(pageId) {
        document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
        var page = document.getElementById(pageId);
        if (page) page.classList.add('active');
        
        document.querySelectorAll('.tab-item').forEach(function(t) {
            t.classList.toggle('active', t.dataset.page === pageId);
        });
        
        // 底部tab显示控制
        var bottomTabs = document.getElementById('bottomTabs');
        if (bottomTabs) {
            bottomTabs.style.display = pageId === 'gamePage' ? 'none' : 'flex';
        }
        
        // 联机大厅初始化
        if (pageId === 'onlineLobbyPage') {
            refreshRoomList();
            var lobbyNick = document.getElementById('lobbyNickname');
            if (lobbyNick) lobbyNick.textContent = localStorage.getItem('playerNickname') || '';
        }
        
        // 我的页面
        if (pageId === 'profilePage') {
            var profileNick = document.getElementById('profileNickname');
            if (profileNick) profileNick.textContent = localStorage.getItem('playerNickname') || '未设置';
        }
    }

    // 方向按键初始化
    function initDpad() {
        var keyMap = {
            'dpadUp': 'KEY_UP', 'dpadDown': 'KEY_DOWN', 
            'dpadLeft': 'KEY_LEFT', 'dpadRight': 'KEY_RIGHT',
            'btnA': 'KEY_A', 'btnB': 'KEY_B',
            'btnSelect': 'KEY_SELECT', 'btnStart': 'KEY_START'
        };
        
        Object.keys(keyMap).forEach(function(btnId) {
            var btn = document.getElementById(btnId);
            if (!btn) return;
            
            var keyName = keyMap[btnId];
            
            function press(e) {
                e.preventDefault();
                if (nes && nes.keyboard && nes.keyboard.keys) {
                    nes.keyboard.state1[nes.keyboard.keys[keyName]] = 0x41;
                }
            }
            
            function release(e) {
                e.preventDefault();
                if (nes && nes.keyboard && nes.keyboard.keys) {
                    nes.keyboard.state1[nes.keyboard.keys[keyName]] = 0x40;
                }
            }
            
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
        if (mainBgm) {
            mainBgm.volume = 0.3;
            mainBgm.play().catch(function() {});
        }
    }

    // 联机功能
    function initOnlineMultiplayer() {
        var SUPABASE_URL = 'https://mmkptnjivwnuodzbyjuy.supabase.co';
        var SUPABASE_KEY = 'sb_publishable_jmAUsKf5jAksds6fpIEaVQ_I8c3SNci';
        
        if (typeof SupabaseMultiplayer === 'undefined') {
            console.log('SupabaseMultiplayer未加载');
            return;
        }
        
        onlineMultiplayer = new SupabaseMultiplayer(SUPABASE_URL, SUPABASE_KEY);
        
        // 填充游戏选择
        var gameSelect = document.getElementById('gameSelectOnline');
        if (gameSelect) {
            gameSelect.innerHTML = '<option value="">请选择游戏</option>';
            GAMES.forEach(function(game) {
                var opt = document.createElement('option');
                opt.value = game.name;
                opt.textContent = game.name;
                gameSelect.appendChild(opt);
            });
        }
        
        // 设置回调
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
            var player2 = document.getElementById('roomPlayer2');
            if (player2) player2.textContent = data.playerName || '玩家2';
            var startBtn = document.getElementById('startGameBtn');
            if (startBtn) { startBtn.disabled = false; startBtn.textContent = '开始游戏'; }
            addChatMessage('系统', data.playerName + ' 加入了房间', false);
        };
        
        onlineMultiplayer.onPlayerLeft = function() {
            addChatMessage('系统', '对手已离开房间', false);
            var player2 = document.getElementById('roomPlayer2');
            if (player2) player2.textContent = '等待中...';
            var startBtn = document.getElementById('startGameBtn');
            if (startBtn) { startBtn.disabled = true; startBtn.textContent = '等待对手加入...'; }
        };
        
        onlineMultiplayer.onChatMessage = function(data) {
            addChatMessage(data.playerName, data.message, data.playerId === onlinePlayerId);
        };
        
        onlineMultiplayer.onError = function(msg) {
            showMessage(msg, 'error');
        };
    }

    function showNicknameDialog() {
        var input = document.getElementById('nicknameInput');
        if (input) input.value = localStorage.getItem('playerNickname') || '';
        var status = document.getElementById('nicknameStatus');
        if (status) status.textContent = '';
        showDialog('nicknameDialog');
    }

    async function confirmNickname() {
        var name = document.getElementById('nicknameInput').value.trim();
        
        if (!name) { showMessage('请输入昵称', 'warning'); return; }
        if (name.length < 2) { showMessage('昵称至少2个字符', 'warning'); return; }
        
        try {
            var connected = await onlineMultiplayer.init();
            if (!connected) { showMessage('连接服务器失败', 'error'); return; }
            
            var available = await onlineMultiplayer.checkNickname(name);
            if (!available) { showMessage('该昵称已被使用', 'error'); return; }
            
            var registered = await onlineMultiplayer.registerNickname(name, DEVICE_ID);
            if (registered) {
                localStorage.setItem('playerNickname', name);
                onlineMultiplayer.playerName = name;
                hideDialog('nicknameDialog');
                showMessage('昵称设置成功', 'success');
                switchPage('onlineLobbyPage');
            } else {
                showMessage('注册失败，请重试', 'error');
            }
        } catch (e) {
            showMessage('操作失败', 'error');
        }
    }

    async function createOnlineRoom() {
        var gameName = document.getElementById('gameSelectOnline').value;
        var name = localStorage.getItem('playerNickname');
        
        if (!gameName) { showMessage('请选择游戏', 'warning'); return; }
        if (!name) { showNicknameDialog(); return; }
        
        try {
            var created = await onlineMultiplayer.createRoom(gameName, name);
            if (created) {
                onlinePlayerId = 1;
                showRoomPage(onlineMultiplayer.roomId, true);
            } else {
                showMessage('创建房间失败', 'error');
            }
        } catch (e) {
            showMessage('创建房间失败', 'error');
        }
    }

    async function joinOnlineRoom() {
        var roomId = document.getElementById('roomIdInput').value.toUpperCase();
        var name = localStorage.getItem('playerNickname');
        
        if (!roomId || roomId.length !== 6) { showMessage('请输入6位房间号', 'warning'); return; }
        if (!name) { showNicknameDialog(); return; }
        
        try {
            var joined = await onlineMultiplayer.joinRoom(roomId, name);
            if (joined) {
                onlinePlayerId = 2;
                showRoomPage(roomId, false);
            } else {
                showMessage('加入房间失败', 'error');
            }
        } catch (e) {
            showMessage('加入房间失败', 'error');
        }
    }

    async function refreshRoomList() {
        var roomList = document.getElementById('roomList');
        if (!roomList) return;
        roomList.innerHTML = '<div class="room-list-empty">加载中...</div>';
        
        try {
            var rooms = await onlineMultiplayer.getRoomList();
            if (!rooms || rooms.length === 0) {
                roomList.innerHTML = '<div class="room-list-empty">暂无房间</div>';
                return;
            }
            roomList.innerHTML = rooms.map(function(room) {
                return '<div class="room-item"><div class="room-item-info"><div class="room-item-game">' + room.game + '</div><div class="room-item-host">房主: ' + room.player1 + '</div><div class="room-item-id">房间号: ' + room.id + '</div></div><button class="room-item-join" onclick="window.quickJoinRoom(\'' + room.id + '\')">加入</button></div>';
            }).join('');
        } catch (e) {
            roomList.innerHTML = '<div class="room-list-empty">加载失败</div>';
        }
    }

    window.quickJoinRoom = async function(roomId) {
        var name = localStorage.getItem('playerNickname');
        if (!name) { showNicknameDialog(); return; }
        var joined = await onlineMultiplayer.joinRoom(roomId, name);
        if (joined) { onlinePlayerId = 2; showRoomPage(roomId, false); }
    };

    function showRoomPage(roomId, isHost) {
        document.getElementById('roomIdDisplay').textContent = roomId;
        document.getElementById('roomPlayer1').textContent = localStorage.getItem('playerNickname') || '玩家1';
        document.getElementById('roomPlayer2').textContent = isHost ? '等待中...' : '玩家2';
        var startBtn = document.getElementById('startGameBtn');
        if (startBtn) { startBtn.disabled = isHost; startBtn.textContent = isHost ? '等待对手加入...' : '开始游戏'; }
        switchPage('roomPage');
        document.getElementById('chatMessages').innerHTML = '<div class="chat-system">欢迎来到房间</div>';
    }

    function copyRoomId() {
        var roomId = document.getElementById('roomIdDisplay').textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(roomId).then(function() { showMessage('房间号已复制', 'success'); });
        } else {
            showMessage('房间号: ' + roomId, 'info');
        }
    }

    function sendChatMessage() {
        var input = document.getElementById('chatInput');
        var msg = input.value.trim();
        if (!msg) return;
        onlineMultiplayer.sendChatMessage(msg);
        addChatMessage(localStorage.getItem('playerNickname'), msg, true);
        input.value = '';
    }

    function addChatMessage(name, msg, isSelf) {
        var container = document.getElementById('chatMessages');
        var div = document.createElement('div');
        div.className = 'chat-message' + (isSelf ? ' self' : '');
        div.innerHTML = '<div class="chat-message-name">' + name + '</div><div class="chat-message-text">' + msg + '</div>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function startOnlineGame() {
        isOnlineMode = true;
        var gameName = document.getElementById('gameSelectOnline').value || '超级玛丽';
        var game = GAMES.find(function(g) { return g.name === gameName; });
        if (game) startGame(game);
    }

    function leaveRoom() {
        if (onlineMultiplayer) onlineMultiplayer.leaveRoom();
        onlineRoomId = null;
        onlinePlayerId = null;
        switchPage('onlineLobbyPage');
    }

    // 游戏核心功能
    function startGame(game) {
        currentGame = game;
        if (mainBgm) mainBgm.pause();
        
        document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
        document.getElementById('gamePage').classList.add('active');
        document.getElementById('gameTitle').textContent = game.name;
        
        // 隐藏底部tab
        var bottomTabs = document.getElementById('bottomTabs');
        if (bottomTabs) bottomTabs.style.display = 'none';
        
        // 请求横屏
        requestLandscape();
        
        // 加载游戏
        setTimeout(function() { loadROM(game.file); }, 200);
    }

    function requestLandscape() {
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').then(function() {
                    console.log('横屏成功');
                }).catch(function(e) {
                    console.log('横屏锁定失败:', e);
                    // 尝试全屏
                    requestFullscreen();
                });
            } else {
                requestFullscreen();
            }
        } catch(e) {
            console.log('横屏请求异常:', e);
            requestFullscreen();
        }
    }

    function requestFullscreen() {
        var el = document.documentElement;
        try {
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            else if (el.msRequestFullscreen) el.msRequestFullscreen();
        } catch(e) {}
    }

    function goBack() {
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes) { try { nes.stop(); } catch(e) {} nes = null; }
        currentGame = null;
        isPaused = false;
        if (mainBgm) mainBgm.play().catch(function() {});
        
        // 恢复竖屏
        try { if (screen.orientation) screen.orientation.unlock(); } catch(e) {}
        try { if (document.exitFullscreen) document.exitFullscreen(); } catch(e) {}
        
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
        showMessage(nes.opts.emulateSound ? '声音已开启' : '声音已关闭', 'info');
    }

    function toggleHeader() {
        var header = document.getElementById('gameHeader');
        if (!header) return;
        header.classList.toggle('visible');
        clearTimeout(headerTimeout);
        if (header.classList.contains('visible')) {
            headerTimeout = setTimeout(function() { header.classList.remove('visible'); }, 3000);
        }
    }

    function showDialog(id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('visible');
    }

    function hideDialog(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('visible');
    }
})();
