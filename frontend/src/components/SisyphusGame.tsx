"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const GAME_W = 640;
const GAME_H = 240;
const SLOPE_ANGLE = 0.16;
const GRAVITY = 0.55;
const JUMP_FORCE = -10.5;
const PLAYER_X = 80;
const BOULDER_R = 14;
const SPEED_INIT = 3.2;
const SPAWN_INIT = 100;
const INTRO_SPEED = 0.8;

const GROUND_OFFSET = 4;

function groundY(x: number): number {
  return GAME_H - 30 - x * SLOPE_ANGLE - GROUND_OFFSET;
}

type ObsType = "amphora" | "trident" | "fire" | "prompt" | "rockpile" | "eagle" | "crab";

interface Obstacle {
  x: number;
  type: ObsType;
  w: number;
  h: number;
  seed: number;
  flyY?: number;
}

function drawAmphora(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number, fg: string) {
  const cx = x + w / 2;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // rim
  ctx.moveTo(cx - w * 0.25, gy - h);
  ctx.lineTo(cx + w * 0.25, gy - h);
  // neck narrows
  ctx.moveTo(cx - w * 0.25, gy - h);
  ctx.lineTo(cx - w * 0.15, gy - h * 0.82);
  // body widens
  ctx.lineTo(cx - w * 0.45, gy - h * 0.55);
  // belly
  ctx.quadraticCurveTo(cx - w * 0.5, gy - h * 0.3, cx - w * 0.3, gy - h * 0.08);
  // base
  ctx.lineTo(cx - w * 0.15, gy);
  ctx.lineTo(cx + w * 0.15, gy);
  // right side
  ctx.lineTo(cx + w * 0.3, gy - h * 0.08);
  ctx.quadraticCurveTo(cx + w * 0.5, gy - h * 0.3, cx + w * 0.45, gy - h * 0.55);
  ctx.lineTo(cx + w * 0.15, gy - h * 0.82);
  ctx.lineTo(cx + w * 0.25, gy - h);
  ctx.stroke();
  // handles
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.25, gy - h * 0.88);
  ctx.quadraticCurveTo(cx - w * 0.55, gy - h * 0.78, cx - w * 0.42, gy - h * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.25, gy - h * 0.88);
  ctx.quadraticCurveTo(cx + w * 0.55, gy - h * 0.78, cx + w * 0.42, gy - h * 0.6);
  ctx.stroke();
}

function drawTrident(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number, fg: string) {
  const cx = x + w / 2;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  // shaft
  ctx.beginPath();
  ctx.moveTo(cx, gy);
  ctx.lineTo(cx, gy - h);
  ctx.stroke();
  // center prong
  ctx.beginPath();
  ctx.moveTo(cx, gy - h);
  ctx.lineTo(cx, gy - h - h * 0.2);
  ctx.stroke();
  // left prong
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.4, gy - h - h * 0.12);
  ctx.lineTo(cx - w * 0.35, gy - h * 0.75);
  ctx.quadraticCurveTo(cx, gy - h * 0.7, cx, gy - h * 0.82);
  ctx.stroke();
  // right prong
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.4, gy - h - h * 0.12);
  ctx.lineTo(cx + w * 0.35, gy - h * 0.75);
  ctx.quadraticCurveTo(cx, gy - h * 0.7, cx, gy - h * 0.82);
  ctx.stroke();
  // crossbar
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.3, gy - h * 0.78);
  ctx.lineTo(cx + w * 0.3, gy - h * 0.78);
  ctx.stroke();
}

function drawFire(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number, frame: number, fg: string, dim: string) {
  const cx = x + w / 2;
  const flicker = Math.sin(frame * 0.3) * 2;
  const flicker2 = Math.cos(frame * 0.22) * 1.5;
  // outer flame
  ctx.fillStyle = dim;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.35, gy);
  ctx.quadraticCurveTo(cx - w * 0.5, gy - h * 0.5, cx - w * 0.1 + flicker, gy - h);
  ctx.quadraticCurveTo(cx + w * 0.15, gy - h * 0.7 + flicker2, cx + w * 0.1, gy - h * 0.85 - flicker);
  ctx.quadraticCurveTo(cx + w * 0.45, gy - h * 0.45, cx + w * 0.35, gy);
  ctx.closePath();
  ctx.fill();
  // inner flame
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.15, gy);
  ctx.quadraticCurveTo(cx - w * 0.2, gy - h * 0.35, cx + flicker2 * 0.5, gy - h * 0.6);
  ctx.quadraticCurveTo(cx + w * 0.15, gy - h * 0.3, cx + w * 0.15, gy);
  ctx.closePath();
  ctx.fill();
}

