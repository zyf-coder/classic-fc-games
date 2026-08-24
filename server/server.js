const http = require('http');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();

function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function broadcast(room, message, excluded) {
  if (!room) return;
  room.players.forEach((player) => {
    if (player.ws !== excluded) send(player.ws, message);
  });
}

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function removePlayer(ws, roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players = room.players.filter((player) => player.ws !== ws);
  if (playerId === 1) {
    broadcast(room, { type: 'host_left', playerId: 1 });
    rooms.delete(roomId);
  } else {
    broadcast(room, { type: 'player_left', playerId });
    if (!room.players.length) rooms.delete(roomId);
  }
}

const server = http.createServer((request, response) => {
  if (request.url === '/rooms') {
    response.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    });
    const list = [];
    for (const [id, room] of rooms) {
      if (room.players.length < 2) list.push({ id, game: room.game, player1: room.players[0].name });
    }
    response.end(JSON.stringify(list));
    return;
  }
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ ok: true, service: 'classic-fc-games', rooms: rooms.size }));
});

const websocketServer = new WebSocket.Server({ server });

websocketServer.on('connection', (ws) => {
  let roomId = null;
  let playerId = null;

  ws.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw); } catch { return; }

    if (message.type === 'create_room') {
      roomId = generateRoomId();
      playerId = 1;
      rooms.set(roomId, {
        game: message.game || '',
        createdAt: Date.now(),
        players: [{ ws, id: 1, name: message.playerName || '玩家1' }]
      });
      send(ws, { type: 'room_created', roomId, playerId });
      return;
    }

    if (message.type === 'join_room') {
      const requestedId = String(message.roomId || '').toUpperCase();
      const room = rooms.get(requestedId);
      if (!room) return send(ws, { type: 'error', message: '房间不存在' });
      if (room.players.length >= 2) return send(ws, { type: 'error', message: '房间已满' });
      roomId = requestedId;
      playerId = 2;
      room.players.push({ ws, id: 2, name: message.playerName || '玩家2' });
      send(ws, { type: 'room_joined', roomId, playerId, game: room.game, hostName: room.players[0].name });
      broadcast(room, { type: 'player_joined', playerId: 2, playerName: message.playerName || '玩家2' }, ws);
      return;
    }

    const room = rooms.get(roomId);
    if (!room) return;

    if (message.type === 'leave_room') {
      removePlayer(ws, roomId, playerId);
      roomId = null;
      playerId = null;
      return;
    }

    if (['player_input', 'game_state', 'chat', 'voice_signal', 'game_start'].includes(message.type)) {
      broadcast(room, { ...message, fromPlayer: playerId }, ws);
    }
  });

  ws.on('close', () => removePlayer(ws, roomId, playerId));
});

setInterval(() => {
  for (const [id, room] of rooms) {
    if (Date.now() - room.createdAt > 3600000) rooms.delete(id);
  }
}, 300000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`FC server listening on ${PORT}`);
});
