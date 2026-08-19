const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3000;

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('FC Games Online Server');
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 房间管理
const rooms = new Map();

// 生成房间ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 广播消息给房间内所有玩家
function broadcast(roomId, message, excludeWs = null) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    room.players.forEach(player => {
        if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    });
}

// 处理WebSocket连接
wss.on('connection', (ws) => {
    let currentRoom = null;
    let playerId = null;
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'create_room':
                    // 创建房间
                    const roomId = generateRoomId();
                    playerId = 1;
                    currentRoom = roomId;
                    
                    rooms.set(roomId, {
                        players: [{ ws, id: 1, name: message.playerName || '玩家1' }],
                        game: message.game,
                        createdAt: Date.now()
                    });
                    
                    ws.send(JSON.stringify({
                        type: 'room_created',
                        roomId,
                        playerId: 1
                    }));
                    break;
                    
                case 'join_room':
                    // 加入房间
                    const room = rooms.get(message.roomId);
                    
                    if (!room) {
                        ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
                        break;
                    }
                    
                    if (room.players.length >= 2) {
                        ws.send(JSON.stringify({ type: 'error', message: '房间已满' }));
                        break;
                    }
                    
                    playerId = 2;
                    currentRoom = message.roomId;
                    
                    room.players.push({ ws, id: 2, name: message.playerName || '玩家2' });
                    
                    // 通知加入成功
                    ws.send(JSON.stringify({
                        type: 'room_joined',
                        roomId: message.roomId,
                        playerId: 2,
                        game: room.game
                    }));
                    
                    // 通知房主有玩家加入
                    broadcast(message.roomId, {
                        type: 'player_joined',
                        playerId: 2,
                        playerName: message.playerName || '玩家2'
                    }, ws);
                    break;
                    
                case 'game_state':
                    // 同步游戏状态
                    if (currentRoom) {
                        broadcast(currentRoom, {
                            type: 'game_state',
                            state: message.state,
                            fromPlayer: playerId
                        }, ws);
                    }
                    break;
                    
                case 'player_input':
                    // 同步玩家输入
                    if (currentRoom) {
                        broadcast(currentRoom, {
                            type: 'player_input',
                            input: message.input,
                            fromPlayer: playerId
                        }, ws);
                    }
                    break;
                    
                case 'chat':
                    // 聊天消息
                    if (currentRoom) {
                        broadcast(currentRoom, {
                            type: 'chat',
                            message: message.message,
                            fromPlayer: playerId
                        }, ws);
                    }
                    break;
                    
                case 'leave_room':
                    // 离开房间
                    handlePlayerLeave(ws, currentRoom, playerId);
                    currentRoom = null;
                    playerId = null;
                    break;
            }
        } catch (e) {
            console.error('处理消息错误:', e);
        }
    });
    
    ws.on('close', () => {
        handlePlayerLeave(ws, currentRoom, playerId);
    });
});

// 处理玩家离开
function handlePlayerLeave(ws, roomId, playerId) {
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    // 移除玩家
    room.players = room.players.filter(p => p.ws !== ws);
    
    // 通知其他玩家
    broadcast(roomId, {
        type: 'player_left',
        playerId
    });
    
    // 如果房间为空，删除房间
    if (room.players.length === 0) {
        rooms.delete(roomId);
    }
}

// 清理过期房间（每5分钟）
setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms) {
        if (now - room.createdAt > 3600000) { // 1小时
            rooms.delete(roomId);
        }
    }
}, 300000);

server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});
