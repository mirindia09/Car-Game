import express from 'express';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GameRoom, Player, DestructibleObject, CarCustomization, WeatherType, RaceStage } from './src/types';
import { MAPS } from './src/maps';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Middleware
app.use(express.json());

// In-memory data store for multiplayer rooms
const rooms: { [id: string]: GameRoom } = {};

// Helper to create a clean list of destructibles from a map
function initDestructibles(mapId: string): DestructibleObject[] {
  const map = MAPS.find(m => m.id === mapId);
  if (!map) return [];
  
  return map.destructibles.map(d => {
    let mass = 4;
    let radius = 12;
    let health = 30;

    switch (d.type) {
      case 'cone':
        mass = 1;
        radius = 8;
        health = 10;
        break;
      case 'box':
        mass = 5;
        radius = 12;
        health = 35;
        break;
      case 'barrel':
        mass = 10;
        radius = 16;
        health = 60;
        break;
      case 'barrier':
        mass = 30;
        radius = 25;
        health = 120;
        break;
    }

    return {
      id: d.id,
      type: d.type,
      x: d.x,
      y: d.y,
      vx: 0,
      vy: 0,
      angle: 0,
      vangle: 0,
      mass,
      radius,
      isDestroyed: false,
      health
    };
  });
}

// REST endpoints for room management
app.get('/api/rooms', (req, res) => {
  const activeRooms = Object.values(rooms).map(r => ({
    id: r.id,
    name: r.name,
    playerCount: Object.keys(r.players).length,
    stage: r.stage,
    mapName: MAPS.find(m => m.id === r.mapId)?.name || r.mapId,
    weather: r.weather,
  }));
  res.json(activeRooms);
});

app.post('/api/rooms', (req, res) => {
  const { name, mapId, weather, hostName } = req.body;
  const id = 'room_' + Math.random().toString(36).substring(2, 9);
  
  rooms[id] = {
    id,
    name: name || `${hostName}'s Drift Rally`,
    hostId: '',
    players: {},
    mapId: mapId || 'neon_downtown',
    weather: weather || 'sunny',
    stage: 'lobby',
    countdown: 0,
    destructibles: initDestructibles(mapId || 'neon_downtown')
  };

  res.json(rooms[id]);
});

// Setup WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Bind WebSocket to HTTP Server
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Map socket connections to players
interface ConnectedSocket {
  ws: WebSocket;
  playerId: string;
  roomId: string;
}
const socketMap = new Map<WebSocket, ConnectedSocket>();

