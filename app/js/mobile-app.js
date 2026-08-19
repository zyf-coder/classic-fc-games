/**
 * 移动端应用 v1.6.7
 */
(function() {
    var APP_VERSION = '1.6.7';
    var GAMES = [
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

    var nes = null;
    var currentGame = null;
    var isPaused = false;
    var mainBgm = null;
    var onlineMultiplayer = null;
    var onlinePlayerId = null;
    var onlineRoomId = null;
    var headerTimeout = null;

    // 设备ID
    function getDeviceId() {
        var id = localStorage.getItem('device-id');
        if (!id) {
            id = 'dev-' + Math.random().toString(36).substr(2, 12);
            localStorage.setItem('device-id', id);
        }
        return id;
    }
    var DEVICE_ID = getDeviceId();

    // 消息提示
    function showMessage(text, type) {
        type = type || 'info';
        var icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        var msg = document.createElement('div');
        msg.className = 'el-message el-message--' + type;
        msg.innerHTML = '<span class="el-message-icon">' + icons[type] + '</span><span>' + text + '</span>';
        document.body.appendChild(msg);
        setTimeout(function() { msg.remove(); }, 2500);
    }

    // 初始化
    document.addEventListener('DOMContentLoaded', function() {
        initGameGrid();
        initEvents();
        initDpad();
        initOnline();
        initBgm();
    });

    function initGameGrid() {
        var grid = document.getElementById('gameGrid');
        if (!grid) return;
        GAMES.forEach(function(game) {
            var card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = '<div class="game-icon">' + game.icon + '</div><div class="game-name">' + game.name + '</div>';
            card.onclick = function() { startGame(game); };
            grid.appendChild(card);
        });
    }

    function initEvents() {
        // 游戏控制
        bind('backBtn', goBack);
        bind('pauseBtn', togglePause);
        bind('soundBtn', toggleSound);
        bind('resumeBtn', resumeGame);
        bind('restartBtn', restartGame);
        bind('exitBtn', goBack);
        
        // 联机
        bind('confirmNicknameBtn', confirmNickname);
        bind('nicknameCancelBtn', function() { hide('nicknameDialog'); });
        bind('lobbyBackBtn', function() { showPage('gameSelectPage'); });
        bind('createRoomBtn', createRoom);
        bind('joinRoomBtn', joinRoom);
        bind('refreshRoomListBtn', refreshRooms);
        bind('roomBackBtn', leaveRoom);
        bind('roomCopyBtn', copyRoomId);
        bind('startGameBtn', startOnlineGame);
        bind('chatSendBtn', sendChat);
        bind('changeNicknameBtn', showNickname);
        bind('aboutBtn', showAbout);
        
        // Tab切换
        document.querySelectorAll('.tab-item').forEach(function(tab) {
            tab.onclick = function() {
                var page = this.dataset.page;
                if (page === 'onlineLobbyPage' && !localStorage.getItem('playerNickname')) {
                    showNickname();
                    return;
                }
                showPage(page);
            };
        });
        
        // 联机标签切换
        document.querySelectorAll('.online-tab').forEach(function(tab) {
            tab.onclick = function() {
                document.querySelectorAll('.online-tab').forEach(function(t) { t.classList.remove('active'); });
                document.querySelectorAll('.online-panel').forEach(function(p) { p.classList.remove('active'); });
                this.classList.add('active');
                var id = this.dataset.tab === 'roomList' ? 'roomListPanel' : 
                          this.dataset.tab === 'createRoom' ? 'createRoomPanel' : 'joinRoomPanel';
                document.getElementById(id).classList.add('active');
                if (this.dataset.tab === 'roomList') refreshRooms();
            };
        });
        
        // 聊天回车
        var chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.onkeydown = function(e) { if (e.key === 'Enter') sendChat(); };
    }

    function bind(id, fn) {
        var el = document.getElementById(id);
        if (el) el.onclick = fn;
    }

    function initDpad() {
        var keys = {
            'dpadUp': 'KEY_UP', 'dpadDown': 'KEY_DOWN',
            'dpadLeft': 'KEY_LEFT', 'dpadRight': 'KEY_RIGHT',
            'btnA': 'KEY_A', 'btnB': 'KEY_B',
            'btnSelect': 'KEY_SELECT', 'btnStart': 'KEY_START'
        };
        
        Object.keys(keys).forEach(function(id) {
            var btn = document.getElementById(id);
            if (!btn) return;
            var key = keys[id];
            
            btn.ontouchstart = function(e) {
                e.preventDefault();
                if (nes && nes.keyboard) nes.keyboard.state1[nes.keyboard.keys[key]] = 0x41;
            };
            btn.ontouchend = function(e) {
                e.preventDefault();
                if (nes && nes.keyboard) nes.keyboard.state1[nes.keyboard.keys[key]] = 0x40;
            };
            btn.onmousedown = function() {
                if (nes && nes.keyboard) nes.keyboard.state1[nes.keyboard.keys[key]] = 0x41;
            };
            btn.onmouseup = function() {
                if (nes && nes.keyboard) nes.keyboard.state1[nes.keyboard.keys[key]] = 0x40;
            };
        });
    }

    function initBgm() {
        mainBgm = document.getElementById('mainBgm');
        if (mainBgm) { mainBgm.volume = 0.3; mainBgm.play().catch(function() {}); }
    }

    function initOnline() {
        if (typeof SupabaseMultiplayer === 'undefined') return;
        
        onlineMultiplayer = new SupabaseMultiplayer(
            'https://mmkptnjivwnuodzbyjuy.supabase.co',
            'sb_publishable_jmAUsKf5jAksds6fpIEaVQ_I8c3SNci'
        );
        
        // 填充游戏选择
        var sel = document.getElementById('gameSelectOnline');
        if (sel) {
            sel.innerHTML = '<option value="">请选择游戏</option>';
            GAMES.forEach(function(g) {
                var opt = document.createElement('option');
                opt.value = g.name;
                opt.textContent = g.name;
                sel.appendChild(opt);
            });
        }
        
        onlineMultiplayer.onRoomCreated = function(id) { onlineRoomId = id; showRoom(id, true); };
        onlineMultiplayer.onRoomJoined = function(d) { onlineRoomId = d.roomId; onlinePlayerId = d.playerId; showRoom(d.roomId, false); };
        onlineMultiplayer.onPlayerJoined = function(d) {
            document.getElementById('roomPlayer2').textContent = d.playerName || '玩家2';
            var btn = document.getElementById('startGameBtn');
            if (btn) { btn.disabled = false; btn.textContent = '开始游戏'; }
            addChat('系统', d.playerName + ' 加入了房间');
        };
        onlineMultiplayer.onPlayerLeft = function() {
            addChat('系统', '对手已离开房间');
            document.getElementById('roomPlayer2').textContent = '等待中...';
            var btn = document.getElementById('startGameBtn');
            if (btn) { btn.disabled = true; btn.textContent = '等待对手加入...'; }
        };
        onlineMultiplayer.onChatMessage = function(d) { addChat(d.playerName, d.message); };
        onlineMultiplayer.onError = function(m) { showMessage(m, 'error'); };
    }

    function showPage(id) {
        document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
        document.getElementById(id).classList.add('active');
        document.querySelectorAll('.tab-item').forEach(function(t) {
            t.classList.toggle('active', t.dataset.page === id);
        });
        var tabs = document.getElementById('bottomTabs');
        if (tabs) tabs.style.display = id === 'gamePage' ? 'none' : 'flex';
        
        if (id === 'onlineLobbyPage') {
            refreshRooms();
            var nick = document.getElementById('lobbyNickname');
            if (nick) nick.textContent = localStorage.getItem('playerNickname') || '';
        }
        if (id === 'profilePage') {
            var pnick = document.getElementById('profileNickname');
            if (pnick) pnick.textContent = localStorage.getItem('playerNickname') || '未设置';
        }
    }

    // 游戏核心
    function startGame(game) {
        currentGame = game;
        if (mainBgm) mainBgm.pause();
        
        document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
        document.getElementById('gamePage').classList.add('active');
        document.getElementById('gameTitle').textContent = game.name;
        document.getElementById('bottomTabs').style.display = 'none';
        
        setTimeout(function() { loadROM(game.file); }, 300);
    }

    function loadROM(file) {
        try {
            var emulator = document.getElementById('emulator');
            emulator.innerHTML = '<canvas width="256" height="240"></canvas>';
            var canvas = emulator.querySelector('canvas');
            
            nes = new JSNES({
                swfPath: 'js/',
                onFrame: function(buffer) {
                    var ctx = canvas.getContext('2d');
                    var img = ctx.createImageData(256, 240);
                    for (var i = 0; i < 256 * 240; i++) {
                        var px = buffer[i];
                        var idx = i * 4;
                        img.data[idx] = px & 0xFF;
                        img.data[idx+1] = (px >> 8) & 0xFF;
                        img.data[idx+2] = (px >> 16) & 0xFF;
                        img.data[idx+3] = 255;
                    }
                    ctx.putImageData(img, 0, 0);
                }
            });
            
            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'roms/' + file, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                if (xhr.status === 200) {
                    var data = new Uint8Array(xhr.response);
                    var rom = '';
                    for (var i = 0; i < data.length; i++) rom += String.fromCharCode(data[i]);
                    nes.loadRom(rom);
                    nes.start();
                    showMessage('游戏加载成功', 'success');
                } else {
                    showMessage('游戏加载失败', 'error');
                }
            };
            xhr.onerror = function() { showMessage('网络错误', 'error'); };
            xhr.send();
        } catch(e) {
            console.error(e);
            showMessage('游戏初始化失败', 'error');
        }
    }

    function goBack() {
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes) { try { nes.stop(); } catch(e) {} nes = null; }
        currentGame = null;
        isPaused = false;
        if (mainBgm) mainBgm.play().catch(function() {});
        showPage('gameSelectPage');
    }

    function togglePause() {
        if (!nes) return;
        if (isPaused) { nes.start(); isPaused = false; document.getElementById('pauseOverlay').classList.remove('visible'); }
        else { nes.stop(); isPaused = true; document.getElementById('pauseOverlay').classList.add('visible'); }
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

    // 联机功能
    function showNickname() {
        document.getElementById('nicknameInput').value = localStorage.getItem('playerNickname') || '';
        show('nicknameDialog');
    }

    async function confirmNickname() {
        var name = document.getElementById('nicknameInput').value.trim();
        if (!name) { showMessage('请输入昵称', 'warning'); return; }
        if (name.length < 2) { showMessage('昵称至少2个字符', 'warning'); return; }
        
        try {
            await onlineMultiplayer.init();
            var ok = await onlineMultiplayer.checkNickname(name);
            if (!ok) { showMessage('该昵称已被使用', 'error'); return; }
            
            var reg = await onlineMultiplayer.registerNickname(name, DEVICE_ID);
            if (reg) {
                localStorage.setItem('playerNickname', name);
                onlineMultiplayer.playerName = name;
                hide('nicknameDialog');
                showMessage('昵称设置成功', 'success');
                showPage('onlineLobbyPage');
            } else {
                showMessage('注册失败', 'error');
            }
        } catch(e) { showMessage('操作失败', 'error'); }
    }

    async function createRoom() {
        var game = document.getElementById('gameSelectOnline').value;
        var name = localStorage.getItem('playerNickname');
        if (!game) { showMessage('请选择游戏', 'warning'); return; }
        if (!name) { showNickname(); return; }
        
        try {
            var ok = await onlineMultiplayer.createRoom(game, name);
            if (ok) { onlinePlayerId = 1; showRoom(onlineMultiplayer.roomId, true); }
            else { showMessage('创建失败', 'error'); }
        } catch(e) { showMessage('创建失败', 'error'); }
    }

    async function joinRoom() {
        var id = document.getElementById('roomIdInput').value.toUpperCase();
        var name = localStorage.getItem('playerNickname');
        if (!id || id.length !== 6) { showMessage('请输入6位房间号', 'warning'); return; }
        if (!name) { showNickname(); return; }
        
        try {
            var ok = await onlineMultiplayer.joinRoom(id, name);
            if (ok) { onlinePlayerId = 2; showRoom(id, false); }
            else { showMessage('加入失败', 'error'); }
        } catch(e) { showMessage('加入失败', 'error'); }
    }

    async function refreshRooms() {
        var list = document.getElementById('roomList');
        if (!list) return;
        list.innerHTML = '<div class="room-list-empty">加载中...</div>';
        
        try {
            var rooms = await onlineMultiplayer.getRoomList();
            if (!rooms || !rooms.length) { list.innerHTML = '<div class="room-list-empty">暂无房间</div>'; return; }
            list.innerHTML = rooms.map(function(r) {
                return '<div class="room-item"><div class="room-item-info"><div class="room-item-game">' + r.game + '</div><div class="room-item-id">房间号: ' + r.id + '</div></div><button class="room-item-join" onclick="window._join(\'' + r.id + '\')">加入</button></div>';
            }).join('');
        } catch(e) { list.innerHTML = '<div class="room-list-empty">加载失败</div>'; }
    }

    window._join = async function(id) {
        var name = localStorage.getItem('playerNickname');
        if (!name) { showNickname(); return; }
        var ok = await onlineMultiplayer.joinRoom(id, name);
        if (ok) { onlinePlayerId = 2; showRoom(id, false); }
    };

    function showRoom(id, isHost) {
        document.getElementById('roomIdDisplay').textContent = id;
        document.getElementById('roomPlayer1').textContent = localStorage.getItem('playerNickname') || '玩家1';
        document.getElementById('roomPlayer2').textContent = isHost ? '等待中...' : '玩家2';
        var btn = document.getElementById('startGameBtn');
        if (btn) { btn.disabled = isHost; btn.textContent = isHost ? '等待对手加入...' : '开始游戏'; }
        showPage('roomPage');
        document.getElementById('chatMessages').innerHTML = '<div class="chat-system">欢迎来到房间</div>';
    }

    function copyRoomId() {
        var id = document.getElementById('roomIdDisplay').textContent;
        if (navigator.clipboard) navigator.clipboard.writeText(id).then(function() { showMessage('已复制', 'success'); });
        else showMessage('房间号: ' + id, 'info');
    }

    function sendChat() {
        var input = document.getElementById('chatInput');
        var msg = input.value.trim();
        if (!msg) return;
        onlineMultiplayer.sendChatMessage(msg);
        addChat(localStorage.getItem('playerNickname'), msg);
        input.value = '';
    }

    function addChat(name, msg) {
        var c = document.getElementById('chatMessages');
        var d = document.createElement('div');
        d.className = 'chat-message';
        d.innerHTML = '<div class="chat-message-name">' + name + '</div><div class="chat-message-text">' + msg + '</div>';
        c.appendChild(d);
        c.scrollTop = c.scrollHeight;
    }

    function startOnlineGame() {
        var game = document.getElementById('gameSelectOnline').value || '超级玛丽';
        var g = GAMES.find(function(x) { return x.name === game; });
        if (g) startGame(g);
    }

    function leaveRoom() {
        if (onlineMultiplayer) onlineMultiplayer.leaveRoom();
        onlineRoomId = null;
        onlinePlayerId = null;
        showPage('onlineLobbyPage');
    }

    // 关于我们
    function showAbout() {
        var overlay = document.createElement('div');
        overlay.className = 'dialog-overlay visible';
        overlay.innerHTML = '<div class="dialog-box"><div class="dialog-title">关于我们</div><div style="text-align:center;padding:15px 0;"><p style="font-size:16px;font-weight:600;">经典怀旧游戏</p><p style="color:var(--text-secondary);margin-top:8px;">版本: v' + APP_VERSION + '</p><p style="color:var(--text-secondary);margin-top:4px;">FC/NES 经典游戏合集</p></div><div class="dialog-actions"><button class="dialog-btn dialog-btn-confirm" id="checkUpdateBtn">检查更新</button><button class="dialog-btn dialog-btn-cancel" onclick="this.closest(\'.dialog-overlay\').remove()">关闭</button></div></div>';
        document.body.appendChild(overlay);
        
        document.getElementById('checkUpdateBtn').onclick = function() {
            overlay.remove();
            checkUpdate();
        };
    }

    function checkUpdate() {
        showMessage('正在检查更新...', 'info');
        fetch('https://raw.githubusercontent.com/zyf-coder/classic-fc-games/main/app/version.json?t=' + Date.now())
            .then(function(r) { return r.json(); })
            .then(function(remote) {
                var local = APP_VERSION.split('.').map(Number);
                var rv = remote.version.split('.').map(Number);
                var hasUpdate = false;
                for (var i = 0; i < 3; i++) {
                    if (rv[i] > local[i]) { hasUpdate = true; break; }
                    if (rv[i] < local[i]) break;
                }
                if (hasUpdate) {
                    showMessage('发现新版本 v' + remote.version, 'warning');
                    setTimeout(function() {
                        if (confirm('发现新版本 v' + remote.version + '，是否下载？')) {
                            window.open('https://raw.githubusercontent.com/zyf-coder/classic-fc-games/main/classic-fc-games.apk');
                        }
                    }, 500);
                } else {
                    showMessage('当前已是最新版本', 'success');
                }
            })
            .catch(function() { showMessage('检查更新失败', 'error'); });
    }

    function show(id) { document.getElementById(id).classList.add('visible'); }
    function hide(id) { document.getElementById(id).classList.remove('visible'); }
})();
