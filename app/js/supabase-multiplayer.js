/**
 * Supabase 联机模块 - 完整版
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
        this.onChatMessage = null;
        this.onError = null;
    }

    // 初始化连接
    async init() {
        try {
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

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // 检查昵称是否可用
    async checkNickname(name) {
        const { data } = await this.supabase
            .from('players')
            .select('name')
            .eq('name', name)
            .single();
        return !data; // 返回true表示可用
    }

    // 注册昵称
    async registerNickname(name) {
        const { error } = await this.supabase
            .from('players')
            .insert({ name: name, last_active: new Date().toISOString() });
        return !error;
    }

    // 创建房间
    async createRoom(gameName, playerName) {
        if (!this.isConnected) {
            const ok = await this.init();
            if (!ok) return false;
        }

        this.roomId = this.generateRoomId();
        this.playerId = 1;
        this.playerName = playerName;

        // 创建频道
        this.channel = this.supabase.channel(`room:${this.roomId}`, {
            config: { broadcast: { self: false, ack: true } }
        });

        // 监听事件
        this.setupChannelListeners();

        // 订阅频道
        const status = await this.channel.subscribe();
        
        if (status === 'SUBSCRIBED') {
            // 保存房间信息
            const { error } = await this.supabase.from('rooms').insert({
                id: this.roomId,
                game: gameName,
                player1: playerName,
                status: 'waiting'
            });

            if (error) {
                console.error('创建房间失败:', error);
                if (this.onError) this.onError('创建房间失败');
                return false;
            }

            if (this.onRoomCreated) this.onRoomCreated(this.roomId);
            return true;
        }
        
        return false;
    }

    // 加入房间
    async joinRoom(roomId, playerName) {
        if (!this.isConnected) {
            const ok = await this.init();
            if (!ok) return false;
        }

        this.roomId = roomId.toUpperCase();
        this.playerId = 2;
        this.playerName = playerName;

        // 检查房间
        const { data: room, error } = await this.supabase
            .from('rooms')
            .select('*')
            .eq('id', this.roomId)
            .single();

        if (!room || error) {
            if (this.onError) this.onError('房间不存在');
            return false;
        }

        // 创建频道
        this.channel = this.supabase.channel(`room:${this.roomId}`, {
            config: { broadcast: { self: false, ack: true } }
        });

        this.setupChannelListeners();

        const status = await this.channel.subscribe();
        
        if (status === 'SUBSCRIBED') {
            // 通知房主
            await this.channel.send({
                type: 'broadcast',
                event: 'player_join',
                payload: { playerId: 2, playerName: playerName }
            });

            // 更新房间
            await this.supabase
                .from('rooms')
                .update({ player2: playerName, status: 'ready' })
                .eq('id', this.roomId);

            if (this.onRoomJoined) {
                this.onRoomJoined({ roomId: this.roomId, playerId: 2, game: room.game });
            }
            return true;
        }
        
        return false;
    }

    // 设置频道监听
    setupChannelListeners() {
        this.channel.on('broadcast', { event: 'player_join' }, (payload) => {
            if (this.onPlayerJoined) this.onPlayerJoined(payload.payload);
        });

        this.channel.on('broadcast', { event: 'player_leave' }, (payload) => {
            if (this.onPlayerLeft) this.onPlayerLeft(payload.payload);
        });

        this.channel.on('broadcast', { event: 'player_input' }, (payload) => {
            if (this.onPlayerInput && payload.payload.playerId !== this.playerId) {
                this.onPlayerInput(payload.payload.input, payload.payload.playerId);
            }
        });

        this.channel.on('broadcast', { event: 'game_state' }, (payload) => {
            if (this.onGameState && payload.payload.playerId !== this.playerId) {
                this.onGameState(payload.payload.state, payload.payload.playerId);
            }
        });

        this.channel.on('broadcast', { event: 'chat_message' }, (payload) => {
            if (this.onChatMessage) {
                this.onChatMessage(payload.payload);
            }
        });
    }

    // 发送输入
    sendInput(input) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'player_input',
            payload: { playerId: this.playerId, input: input }
        });
    }

    // 发送游戏状态
    sendGameState(state) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'game_state',
            payload: { playerId: this.playerId, state: state }
        });
    }

    // 发送聊天消息
    sendChatMessage(message) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'chat_message',
            payload: {
                playerId: this.playerId,
                playerName: this.playerName,
                message: message,
                timestamp: Date.now()
            }
        });
    }

    // 获取房间列表
    async getRoomList() {
        const { data, error } = await this.supabase
            .from('rooms')
            .select('*')
            .eq('status', 'waiting')
            .order('created_at', { ascending: false })
            .limit(20);
        
        return data || [];
    }

    // 离开房间
    async leaveRoom() {
        if (this.channel) {
            await this.channel.send({
                type: 'broadcast',
                event: 'player_leave',
                payload: { playerId: this.playerId }
            });
            await this.supabase.removeChannel(this.channel);
            this.channel = null;
        }

        if (this.roomId) {
            await this.supabase
                .from('rooms')
                .delete()
                .eq('id', this.roomId);
        }

        this.roomId = null;
        this.playerId = null;
    }

    async disconnect() {
        await this.leaveRoom();
        this.isConnected = false;
    }
}

window.SupabaseMultiplayer = SupabaseMultiplayer;
