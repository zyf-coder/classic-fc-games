/**
 * Supabase 联机模块
 * 使用 Supabase Realtime Broadcast 实现双人联机
 */
class SupabaseMultiplayer {
    constructor(projectUrl, anonKey) {
        this.projectUrl = projectUrl;
        this.anonKey = anonKey;
        this.supabase = null;
        this.channel = null;
        this.roomId = null;
        this.playerId = null;
        this.playerName = '';
        this.isConnected = false;
        
        // 回调函数
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onPlayerInput = null;
        this.onGameState = null;
        this.onError = null;
    }

    // 初始化连接
    async init() {
        try {
            // 动态加载Supabase客户端
            if (!window.supabase) {
                await this.loadScript('https://unpkg.com/@supabase/supabase-js@2');
            }
            
            this.supabase = window.supabase.createClient(this.projectUrl, this.anonKey);
            this.isConnected = true;
            console.log('Supabase 连接成功');
            return true;
        } catch (e) {
            console.error('Supabase 连接失败:', e);
            if (this.onError) this.onError('连接失败: ' + e.message);
            return false;
        }
    }

    // 动态加载脚本
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // 生成房间ID
    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // 创建房间
    async createRoom(gameName, playerName) {
        if (!this.isConnected) {
            await this.init();
        }

        this.roomId = this.generateRoomId();
        this.playerId = 1;
        this.playerName = playerName;

        // 创建频道
        this.channel = this.supabase.channel(`room:${this.roomId}`, {
            config: {
                broadcast: { self: false, ack: true }
            }
        });

        // 监听玩家加入
        this.channel.on('broadcast', { event: 'player_join' }, (payload) => {
            if (this.onPlayerJoined) {
                this.onPlayerJoined(payload.payload);
            }
        });

        // 监听玩家离开
        this.channel.on('broadcast', { event: 'player_leave' }, (payload) => {
            if (this.onPlayerLeft) {
                this.onPlayerLeft(payload.payload);
            }
        });

        // 监听玩家输入
        this.channel.on('broadcast', { event: 'player_input' }, (payload) => {
            if (this.onPlayerInput && payload.payload.playerId !== this.playerId) {
                this.onPlayerInput(payload.payload.input, payload.payload.playerId);
            }
        });

        // 监听游戏状态
        this.channel.on('broadcast', { event: 'game_state' }, (payload) => {
            if (this.onGameState && payload.payload.playerId !== this.playerId) {
                this.onGameState(payload.payload.state, payload.payload.playerId);
            }
        });

        // 订阅频道
        const status = await this.channel.subscribe();
        
        if (status === 'SUBSCRIBED') {
            // 保存房间信息到数据库
            await this.supabase.from('rooms').upsert({
                id: this.roomId,
                game: gameName,
                player1: playerName,
                created_at: new Date().toISOString()
            });

            if (this.onRoomCreated) {
                this.onRoomCreated(this.roomId);
            }
            return true;
        }
        
        return false;
    }

    // 加入房间
    async joinRoom(roomId, playerName) {
        if (!this.isConnected) {
            await this.init();
        }

        this.roomId = roomId.toUpperCase();
        this.playerId = 2;
        this.playerName = playerName;

        // 检查房间是否存在
        const { data: room } = await this.supabase
            .from('rooms')
            .select('*')
            .eq('id', this.roomId)
            .single();

        if (!room) {
            if (this.onError) this.onError('房间不存在');
            return false;
        }

        // 创建频道
        this.channel = this.supabase.channel(`room:${this.roomId}`, {
            config: {
                broadcast: { self: false, ack: true }
            }
        });

        // 监听玩家输入
        this.channel.on('broadcast', { event: 'player_input' }, (payload) => {
            if (this.onPlayerInput && payload.payload.playerId !== this.playerId) {
                this.onPlayerInput(payload.payload.input, payload.payload.playerId);
            }
        });

        // 监听游戏状态
        this.channel.on('broadcast', { event: 'game_state' }, (payload) => {
            if (this.onGameState && payload.payload.playerId !== this.playerId) {
                this.onGameState(payload.payload.state, payload.payload.playerId);
            }
        });

        // 订阅频道
        const status = await this.channel.subscribe();
        
        if (status === 'SUBSCRIBED') {
            // 通知房主有玩家加入
            await this.channel.send({
                type: 'broadcast',
                event: 'player_join',
                payload: {
                    playerId: 2,
                    playerName: playerName
                }
            });

            // 更新房间信息
            await this.supabase
                .from('rooms')
                .update({ player2: playerName })
                .eq('id', this.roomId);

            if (this.onRoomJoined) {
                this.onRoomJoined({
                    roomId: this.roomId,
                    playerId: 2,
                    game: room.game
                });
            }
            return true;
        }
        
        return false;
    }

    // 发送玩家输入
    sendInput(input) {
        if (!this.channel) return;
        
        this.channel.send({
            type: 'broadcast',
            event: 'player_input',
            payload: {
                playerId: this.playerId,
                input: input
            }
        });
    }

    // 发送游戏状态
    sendGameState(state) {
        if (!this.channel) return;
        
        this.channel.send({
            type: 'broadcast',
            event: 'game_state',
            payload: {
                playerId: this.playerId,
                state: state
            }
        });
    }

    // 离开房间
    async leaveRoom() {
        if (this.channel) {
            // 通知其他玩家
            await this.channel.send({
                type: 'broadcast',
                event: 'player_leave',
                payload: {
                    playerId: this.playerId
                }
            });

            // 取消订阅
            await this.supabase.removeChannel(this.channel);
            this.channel = null;
        }

        this.roomId = null;
        this.playerId = null;
    }

    // 断开连接
    async disconnect() {
        await this.leaveRoom();
        this.isConnected = false;
    }
}

// 导出
window.SupabaseMultiplayer = SupabaseMultiplayer;
