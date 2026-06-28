import React, { useState } from 'react';
import { CarCustomization, CarStats } from '../types';
import { Wrench, Palette, Disc, Shield, Sparkles, ChevronRight } from 'lucide-react';

interface GarageProps {
  customization: CarCustomization;
  onUpdate: (updated: CarCustomization) => void;
  onConfirm: () => void;
}

const CAR_TEMPLATES = [
  {
    id: 'sports' as const,
    name: 'Interceptor (Sports)',
    desc: 'Sleek aerodynamics, ultra high acceleration and top speed.',
    baseStats: { engine: 5, tires: 3, weight: 2, boost: 4 }
  },
  {
    id: 'muscle' as const,
    name: 'V8 Charger (Muscle)',
    desc: 'Raw power and heavy drift action. Built for massive slides.',
    baseStats: { engine: 4, tires: 2, weight: 5, boost: 3 }
  },
  {
    id: 'drift' as const,
    name: 'Apex Slider (Drift Tuner)',
    desc: 'Perfect balance and razor-sharp steering feedback.',
    baseStats: { engine: 3, tires: 5, weight: 3, boost: 3 }
  },
  {
    id: 'truck' as const,
    name: 'Rumble Truck (Utility)',
    desc: 'Heavy mass. Smashes barrels and barricades without losing speed.',
    baseStats: { engine: 3, tires: 3, weight: 5, boost: 1 }
  }
];

const PRESET_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#ffffff', // Clean white
  '#1e293b'  // Dark slate
];

const UNDERGLOWS = [
  { id: 'none', name: 'No Glow', color: 'transparent' },
  { id: '#22c55e', name: 'Acid Green', color: '#22c55e' },
  { id: '#3b82f6', name: 'Neon Blue', color: '#3b82f6' },
  { id: '#ec4899', name: 'Cyber Pink', color: '#ec4899' },
  { id: '#eab308', name: 'Solar Yellow', color: '#eab308' },
  { id: '#a855f7', name: 'Toxic Violet', color: '#a855f7' }
];

const RIMS_LIST = [
  { id: 'standard' as const, name: 'Standard Steelies' },
  { id: 'racing' as const, name: '5-Spoke Alloys' },
  { id: 'retro' as const, name: 'Dish Chrome' },
  { id: 'neon' as const, name: 'Illuminated Neon' }
];

