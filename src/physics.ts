import { Player, DestructibleObject, CarCustomization, WeatherType } from './types';

// Physical Constants
export const CAR_RADIUS = 22;
export const WALL_BOUNCE = 0.35;
export const MAX_DRIFT_VALUE = 100;

interface Vector2D {
  x: number;
  y: number;
}

// Distance helper
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Line segment intersection with circle (for wall collisions)
export function getClosestPointOnSegment(
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Vector2D {
  const abX = x2 - x1;
  const abY = y2 - y1;
  const acX = cx - x1;
  const acY = cy - y1;

  // Project point c onto line segment ab
  const abLenSq = abX * abX + abY * abY;
  if (abLenSq === 0) return { x: x1, y: y1 };

  let t = (acX * abX + acY * abY) / abLenSq;
  t = Math.max(0, Math.min(1, t)); // Clamp to segment boundaries

  return {
    x: x1 + t * abX,
    y: y1 + t * abY,
  };
}

// Update single player's driving physics
export function updateCarPhysics(
  player: Player,
  keys: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    handbrake: boolean;
  },
  weather: WeatherType,
  deltaTime: number // in seconds
): Player {
  // 1. Get stats multipliers from customization
  const stats = player.customization.stats;
  
  // Base parameters
  const enginePower = 340 + (stats.engine * 50); // Speed / accel power
  const brakingPower = 400;
  const baseSteerPower = 3.6 + (stats.tires * 0.15); // Turning sharpness
  const weightInertia = 0.85 + (stats.weight * 0.05); // Weight distribution

  // Weather adjustments (Tire grip and drag)
  let weatherGripFactor = 1.0;
  let weatherDragMultiplier = 1.0;

  if (weather === 'rainy') {
    weatherGripFactor = 0.65; // Wet tarmac, slides more
    weatherDragMultiplier = 1.1; // Rain resistance
  } else if (weather === 'snowy') {
    weatherGripFactor = 0.35; // Snowy/icy tarmac, massive drifting, low friction
    weatherDragMultiplier = 1.2;
  } else if (weather === 'night') {
    weatherGripFactor = 0.95; // Slightly damp night air
  }

  // Speed-dependent steering (cannot turn if completely stationary)
  const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  const steeringSpeedFactor = Math.min(1.0, currentSpeed / 80);
  
  // Handle steering input
  let steerAngle = 0;
  if (keys.left) steerAngle = -baseSteerPower;
  if (keys.right) steerAngle = baseSteerPower;

  // Handbrake increases turning sharpness and reduces grip
  const isHandbraking = keys.handbrake;
  const steeringMultiplier = isHandbraking ? 1.5 : 1.0;

  player.angle += steerAngle * steeringSpeedFactor * steeringMultiplier * deltaTime;

  // Direction vectors
  const forwardX = Math.cos(player.angle);
  const forwardY = Math.sin(player.angle);
  const rightX = -Math.sin(player.angle);
  const rightY = Math.cos(player.angle);

  // Local speed components
  const forwardSpeed = player.vx * forwardX + player.vy * forwardY;
  const rightSpeed = player.vx * rightX + player.vy * rightY;

  // Forces
  let forceX = 0;
  let forceY = 0;

  if (keys.forward) {
    forceX += forwardX * enginePower;
    forceY += forwardY * enginePower;
  }
  if (keys.backward) {
    // If going forward, backward behaves as braking, otherwise reverse
    const revMultiplier = forwardSpeed > 10 ? brakingPower : enginePower * 0.55;
    forceX -= forwardX * revMultiplier;
    forceY -= forwardY * revMultiplier;
  }

  // Calculate local lateral grip coefficient
  // Handbrake forces a slide. Icy roads dramatically lower lateral grip.
  let grip = (isHandbraking ? 0.08 : 0.82) * weatherGripFactor;
  
  // Performance tire upgrades increase grip slightly
  grip += (stats.tires * 0.025);

  // Apply friction
  // Forward roll resistance (very low)
  const dragCoef = 0.25 * weatherDragMultiplier;
  const rollResistance = 12.0;
  
  // Slide resistance (sideways friction). This creates the steering vector alignment.
  const lateralFrictionCoef = grip * 45.0;

  // Combine forces
  // Accelerating forces
  player.vx += forceX * deltaTime;
  player.vy += forceY * deltaTime;

  // Drag and Roll resistance (opposite to movement)
  player.vx -= player.vx * dragCoef * deltaTime;
  player.vy -= player.vy * dragCoef * deltaTime;
  
  if (currentSpeed > 1) {
    player.vx -= (player.vx / currentSpeed) * rollResistance * deltaTime;
    player.vy -= (player.vy / currentSpeed) * rollResistance * deltaTime;
  }

  // Project sideways friction
  // This reduces rightSpeed (sideways movement) toward zero, depending on lateral grip
  const lateralFrictionForceX = rightX * (-rightSpeed * lateralFrictionCoef);
  const lateralFrictionForceY = rightY * (-rightSpeed * lateralFrictionCoef);

  player.vx += lateralFrictionForceX * deltaTime;
  player.vy += lateralFrictionForceY * deltaTime;

  // Move player
  player.x += player.vx * deltaTime;
  player.y += player.vy * deltaTime;

  // Calculate Drift Status
  // Drift occurs if sideways sliding speed is high enough, or space is held at speed
  const slideValue = Math.abs(rightSpeed);
  const isDriftActive = (slideValue > 55 || (isHandbraking && currentSpeed > 40));
  player.isDrifting = isDriftActive;

  if (isDriftActive) {
    player.driftValue = Math.min(MAX_DRIFT_VALUE, player.driftValue + deltaTime * 25 * weightInertia);
  } else {
    player.driftValue = Math.max(0, player.driftValue - deltaTime * 40);
  }

  return player;
}

