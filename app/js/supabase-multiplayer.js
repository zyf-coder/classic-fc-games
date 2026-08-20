/**
 * Supabase 联机模块 - 完整版（带调试）
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
        
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onPlayerInput = null;
        this.onGameState = null;
        this.onChatMessage = null;
        this.onGameStart = null;
        this.onVoiceSignal = null;
        this.onError = null;
    }

    async init() {
        try {
            console.log('正在初始化 Supabase...');
            
            if (!window.supabase) {
                console.log('加载 Supabase 客户端库...');
                await this.loadScript('https://unpkg.com/@supabase/supabase-js@2');
            }
            
            if (!window.supabase) {
                throw new Error('Supabase 客户端库加载失败');
            }
            
            this.supabase = window.supabase.createClient(this.projectUrl, this.anonKey);
            this.isConnected = true;
            console.log('✅ Supabase 连接成功');
            return true;
        } catch (e) {
            console.error('❌ Supabase 连接失败:', e);
            if (this.onError) this.onError('连接失败: ' + e.message);
            return false;
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log('脚本加载成功:', src);
                resolve();
            };
            script.onerror = (e) => {
                console.error('脚本加载失败:', src, e);
                reject(new Error('脚本加载失败'));
            };
            document.head.appendChild(script);
        });
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async checkNickname(name) {
        try {
            const { data, error } = await this.supabase
                .from('players')
                .select('name')
                .eq('name', name)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.error('检查昵称失败:', error);
                return false;
            }
            return !data;
        } catch (e) {
            console.error('检查昵称异常:', e);
            return false;
        }
    }

    async registerNickname(name, deviceId) {
        try {
            const { error } = await this.supabase
                .from('players')
                .insert({ 
                    name: name, 
                    device_id: deviceId || 'unknown',
                    last_active: new Date().toISOString() 
                });
            
            if (error) {
                console.error('注册昵称失败:', error);
                return false;
            }
            return true;
        } catch (e) {
            console.error('注册昵称异常:', e);
            return false;
        }
    }

    async createRoom(gameName, playerName) {
        console.log('创建房间:', { gameName, playerName });
        
        if (!this.isConnected) {
            const ok = await this.init();
            if (!ok) return false;
        }

        this.roomId = this.generateRoomId();
        this.playerId = 1;
        this.playerName = playerName;

        try {
            // 创建频道
            this.channel = this.supabase.channel(`room:${this.roomId}`, {
                config: { broadcast: { self: false, ack: true } }
            });

            this.setupChannelListeners();

            // 数据写入与频道订阅互不依赖，并行执行，减少创建房间首屏等待。
            const [insertResult, subscribed] = await Promise.all([
                this.supabase.from('rooms').insert({
                    id: this.roomId,
                    game: gameName,
                    player1: playerName
                }),
                this.subscribeChannel()
            ]);
            if (insertResult.error) throw insertResult.error;
            if (!subscribed) {
                await this.supabase.from('rooms').delete().eq('id', this.roomId);
                throw new Error('实时频道连接超时');
            }

            console.log('✅ 房间创建成功:', this.roomId);
            if (this.onRoomCreated) this.onRoomCreated(this.roomId);
            return true;
        } catch (e) {
            console.error('创建房间异常:', e);
            if (this.onError) this.onError('创建房间失败: ' + e.message);
        }
        
        return false;
    }

    async joinRoom(roomId, playerName) {
        console.log('加入房间:', { roomId, playerName });
        
        if (!this.isConnected) {
            const ok = await this.init();
            if (!ok) return false;
        }

        this.roomId = roomId.toUpperCase();
        this.playerId = 2;
        this.playerName = playerName;

        try {
            // 检查房间
            const { data: room, error } = await this.supabase
                .from('rooms')
                .select('*')
                .eq('id', this.roomId)
                .single();

            if (!room || error) {
                console.error('房间不存在:', error);
                if (this.onError) this.onError('房间不存在');
                return false;
            }
            if (room.player2) {
                if (this.onError) this.onError('房间人数已满');
                return false;
            }

            // 创建频道
            this.channel = this.supabase.channel(`room:${this.roomId}`, {
                config: { broadcast: { self: false, ack: true } }
            });

            this.setupChannelListeners();

            const subscribed = await this.subscribeChannel();
            if (!subscribed) throw new Error('实时频道连接超时');

            const { error: updateError, data: updatedRoom } = await this.supabase
                .from('rooms').update({ player2: playerName }).eq('id', this.roomId).is('player2', null).select('id');
            if (updateError) throw updateError;
            if (!updatedRoom || !updatedRoom.length) throw new Error('房间刚刚被其他玩家加入');

            await this.channel.send({
                type: 'broadcast',
                event: 'player_join',
                payload: { playerId: 2, playerName: playerName }
            });

            console.log('✅ 加入房间成功');
            if (this.onRoomJoined) {
                this.onRoomJoined({ roomId: this.roomId, playerId: 2, game: room.game, hostName: room.player1 });
            }
            return true;
        } catch (e) {
            console.error('加入房间异常:', e);
            if (this.onError) this.onError('加入房间失败: ' + e.message);
        }
        
        return false;
    }

    subscribeChannel() {
        return new Promise((resolve) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (!settled) { settled = true; resolve(false); }
            }, 8000);
            this.channel.subscribe((status) => {
                console.log('频道订阅状态:', status);
                if (settled) return;
                if (status === 'SUBSCRIBED') {
                    settled = true;
                    clearTimeout(timer);
                    resolve(true);
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    settled = true;
                    clearTimeout(timer);
                    resolve(false);
                }
            });
        });
    }

    setupChannelListeners() {
        this.channel.on('broadcast', { event: 'player_join' }, (payload) => {
            console.log('收到玩家加入事件:', payload);
            if (this.onPlayerJoined) this.onPlayerJoined(payload.payload);
        });

        this.channel.on('broadcast', { event: 'player_leave' }, (payload) => {
            console.log('收到玩家离开事件:', payload);
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
            console.log('收到聊天消息:', payload);
            if (this.onChatMessage) {
                this.onChatMessage(payload.payload);
            }
        });

        this.channel.on('broadcast', { event: 'game_start' }, (payload) => {
            if (this.onGameStart) this.onGameStart(payload.payload);
        });

        this.channel.on('broadcast', { event: 'voice_signal' }, (payload) => {
            if (this.onVoiceSignal && payload.payload.playerId !== this.playerId) {
                this.onVoiceSignal(payload.payload.signal);
            }
        });
    }

    sendInput(input) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'player_input',
            payload: { playerId: this.playerId, input: input }
        });
    }

    sendGameStart(game) {
        if (!this.channel) return Promise.resolve();
        return this.channel.send({ type: 'broadcast', event: 'game_start', payload: { game: game } });
    }

    sendVoiceSignal(signal) {
        if (!this.channel) return Promise.resolve();
        return this.channel.send({
            type: 'broadcast',
            event: 'voice_signal',
            payload: { playerId: this.playerId, signal: signal }
        });
    }

    sendGameState(state) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'game_state',
            payload: { playerId: this.playerId, state: state }
        });
    }

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

    async getRoomList() {
        try {
            if (!this.isConnected) {
                const ok = await this.init();
                if (!ok) return [];
            }
            const { data, error } = await this.supabase
                .from('rooms')
                .select('*')
                .is('player2', null)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) {
                console.error('获取房间列表失败:', error);
                return [];
            }
            
            console.log('房间列表:', data);
            return data || [];
        } catch (e) {
            console.error('获取房间列表异常:', e);
            return [];
        }
    }

    async leaveRoom() {
        const roomId = this.roomId;
        const playerId = this.playerId;
        const channel = this.channel;
        try {
            if (channel) {
                try {
                    await channel.send({
                        type: 'broadcast',
                        event: 'player_leave',
                        payload: { playerId: playerId }
                    });
                } catch (e) {
                    console.warn('发送离开通知失败:', e);
                }
                try {
                    await this.supabase.removeChannel(channel);
                } catch (e) {
                    console.warn('断开房间频道失败:', e);
                }
            }

            if (roomId) {
                if (playerId === 1) {
                    let deleteError = null;
                    for (let attempt = 0; attempt < 2; attempt++) {
                        const result = await this.supabase.from('rooms').delete().eq('id', roomId);
                        deleteError = result.error;
                        if (!deleteError) break;
                        await new Promise(resolve => setTimeout(resolve, 250));
                    }
                    if (deleteError) throw deleteError;
                } else {
                    const { error } = await this.supabase.from('rooms').update({ player2: null }).eq('id', roomId);
                    if (error) throw error;
                }
            }
        } finally {
            if (this.channel === channel) this.channel = null;
            if (this.roomId === roomId) this.roomId = null;
            if (this.playerId === playerId) this.playerId = null;
        }
    }

    async disconnect() {
        await this.leaveRoom();
        this.isConnected = false;
    }
}

window.SupabaseMultiplayer = SupabaseMultiplayer;