function drawPrompt(ctx: CanvasRenderingContext2D, x: number, gy: number, h: number, fg: string) {
  ctx.fillStyle = fg;
  ctx.font = `bold ${h}px 'IBM Plex Mono', monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(">>>", x, gy);
}

function drawCrab(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number, fg: string) {
  const cx = x + w / 2;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  // body — wide oval
  ctx.beginPath();
  ctx.ellipse(cx, gy - h * 0.35, w * 0.32, h * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();
  // eyes
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, gy - h * 0.63);
  ctx.lineTo(cx - w * 0.15, gy - h * 0.82);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - w * 0.15, gy - h * 0.87, 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.12, gy - h * 0.63);
  ctx.lineTo(cx + w * 0.15, gy - h * 0.82);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + w * 0.15, gy - h * 0.87, 2, 0, Math.PI * 2);
  ctx.stroke();
  // left claw
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.32, gy - h * 0.4);
  ctx.lineTo(cx - w * 0.48, gy - h * 0.65);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.48, gy - h * 0.65);
  ctx.lineTo(cx - w * 0.42, gy - h * 0.82);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.48, gy - h * 0.65);
  ctx.lineTo(cx - w * 0.55, gy - h * 0.8);
  ctx.stroke();
  // right claw
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.32, gy - h * 0.4);
  ctx.lineTo(cx + w * 0.48, gy - h * 0.65);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.48, gy - h * 0.65);
  ctx.lineTo(cx + w * 0.42, gy - h * 0.82);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.48, gy - h * 0.65);
  ctx.lineTo(cx + w * 0.55, gy - h * 0.8);
  ctx.stroke();
  // legs — 3 per side
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const angle = 0.3 + i * 0.35;
    const lx = Math.cos(angle) * w * 0.32;
    const ly = Math.sin(angle) * h * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx - lx, gy - h * 0.35 + ly);
    ctx.lineTo(cx - lx - w * 0.12, gy - h * 0.05);
    ctx.lineTo(cx - lx - w * 0.15, gy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + lx, gy - h * 0.35 + ly);
    ctx.lineTo(cx + lx + w * 0.12, gy - h * 0.05);
    ctx.lineTo(cx + lx + w * 0.15, gy);
    ctx.stroke();
  }
}

function drawRockpile(ctx: CanvasRenderingContext2D, x: number, gy: number, w: number, h: number, dim: string, muted: string) {
  // back rock — darker
  ctx.fillStyle = muted;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, gy);
  ctx.lineTo(x + w * 0.2, gy - h * 0.65);
  ctx.lineTo(x + w * 0.45, gy - h * 0.8);
  ctx.lineTo(x + w * 0.7, gy - h * 0.55);
  ctx.lineTo(x + w * 0.8, gy);
  ctx.closePath();
  ctx.fill();
  // front rock — lighter, overlapping
  ctx.fillStyle = dim;
  ctx.beginPath();
  ctx.moveTo(x, gy);
  ctx.lineTo(x + w * 0.12, gy - h * 0.5);
  ctx.lineTo(x + w * 0.3, gy - h);
  ctx.lineTo(x + w * 0.55, gy - h * 0.85);
  ctx.lineTo(x + w * 0.65, gy - h * 0.4);
  ctx.lineTo(x + w * 0.6, gy);
  ctx.closePath();
  ctx.fill();
}

function drawEagle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, frame: number, fg: string) {
  const flapAngle = Math.sin(frame * 0.15) * 0.5;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1.8;
  ctx.save();
  ctx.translate(x + w / 2, y);
  // body
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(8, -1);
  ctx.lineTo(14, 0);
  ctx.stroke();
  // beak
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(18, 1);
  ctx.lineTo(14, 2);
  ctx.stroke();
  // left wing
  ctx.beginPath();
  ctx.moveTo(-1, -1);
  ctx.lineTo(-6, -8 - flapAngle * 10);
  ctx.lineTo(-14, -6 - flapAngle * 12);
  ctx.stroke();
  // right wing (behind body, shorter)
  ctx.beginPath();
  ctx.moveTo(4, -1);
  ctx.lineTo(2, -7 - flapAngle * 8);
  ctx.lineTo(-3, -5 - flapAngle * 9);
  ctx.stroke();
  // tail feathers
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(-9, 2);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-10, 1);
  ctx.stroke();
  ctx.restore();
}

function drawBoulder(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, _fg: string, dim: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = dim;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.1);
  ctx.lineTo(-r * 0.85, -r * 0.5);
  ctx.lineTo(-r * 0.5, -r * 0.85);
  ctx.lineTo(-r * 0.1, -r * 0.95);
  ctx.lineTo(r * 0.35, -r * 0.9);
  ctx.lineTo(r * 0.7, -r * 0.65);
  ctx.lineTo(r * 0.95, -r * 0.2);
  ctx.lineTo(r, r * 0.3);
  ctx.lineTo(r * 0.8, r * 0.7);
  ctx.lineTo(r * 0.4, r * 0.9);
  ctx.lineTo(-r * 0.1, r * 0.95);
  ctx.lineTo(-r * 0.55, r * 0.8);
  ctx.lineTo(-r * 0.9, r * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = dim;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawSisyphus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  running: boolean,
  jumping: boolean,
  angle: number,
  fg: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-angle);

  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const run = running ? frame * 0.25 : 0;
  const legA = jumping ? -0.3 : Math.sin(run) * 0.6;
  const legB = jumping ? 0.3 : Math.sin(run + Math.PI) * 0.6;

  const hipX = 0;
  const hipY = 0;
  const torsoTopX = 6;
  const torsoTopY = -22;

  // torso
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(torsoTopX, torsoTopY);
  ctx.stroke();

  // head
  ctx.beginPath();
  ctx.arc(torsoTopX + 2, torsoTopY - 5.5, 5, 0, Math.PI * 2);
  ctx.stroke();

  // back leg
  const legLen = 16;
  const kneeAx = hipX + Math.sin(legA * 0.7) * legLen * 0.55 - 4;
  const kneeAy = hipY + Math.cos(legA * 0.7) * legLen * 0.55;
  const footAx = kneeAx + Math.sin(legA) * legLen * 0.5 - 2;
  const footAy = kneeAy + Math.cos(legA) * legLen * 0.5;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeAx, kneeAy);
  ctx.lineTo(footAx, footAy);
  ctx.stroke();

  // front leg
  const kneeBx = hipX + Math.sin(legB * 0.7) * legLen * 0.55 - 4;
  const kneeBy = hipY + Math.cos(legB * 0.7) * legLen * 0.55;
  const footBx = kneeBx + Math.sin(legB) * legLen * 0.5 - 2;
  const footBy = kneeBy + Math.cos(legB) * legLen * 0.5;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeBx, kneeBy);
  ctx.lineTo(footBx, footBy);
  ctx.stroke();

  // arms — bent, bracing against the boulder
  const shoulderX = torsoTopX - 1;
  const shoulderY = torsoTopY + 8;
  const strain = running ? Math.sin(run * 0.5) * 1.5 : 0;

  const boulderLocalX = 24;
  const boulderLocalY = -BOULDER_R - 8 - hipY;

  const elbowBackX = shoulderX + 8;
  const elbowBackY = shoulderY - 3 + strain;
  const handBackX = boulderLocalX - BOULDER_R * 0.6;
  const handBackY = boulderLocalY + 2;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(elbowBackX, elbowBackY);
  ctx.lineTo(handBackX, handBackY);
  ctx.stroke();

  const elbowFrontX = shoulderX + 9;
  const elbowFrontY = shoulderY - 6 - strain;
  const handFrontX = boulderLocalX - BOULDER_R * 0.5;
  const handFrontY = boulderLocalY - 4;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(elbowFrontX, elbowFrontY);
  ctx.lineTo(handFrontX, handFrontY);
  ctx.stroke();

  ctx.restore();
}

export default function SisyphusGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({
    running: false,
    started: false,
    intro: true,
    introFrame: 0,
    vy: 0,
    py: 0,
    onGround: true,
    obstacles: [] as Obstacle[],
    frame: 0,
    score: 0,
    highScore: 0,
    speed: SPEED_INIT,
    boulderAngle: 0,
  });
  const [, setTick] = useState(0);

  const jump = useCallback(() => {
    const g = gameRef.current;
    if (g.intro) {
      g.intro = false;
      g.started = true;
      g.running = true;
      g.score = 0;
      g.frame = 0;
      g.speed = SPEED_INIT;
      g.obstacles = [];
      g.py = groundY(PLAYER_X);
      g.vy = 0;
      g.onGround = true;
      return;
    }
    if (!g.started || !g.running) {
      g.started = true;
      g.running = true;
      g.intro = false;
      g.score = 0;
      g.frame = 0;
      g.speed = SPEED_INIT;
      g.obstacles = [];
      g.py = groundY(PLAYER_X);
      g.vy = 0;
      g.onGround = true;
      return;
    }
    if (g.onGround) {
      g.vy = JUMP_FORCE;
      g.onGround = false;
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    const g = gameRef.current;
    g.py = groundY(PLAYER_X);

    const loop = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = GAME_W * dpr;
      canvas.height = GAME_H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, GAME_W, GAME_H);

      const fg = "#e8e8e8";
      const dim = "#6a6a6a";
      const muted = "#3a3a3a";
      const gy0 = groundY(0);
      const gy1 = groundY(GAME_W);

      const isMoving = g.running || g.intro;

      // ground line — thin, like dino game
      ctx.strokeStyle = muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, gy0);
      ctx.lineTo(GAME_W, gy1);
      ctx.stroke();

      // ground texture — small dashes and dots along the line, scrolling
      ctx.fillStyle = muted;
      const scrollOff = isMoving ? (g.introFrame * (g.intro ? INTRO_SPEED : g.speed)) % 12 : 0;
      for (let i = -12; i < GAME_W + 12; i += 12) {
        const sx = ((i - scrollOff) % (GAME_W + 24) + GAME_W + 24) % (GAME_W + 24) - 12;
        const sy = groundY(sx);
        // small pebble marks
        ctx.fillRect(sx, sy + 2, 3, 1);
        ctx.fillRect(sx + 5, sy + 1, 1, 1);
        ctx.fillRect(sx + 8, sy + 3, 2, 1);
      }

      // very subtle fill below ground
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.moveTo(0, gy0);
      ctx.lineTo(GAME_W, gy1);
      ctx.lineTo(GAME_W, GAME_H);
      ctx.lineTo(0, GAME_H);
      ctx.closePath();
      ctx.fill();

      // intro: walk uphill slowly
      if (g.intro) {
        g.introFrame++;
        g.boulderAngle += INTRO_SPEED * 0.04;
        g.py = groundY(PLAYER_X);
      }

      if (g.running) {
        g.frame++;
        g.introFrame++;
        g.score = Math.floor(g.frame / 6);
        g.speed = SPEED_INIT + g.score * 0.007;

        g.vy += GRAVITY;
        g.py += g.vy;
        const gAtPlayer = groundY(PLAYER_X);
        if (g.py >= gAtPlayer) {
          g.py = gAtPlayer;
          g.vy = 0;
          g.onGround = true;
        }

        // spawn obstacles
        const interval = Math.max(50, SPAWN_INIT - g.score * 0.25);
        if (g.frame % Math.floor(interval) === 0) {
          const r = Math.random();
          let obs: Obstacle;
          if (r < 0.2) {
            obs = { x: GAME_W + 20, type: "amphora", w: 16 + Math.random() * 6, h: 22 + Math.random() * 14, seed: Math.random() };
          } else if (r < 0.35) {
            obs = { x: GAME_W + 20, type: "trident", w: 18, h: 30 + Math.random() * 14, seed: Math.random() };
          } else if (r < 0.5) {
            obs = { x: GAME_W + 20, type: "fire", w: 16 + Math.random() * 6, h: 20 + Math.random() * 14, seed: Math.random() };
          } else if (r < 0.62) {
            obs = { x: GAME_W + 20, type: "prompt", w: 36, h: 18 + Math.random() * 8, seed: Math.random() };
          } else if (r < 0.7) {
            obs = { x: GAME_W + 20, type: "rockpile", w: 26 + Math.random() * 10, h: 18 + Math.random() * 10, seed: Math.random() };
          } else if (r < 0.82) {
            obs = { x: GAME_W + 20, type: "crab", w: 24 + Math.random() * 8, h: 16 + Math.random() * 6, seed: Math.random() };
          } else {
            const flyOffset = 25 + Math.random() * 45;
            obs = { x: GAME_W + 20, type: "eagle", w: 36, h: 20, seed: Math.random(), flyY: flyOffset };
          }
          g.obstacles.push(obs);
        }

        for (let i = g.obstacles.length - 1; i >= 0; i--) {
          g.obstacles[i].x -= g.speed;
          if (g.obstacles[i].x < -50) g.obstacles.splice(i, 1);
        }

        // collision
        const bCx = PLAYER_X + 24;
        const bCy = g.py - BOULDER_R - 8;

        for (const obs of g.obstacles) {
          if (obs.type === "eagle" && obs.flyY != null) {
            const eagleY = groundY(obs.x + obs.w / 2) - obs.flyY;
            const eLeft = obs.x;
            const eRight = obs.x + obs.w;
            const eTop = eagleY - 10;
            const eBottom = eagleY + 6;
            // boulder vs eagle
            const clX = Math.max(eLeft, Math.min(bCx, eRight));
            const clY = Math.max(eTop, Math.min(bCy, eBottom));
            const ddx = bCx - clX;
            const ddy = bCy - clY;
            if (ddx * ddx + ddy * ddy < (BOULDER_R - 2) * (BOULDER_R - 2)) {
              g.running = false;
              if (g.score > g.highScore) g.highScore = g.score;
              setTick((t) => t + 1);
              break;
            }
            // body vs eagle
            const bodyLeft = PLAYER_X - 6;
            const bodyRight = PLAYER_X + 10;
            const bodyTop = g.py - 28;
            if (bodyRight > eLeft && bodyLeft < eRight && g.py > eTop && bodyTop < eBottom) {
              g.running = false;
              if (g.score > g.highScore) g.highScore = g.score;
              setTick((t) => t + 1);
              break;
            }
            continue;
          }

          const oGy = groundY(obs.x + obs.w / 2);
          const obsLeft = obs.x;
          const obsRight = obs.x + obs.w;
          const obsTop = oGy - obs.h;
          // boulder vs ground obstacle
          const clX = Math.max(obsLeft, Math.min(bCx, obsRight));
          const clY = Math.max(obsTop, Math.min(bCy, oGy));
          const ddx = bCx - clX;
          const ddy = bCy - clY;
          if (ddx * ddx + ddy * ddy < (BOULDER_R - 1) * (BOULDER_R - 1)) {
            g.running = false;
            if (g.score > g.highScore) g.highScore = g.score;
            setTick((t) => t + 1);
            break;
          }
          // body vs ground obstacle
          const bodyLeft = PLAYER_X - 6;
          const bodyRight = PLAYER_X + 10;
          const bodyTop = g.py - 28;
          if (bodyRight > obsLeft && bodyLeft < obsRight && g.py > obsTop && bodyTop < oGy) {
            g.running = false;
            if (g.score > g.highScore) g.highScore = g.score;
            setTick((t) => t + 1);
            break;
          }
        }

        g.boulderAngle += g.speed * 0.05;
      }

      // draw obstacles
      for (const obs of g.obstacles) {
        if (obs.type === "amphora") {
          const oGy = groundY(obs.x + obs.w / 2);
          drawAmphora(ctx, obs.x, oGy, obs.w, obs.h, dim);
        } else if (obs.type === "trident") {
          const oGy = groundY(obs.x + obs.w / 2);
          drawTrident(ctx, obs.x, oGy, obs.w, obs.h, dim);
        } else if (obs.type === "fire") {
          const oGy = groundY(obs.x + obs.w / 2);
          drawFire(ctx, obs.x, oGy, obs.w, obs.h, g.frame, fg, dim);
        } else if (obs.type === "prompt") {
          const oGy = groundY(obs.x + obs.w / 2);
          drawPrompt(ctx, obs.x, oGy, obs.h, dim);
        } else if (obs.type === "rockpile") {
          const oGy = groundY(obs.x + obs.w / 2);
          drawRockpile(ctx, obs.x, oGy, obs.w, obs.h, dim, muted);
        } else if (obs.type === "crab") {
          const oGy = groundY(obs.x + obs.w / 2);
          drawCrab(ctx, obs.x, oGy, obs.w, obs.h, dim);
        } else if (obs.type === "eagle" && obs.flyY != null) {
          const eagleY = groundY(obs.x + obs.w / 2) - obs.flyY;
          drawEagle(ctx, obs.x, eagleY, obs.w, g.frame, dim);
        }
      }

      // draw sisyphus
      const animFrame = g.intro ? g.introFrame : g.frame;
      const isWalking = g.intro || g.running;
      drawSisyphus(ctx, PLAYER_X, g.py, animFrame, isWalking, !g.onGround && !g.intro, SLOPE_ANGLE, fg);

      // draw boulder
      drawBoulder(ctx, PLAYER_X + 24, g.py - BOULDER_R - 8, BOULDER_R, g.boulderAngle, fg, dim);

      // score
      if (g.started && !g.intro) {
        ctx.fillStyle = dim;
        ctx.font = "11px 'IBM Plex Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(String(g.score).padStart(5, "0"), GAME_W - 12, 20);
        if (g.highScore > 0) {
          ctx.fillStyle = muted;
          ctx.font = "9px 'IBM Plex Mono', monospace";
          ctx.fillText("HI " + String(g.highScore).padStart(5, "0"), GAME_W - 72, 20);
        }
      }

      // states
      if (g.intro) {
        const fade = Math.min(1, g.introFrame / 40);
        ctx.globalAlpha = fade;
        ctx.fillStyle = dim;
        ctx.font = "12px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("press space or tap", GAME_W / 2, 30);
        ctx.globalAlpha = 1;
      } else if (!g.running && g.started) {
        ctx.fillStyle = fg;
        ctx.font = "14px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("the boulder rolls back", GAME_W / 2, GAME_H / 2 - 16);
        ctx.fillStyle = dim;
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.fillText("space or tap to push again", GAME_W / 2, GAME_H / 2 + 4);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <canvas
        ref={canvasRef}
        onClick={jump}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
        className="cursor-pointer"
        style={{
          width: GAME_W,
          maxWidth: "100%",
          height: "auto",
          aspectRatio: `${GAME_W} / ${GAME_H}`,
        }}
      />
      <div className="text-center">
        <SloganCycler />
      </div>
    </div>
  );
}

function SloganCycler() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % SLOGANS.length);
        setVisible(true);
      }, 500);
    }, 3400);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="text-[13px] md:text-[15px] font-mono text-[var(--color-dim)] transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {SLOGANS[idx]}
    </span>
  );
}

const SLOGANS = [
  "you are one clean refactor away from clarity",
  "a tiny rename today prevents a huge bug tomorrow",
  "your next commit message will be immaculate",
  "the edge case you are ignoring is already solved in your head",
  "minimal diff, maximal calm",
  "today favors bold deletions over new abstractions",
  "the right helper is already in your codebase",
  "you will ship before overthinking catches up",
  "tests are about to save your future self",
  "your instincts are correctly suspicious of that one branch",
  "legendary drop: one-line fix, first try",
  "legendary drop: every flaky test passes cleanly",
  "legendary drop: your diff teaches by itself",
];
