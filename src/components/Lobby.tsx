import React, { useState, useEffect } from 'react';
import { GameRoom, Player, WeatherType } from '../types';
import { MAPS } from '../maps';
import { Play, Users, MessageSquare, Shield, LogOut, Sun, CloudRain, Snowflake, Moon, Trophy, Check, Plus, RefreshCw, Send, Globe } from 'lucide-react';

interface LobbyProps {
  rooms: any[];
  currentRoom: GameRoom | null;
  myPlayerId: string;
  chatMessages: { senderName: string; message: string }[];
  onFetchRooms: () => void;
  onCreateRoom: (roomName: string, mapId: string, weather: WeatherType) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
  onToggleReady: (ready: boolean) => void;
  onUpdateSettings: (mapId: string, weather: WeatherType) => void;
  onForceStart: () => void;
  onSendChat: (msg: string) => void;
}

export default function Lobby({
  rooms,
  currentRoom,
  myPlayerId,
  chatMessages,
  onFetchRooms,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onToggleReady,
  onUpdateSettings,
  onForceStart,
  onSendChat
}: LobbyProps) {
  // Lobby browser states
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedMapId, setSelectedMapId] = useState('neon_downtown');
  const [selectedWeather, setSelectedWeather] = useState<WeatherType>('sunny');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Inside room states
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    // Poll rooms list every 3 seconds when not in a room
    if (!currentRoom) {
      onFetchRooms();
      const interval = setInterval(onFetchRooms, 3000);
      return () => clearInterval(interval);
    }
  }, [currentRoom]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendChat(chatInput.trim());
      setChatInput('');
    }
  };

  const currentMap = MAPS.find(m => m.id === currentRoom?.mapId);
  const isHost = currentRoom?.hostId === myPlayerId;
  const myPlayer = currentRoom?.players[myPlayerId];
  const isMyPlayerReady = myPlayer?.state === 'ready';

  if (currentRoom) {
    return (
      <div id="lobby_room_view" className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.03),transparent_70%)] pointer-events-none" />

        {/* Left Column: Room Overview & Map details */}
        <div className="lg:col-span-1 flex flex-col space-y-4 relative z-10">
          <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-5 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 p-3 flex space-x-1.5 opacity-40">
              <Globe className="w-4 h-4 text-orange-500" />
              <span className="text-[10px] font-mono tracking-widest text-white">CROSS-PLAY</span>
            </div>
            
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-orange-500">Active Room</span>
            <h2 id="room_title" className="text-xl font-black italic uppercase tracking-tighter text-white mt-1">{currentRoom.name}</h2>
            
            <div className="flex items-center space-x-2.5 mt-3.5 bg-[#111] rounded-sm p-3 border border-white/5">
              <Users className="w-4.5 h-4.5 text-gray-400" />
              <span className="text-xs text-gray-300 font-mono">
                {Object.keys(currentRoom.players).length} Racer(s) Connected
              </span>
            </div>

            <button
              id="leave_room_button"
              onClick={onLeaveRoom}
              className="mt-4 w-full border border-red-500/20 hover:bg-red-500/10 text-red-400 py-2.5 px-4 rounded-sm text-xs font-mono font-bold uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Lobby</span>
            </button>
          </div>

          {/* Tracks and Weather Configuration Panel */}
          <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-5 shadow-lg flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Track Details</span>
              <div className="mt-3 bg-[#111] rounded-sm p-4 border border-white/5 relative overflow-hidden">
                <h3 className="text-white font-bold text-sm italic">{currentMap?.name}</h3>
                <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded uppercase mt-2 ${currentMap?.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' : currentMap?.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {currentMap?.difficulty} Track
                </span>
                <p className="text-xs text-gray-400 mt-2 line-clamp-3 leading-relaxed font-sans">
                  {currentMap?.description}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-mono text-gray-400">
                  <div>🏁 Laps: <span className="text-white font-bold">{currentMap?.laps}</span></div>
                  <div>🚧 Hazards: <span className="text-white font-bold">{currentMap?.destructibles.length} Items</span></div>
                </div>
              </div>

              {/* Weather Indicators */}
              <div className="mt-5">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400 block mb-2.5">Environmental Weather</span>
                <div className="bg-[#111] border border-white/5 rounded-sm p-3.5 flex items-center space-x-3.5">
                  {currentRoom.weather === 'sunny' && (
                    <>
                      <Sun className="w-8 h-8 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
                      <div>
                        <span className="text-xs font-bold text-white block">Sizzling Summer</span>
                        <span className="text-[10px] text-gray-400 font-mono">100% Grip • Standard speed</span>
                      </div>
                    </>
                  )}
                  {currentRoom.weather === 'rainy' && (
                    <>
                      <CloudRain className="w-8 h-8 text-orange-400 filter drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]" />
                      <div>
                        <span className="text-xs font-bold text-white block">Stormy Harbor Splash</span>
                        <span className="text-[10px] text-gray-400 font-mono">65% Grip • Tires will slip & drift</span>
                      </div>
                    </>
                  )}
                  {currentRoom.weather === 'snowy' && (
                    <>
                      <Snowflake className="w-8 h-8 text-indigo-200 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                      <div>
                        <span className="text-xs font-bold text-white block">Siberian Drift-Ice</span>
                        <span className="text-[10px] text-gray-400 font-mono">35% Grip • Maximum slide danger!</span>
                      </div>
                    </>
                  )}
                  {currentRoom.weather === 'night' && (
                    <>
                      <Moon className="w-8 h-8 text-indigo-400 filter drop-shadow-[0_0_8px_rgba(129,140,248,0.3)]" />
                      <div>
                        <span className="text-xs font-bold text-white block">Cyberpunk Midnight</span>
                        <span className="text-[10px] text-gray-400 font-mono">95% Grip • Limited headlights cone</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Host Dashboard settings */}
            {isHost && (
              <div id="host_dashboard" className="mt-6 border-t border-white/5 pt-5 space-y-3.5">
                <div className="flex items-center space-x-1.5 text-orange-500">
                  <Shield className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Lobby Director Controls</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold text-gray-500 uppercase mb-1">Select Track</label>
                    <select
                      id="host_select_track"
                      value={currentRoom.mapId}
                      onChange={(e) => onUpdateSettings(e.target.value, currentRoom.weather)}
                      className="bg-[#111] text-white text-xs border border-white/10 rounded px-2 py-2 focus:border-orange-500 font-mono focus:outline-none"
                    >
                      {MAPS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold text-gray-500 uppercase mb-1">Select Weather</label>
                    <select
                      id="host_select_weather"
                      value={currentRoom.weather}
                      onChange={(e) => onUpdateSettings(currentRoom.mapId, e.target.value as WeatherType)}
                      className="bg-[#111] text-white text-xs border border-white/10 rounded px-2 py-2 focus:border-orange-500 font-mono focus:outline-none"
                    >
                      <option value="sunny">☀️ Sunny</option>
                      <option value="rainy">🌧️ Rainy</option>
                      <option value="snowy">❄️ Snowy</option>
                      <option value="night">🌙 Night</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Players List & Team Setup */}
        <div className="lg:col-span-1 flex flex-col space-y-4 relative z-10">
          <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-5 shadow-lg flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Racers Queue</span>
              <div className="space-y-2 mt-3.5">
                {Object.values(currentRoom.players).map((player: Player) => (
                  <div
                    key={player.id}
                    id={`player_entry_${player.id}`}
                    className="flex items-center justify-between bg-[#111] border border-white/5 rounded p-3"
                  >
                    <div className="flex items-center space-x-3">
                      {/* Colored icon */}
                      <div 
                        className="w-3.5 h-8 rounded-sm shadow-inner"
                        style={{ backgroundColor: player.customization.color }}
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-white">{player.name}</span>
                          {currentRoom.hostId === player.id && (
                            <span className="text-[9px] font-mono font-bold bg-orange-500/10 text-orange-400 px-1 py-0.5 rounded">HOST</span>
                          )}
                          {player.id === myPlayerId && (
                            <span className="text-[9px] font-mono font-bold bg-white/10 text-white px-1 py-0.5 rounded">YOU</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 uppercase mt-0.5 block">
                          {player.customization.bodyType} • HP {player.customization.stats.engine}/5 | GR {player.customization.stats.tires}/5
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {player.state === 'ready' ? (
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>READY</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                          TUNING
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick action ready buttons */}
            <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
              <button
                id="toggle_ready_button"
                onClick={() => onToggleReady(!isMyPlayerReady)}
                className={`w-full font-black italic uppercase tracking-tighter py-3.5 px-4 transform -skew-x-12 transition-all flex items-center justify-center space-x-2 cursor-pointer ${isMyPlayerReady ? 'bg-emerald-600 text-white' : 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-900/10'}`}
              >
                <span className="transform skew-x-12 flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>{isMyPlayerReady ? 'Ready Confirmed' : 'Ready to Race'}</span>
                </span>
              </button>

              {isHost && (
                <button
                  id="force_start_button"
                  onClick={onForceStart}
                  className="w-full bg-[#111] hover:bg-white/5 border border-white/10 text-gray-300 font-bold uppercase tracking-wider py-3 px-4 transition-all flex items-center justify-center space-x-2 cursor-pointer rounded-sm"
                >
                  <Play className="w-4 h-4 text-orange-500" />
                  <span>Launch Race</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Lobby Live Chat */}
        <div className="lg:col-span-1 flex flex-col h-[520px] relative z-10">
          <div className="bg-[#0c0c0c] border border-white/10 rounded-xl shadow-lg flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-[#111]/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4.5 h-4.5 text-orange-500" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Live Pit-Lane Chat</span>
              </div>
            </div>

            {/* Message lists */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-[#080808]">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-xs font-mono mt-12 py-4">
                  Send a message to coordinate tactics!
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className="text-xs bg-[#111] rounded p-2.5 border border-white/5">
                    <span className="font-bold text-orange-500">{msg.senderName}:</span>{' '}
                    <span className="text-gray-200">{msg.message}</span>
                  </div>
                ))
              )}
            </div>

            {/* Submit message form */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 bg-[#111]/40 flex items-center space-x-2">
              <input
                type="text"
                id="lobby_chat_input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Talk trash or strategy..."
                className="flex-1 bg-[#080808] border border-white/10 rounded-sm px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-gray-500"
              />
              <button
                type="submit"
                id="lobby_chat_submit"
                className="bg-[#111] hover:bg-white/5 text-white p-2.5 rounded transition-all border border-white/10 cursor-pointer"
              >
                <Send className="w-4 h-4 text-orange-500" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Browse Rooms State
  return (
    <div id="lobby_browser_view" className="max-w-4xl mx-auto space-y-5 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.02),transparent_70%)] pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0c0c0c] border border-white/10 p-6 rounded-xl shadow-xl space-y-4 sm:space-y-0 relative overflow-hidden z-10">
        {/* Underlay glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full filter blur-3xl" />
        
        <div>
          <div className="flex items-center space-x-2 text-orange-500 mb-1">
            <Globe className="w-5 h-5 animate-spin" style={{ animationDuration: '20s' }} />
            <span className="text-[10px] uppercase font-bold tracking-widest">Cross-Platform Lobby Engine</span>
          </div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Join the Racing Grid</h2>
          <p className="text-xs text-gray-400 mt-1 font-sans">Select a hosted room or bootstrap a custom lobby with dynamic rules.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="refresh_rooms_button"
            onClick={onFetchRooms}
            className="bg-[#111] hover:bg-white/5 border border-white/10 p-2.5 rounded transition-all cursor-pointer"
            title="Refresh lobbies"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>

          <button
            id="open_create_modal"
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black italic uppercase tracking-tighter text-xs py-2.5 px-4 transform -skew-x-12 transition-all shadow-lg shadow-orange-950/10 cursor-pointer hover:from-orange-500 hover:to-orange-400"
          >
            <span className="transform skew-x-12 flex items-center space-x-1.5">
              <Plus className="w-4 h-4" />
              <span>Create Race</span>
            </span>
          </button>
        </div>
      </div>

      {/* Grid of existing lobbies */}
      {rooms.length === 0 ? (
        <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-16 text-center space-y-4 shadow-xl relative z-10">
          <Users className="w-12 h-12 text-gray-600 mx-auto" />
          <div>
            <h3 className="text-gray-200 font-bold text-sm italic">No lobbies active</h3>
            <p className="text-xs text-gray-400 mt-1 font-sans">Be the first to launch a room and invite friends to drift!</p>
          </div>
          <button
            id="create_lobby_first_btn"
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black italic uppercase tracking-tighter text-xs py-2.5 px-6 transform -skew-x-12 transition-all cursor-pointer"
          >
            <span className="transform skew-x-12">Create Room</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {rooms.map((room) => (
            <div
              key={room.id}
              id={`room_card_${room.id}`}
              className="bg-[#0c0c0c] border border-white/10 rounded-xl p-5 hover:border-orange-500/30 transition-all flex flex-col justify-between space-y-4 shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-sm line-clamp-1 italic">{room.name}</h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${room.stage === 'lobby' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {room.stage === 'lobby' ? 'OPEN' : 'RACING'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-gray-400 font-mono mt-3.5 border-t border-white/5 pt-3">
                  <div>📍 Track: <span className="text-gray-200 font-bold">{room.mapName}</span></div>
                  <div>🌤️ Weather: <span className="text-gray-200 font-bold capitalize">{room.weather}</span></div>
                  <div>👥 Racers: <span className="text-gray-200 font-bold">{room.playerCount}</span></div>
                </div>
              </div>

              <button
                id={`join_room_btn_${room.id}`}
                onClick={() => onJoinRoom(room.id)}
                className="w-full bg-[#111] hover:bg-white/5 border border-white/10 hover:border-orange-500/30 text-gray-200 font-bold font-mono text-xs py-2.5 px-3 rounded-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-orange-500" />
                <span>Join Lobby</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Room Overlay Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#050505]/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c0c0c] border border-white/10 w-full max-w-md rounded-xl overflow-hidden shadow-2xl p-6 space-y-5 relative">
            <h3 className="text-white font-black italic uppercase tracking-tighter text-base">Setup New Racing Lobby</h3>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Lobby Name</label>
                <input
                  type="text"
                  id="create_room_name_input"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Midnight Drift Syndicate"
                  className="bg-[#111] border border-white/10 rounded-sm px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-gray-600"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Circuit Location</label>
                <select
                  id="create_room_map_select"
                  value={selectedMapId}
                  onChange={(e) => setSelectedMapId(e.target.value)}
                  className="bg-[#111] text-gray-200 text-xs border border-white/10 rounded-sm px-3 py-2.5 focus:outline-none focus:border-orange-500 font-mono"
                >
                  {MAPS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.difficulty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Starting Weather</label>
                <select
                  id="create_room_weather_select"
                  value={selectedWeather}
                  onChange={(e) => setSelectedWeather(e.target.value as WeatherType)}
                  className="bg-[#111] text-gray-200 text-xs border border-white/10 rounded-sm px-3 py-2.5 focus:outline-none focus:border-orange-500 font-mono"
                >
                  <option value="sunny">☀️ Sunny (Slick Tarmac)</option>
                  <option value="rainy">🌧️ Rainy (Wet sliding)</option>
                  <option value="snowy">❄️ Snowy (Icy chaos)</option>
                  <option value="night">🌙 Night (Limited headlights visibility)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                id="create_room_cancel"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 border border-white/10 hover:bg-white/5 text-gray-300 py-2.5 rounded-sm text-xs font-mono font-bold uppercase transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="create_room_confirm"
                onClick={() => {
                  onCreateRoom(newRoomName, selectedMapId, selectedWeather);
                  setShowCreateModal(false);
                }}
                className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 text-white py-2.5 transform -skew-x-12 font-black italic uppercase tracking-tighter text-xs transition-all cursor-pointer hover:from-orange-500 hover:to-orange-400"
              >
                <span className="transform skew-x-12 block">Launch Room</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
