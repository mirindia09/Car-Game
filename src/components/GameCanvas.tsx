import React, { useRef, useEffect, useState } from 'react';
import { Player, GameRoom, DestructibleObject, WeatherType } from '../types';
import { MAPS } from '../maps';
import { updateCarPhysics, handleWallCollisions, handlePlayerCollisions, handleDestructibleCollisions, updateDestructibleDebris, CAR_RADIUS } from '../physics';
import { Zap, Volume2, Trophy, Clock, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface GameCanvasProps {
  room: GameRoom;
  myPlayerId: string;
  onUpdateState: (posData: { x: number; y: number; angle: number; vx: number; vy: number; isDrifting: boolean; driftValue: boolean | number; currentLap: number; lastCheckpoint: number; state?: string; finishedTime?: number }) => void;
  onImpactObject: (objectId: string, damage: number, vx: number, vy: number, x: number, y: number) => void;
  onRaceFinished: (finalTime: number) => void;
}

// Spark Particle Class
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

// Tire Track Class
interface TireTrack {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
}

// Weather Particle
interface WeatherParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  opacity: number;
}

export default function GameCanvas({
  room,
  myPlayerId,
  onUpdateState,
  onImpactObject,
  onRaceFinished
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard input state
  const keysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false
  });

  // Client-side game loop states
  const mapData = MAPS.find(m => m.id === room.mapId)!;
  const localPlayerRef = useRef<Player>({ ...room.players[myPlayerId] });
  const remotePlayersRef = useRef<{ [id: string]: Player }>({ ...room.players });

  // Persistent visual elements (skids, sparks, rain)
  const skidMarksRef = useRef<TireTrack[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const weatherParticlesRef = useRef<WeatherParticle[]>([]);
  const lastSkidPosRef = useRef<{ [wheel: string]: { x: number; y: number } | null }>({
    rearLeft: null,
    rearRight: null
  });

  // Racing timing stats
  const [raceTime, setRaceTime] = useState(0);
  const [currentSpeedMPH, setCurrentSpeedMPH] = useState(0);
  const [totalDriftPoints, setTotalDriftPoints] = useState(0);
  const [activeDriftCombo, setActiveDriftCombo] = useState(0);
  const [currentRank, setCurrentRank] = useState('1st');

  // Mobile / Touch controls toggle
  const [useTouchControls, setUseTouchControls] = useState(false);

  // Sync internal refs whenever room prop updates (e.g. other player coordinates synced from server)
  useEffect(() => {
    Object.keys(room.players).forEach(pId => {
      if (pId !== myPlayerId) {
        remotePlayersRef.current[pId] = room.players[pId];
      } else {
        // If server finished state sync or lap sync matches
        const sPlayer = room.players[myPlayerId];
        if (sPlayer.state === 'finished' && localPlayerRef.current.state !== 'finished') {
          localPlayerRef.current.state = 'finished';
          localPlayerRef.current.finishedTime = sPlayer.finishedTime;
        }
      }
    });

    // Remove left players
    Object.keys(remotePlayersRef.current).forEach(pId => {
      if (!room.players[pId]) {
        delete remotePlayersRef.current[pId];
      }
    });
  }, [room.players, myPlayerId]);

  // Handle resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = containerRef.current;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set up keyboards listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') keysRef.current.forward = true;
      if (k === 'arrowdown' || k === 's') keysRef.current.backward = true;
      if (k === 'arrowleft' || k === 'a') keysRef.current.left = true;
      if (k === 'arrowright' || k === 'd') keysRef.current.right = true;
      if (e.key === ' ' || k === 'shift') keysRef.current.handbrake = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') keysRef.current.forward = false;
      if (k === 'arrowdown' || k === 's') keysRef.current.backward = false;
      if (k === 'arrowleft' || k === 'a') keysRef.current.left = false;
      if (k === 'arrowright' || k === 'd') keysRef.current.right = false;
      if (e.key === ' ' || k === 'shift') keysRef.current.handbrake = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize weather particles (rain, snow)
  useEffect(() => {
    const particles: WeatherParticle[] = [];
    const count = room.weather === 'rainy' ? 120 : room.weather === 'snowy' ? 80 : 0;
    
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * 1200,
        y: Math.random() * 800,
        vy: room.weather === 'rainy' ? 12 + Math.random() * 6 : 2 + Math.random() * 3,
        vx: room.weather === 'rainy' ? -3 : Math.random() * 2 - 1,
        size: room.weather === 'rainy' ? 1.5 : 2.5,
        opacity: Math.random() * 0.6 + 0.3
      });
    }
    weatherParticlesRef.current = particles;
  }, [room.weather]);

  // Main Canvas loop (60 FPS)
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();
    let startTime = performance.now();
    let driftPointsAcc = 0;

    // Reset stopwatch on race start
    setRaceTime(0);

    const loop = (time: number) => {
      let dt = (time - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; // Cap time step for stability
      lastTime = time;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      const pLocal = localPlayerRef.current;

      // 1. Physics update for local player (only if active)
      if (room.stage === 'racing' && pLocal.state === 'racing') {
        const prevLap = pLocal.currentLap;
        
        updateCarPhysics(pLocal, keysRef.current, room.weather, dt);
        handleWallCollisions(pLocal, mapData.walls);

        // Checkpoint crossings and lap increments
        const currentCP = mapData.checkpoints[pLocal.lastCheckpoint];
        const distToCP = Math.sqrt((pLocal.x - currentCP.x) ** 2 + (pLocal.y - currentCP.y) ** 2);
        
        if (distToCP < currentCP.radius) {
          // Crossed! Progress to next index
          pLocal.lastCheckpoint = (pLocal.lastCheckpoint + 1) % mapData.checkpoints.length;
          
          if (pLocal.lastCheckpoint === 0) {
            // Completed a lap!
            pLocal.currentLap++;
            if (pLocal.currentLap > mapData.laps) {
              pLocal.state = 'finished';
              const finalTime = (performance.now() - startTime) / 1000;
              pLocal.finishedTime = finalTime;
              onRaceFinished(finalTime);
            }
          }
        }

        // Drifts calculation & combos
        if (pLocal.isDrifting) {
          driftPointsAcc += dt * 300 * pLocal.customization.stats.weight;
          setActiveDriftCombo(Math.floor(driftPointsAcc));
        } else {
          if (driftPointsAcc > 10) {
            setTotalDriftPoints(prev => prev + Math.floor(driftPointsAcc));
          }
          driftPointsAcc = 0;
          setActiveDriftCombo(0);
        }

        // Sync local coords back to app layer (to propagate to server)
        onUpdateState({
          x: pLocal.x,
          y: pLocal.y,
          angle: pLocal.angle,
          vx: pLocal.vx,
          vy: pLocal.vy,
          isDrifting: pLocal.isDrifting,
          driftValue: pLocal.driftValue,
          currentLap: pLocal.currentLap,
          lastCheckpoint: pLocal.lastCheckpoint,
          state: pLocal.state,
          finishedTime: pLocal.finishedTime
        });

        // 2. Local-to-destructibles collisions
        room.destructibles.forEach(obj => {
          handleDestructibleCollisions(pLocal, obj, (objId, damage) => {
            onImpactObject(objId, damage, obj.vx, obj.vy, obj.x, obj.y);
            // Spawn sparks at crash
            for (let i = 0; i < 15; i++) {
              sparksRef.current.push({
                x: obj.x,
                y: obj.y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                color: '#f59e0b',
                life: 0,
                maxLife: 20 + Math.random() * 30,
                size: 2 + Math.random() * 2
              });
            }
          });
        });

        // 3. Local-to-remotes collisions
        (Object.values(remotePlayersRef.current) as Player[]).forEach(pRem => {
          if (pRem.state === 'racing') {
            handlePlayerCollisions(pLocal, pRem);
          }
        });

        // Update race stopwatch
        setRaceTime((performance.now() - startTime) / 1000);
      }

      // Update flying destructibles physics
      room.destructibles.forEach(obj => {
        updateDestructibleDebris(obj, dt);
      });

      // Update sparks
      const activeSparks: Spark[] = [];
      sparksRef.current.forEach(s => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life++;
        if (s.life < s.maxLife) {
          activeSparks.push(s);
        }
      });
      sparksRef.current = activeSparks;

      // Update weather particles
      weatherParticlesRef.current.forEach(wp => {
        wp.y += wp.vy;
        wp.x += wp.vx;
        if (wp.y > canvas.height) {
          wp.y = -10;
          wp.x = Math.random() * canvas.width;
        }
        if (wp.x < 0) wp.x = canvas.width;
        if (wp.x > canvas.width) wp.x = 0;
      });

      // Compute camera tracking (centering player with clamping to map limits)
      const camX = Math.max(0, Math.min(mapData.width - canvas.width, pLocal.x - canvas.width / 2));
      const camY = Math.max(0, Math.min(mapData.height - canvas.height, pLocal.y - canvas.height / 2));

      // Calculate Speed in MPH
      const spd = Math.sqrt(pLocal.vx * pLocal.vx + pLocal.vy * pLocal.vy);
      setCurrentSpeedMPH(Math.floor(spd * 0.22));

      // 4. DRAWING TIMELINE
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-camX, -camY);

      // Draw map grass/background base
      ctx.fillStyle = room.weather === 'snowy' ? '#e2e8f0' : '#0f172a';
      ctx.fillRect(0, 0, mapData.width, mapData.height);

      // Draw asphalt track roadway loop (custom procedural style)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 140;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      // Draw road guide matching checkpoints loop
      ctx.moveTo(mapData.startPos.x, mapData.startPos.y);
      mapData.checkpoints.forEach(cp => {
        ctx.lineTo(cp.x, cp.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Inner road lane lines (yellow dashed)
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.setLineDash([15, 20]);
      ctx.beginPath();
      ctx.moveTo(mapData.startPos.x, mapData.startPos.y);
      mapData.checkpoints.forEach(cp => {
        ctx.lineTo(cp.x, cp.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Draw finish line checkerboard
      ctx.save();
      ctx.translate(mapData.startPos.x, mapData.startPos.y);
      ctx.rotate(mapData.startPos.angle);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-15, -60, 30, 120);
      ctx.fillStyle = '#000000';
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 2; c++) {
          if ((r + c) % 2 === 0) {
            ctx.fillRect(-15 + c * 15, -60 + r * 20, 15, 20);
          }
        }
      }
      ctx.restore();

      // Draw persistent skids tracks
      skidMarksRef.current.forEach(track => {
        ctx.strokeStyle = `rgba(0, 0, 0, ${track.opacity})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(track.x1, track.y1);
        ctx.lineTo(track.x2, track.y2);
        ctx.stroke();
      });

      // Limit skidmarks count for memory performance
      if (skidMarksRef.current.length > 800) {
        skidMarksRef.current.shift();
      }

      // Record new skid coordinates behind tires if drifting
      if (pLocal.isDrifting) {
        // Calculate rear wheels position (offset backwards)
        const rearDist = 18;
        const widthDist = 9;
        const rx = pLocal.x - Math.cos(pLocal.angle) * rearDist;
        const ry = pLocal.y - Math.sin(pLocal.angle) * rearDist;
        
        const rlx = rx - Math.sin(pLocal.angle) * widthDist;
        const rly = ry + Math.cos(pLocal.angle) * widthDist;
        const rrx = rx + Math.sin(pLocal.angle) * widthDist;
        const rry = ry - Math.cos(pLocal.angle) * widthDist;

        if (lastSkidPosRef.current.rearLeft) {
          skidMarksRef.current.push({
            x1: lastSkidPosRef.current.rearLeft.x,
            y1: lastSkidPosRef.current.rearLeft.y,
            x2: rlx,
            y2: rly,
            opacity: 0.45
          });
        }
        if (lastSkidPosRef.current.rearRight) {
          skidMarksRef.current.push({
            x1: lastSkidPosRef.current.rearRight.x,
            y1: lastSkidPosRef.current.rearRight.y,
            x2: rrx,
            y2: rry,
            opacity: 0.45
          });
        }

        lastSkidPosRef.current.rearLeft = { x: rlx, y: rly };
        lastSkidPosRef.current.rearRight = { x: rrx, y: rry };
      } else {
        lastSkidPosRef.current.rearLeft = null;
        lastSkidPosRef.current.rearRight = null;
      }

      // Draw map boundaries / walls (solid borders)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 6;
      mapData.walls.forEach(w => {
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();
      });

      // Draw destructibles (barrels, cones, boxes, wooden fence panels)
      room.destructibles.forEach(obj => {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.angle);

        if (obj.isDestroyed) {
          // Shattered graphics (broken into 3 floating pieces)
          ctx.fillStyle = obj.type === 'cone' ? '#ef4444' : obj.type === 'barrel' ? '#64748b' : '#b45309';
          ctx.beginPath();
          ctx.arc(-5, -3, obj.radius * 0.4, 0, Math.PI * 2);
          ctx.arc(6, 4, obj.radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Intact full models
          if (obj.type === 'cone') {
            ctx.fillStyle = '#f97316'; // orange
            ctx.beginPath();
            ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff'; // stripe
            ctx.beginPath();
            ctx.arc(0, 0, obj.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (obj.type === 'barrel') {
            ctx.fillStyle = '#3b4f6b'; // oil drum blue
            ctx.beginPath();
            ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (obj.type === 'box') {
            ctx.fillStyle = '#b45309'; // wooden brown
            ctx.fillRect(-obj.radius, -obj.radius, obj.radius * 2, obj.radius * 2);
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-obj.radius, -obj.radius, obj.radius * 2, obj.radius * 2);
          } else if (obj.type === 'barrier') {
            ctx.fillStyle = '#ef4444'; // safety concrete divider
            ctx.fillRect(-obj.radius * 1.5, -obj.radius * 0.5, obj.radius * 3, obj.radius);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-obj.radius * 0.5, -obj.radius * 0.5, obj.radius, obj.radius);
          }
        }
        ctx.restore();
      });

      // Draw remote players
      (Object.values(remotePlayersRef.current) as Player[]).forEach(pRem => {
        if (pRem.state === 'racing') {
          drawCar(ctx, pRem);
        }
      });

      // Draw local player
      if (pLocal.state === 'racing' || pLocal.state === 'finished') {
        drawCar(ctx, pLocal);
      }

      // Draw Sparks particles
      sparksRef.current.forEach(s => {
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      });

      // 5. Environmental Lights Overlay (if NIGHTTIME weather)
      if (room.weather === 'night') {
        ctx.restore(); // Stop map-space translation temporarily to make full canvas shadows
        ctx.save();
        
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const mctx = maskCanvas.getContext('2d')!;
        
        // Fill pure midnight darkness
        mctx.fillStyle = 'rgba(8, 12, 24, 0.91)';
        mctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtract headlights cone of our active local car
        const localScreenX = pLocal.x - camX;
        const localScreenY = pLocal.y - camY;

        mctx.save();
        mctx.translate(localScreenX, localScreenY);
        mctx.rotate(pLocal.angle);

        // Headlight triangular sweep
        const grad = mctx.createRadialGradient(0, 0, 10, 220, 0, 240);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.3, 'rgba(254, 240, 138, 0.7)');
        grad.addColorStop(1, 'rgba(254, 240, 138, 0)');

        mctx.fillStyle = grad;
        mctx.beginPath();
        mctx.moveTo(12, -4);
        mctx.lineTo(260, -95);
        mctx.lineTo(260, 95);
        mctx.closePath();
        mctx.fill();

        // Underglow glow subtraction
        if (pLocal.customization.underglow !== 'none') {
          const glowGrad = mctx.createRadialGradient(0, 0, 5, 0, 0, 45);
          glowGrad.addColorStop(0, pLocal.customization.underglow);
          glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
          mctx.globalCompositeOperation = 'destination-out';
          mctx.fillStyle = glowGrad;
          mctx.beginPath();
          mctx.arc(0, 0, 45, 0, Math.PI * 2);
          mctx.fill();
        }

        mctx.restore();

        // Draw street lights glow subtraction (procedural along the track)
        mapData.checkpoints.forEach(cp => {
          const cpScrX = cp.x - camX;
          const cpScrY = cp.y - camY;
          if (cpScrX > -100 && cpScrX < canvas.width + 100 && cpScrY > -100 && cpScrY < canvas.height + 100) {
            const glow = mctx.createRadialGradient(cpScrX, cpScrY, 5, cpScrX, cpScrY, 140);
            glow.addColorStop(0, 'rgba(165, 180, 252, 0.75)');
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            mctx.globalCompositeOperation = 'destination-out';
            mctx.fillStyle = glow;
            mctx.beginPath();
            mctx.arc(cpScrX, cpScrY, 140, 0, Math.PI * 2);
            mctx.fill();
          }
        });

        // Draw light mask
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(-camX, -camY); // resume
      }

      ctx.restore();

      // 6. DRAW WEATHER PARTICLES (falling over the top screen overlay)
      ctx.save();
      weatherParticlesRef.current.forEach(wp => {
        ctx.fillStyle = room.weather === 'rainy' ? 'rgba(34, 211, 238, 0.65)' : 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // 7. RANKINGS RESOLUTION
      const allActivePlayers = [pLocal, ...Object.values(remotePlayersRef.current)];
      allActivePlayers.sort((a, b) => {
        // High lap wins, else high checkpoint, else closest to next CP
        if (a.currentLap !== b.currentLap) return b.currentLap - a.currentLap;
        if (a.lastCheckpoint !== b.lastCheckpoint) return b.lastCheckpoint - a.lastCheckpoint;
        
        // Closest to next CP
        const nextCP = mapData.checkpoints[a.lastCheckpoint];
        const distA = Math.sqrt((a.x - nextCP.x) ** 2 + (a.y - nextCP.y) ** 2);
        const distB = Math.sqrt((b.x - nextCP.x) ** 2 + (b.y - nextCP.y) ** 2);
        return distA - distB;
      });

      const myIdx = allActivePlayers.findIndex(p => p.id === myPlayerId);
      const ranks = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
      setCurrentRank(ranks[myIdx] || '1st');

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [room.stage, room.weather, mapData, room.destructibles]);

  // SVG-based stylized drawing of cars inside the Canvas
  const drawCar = (ctx: CanvasRenderingContext2D, car: Player) => {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Dynamic Tail smoke drift effect
    if (car.isDrifting && Math.random() > 0.45) {
      // Spawn skid sparks/smoke
      sparksRef.current.push({
        x: car.x - Math.cos(car.angle) * 18,
        y: car.y - Math.sin(car.angle) * 18,
        vx: -Math.cos(car.angle) * 50 + (Math.random() - 0.5) * 30,
        vy: -Math.sin(car.angle) * 50 + (Math.random() - 0.5) * 30,
        color: 'rgba(241, 245, 249, 0.45)', // white-grey smoke
        life: 0,
        maxLife: 25 + Math.random() * 20,
        size: 5 + Math.random() * 6
      });
    }

    // Car shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-22, -13, 44, 26);

    // Underglow neon visual block
    if (car.customization.underglow !== 'none') {
      ctx.shadowColor = car.customization.underglow;
      ctx.shadowBlur = 15;
      ctx.fillStyle = car.customization.underglow;
      ctx.fillRect(-14, -10, 28, 20);
      ctx.shadowBlur = 0; // reset
    }

    // Body metal block
    ctx.fillStyle = car.customization.color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;

    // Draw slightly different body shapes depending on customization
    if (car.customization.bodyType === 'sports') {
      // Sleek shape
      ctx.beginPath();
      ctx.moveTo(-22, -11);
      ctx.lineTo(10, -11);
      ctx.lineTo(24, -4);
      ctx.lineTo(24, 4);
      ctx.lineTo(10, 11);
      ctx.lineTo(-22, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Windshield
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, -8, 11, 16);
    } else if (car.customization.bodyType === 'muscle') {
      // Chunky blocky
      ctx.fillRect(-22, -12, 44, 24);
      ctx.strokeRect(-22, -12, 44, 24);

      // Windshield
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3, -9, 11, 18);
    } else if (car.customization.bodyType === 'drift') {
      // Triangular streamlined with spoiler
      ctx.beginPath();
      ctx.moveTo(-22, -10);
      ctx.lineTo(6, -11);
      ctx.lineTo(23, -6);
      ctx.lineTo(23, 6);
      ctx.lineTo(6, 11);
      ctx.lineTo(-22, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Spoiler wing bar
      ctx.fillStyle = '#111827';
      ctx.fillRect(-24, -13, 3, 26);
    } else if (car.customization.bodyType === 'truck') {
      // Truck bed + cabin
      ctx.fillRect(-22, -13, 44, 26);
      ctx.strokeRect(-22, -13, 44, 26);
      
      // Cabin windshield
      ctx.fillStyle = '#334155';
      ctx.fillRect(-2, -11, 14, 22);
    }

    // Headlights glows
    ctx.fillStyle = '#fef08a'; // yellow light points
    ctx.fillRect(21, -8, 3, 4);
    ctx.fillRect(21, 4, 3, 4);

    // Wheels
    ctx.fillStyle = '#111827';
    ctx.fillRect(-15, -13, 8, 4);
    ctx.fillRect(-15, 9, 8, 4);
    ctx.fillRect(10, -13, 8, 4);
    ctx.fillRect(10, 9, 8, 4);

    ctx.restore();
  };

  return (
    <div id="canvas_container_stage" className="relative w-full h-[600px] bg-[#050505] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-end">
      
      {/* Absolute Game Canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full">
        <canvas ref={canvasRef} id="race_game_canvas" className="w-full h-full block" />
      </div>

      {/* COUNTDOWN OVERLAY */}
      {room.stage === 'countdown' && (
        <div id="race_countdown_alert" className="absolute inset-0 bg-[#050505]/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-2.5 z-20">
          <div className="animate-ping duration-1000 text-6xl font-black italic uppercase tracking-tighter text-orange-500 font-mono">
            {room.countdown}
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Rev your engines...</span>
        </div>
      )}

      {/* ON-SCREEN MOBILE / CROSS-PLATFORM CONTROLS OVERLAY */}
      <div className="absolute top-4 left-4 z-10">
        <button
          id="touch_controls_toggle"
          onClick={() => setUseTouchControls(p => !p)}
          className="bg-[#0c0c0c]/90 hover:bg-[#111] text-xs font-mono font-bold text-gray-300 border border-white/10 px-4 py-2 rounded-sm transition-all shadow cursor-pointer"
        >
          {useTouchControls ? 'Hide Touch Controls' : 'Show Touch Controls'}
        </button>
      </div>

      {useTouchControls && (
        <div id="touch_gamepads" className="absolute inset-x-0 bottom-6 px-8 flex justify-between items-end z-10 pointer-events-none select-none">
          {/* Steering wheel side */}
          <div className="flex space-x-3.5 pointer-events-auto">
            <button
              id="btn_touch_left"
              onMouseDown={() => { keysRef.current.left = true; }}
              onMouseUp={() => { keysRef.current.left = false; }}
              onTouchStart={() => { keysRef.current.left = true; }}
              onTouchEnd={() => { keysRef.current.left = false; }}
              className="w-14 h-14 bg-[#0c0c0c]/90 border border-white/10 rounded-full flex items-center justify-center text-white active:bg-orange-500 active:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              id="btn_touch_right"
              onMouseDown={() => { keysRef.current.right = true; }}
              onMouseUp={() => { keysRef.current.right = false; }}
              onTouchStart={() => { keysRef.current.right = true; }}
              onTouchEnd={() => { keysRef.current.right = false; }}
              className="w-14 h-14 bg-[#0c0c0c]/90 border border-white/10 rounded-full flex items-center justify-center text-white active:bg-orange-500 active:text-white transition-colors cursor-pointer"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

          {/* Action handbrake */}
          <div className="pointer-events-auto">
            <button
              id="btn_touch_handbrake"
              onMouseDown={() => { keysRef.current.handbrake = true; }}
              onMouseUp={() => { keysRef.current.handbrake = false; }}
              onTouchStart={() => { keysRef.current.handbrake = true; }}
              onTouchEnd={() => { keysRef.current.handbrake = false; }}
              className="w-24 py-3 bg-orange-600/95 border border-orange-500 text-xs font-mono font-bold rounded-sm text-white active:bg-orange-500 cursor-pointer"
            >
              DRIFT
            </button>
          </div>

          {/* Pedals side */}
          <div className="flex space-x-3.5 pointer-events-auto">
            <button
              id="btn_touch_brake"
              onMouseDown={() => { keysRef.current.backward = true; }}
              onMouseUp={() => { keysRef.current.backward = false; }}
              onTouchStart={() => { keysRef.current.backward = true; }}
              onTouchEnd={() => { keysRef.current.backward = false; }}
              className="w-14 h-14 bg-[#0c0c0c]/90 border border-white/10 rounded-full flex items-center justify-center text-white active:bg-red-500 transition-colors cursor-pointer"
            >
              <ArrowDown className="w-6 h-6" />
            </button>
            <button
              id="btn_touch_gas"
              onMouseDown={() => { keysRef.current.forward = true; }}
              onMouseUp={() => { keysRef.current.forward = false; }}
              onTouchStart={() => { keysRef.current.forward = true; }}
              onTouchEnd={() => { keysRef.current.forward = false; }}
              className="w-16 h-16 bg-[#0c0c0c]/90 border border-white/10 rounded-full flex items-center justify-center text-white active:bg-orange-500 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD HUD WRAPPER */}
      <div id="dashboard_hud" className="absolute inset-x-0 top-0 p-5 pointer-events-none select-none flex justify-between items-start z-10">
        
        {/* Left Side: Lap, stopwatch, rank */}
        <div className="flex flex-col space-y-1.5 bg-[#0c0c0c]/90 backdrop-blur-md border border-white/10 p-4 rounded-xl">
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-orange-500" />
            <span className="text-white font-black text-lg tracking-tight font-mono">{currentRank} Place</span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-gray-400 font-mono">
            <span>Lap:</span>
            <span className="text-white font-bold">{Math.min(mapData.laps, localPlayerRef.current.currentLap)} / {mapData.laps}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-gray-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-white font-bold">{raceTime.toFixed(2)}s</span>
          </div>
        </div>

        {/* Center: Drift multiplier announcement popup */}
        {activeDriftCombo > 10 && (
          <div className="animate-bounce bg-[#0c0c0c]/90 border border-orange-500/30 px-5 py-2.5 rounded-sm flex items-center space-x-2">
            <Zap className="w-4 h-4 text-orange-500 animate-pulse" />
            <span className="text-xs font-mono uppercase font-bold text-white tracking-widest">
              DRIFT SLIDE +{activeDriftCombo} PTS
            </span>
          </div>
        )}

        {/* Right Side: Speedometer dials and total drift points */}
        <div className="flex flex-col items-end space-y-1.5 bg-[#0c0c0c]/90 backdrop-blur-md border border-white/10 p-4 rounded-xl min-w-40">
          <div className="text-right">
            <span id="speed_meter" className="text-3xl font-black font-mono text-orange-500 block leading-none">{currentSpeedMPH}</span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500 block mt-0.5 font-bold">MPH</span>
          </div>

          <div className="w-full h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-75"
              style={{ width: `${Math.min(100, (currentSpeedMPH / 180) * 100)}%` }}
            />
          </div>

          <div className="text-right mt-1">
            <span className="text-[9px] uppercase font-mono text-gray-500 tracking-wider block font-bold">Drift Score:</span>
            <span id="drift_score_hud" className="text-xs font-mono text-white font-bold block mt-0.5">{totalDriftPoints} PTS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
