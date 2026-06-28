import React, { useState, useEffect, useRef } from 'react';
import { CarCustomization, GameRoom, Player, WeatherType } from './types';
import Garage from './components/Garage';
import Lobby from './components/Lobby';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import { Globe, Shield, User, Trophy, Play, Check, ChevronRight, Settings, Sparkles } from 'lucide-react';

export default function App() {
  // Screen routing states
  const [screen, setScreen] = useState<'home' | 'garage' | 'lobby' | 'race' | 'results'>('home');
  const [playerName, setPlayerName] = useState(() => {
    return 'Driver_' + Math.random().toString(36).substring(2, 6).toUpperCase();
  });

  // Vehicle profile state
  const [customization, setCustomization] = useState<CarCustomization>({
    color: '#ef4444',
    underglow: '#3b82f6',
    bodyType: 'sports',
    rims: 'racing',
    stats: { engine: 4, tires: 3, weight: 4, boost: 4 }
  });

  // Room states
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<{ senderName: string; message: string }[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>('');

  // Socket references
  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);

  // Fetch Rooms list from Express JSON API
  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (e) {
      console.error('Error fetching rooms:', e);
    }
  };

  // Connect to the real-time WebSocket server
  const connectWebSocket = (roomId: string) => {
    // Determine WS URI dynamically (supports both HTTP/HTTPS and localhost)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to racing grid socket server');
      
      // Join Room instantly
      socket.send(JSON.stringify({
        type: 'join_room',
        roomId,
        name: playerName,
        customization
      }));

      // Setup keep-alive ping interval
      pingIntervalRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 10000);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'room_state': {
            const room = msg.room as GameRoom;
            setCurrentRoom(room);
            
            // Map myPlayerId by matching name and color or from server session
            if (!myPlayerId) {
              const matchedMe = Object.values(room.players).find(p => p.name === playerName);
              if (matchedMe) {
                setMyPlayerId(matchedMe.id);
              }
            }

            // Sync screen transitions based on stage
            if (room.stage === 'countdown' || room.stage === 'racing') {
              setScreen('race');
            } else if (room.stage === 'finished') {
              setScreen('results');
            }
            break;
          }

          case 'countdown': {
            if (currentRoom) {
              setCurrentRoom({
                ...currentRoom,
                countdown: msg.countdown,
                stage: msg.stage
              });
            }
            if (msg.stage === 'racing') {
              setScreen('race');
            }
            break;
          }

          case 'pos_sync': {
            // Coordinate streaming update
            if (currentRoom) {
              const updatedPlayers = { ...currentRoom.players };
              Object.keys(msg.players).forEach(pId => {
                if (updatedPlayers[pId]) {
                  updatedPlayers[pId] = {
                    ...updatedPlayers[pId],
                    ...msg.players[pId]
                  };
                }
              });
              
              setCurrentRoom({
                ...currentRoom,
                players: updatedPlayers
              });
            }
            break;
          }

          case 'object_sync': {
            if (currentRoom) {
              const updatedObjs = currentRoom.destructibles.map(obj => {
                if (obj.id === msg.objectId) {
                  return {
                    ...obj,
                    health: msg.health,
                    isDestroyed: msg.isDestroyed,
                    vx: msg.vx,
                    vy: msg.vy,
                    x: msg.x,
                    y: msg.y
                  };
                }
                return obj;
              });

              setCurrentRoom({
                ...currentRoom,
                destructibles: updatedObjs
              });
            }
            break;
          }

          case 'shortcut_reveal': {
            // Display alert or sound
            console.log(`Shortcut area revealed by breaking: ${msg.objectId}`);
            break;
          }

          case 'chat': {
            setChatMessages(prev => [...prev, { senderName: msg.senderName, message: msg.message }]);
            break;
          }

          case 'error':
            alert(`Lobby Alert: ${msg.message}`);
            break;
        }
      } catch (err) {
        console.error('Error parsing WS event:', err);
      }
    };

    socket.onclose = () => {
      console.log('Socket connection severed');
      clearInterval(pingIntervalRef.current);
    };

    socket.onerror = (e) => {
      console.error('WebSocket Error:', e);
    };
  };

  // Close connections on exit
  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    clearInterval(pingIntervalRef.current);
    setCurrentRoom(null);
    setMyPlayerId('');
    setChatMessages([]);
  };

  // Host a new Room
  const handleCreateRoom = async (roomName: string, mapId: string, weather: WeatherType) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, mapId, weather, hostName: playerName })
      });

      if (res.ok) {
        const room = await res.json();
        setScreen('lobby');
        connectWebSocket(room.id);
      }
    } catch (e) {
      console.error('Error creating room:', e);
    }
  };

  // Join hosted Room
  const handleJoinRoom = (roomId: string) => {
    setScreen('lobby');
    connectWebSocket(roomId);
  };

  // Leave room / return home
  const handleLeaveRoom = () => {
    disconnectSocket();
    setScreen('home');
    fetchRooms();
  };

  // Toggle ready status
  const handleToggleReady = (ready: boolean) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'ready',
        ready
      }));
    }
  };

  // Update room settings (Host only)
  const handleUpdateSettings = (mapId: string, weather: WeatherType) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'settings_update',
        mapId,
        weather
      }));
    }
  };

  // Forced start (Host only)
  const handleForceStart = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'start_race_forced'
      }));
    }
  };

  // Send lobby chat message
  const handleSendChat = (message: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        message
      }));
    }
  };

  // Local physical update sync streamed to WS
  const handleUpdateLocalPosState = (posData: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update_state',
        ...posData
      }));
    }
  };

  // Local player reports smashing obstacles
  const handleImpactObject = (objectId: string, damage: number, vx: number, vy: number, x: number, y: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'impact_object',
        objectId,
        damage,
        vx,
        vy,
        x,
        y
      }));
    }
  };

  // Local player finished race
  const handleRaceFinished = (finalTime: number) => {
    console.log(`Race Finished! Elapsed: ${finalTime}s`);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update_state',
        state: 'finished',
        finishedTime: finalTime
      }));
    }
    setScreen('results');
  };

  // Initial rooms loading
  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div id="velocity_root" className="min-h-screen bg-[#050505] text-white flex flex-col justify-between selection:bg-orange-500 selection:text-white font-sans">
      
      {/* HEADER NAVBAR */}
      <header id="main_navbar" className="bg-[#0c0c0c]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-sm transform -skew-x-12 flex items-center justify-center shadow-lg shadow-orange-950/30">
              <span className="font-black text-2xl italic tracking-tighter text-white transform skew-x-12">VC</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">Velocity City</h1>
              <p className="text-[10px] text-orange-500 font-bold tracking-[0.2em] uppercase opacity-90 mt-1">Unbound Horizon</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            {/* Player profile quick adjustment */}
            <div className="bg-[#111] border border-white/5 rounded-full px-5 py-2 flex items-center space-x-3 shadow-inner">
              <User className="w-4 h-4 text-orange-500" />
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest leading-none">DRIVER NAME</span>
                <input
                  type="text"
                  id="header_name_input"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.substring(0, 15))}
                  className="bg-transparent border-none text-xs font-mono font-bold text-white focus:outline-none w-28 text-left mt-0.5"
                  placeholder="Racer Name"
                />
              </div>
            </div>

            {screen !== 'home' && screen !== 'race' && (
              <button
                id="nav_exit_to_home"
                onClick={handleLeaveRoom}
                className="bg-transparent hover:bg-white/5 text-xs border border-white/10 hover:border-orange-500/30 text-gray-300 py-2.5 px-4 rounded-full uppercase font-mono tracking-wider transition-all"
              >
                Exit to Garage
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CORE SCREENS ROUTING CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center">
        
        {/* SCREEN: HOME HERO GRID */}
        {screen === 'home' && (
          <div id="screen_home" className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8 items-center py-4 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.06),transparent_70%)] pointer-events-none" />

            {/* Landing Hero banner */}
            <div className="md:col-span-3 space-y-6 relative z-10">
              <div className="inline-flex items-center space-x-2 bg-orange-950/40 border border-orange-800/40 px-3.5 py-1.5 rounded-full text-xs font-mono text-orange-500 shadow-md">
                <Sparkles className="w-4 h-4 animate-spin text-orange-400" style={{ animationDuration: '6s' }} />
                <span>Version 2.4.0 • Realistic 2D Physics Grid</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
                Master the Drift.<br />
                Rule the <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 underline decoration-orange-500/30">City Streets.</span>
              </h2>

              <p className="text-gray-400 text-sm leading-relaxed max-w-lg font-sans">
                Enter high-performance 2D drifting. Squeeze through hidden shortcuts, smash destructible street hazards, and challenge real racers globally with zero installation, cross-platform latency synchronizers.
              </p>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
                <button
                  id="home_play_lobby_btn"
                  onClick={() => setScreen('lobby')}
                  className="group relative text-left py-4 px-8 bg-gradient-to-r from-orange-600 to-orange-500 transform -skew-x-12 shadow-xl shadow-orange-900/10 hover:shadow-orange-500/20 active:scale-98 transition-all duration-200 cursor-pointer"
                >
                  <span className="flex items-center space-x-2.5 transform skew-x-12 font-black italic text-base uppercase text-white">
                    <Play className="w-5 h-5 fill-white" />
                    <span>Race Now</span>
                  </span>
                </button>

                <button
                  id="home_customize_car_btn"
                  onClick={() => setScreen('garage')}
                  className="py-4 px-8 bg-[#111] hover:bg-white/5 border border-white/10 rounded-sm font-bold uppercase tracking-wider text-xs text-gray-300 hover:text-white transition-all flex items-center justify-center space-x-2"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span>The Garage</span>
                </button>
              </div>

              {/* Specs footer */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5 max-w-md text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <div>
                  <span className="text-white font-black block text-sm italic tracking-tight">60 FPS</span>
                  Responsive Physics
                </div>
                <div>
                  <span className="text-white font-black block text-sm italic tracking-tight">REAL-TIME</span>
                  Multiplayer Grid
                </div>
                <div>
                  <span className="text-white font-black block text-sm italic tracking-tight">CROSS-PLAY</span>
                  Dual Touch Gamepad
                </div>
              </div>
            </div>

            {/* Showcase Visualizer Cards */}
            <div className="md:col-span-2 bg-[#111]/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full filter blur-2xl" />
              
              <h3 className="text-[10px] text-orange-500 font-bold tracking-[0.3em] uppercase">Vehicle Stats</h3>
              
              {/* Dynamic car display block */}
              <div className="bg-gradient-to-t from-[#080808] to-transparent border-b-2 border-orange-500/50 flex flex-col items-center justify-center h-44 relative overflow-hidden rounded-lg">
                {customization.underglow !== 'none' && (
                  <div className="absolute w-36 h-20 rounded-full filter blur-xl opacity-60 animate-pulse" style={{ backgroundColor: customization.underglow }} />
                )}
                
                <div className="relative w-40 h-20 z-10 transition-transform duration-300 hover:scale-105">
                  {/* Miniature car preview */}
                  <svg viewBox="0 0 120 60" className="w-full h-full filter drop-shadow-md">
                    <path d="M10 40 L30 15 L80 15 L110 40 L105 48 L15 48 Z" fill={customization.color} stroke="#000" strokeWidth="2.5" />
                    <circle cx="30" cy="46" r="9" fill="#111" stroke="#666" strokeWidth="2" />
                    <circle cx="90" cy="46" r="9" fill="#111" stroke="#666" strokeWidth="2" />
                  </svg>
                </div>
                <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_12px_orange]" />
              </div>

              {/* Stats overview using the mock design's high-contrast style */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-1.5">
                    <span>Engine Tuning (Speed)</span>
                    <span className="font-mono text-white">{(customization.stats.engine * 2).toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all duration-500" style={{ width: `${customization.stats.engine * 20}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-1.5">
                    <span>Compound Tires (Handling)</span>
                    <span className="font-mono text-white">{(customization.stats.tires * 2).toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all duration-500" style={{ width: `${customization.stats.tires * 20}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-1.5">
                    <span>NOS Boost (Nitro)</span>
                    <span className="font-mono text-orange-500">{(customization.stats.boost * 2).toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${customization.stats.boost * 20}%` }}></div>
                  </div>
                </div>
              </div>

              <button
                id="showcase_tuning_btn"
                onClick={() => setScreen('garage')}
                className="w-full bg-[#080808] hover:bg-white/5 border border-white/10 text-gray-300 py-3 px-4 rounded-sm transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Enter Tuning Bay</span>
                <ChevronRight className="w-4 h-4 text-orange-500" />
              </button>
            </div>
          </div>
        )}

        {/* SCREEN: GARAGE VEHICLE TUNER */}
        {screen === 'garage' && (
          <div id="screen_garage" className="space-y-4">
            <Garage
              customization={customization}
              onUpdate={setCustomization}
              onConfirm={() => {
                setScreen('home');
                fetchRooms();
              }}
            />
          </div>
        )}

        {/* SCREEN: LOBBY MATCHMAKER */}
        {screen === 'lobby' && (
          <div id="screen_lobby" className="space-y-4">
            <Lobby
              rooms={rooms}
              currentRoom={currentRoom}
              myPlayerId={myPlayerId}
              chatMessages={chatMessages}
              onFetchRooms={fetchRooms}
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onLeaveRoom={handleLeaveRoom}
              onToggleReady={handleToggleReady}
              onUpdateSettings={handleUpdateSettings}
              onForceStart={handleForceStart}
              onSendChat={handleSendChat}
            />
          </div>
        )}

        {/* SCREEN: LIVE RACING CANVAS STAGE */}
        {screen === 'race' && currentRoom && (
          <div id="screen_race" className="space-y-4 max-w-5xl mx-auto w-full">
            <GameCanvas
              room={currentRoom}
              myPlayerId={myPlayerId}
              onUpdateState={handleUpdateLocalPosState}
              onImpactObject={handleImpactObject}
              onRaceFinished={handleRaceFinished}
            />
          </div>
        )}

        {/* SCREEN: RESULTS LEADERBOARD PODIUM */}
        {screen === 'results' && currentRoom && (
          <div id="screen_results" className="space-y-4">
            <Leaderboard
              players={Object.values(currentRoom.players)}
              onBackToLobby={() => {
                // Return to room lobby
                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                  socketRef.current.send(JSON.stringify({
                    type: 'ready',
                    ready: false // resets ready for next race
                  }));
                }
                setScreen('lobby');
              }}
            />
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer id="main_footer" className="bg-slate-950 border-t border-slate-900 text-center py-5 text-xs text-slate-500 font-mono">
        <p>© 2026 Velocity City Drifters. Cross-play synced on standard HTTP/WebSockets.</p>
      </footer>

    </div>
  );
}