export default function Garage({ customization, onUpdate, onConfirm }: GarageProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'paint' | 'parts' | 'performance'>('body');

  const handleBodyChange = (type: 'sports' | 'muscle' | 'drift' | 'truck') => {
    const template = CAR_TEMPLATES.find(c => c.id === type);
    if (template) {
      onUpdate({
        ...customization,
        bodyType: type,
        stats: { ...template.baseStats }
      });
    }
  };

  const handleStatChange = (stat: keyof CarStats, change: number) => {
    // Limits: stat between 1 and 5
    const currentVal = customization.stats[stat];
    const newVal = Math.max(1, Math.min(5, currentVal + change));

    // Calculate total spend (max 15 total stat points)
    const otherStatsTotal = Object.entries(customization.stats)
      .filter(([key]) => key !== stat)
      .reduce((acc, [_, val]) => acc + val, 0);

    if (otherStatsTotal + newVal <= 15) {
      const updatedStats = {
        ...customization.stats,
        [stat]: newVal
      };
      onUpdate({ ...customization, stats: updatedStats });
    }
  };

  const currentTotalStats = Object.values(customization.stats).reduce((a, b) => a + b, 0);
  const remainingPoints = 15 - currentTotalStats;

  return (
    <div id="garage_panel" className="max-w-4xl mx-auto bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[550px] relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.03),transparent_60%)] pointer-events-none" />

      {/* Visual Car Preview Stage */}
      <div id="car_stage" className="flex-1 bg-gradient-to-b from-[#050505] to-[#111] p-8 flex flex-col justify-between relative border-r border-white/5 z-10">
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          <Sparkles className="text-orange-500 w-4 h-4 animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-orange-500 opacity-90">Customization Bay</span>
        </div>

        {/* The dynamic car render simulation */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Neon Underglow effect */}
          {customization.underglow !== 'none' && (
            <div 
              className="absolute w-56 h-36 rounded-full filter blur-xl opacity-85 animate-pulse transition-all duration-300"
              style={{ backgroundColor: customization.underglow }}
            />
          )}

          {/* Car body sketch */}
          <div className="relative w-64 h-32 flex items-center justify-center transition-transform hover:scale-105 duration-300">
            {customization.bodyType === 'sports' && (
              <svg viewBox="0 0 120 60" className="w-full h-full filter drop-shadow-lg">
                <path d="M10 40 L30 15 L80 15 L110 40 L105 48 L15 48 Z" fill={customization.color} stroke="#000" strokeWidth="2" />
                <path d="M35 18 L55 18 L52 28 L35 28 Z" fill="#111" opacity="0.8" />
                <path d="M60 18 L75 18 L75 28 L58 28 Z" fill="#111" opacity="0.8" />
                {/* Underglow bar inside SVG */}
                {customization.underglow !== 'none' && (
                  <rect x="25" y="47" width="70" height="2" fill={customization.underglow} className="animate-pulse" />
                )}
                {/* Wheels */}
                <circle cx="30" cy="46" r="9" fill="#111" stroke={customization.rims === 'neon' ? customization.color : '#666'} strokeWidth="2" />
                <circle cx="30" cy="46" r="4" fill="#666" />
                <circle cx="90" cy="46" r="9" fill="#111" stroke={customization.rims === 'neon' ? customization.color : '#666'} strokeWidth="2" />
                <circle cx="90" cy="46" r="4" fill="#666" />
              </svg>
            )}

            {customization.bodyType === 'muscle' && (
              <svg viewBox="0 0 120 60" className="w-full h-full filter drop-shadow-lg">
                <path d="M8 42 L12 22 L90 22 L112 38 L108 50 L12 50 Z" fill={customization.color} stroke="#000" strokeWidth="2.5" />
                <rect x="35" y="25" width="40" height="10" fill="#111" opacity="0.8" />
                {/* Wheels */}
                <circle cx="28" cy="48" r="10" fill="#111" stroke={customization.rims === 'neon' ? customization.color : '#888'} strokeWidth="2" />
                <circle cx="28" cy="48" r="5" fill="#555" />
                <circle cx="92" cy="48" r="10" fill="#111" stroke={customization.rims === 'neon' ? customization.color : '#888'} strokeWidth="2" />
                <circle cx="92" cy="48" r="5" fill="#555" />
              </svg>
            )}

            {customization.bodyType === 'drift' && (
              <svg viewBox="0 0 120 60" className="w-full h-full filter drop-shadow-lg">
                <path d="M12 42 L35 20 L75 20 L108 38 L102 48 L15 48 Z" fill={customization.color} stroke="#000" strokeWidth="2" />
                <path d="M40 22 L58 22 L55 30 L40 30 Z" fill="#111" />
                <path d="M62 22 L72 22 L72 30 L60 30 Z" fill="#111" />
                {/* Spoiler */}
                <path d="M12 35 L5 25 L12 25 Z" fill="#111" />
                {/* Wheels */}
                <circle cx="28" cy="46" r="9" fill="#111" stroke={customization.rims === 'neon' ? customization.color : '#444'} strokeWidth="2" />
                <circle cx="28" cy="46" r="4" fill="#999" />
                <circle cx="88" cy="46" r="9" fill="#111" stroke={customization.rims === 'neon' ? customization.color : '#444'} strokeWidth="2" />
                <circle cx="88" cy="46" r="4" fill="#999" />
              </svg>
            )}

            {customization.bodyType === 'truck' && (
              <svg viewBox="0 0 120 60" className="w-full h-full filter drop-shadow-lg">
                <path d="M8 44 L10 18 L55 18 L70 30 L112 30 L112 48 L10 48 Z" fill={customization.color} stroke="#000" strokeWidth="2.5" />
                <rect x="22" y="22" width="28" height="12" fill="#111" />
                {/* Wheels */}
                <circle cx="32" cy="46" r="12" fill="#111" stroke={customization.rims === 'neon' ? customization.color : '#555'} strokeWidth="3" />
                <circle cx="32" cy="46" r="6" fill="#333" />
                <circle cx="88" cy="46" r="12" fill="#111" stroke={customization.rims === 'neon' ? customization.color : '#555'} strokeWidth="3" />
                <circle cx="88" cy="46" r="6" fill="#333" />
              </svg>
            )}
          </div>
        </div>

        {/* Summary profile */}
        <div className="bg-[#111]/80 backdrop-blur-sm p-4 rounded-lg border border-white/10">
          <h3 className="text-white font-bold text-sm tracking-tight">
            {CAR_TEMPLATES.find(c => c.id === customization.bodyType)?.name}
          </h3>
          <p className="text-xs text-gray-400 mt-1 font-sans">
            {CAR_TEMPLATES.find(c => c.id === customization.bodyType)?.desc}
          </p>
        </div>
      </div>

      {/* Editor Tuning Panel */}
      <div id="tuning_controls" className="w-full md:w-96 bg-[#0c0c0c] flex flex-col justify-between border-l border-white/5 z-10">
        {/* Tab Headers */}
        <div className="grid grid-cols-4 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider font-mono">
          <button
            id="tab_body"
            onClick={() => setActiveTab('body')}
            className={`py-3.5 text-center border-b-2 transition-colors ${activeTab === 'body' ? 'border-orange-500 text-white bg-[#111]/40' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Body
          </button>
          <button
            id="tab_paint"
            onClick={() => setActiveTab('paint')}
            className={`py-3.5 text-center border-b-2 transition-colors ${activeTab === 'paint' ? 'border-orange-500 text-white bg-[#111]/40' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Paint
          </button>
          <button
            id="tab_parts"
            onClick={() => setActiveTab('parts')}
            className={`py-3.5 text-center border-b-2 transition-colors ${activeTab === 'parts' ? 'border-orange-500 text-white bg-[#111]/40' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Neon
          </button>
          <button
            id="tab_perf"
            onClick={() => setActiveTab('performance')}
            className={`py-3.5 text-center border-b-2 transition-colors ${activeTab === 'performance' ? 'border-orange-500 text-white bg-[#111]/40' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Tune
          </button>
        </div>

        {/* Tab Content area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'body' && (
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Select Chassis Type</span>
              {CAR_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  id={`body_option_${tpl.id}`}
                  onClick={() => handleBodyChange(tpl.id)}
                  className={`w-full text-left p-3.5 rounded-sm border text-sm transition-all flex items-center justify-between ${customization.bodyType === tpl.id ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-[#111] border-white/5 text-gray-300 hover:bg-white/5'}`}
                >
                  <div>
                    <span className="font-bold block italic">{tpl.name}</span>
                    <span className="text-xs text-gray-400 mt-1 line-clamp-1">{tpl.desc}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                </button>
              ))}
            </div>
          )}

          {activeTab === 'paint' && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block mb-3">Metallic Body Paint</span>
                <div className="grid grid-cols-5 gap-3">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      id={`paint_color_${col.replace('#', '')}`}
                      onClick={() => onUpdate({ ...customization, color: col })}
                      className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 relative ${customization.color === col ? 'border-orange-500 scale-105' : 'border-transparent'}`}
                      style={{ backgroundColor: col }}
                    >
                      {customization.color === col && (
                        <span className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white mix-blend-difference" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block mb-3">Custom Color Code</span>
                <div className="flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-orange-500" />
                  <input
                    type="color"
                    id="paint_hex_picker"
                    value={customization.color}
                    onChange={(e) => onUpdate({ ...customization, color: e.target.value })}
                    className="w-12 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    id="paint_hex_text"
                    value={customization.color.toUpperCase()}
                    onChange={(e) => onUpdate({ ...customization, color: e.target.value })}
                    className="flex-1 bg-[#111] text-white border border-white/5 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'parts' && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block mb-3">Neon Underglow Bundle</span>
                <div className="grid grid-cols-2 gap-2">
                  {UNDERGLOWS.map((glow) => (
                    <button
                      key={glow.id}
                      id={`neon_glow_${glow.id.replace('#', '')}`}
                      onClick={() => onUpdate({ ...customization, underglow: glow.id })}
                      className={`py-2 px-3 text-xs rounded-sm border text-left flex items-center space-x-2 transition-all ${customization.underglow === glow.id ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-[#111] border-white/5 text-gray-400 hover:bg-white/5'}`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full border border-white/10 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: glow.color }} />
                      </div>
                      <span>{glow.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block mb-3">Wheel Rims Selection</span>
                <div className="space-y-2">
                  {RIMS_LIST.map((rim) => (
                    <button
                      key={rim.id}
                      id={`rims_option_${rim.id}`}
                      onClick={() => onUpdate({ ...customization, rims: rim.id })}
                      className={`w-full py-2.5 px-3.5 text-xs rounded-sm border text-left flex items-center justify-between transition-all ${customization.rims === rim.id ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-[#111] border-white/5 text-gray-400 hover:bg-white/5'}`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Disc className="w-4 h-4 text-gray-500" />
                        <span>{rim.name}</span>
                      </div>
                      {customization.rims === rim.id && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center bg-[#111] p-3 rounded border border-white/5 mb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Upgrade Points</span>
                <span className="text-xs font-black font-mono text-orange-500">{remainingPoints} Points Left</span>
              </div>

              {/* Engine Tuning */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400">
                  <span>V8 Twin-Turbo Engine (Accel)</span>
                  <span className="text-white font-black">{customization.stats.engine} / 5</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    id="perf_engine_dec"
                    onClick={() => handleStatChange('engine', -1)}
                    className="w-8 h-8 rounded bg-[#111] hover:bg-white/5 border border-white/5 text-white font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <div className="flex-1 bg-[#111] h-3 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 mx-0.5 rounded-sm transition-all ${i < customization.stats.engine ? 'bg-white' : 'bg-gray-800'}`}
                      />
                    ))}
                  </div>
                  <button
                    id="perf_engine_inc"
                    onClick={() => handleStatChange('engine', 1)}
                    className="w-8 h-8 rounded bg-[#111] hover:bg-white/5 border border-white/5 text-white font-bold transition-colors cursor-pointer"
                    disabled={remainingPoints <= 0}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tires Tuning */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400">
                  <span>Slick Racing Compound (Grip)</span>
                  <span className="text-white font-black">{customization.stats.tires} / 5</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    id="perf_tires_dec"
                    onClick={() => handleStatChange('tires', -1)}
                    className="w-8 h-8 rounded bg-[#111] hover:bg-white/5 border border-white/5 text-white font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <div className="flex-1 bg-[#111] h-3 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 mx-0.5 rounded-sm transition-all ${i < customization.stats.tires ? 'bg-white' : 'bg-gray-800'}`}
                      />
                    ))}
                  </div>
                  <button
                    id="perf_tires_inc"
                    onClick={() => handleStatChange('tires', 1)}
                    className="w-8 h-8 rounded bg-[#111] hover:bg-white/5 border border-white/5 text-white font-bold transition-colors cursor-pointer"
                    disabled={remainingPoints <= 0}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Weight Tuning */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400">
                  <span>Carbon Chassis (Inertia)</span>
                  <span className="text-white font-black">{customization.stats.weight} / 5</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    id="perf_weight_dec"
                    onClick={() => handleStatChange('weight', -1)}
                    className="w-8 h-8 rounded bg-[#111] hover:bg-white/5 border border-white/5 text-white font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <div className="flex-1 bg-[#111] h-3 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 mx-0.5 rounded-sm transition-all ${i < customization.stats.weight ? 'bg-white' : 'bg-gray-800'}`}
                      />
                    ))}
                  </div>
                  <button
                    id="perf_weight_inc"
                    onClick={() => handleStatChange('weight', 1)}
                    className="w-8 h-8 rounded bg-[#111] hover:bg-white/5 border border-white/5 text-white font-bold transition-colors cursor-pointer"
                    disabled={remainingPoints <= 0}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Boost Tuning */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400">
                  <span>NOS Boost Thrusters (Nitro)</span>
                  <span className="text-orange-500 font-black">{customization.stats.boost} / 5</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    id="perf_boost_dec"
                    onClick={() => handleStatChange('boost', -1)}
                    className="w-8 h-8 rounded bg-[#111] hover:bg-white/5 border border-white/5 text-white font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <div className="flex-1 bg-[#111] h-3 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 mx-0.5 rounded-sm transition-all ${i < customization.stats.boost ? 'bg-orange-500' : 'bg-gray-800'}`}
                      />
                    ))}
                  </div>
                  <button
                    id="perf_boost_inc"
                    onClick={() => handleStatChange('boost', 1)}
                    className="w-8 h-8 rounded bg-[#111] hover:bg-white/5 border border-white/5 text-white font-bold transition-colors cursor-pointer"
                    disabled={remainingPoints <= 0}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Confirm */}
        <div className="p-6 border-t border-white/5 bg-[#111]/40">
          <button
            id="garage_confirm_button"
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 transform -skew-x-12 py-3 px-4 shadow-xl shadow-orange-950/20 text-white font-black italic uppercase tracking-tighter text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer hover:from-orange-500 hover:to-orange-400"
          >
            <span className="transform skew-x-12 flex items-center justify-center space-x-2">
              <Wrench className="w-4 h-4" />
              <span>Apply Upgrades</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