// Collide with track walls and rebound
export function handleWallCollisions(
  player: Player,
  walls: { x1: number; y1: number; x2: number; y2: number }[]
): { collided: boolean; normalX: number; normalY: number } {
  let collided = false;
  let normalX = 0;
  let normalY = 0;

  for (const wall of walls) {
    const closest = getClosestPointOnSegment(player.x, player.y, wall.x1, wall.y1, wall.x2, wall.y2);
    const dist = getDistance(player.x, player.y, closest.x, closest.y);

    if (dist < CAR_RADIUS) {
      collided = true;
      // Normal vector from wall to player
      let nx = player.x - closest.x;
      let ny = player.y - closest.y;
      const len = Math.sqrt(nx * nx + ny * ny) || 1;
      nx /= len;
      ny /= len;

      normalX = nx;
      normalY = ny;

      // Push player outside of the wall
      player.x = closest.x + nx * CAR_RADIUS;
      player.y = closest.y + ny * CAR_RADIUS;

      // Reflect velocity along normal
      const dot = player.vx * nx + player.vy * ny;
      if (dot < 0) {
        player.vx = (player.vx - 2 * dot * nx) * WALL_BOUNCE;
        player.vy = (player.vy - 2 * dot * ny) * WALL_BOUNCE;
      }
    }
  }

  return { collided, normalX, normalY };
}

// Collide with other players (elastic circle collision)
export function handlePlayerCollisions(p1: Player, p2: Player): void {
  const dist = getDistance(p1.x, p1.y, p2.x, p2.y);
  const minDist = CAR_RADIUS * 2;

  if (dist < minDist) {
    // Normal vector
    let nx = (p2.x - p1.x) / (dist || 1);
    let ny = (p2.y - p1.y) / (dist || 1);

    // Push apart equally
    const overlap = minDist - dist;
    p1.x -= nx * overlap * 0.5;
    p1.y -= ny * overlap * 0.5;
    p2.x += nx * overlap * 0.5;
    p2.y += ny * overlap * 0.5;

    // Relative velocity
    const rvx = p2.vx - p1.vx;
    const rvy = p2.vy - p1.vy;

    // Dot product along normal
    const velAlongNormal = rvx * nx + rvy * ny;

    // Only resolve if velocities are moving toward each other
    if (velAlongNormal < 0) {
      const restitution = 0.5; // Bounciness
      const impulseScalar = -(1 + restitution) * velAlongNormal;

      // Mass is equal for both cars
      const impulseX = impulseScalar * nx * 0.5;
      const impulseY = impulseScalar * ny * 0.5;

      p1.vx -= impulseX;
      p1.vy -= impulseY;
      p2.vx += impulseX;
      p2.vy += impulseY;
    }
  }
}

// Collide with destructible environmental items
export function handleDestructibleCollisions(
  player: Player,
  obj: DestructibleObject,
  onImpact: (objId: string, damage: number) => void
): boolean {
  if (obj.isDestroyed) {
    // Already broken, but we can still push the debris with minor resistance
    const dist = getDistance(player.x, player.y, obj.x, obj.y);
    const minDist = CAR_RADIUS + obj.radius;
    if (dist < minDist) {
      let nx = (obj.x - player.x) / (dist || 1);
      let ny = (obj.y - player.y) / (dist || 1);
      
      // Push object away
      const overlap = minDist - dist;
      obj.x += nx * overlap;
      obj.y += ny * overlap;

      // Impart velocity
      obj.vx = player.vx * 0.7;
      obj.vy = player.vy * 0.7;
      obj.angle += 0.1;
      return true;
    }
    return false;
  }

  const dist = getDistance(player.x, player.y, obj.x, obj.y);
  const minDist = CAR_RADIUS + obj.radius;

  if (dist < minDist) {
    // Heavy collision impact!
    let nx = (obj.x - player.x) / (dist || 1);
    let ny = (obj.y - player.y) / (dist || 1);

    // Push object outside car radius
    const overlap = minDist - dist;
    obj.x += nx * overlap;
    obj.y += ny * overlap;

    // Calculate relative speed along normal
    const rvx = obj.vx - player.vx;
    const rvy = obj.vy - player.vy;
    const speedAlongNormal = -(rvx * nx + rvy * ny);

    if (speedAlongNormal > 0) {
      // Impact damage depends on hitting speed
      const impactDamage = Math.floor(speedAlongNormal * 0.12);
      
      // Impart kinetic energy to object
      const impulseScalar = speedAlongNormal * (1.2 / obj.mass);
      obj.vx += nx * impulseScalar * 0.8;
      obj.vy += ny * impulseScalar * 0.8;
      obj.vangle = (Math.random() - 0.5) * speedAlongNormal * 0.15;

      // Player loses some speed during crash
      player.vx -= nx * speedAlongNormal * 0.22;
      player.vy -= ny * speedAlongNormal * 0.22;

      if (impactDamage > 5) {
        onImpact(obj.id, impactDamage);
      }
    }
    return true;
  }
  return false;
}

// Update free-flying destructible object positions (frictional decay)
export function updateDestructibleDebris(obj: DestructibleObject, deltaTime: number): void {
  // Move debris
  obj.x += obj.vx * deltaTime;
  obj.y += obj.vy * deltaTime;
  obj.angle += obj.vangle * deltaTime;

  // Friction decays movement speed over time
  const decay = obj.isDestroyed ? 2.8 : 1.2;
  obj.vx -= obj.vx * decay * deltaTime;
  obj.vy -= obj.vy * decay * deltaTime;
  obj.vangle -= obj.vangle * decay * deltaTime;
}