wss.on('connection', (ws: WebSocket) => {
  // Setup heartbeat ping-pong to clean up dead sockets
  let isAlive = true;
  ws.on('pong', () => { isAlive = true; });

  ws.on('message', (messageData: string) => {
    try {
      const data = JSON.parse(messageData);
      
      switch (data.type) {
        case 'join_room': {
          const { roomId, name, customization } = data;
          const room = rooms[roomId];
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
          }

          // If race already in progress and player joining, set status to finished or spectating
          const state: Player['state'] = room.stage === 'lobby' ? 'lobby' : 'finished';
          const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
          
          if (!room.hostId) {
            room.hostId = playerId;
          }

          const mapInfo = MAPS.find(m => m.id === room.mapId);
          const startX = mapInfo?.startPos.x || 200;
          const startY = mapInfo?.startPos.y || 200;
          const startAngle = mapInfo?.startPos.angle || 0;

          const newPlayer: Player = {
            id: playerId,
            name: name || `Racer ${Object.keys(room.players).length + 1}`,
            x: startX,
            y: startY,
            angle: startAngle,
            vx: 0,
            vy: 0,
            angularVelocity: 0,
            driftValue: 0,
            isDrifting: false,
            color: customization?.color || '#3b82f6',
            customization: customization || {
              color: '#3b82f6',
              underglow: 'none',
              bodyType: 'sports',
              rims: 'standard',
              stats: { engine: 3, tires: 3, weight: 3, boost: 3 }
            },
            state,
            currentLap: 1,
            lastCheckpoint: 0,
          };

          room.players[playerId] = newPlayer;
          socketMap.set(ws, { ws, playerId, roomId });

          // Notify everyone in the room
          broadcastToRoom(roomId, { type: 'room_state', room });
          break;
        }

        case 'update_state': {
          const connection = socketMap.get(ws);
          if (!connection) return;
          const { roomId, playerId } = connection;
          const room = rooms[roomId];
          if (!room) return;

          const player = room.players[playerId];
          if (player) {
            player.x = data.x;
            player.y = data.y;
            player.angle = data.angle;
            player.vx = data.vx;
            player.vy = data.vy;
            player.isDrifting = data.isDrifting;
            player.driftValue = data.driftValue;
            player.currentLap = data.currentLap;
            player.lastCheckpoint = data.lastCheckpoint;
            if (data.state) player.state = data.state;
            if (data.finishedTime) player.finishedTime = data.finishedTime;
          }
          break;
        }

        case 'ready': {
          const connection = socketMap.get(ws);
          if (!connection) return;
          const { roomId, playerId } = connection;
          const room = rooms[roomId];
          if (!room) return;

          const player = room.players[playerId];
          if (player) {
            player.state = data.ready ? 'ready' : 'lobby';
            broadcastToRoom(roomId, { type: 'room_state', room });

            // If everyone is ready, and we have at least 1 player, trigger countdown
            const allPlayers = Object.values(room.players);
            const allReady = allPlayers.every(p => p.state === 'ready');
            if (allReady && allPlayers.length > 0 && room.stage === 'lobby') {
              startCountdown(roomId);
            }
          }
          break;
        }

        case 'start_race_forced': {
          const connection = socketMap.get(ws);
          if (!connection) return;
          const { roomId, playerId } = connection;
          const room = rooms[roomId];
          if (!room || room.hostId !== playerId) return;

          if (room.stage === 'lobby') {
            startCountdown(roomId);
          }
          break;
        }

        case 'impact_object': {
          const connection = socketMap.get(ws);
          if (!connection) return;
          const { roomId, playerId } = connection;
          const room = rooms[roomId];
          if (!room) return;

          const { objectId, damage, vx, vy, x, y } = data;
          const obj = room.destructibles.find(d => d.id === objectId);
          if (obj) {
            obj.health = Math.max(0, obj.health - damage);
            obj.vx = vx;
            obj.vy = vy;
            obj.x = x;
            obj.y = y;

            if (obj.health <= 0 && !obj.isDestroyed) {
              obj.isDestroyed = true;
              
              // If there's a shortcut blocked by this object, reveal it!
              const map = MAPS.find(m => m.id === room.mapId);
              const shortcut = map?.shortcuts.find(s => s.destructibleBarrierId === objectId);
              if (shortcut) {
                broadcastToRoom(roomId, { 
                  type: 'shortcut_reveal', 
                  shortcutId: shortcut.id,
                  objectId 
                });
              }
            }

            // Sync object velocity and damage info to others
            broadcastToRoom(roomId, {
              type: 'object_sync',
              objectId,
              health: obj.health,
              isDestroyed: obj.isDestroyed,
              vx,
              vy,
              x,
              y
            }, playerId);
          }
          break;
        }

        case 'chat': {
          const connection = socketMap.get(ws);
          if (!connection) return;
          const { roomId, playerId } = connection;
          const room = rooms[roomId];
          if (!room) return;

          const player = room.players[playerId];
          if (player) {
            broadcastToRoom(roomId, {
              type: 'chat',
              senderName: player.name,
              message: data.message
            });
          }
          break;
        }

        case 'settings_update': {
          const connection = socketMap.get(ws);
          if (!connection) return;
          const { roomId, playerId } = connection;
          const room = rooms[roomId];
          if (!room || room.hostId !== playerId) return;

          const { mapId, weather } = data;
          if (mapId) {
            room.mapId = mapId;
            room.destructibles = initDestructibles(mapId);
          }
          if (weather) {
            room.weather = weather;
          }

          broadcastToRoom(roomId, { type: 'room_state', room });
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }
      }
    } catch (e) {
      console.error('Error handling WS message:', e);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

// Broadcast countdown state & begin race
function startCountdown(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  room.stage = 'countdown';
  room.countdown = 3;
  
  // Set all players to 'racing' status to prepare positions
  const mapInfo = MAPS.find(m => m.id === room.mapId);
  const startX = mapInfo?.startPos.x || 200;
  const startY = mapInfo?.startPos.y || 200;
  const startAngle = mapInfo?.startPos.angle || 0;

  Object.values(room.players).forEach(p => {
    p.state = 'racing';
    p.x = startX;
    p.y = startY;
    p.angle = startAngle;
    p.vx = 0;
    p.vy = 0;
    p.currentLap = 1;
    p.lastCheckpoint = 0;
  });

  broadcastToRoom(roomId, { type: 'room_state', room });

  const interval = setInterval(() => {
    const r = rooms[roomId];
    if (!r || r.stage !== 'countdown') {
      clearInterval(interval);
      return;
    }

    r.countdown--;
    if (r.countdown <= 0) {
      r.stage = 'racing';
      clearInterval(interval);
    }
    broadcastToRoom(roomId, { type: 'countdown', countdown: r.countdown, stage: r.stage });
  }, 1000);
}

// Broadcast helper (optionally skip sender)
function broadcastToRoom(roomId: string, messageObj: any, skipPlayerId?: string) {
  const payload = JSON.stringify(messageObj);
  socketMap.forEach((conn) => {
    if (conn.roomId === roomId && conn.playerId !== skipPlayerId) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(payload);
      }
    }
  });
}

// Periodically synchronize all player positions (30Hz tick)
setInterval(() => {
  Object.keys(rooms).forEach(roomId => {
    const room = rooms[roomId];
    if (!room || room.stage === 'lobby') return;

    // Collect positions
    const posPayload: { [id: string]: any } = {};
    Object.values(room.players).forEach(p => {
      posPayload[p.id] = {
        x: p.x,
        y: p.y,
        angle: p.angle,
        vx: p.vx,
        vy: p.vy,
        isDrifting: p.isDrifting,
        driftValue: p.driftValue,
        currentLap: p.currentLap,
        lastCheckpoint: p.lastCheckpoint,
        state: p.state,
        finishedTime: p.finishedTime
      };
    });

    broadcastToRoom(roomId, {
      type: 'pos_sync',
      players: posPayload
    });
  });
}, 33);

// Handle disconnected sockets
function handleDisconnect(ws: WebSocket) {
  const connection = socketMap.get(ws);
  if (!connection) return;

  const { roomId, playerId } = connection;
  socketMap.delete(ws);

  const room = rooms[roomId];
  if (room) {
    delete room.players[playerId];
    
    const remainingPlayers = Object.keys(room.players);
    if (remainingPlayers.length === 0) {
      // Delete empty rooms after 5 seconds to avoid memory leaks
      setTimeout(() => {
        const checkRoom = rooms[roomId];
        if (checkRoom && Object.keys(checkRoom.players).length === 0) {
          delete rooms[roomId];
          console.log(`Cleaned up empty room: ${roomId}`);
        }
      }, 5000);
    } else {
      // If host disconnected, promote next player to host
      if (room.hostId === playerId) {
        room.hostId = remainingPlayers[0];
      }
      broadcastToRoom(roomId, { type: 'room_state', room });
    }
  }
}

// Heartbeat interval to check dead connections
setInterval(() => {
  wss.clients.forEach((ws: WebSocket) => {
    // If connection did not respond to ping-pong since last check, terminate
    const conn = socketMap.get(ws);
    if (!conn) return;

    ws.ping();
  });
}, 30000);


// Integrate Vite Development Server / Static build
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
