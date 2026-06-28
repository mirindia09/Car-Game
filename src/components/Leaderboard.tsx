import React from 'react';
import { Player } from '../types';
import { Trophy, Clock, Zap, ArrowRight, RotateCcw } from 'lucide-react';

interface LeaderboardProps {
  players: Player[];
  onBackToLobby: () => void;
}

export default function Leaderboard({ players, onBackToLobby }: LeaderboardProps) {
  // Sort players by race results
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.state === 'finished' && b.state !== 'finished') return -1;
    if (a.state !== 'finished' && b.state === 'finished') return 1;
    if (a.state === 'finished' && b.state === 'finished') {
      return (a.finishedTime || 9999) - (b.finishedTime || 9999);
    }
    // If both DNF, sort by last checkpoint / lap
    if (a.currentLap !== b.currentLap) return b.currentLap - a.currentLap;
    return b.lastCheckpoint - a.lastCheckpoint;
  });

  return (
    <div id="leaderboard_overlay" className="max-w-xl mx-auto bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
      {/* Decorative top lighting overlay */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500" />
      
      <div className="p-8 text-center space-y-2">
        <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-1 animate-bounce">
          <Trophy className="w-7 h-7 text-orange-500" />
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Grand Prix Standings</h2>
        <p className="text-xs text-gray-400">The tires have cooled. The checkered flag has flown.</p>
      </div>

      <div className="px-6 pb-4 space-y-2.5">
        {sortedPlayers.map((player, idx) => {
          const isWinner = idx === 0;
          const isRunnerUp = idx === 1;
          const isThird = idx === 2;

          return (
            <div
              key={player.id}
              id={`leaderboard_row_${player.id}`}
              className={`flex items-center justify-between p-4 rounded border transition-all ${isWinner ? 'bg-orange-500/5 border-orange-500/20' : 'bg-[#111] border-white/5'}`}
            >
              <div className="flex items-center space-x-4">
                {/* Ranking placement number badge */}
                <div className={`w-7 h-7 rounded-sm flex items-center justify-center font-mono font-bold text-xs ${isWinner ? 'bg-orange-500 text-white' : isRunnerUp ? 'bg-gray-300 text-slate-950' : isThird ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  {idx + 1}
                </div>

                <div className="flex items-center space-x-3">
                  <div
                    className="w-3.5 h-7 rounded-sm shadow-inner"
                    style={{ backgroundColor: player.customization.color }}
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">{player.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono uppercase">
                      {player.customization.bodyType} chassis
                    </span>
                  </div>
                </div>
              </div>

              {/* Timing or DNF indicator */}
              <div className="text-right">
                {player.state === 'finished' && player.finishedTime ? (
                  <div className="flex items-center space-x-1 justify-end text-xs font-mono font-bold text-emerald-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{player.finishedTime.toFixed(3)}s</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono bg-red-500/10 text-red-400 px-2 py-0.5 rounded">
                    DNF (Did Not Finish)
                  </span>
                )}
                <span className="text-[9px] text-gray-500 font-mono block mt-0.5">
                  Checkpoints: {player.lastCheckpoint} • Lap {player.currentLap}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action button */}
      <div className="p-6 border-t border-white/5 bg-[#111]/20">
        <button
          id="back_to_lobby_button"
          onClick={onBackToLobby}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black italic uppercase tracking-tighter py-3.5 px-4 transform -skew-x-12 transition-all shadow-lg shadow-orange-950/10 flex items-center justify-center space-x-2 cursor-pointer hover:from-orange-500 hover:to-orange-400"
        >
          <span className="transform skew-x-12 flex items-center justify-center space-x-2">
            <RotateCcw className="w-4 h-4" />
            <span>Back to Pit-Lane</span>
          </span>
        </button>
      </div>
    </div>
  );
}
