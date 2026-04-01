'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { getSocialLinks } from "@/lib/public-site"

const css = `
/* ─── DESIGN TOKENS ─────────────────────────────── */
:root {
  --bg:           #ffffff;
  --fg:           #0f0f18;
  --card:         #ffffff;
  --card-el:      #f0f0f5;
  --primary:      #497dcb;
  --primary-dim:  #3f6cb1;
  --primary-glow: rgba(73, 125, 203, 0.18);
  --primary-fg:   #ffffff;
  --secondary:    #f0f0f5;
  --muted:        #f5f6fa;
  --muted-fg:     #4a4a62;
  --border:       rgba(0, 0, 0, 0.08);
  --surface:      #ffffff;
  --radius:       0.5rem;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: auto; }

body {
  font-family: 'DM Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.65;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

body::after {
  content: '';
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 9999; opacity: .35;
}

#smooth-wrapper { }
#smooth-content { }

/* ─── UTILITY ─────────────────── */
.cl-container { max-width: 1280px; margin: 0 auto; padding: 0 28px; }

.cl-badge {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--primary-glow);
  border: 1px solid hsla(193, 53.50%, 83.10%, 0.30);
  color: var(--primary);
  font-size: 11px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase;
  padding: 6px 14px; border-radius: 100px;
}
.cl-badge .pulse {
  width: 6px; height: 6px; border-radius: 50%; background: var(--primary);
  animation: pulseAnim 2s infinite;
}
@keyframes pulseAnim { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

.cl-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--primary); color: var(--primary-fg);
  padding: 13px 26px; border-radius: var(--radius);
  font-size: 14px; font-weight: 700; text-decoration: none; border: none; cursor: pointer;
  transition: background .2s, transform .2s, box-shadow .2s;
}
.cl-btn-primary:hover {
  background: #6b9fd4; transform: translateY(-2px);
  box-shadow: 0 8px 32px var(--primary-glow);
}

.cl-btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent; color: var(--fg);
  padding: 12px 22px; border-radius: var(--radius);
  font-size: 14px; font-weight: 500; text-decoration: none;
  border: 1px solid var(--border); cursor: pointer;
  transition: border-color .2s, color .2s;
}
.cl-btn-ghost:hover { border-color: var(--primary); color: var(--primary); }

/* ─── NAV ──────────────────────── */
.cl-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 999;
  background: hsla(0, 0%, 100%, 0.86);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid var(--border);
  transition: background .3s;
  will-change: transform;
}
.cl-nav--hidden {
  pointer-events: none;
}
.cl-nav-inner {
  max-width: 1280px; margin: 0 auto; padding: 0 28px;
  display: flex; align-items: center; justify-content: space-between;
  height: 64px; gap: 32px;
}
.cl-nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.cl-logo-mark {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--primary);
  display: flex; align-items: center; justify-content: center;
}
.cl-logo-mark i { font-size: 16px; color: #fff; }
.cl-logo-text { font-size: 18px; font-weight: 800; color: var(--fg); letter-spacing: -.3px; }
.cl-logo-text span { color: var(--primary); }

.cl-nav-links { display: flex; align-items: center; gap: 4px; }
.cl-nav-links a {
  font-size: 15px; font-weight: 500; color: var(--muted-fg);
  text-decoration: none; padding: 8px 16px; border-radius: 6px;
  transition: color .2s;
}
.cl-nav-links a:hover, .cl-nav-links a.active { color: var(--primary); }
.cl-nav-actions { display: flex; align-items: center; gap: 10px; }
.cl-nav-actions .cl-btn-primary { padding: 9px 18px; font-size: 13px; }
.cl-nav-actions .cl-btn-ghost { padding: 8px 18px; font-size: 13px; }

/* ─── HERO ─────────────────────── */
.cl-hero {
  min-height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 120px 28px 0; text-align: center; position: relative; overflow: hidden;
}
.cl-hero-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 80%);
  opacity: .35;
}
.cl-hero-orb {
  position: absolute; border-radius: 50%; filter: blur(120px); pointer-events: none;
}
.cl-hero-orb-1 {
  width: 600px; height: 400px;
  background: radial-gradient(circle, rgba(73, 125, 203, 0.15) 0%, transparent 70%);
  top: -100px; left: 50%; transform: translateX(-50%);
}
.cl-hero-orb-2 {
  width: 400px; height: 300px;
  background: radial-gradient(circle, rgba(73, 125, 203, 0.08) 0%, transparent 70%);
  bottom: 0; right: 10%;
}
.cl-hero-inner { position: relative; z-index: 2; max-width: 1280px; margin: 0 auto; padding: 0 28px; }
#hero-badge { margin-bottom: 28px; }

.cl-hero h1 {
  font-size: clamp(38px, 6.5vw, 82px);
  font-weight: 900; line-height: 1.05; letter-spacing: -2.5px; margin-bottom: 22px;
}
.cl-hero h1 .line-wrap { overflow: hidden; display: block; }
.cl-hero h1 em { font-style: normal; color: var(--primary); display: inline-block; }

.cl-hero-sub {
  font-size: 17px; color: var(--muted-fg);
  max-width: 500px; margin: 0 auto 38px; font-weight: 400; line-height: 1.7;
}
.cl-hero-ctas { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.cl-hero-note { font-size: 12px; color: hsl(0, 0%, 40%); display: flex; align-items: center; gap: 16px; justify-content: center; }
.cl-hero-note span { display: flex; align-items: center; gap: 5px; }
.cl-hero-note i { color: var(--primary); font-size: 13px; }

/* ── MOCKUP ── */
.cl-mockup-wrap {
  margin-top: 72px; position: relative; z-index: 2;
  width: 100%; display: flex; justify-content: center;
}
.cl-mockup-glow {
  position: absolute; top: 40px; left: 50%; transform: translateX(-50%);
  width: 80%; height: 60px; background: var(--primary);
  filter: blur(80px); opacity: .2; pointer-events: none; z-index: 0;
}
.cl-mockup-frame {
  width: min(1000px, 94vw);
  background: var(--card); border: 1px solid var(--border);
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 0 0 1px var(--border), 0 40px 100px -20px rgba(0,0,0,.8);
  position: relative; z-index: 1;
  transform: perspective(1400px) rotateX(5deg);
  transform-origin: top center;
}
.cl-mockup-titlebar {
  background: var(--surface); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px; padding: 12px 18px;
}
.m-dot { width: 10px; height: 10px; border-radius: 50%; }
.m-dot:nth-child(1){ background: #FF5F57; }
.m-dot:nth-child(2){ background: #FEBC2E; }
.m-dot:nth-child(3){ background: #28C840; }
.m-url {
  flex: 1; margin: 0 12px; background: var(--secondary);
  border-radius: 5px; padding: 4px 12px; font-size: 11px; color: hsl(0, 0%, 45%);
  display: flex; align-items: center; gap: 6px;
}
.m-url i { font-size: 10px; }
.cl-mockup-app { display: flex; height: 460px; }

.cl-m-sidebar {
  width: 196px; background: var(--surface);
  border-right: 1px solid var(--border); padding: 16px 10px; flex-shrink: 0;
}
.cl-m-brand { display: flex; align-items: center; gap: 8px; padding: 6px 8px; margin-bottom: 20px; }
.cl-m-brand .m-logo {
  width: 26px; height: 26px; border-radius: 6px; background: var(--primary);
  display: flex; align-items: center; justify-content: center;
}
.cl-m-brand .m-logo i { font-size: 13px; color: #fff; }
.cl-m-brand .m-name { font-size: 13px; font-weight: 800; color: var(--fg); }

.m-nav-section { margin-bottom: 16px; }
.m-nav-label {
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px;
  color: hsl(0, 0%, 35%); padding: 0 10px; margin-bottom: 4px;
}
.m-nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 6px; margin-bottom: 1px;
  font-size: 12px; font-weight: 500; color: var(--muted-fg); cursor: pointer;
  transition: background .15s, color .15s;
}
.m-nav-item:hover, .m-nav-item.active { background: var(--card-el); color: var(--fg); }
.m-nav-item.active i { color: var(--primary); }
.m-nav-item i { font-size: 15px; }
.m-badge {
  margin-left: auto; background: var(--primary); color: #fff;
  font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 100px;
}
.cl-m-main { flex: 1; padding: 20px; overflow: hidden; background: var(--bg); }
.m-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.m-topbar h2 { font-size: 15px; font-weight: 700; }
.m-topbar-actions { display: flex; gap: 8px; align-items: center; }
.m-chip {
  display: flex; align-items: center; gap: 5px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 6px; padding: 5px 10px; font-size: 11px; color: var(--muted-fg);
}
.m-chip.primary-chip {
  background: var(--primary-glow); border-color: rgba(73, 125, 203, 0.3); color: var(--primary);
}
.m-chip i { font-size: 13px; }
.m-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.m-stat { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
.m-stat-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: hsl(0,0%,58%); margin-bottom: 5px; display: flex; align-items: center; gap: 4px; }
.m-stat-lbl i { font-size: 11px; }
.m-stat-val { font-size: 18px; font-weight: 800; color: var(--fg); }
.m-stat-delta { font-size: 9px; color: var(--primary); margin-top: 2px; display: flex; align-items: center; gap: 2px; }
.m-stat-delta i { font-size: 10px; }
.m-pipeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.m-pipe-head {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px;
  color: hsl(0,0%,55%); margin-bottom: 6px; padding: 0 2px;
}
.m-pipe-count {
  background: var(--secondary); color: hsl(0,0%,55%);
  font-size: 9px; padding: 1px 6px; border-radius: 100px; font-weight: 600;
}
.m-pipe-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 7px; padding: 9px 10px; margin-bottom: 6px;
  transition: transform .2s, border-color .2s;
}
.m-pipe-card-name { font-size: 10px; font-weight: 600; color: var(--fg); margin-bottom: 3px; }
.m-pipe-card-val { font-size: 10px; color: hsl(0,0%,58%); }
.m-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 8px; font-weight: 700; padding: 2px 7px; border-radius: 100px; margin-top: 5px; }
.tag-lime { background: rgba(73,125,203,0.15); color: var(--primary); }
.tag-yellow { background: rgba(251,191,36,.12); color: #FBBF24; }
.tag-red { background: rgba(239,68,68,.12); color: #F87171; }
.tag-muted { background: var(--secondary); color: hsl(0,0%,55%); }

/* ─── LOGOS ─────────────────────── */
.cl-logos-strip {
  padding: 52px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.cl-logos-label {
  text-align: center; font-size: 11px; text-transform: uppercase;
  letter-spacing: 1.2px; color: hsl(0,0%,55%); font-weight: 700; margin-bottom: 28px;
}
.cl-logos-row { display: flex; align-items: center; justify-content: center; gap: 48px; flex-wrap: wrap; }
.cl-logo-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 800; color: hsl(0,0%,52%);
  letter-spacing: -.3px; transition: color .2s;
}
.cl-logo-item:hover { color: hsl(0,0%,72%); }
.cl-logo-item i { font-size: 17px; }

/* ─── SECTION BASE ──────────────── */
.cl-section { padding: 110px 0; }
.cl-section-header { text-align: center; margin-bottom: 72px; }
.cl-section-header .cl-badge { margin-bottom: 18px; }
.cl-section-header h2 {
  font-size: clamp(28px, 4.5vw, 54px);
  font-weight: 900; letter-spacing: -1.5px; line-height: 1.1; margin-bottom: 16px;
}
.cl-section-header p { font-size: 16px; color: var(--muted-fg); max-width: 500px; margin: 0 auto; line-height: 1.7; }

/* ─── FEATURE BENTO ──────────────── */
.cl-features-bg { background: var(--surface); }
.cl-feat-bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }

.cl-f-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; padding: 32px; overflow: hidden; position: relative;
  transition: border-color .25s, transform .25s;
}
.cl-f-card::before {
  content: ''; position: absolute; inset: 0; border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-glow) 0%, transparent 60%);
  opacity: 0; transition: opacity .3s; pointer-events: none;
}
.cl-f-card:hover { border-color: rgba(73,125,203,0.4); transform: translateY(-3px); }
.cl-f-card:hover::before { opacity: 1; }

.cl-col8 { grid-column: span 8; }
.cl-col4 { grid-column: span 4; }
.cl-col6 { grid-column: span 6; }

.cl-f-card.cl-highlight {
  background: linear-gradient(145deg, rgba(73,125,203,0.12) 0%, rgba(73,125,203,0.04) 100%);
  border-color: rgba(73,125,203,0.35);
}
.cl-f-icon-wrap {
  width: 42px; height: 42px; border-radius: 10px;
  background: var(--secondary); display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px; border: 1px solid var(--border);
}
.cl-f-icon-wrap i { font-size: 20px; color: var(--primary); }
.cl-f-card.cl-highlight .cl-f-icon-wrap { background: rgba(73,125,203,0.15); border-color: rgba(73,125,203,0.25); }
.cl-f-eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: .8px; font-weight: 700; color: hsl(0,0%,58%); margin-bottom: 8px; }
.cl-f-card.cl-highlight .cl-f-eyebrow { color: var(--primary); }
.cl-f-card h3 { font-size: 18px; font-weight: 800; margin-bottom: 10px; line-height: 1.3; letter-spacing: -.3px; }
.cl-f-card p { font-size: 13px; color: var(--muted-fg); line-height: 1.75; }

.cl-f-pipeline-mini { margin-top: 24px; display: flex; gap: 8px; }
.cl-f-pipe-mini-col { flex: 1; }
.cl-f-pipe-mini-head { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: hsl(0,0%,52%); margin-bottom: 6px; }
.cl-f-pipe-mini-item {
  background: var(--secondary); border: 1px solid var(--border);
  border-radius: 5px; padding: 7px 8px; margin-bottom: 4px;
  font-size: 9px; font-weight: 500; color: hsl(0,0%,65%);
  display: flex; align-items: center; gap: 5px;
}
.cl-f-pipe-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

.cl-f-ai-mock { margin-top: 22px; background: var(--secondary); border: 1px solid var(--border); border-radius: 8px; padding: 14px; }
.cl-f-ai-mock-label { font-size: 9px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: .6px; display: flex; align-items: center; gap: 5px; margin-bottom: 10px; }
.cl-f-ai-mock-label i { font-size: 12px; }
.cl-f-ai-msg { font-size: 11px; color: hsl(0,0%,70%); line-height: 1.6; }
.cl-f-ai-cursor { display: inline-block; width: 2px; height: 13px; background: var(--primary); animation: blink .9s infinite; margin-left: 2px; vertical-align: middle; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

.cl-f-bars { display: flex; align-items: flex-end; gap: 5px; height: 56px; margin-top: 22px; }
.cl-f-bar { flex: 1; border-radius: 4px 4px 0 0; background: var(--secondary); }
.cl-f-bar.on { background: var(--primary); opacity: .8; }
.cl-f-bar.hi { background: var(--primary); }

.cl-f-integrations { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.cl-f-int-chip {
  display: flex; align-items: center; gap: 6px;
  background: var(--secondary); border: 1px solid var(--border);
  border-radius: 6px; padding: 6px 10px;
  font-size: 11px; font-weight: 600; color: hsl(0,0%,65%);
}
.cl-f-int-chip i { font-size: 13px; color: var(--primary); }

.cl-f-schedule { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.cl-f-schedule-row {
  display: flex; align-items: center; gap: 8px;
  background: var(--secondary); border: 1px solid var(--border);
  border-radius: 7px; padding: 8px 10px;
}
.cl-f-schedule-time { font-size: 10px; font-weight: 700; color: var(--primary); min-width: 52px; flex-shrink: 0; }
.cl-f-schedule-label { font-size: 11px; color: hsl(0,0%,65%); flex: 1; }
.cl-f-schedule-pill {
  font-size: 9px; font-weight: 700; padding: 3px 7px; border-radius: 4px;
  background: rgba(73,125,203,0.15); color: var(--primary); white-space: nowrap;
}

/* ─── HOW IT WORKS ──────────────── */
.cl-steps-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px;
  background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
}
.cl-step-block { background: var(--card); padding: 40px 36px; position: relative; }
.cl-step-num {
  font-size: 52px; font-weight: 900; color: hsl(0,0%,17%); line-height: 1;
  margin-bottom: 24px; letter-spacing: -2px;
  position: absolute; top: 24px; right: 24px;
}
.cl-step-ico {
  width: 48px; height: 48px; border-radius: 10px;
  background: var(--primary-glow); border: 1px solid rgba(73,125,203,0.25);
  display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
}
.cl-step-ico i { font-size: 22px; color: var(--primary); }
.cl-step-block h3 { font-size: 18px; font-weight: 800; margin-bottom: 10px; letter-spacing: -.3px; }
.cl-step-block p { font-size: 13px; color: var(--muted-fg); line-height: 1.75; }
.cl-step-arrow {
  position: absolute; top: 50%; right: -14px; transform: translateY(-50%);
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--primary); display: flex; align-items: center; justify-content: center; z-index: 2;
}
.cl-step-arrow i { font-size: 14px; color: #fff; }

/* ─── SOCIAL PROOF ──────────────── */
.cl-proof-bg { background: var(--surface); }
.cl-proof-bar {
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 72px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden;
}
.cl-proof-stat { flex: 1; padding: 28px 24px; text-align: center; position: relative; }
.cl-proof-stat + .cl-proof-stat::before {
  content: ''; position: absolute; left: 0; top: 20%; height: 60%; width: 1px; background: var(--border);
}
.cl-proof-num { font-size: 36px; font-weight: 900; color: var(--primary); letter-spacing: -1px; line-height: 1; }
.cl-proof-lbl { font-size: 12px; color: var(--muted-fg); margin-top: 4px; font-weight: 500; }

.cl-testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.cl-testi-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; padding: 28px;
  transition: border-color .25s, transform .25s; position: relative; overflow: hidden;
}
.cl-testi-card::after {
  content: '"'; position: absolute; top: -10px; right: 16px;
  font-size: 100px; font-weight: 900; color: var(--primary-glow);
  line-height: 1; pointer-events: none;
}
.cl-testi-card:hover { border-color: rgba(73,125,203,0.35); transform: translateY(-3px); }
.cl-testi-stars { display: flex; gap: 3px; margin-bottom: 14px; }
.cl-testi-stars i { font-size: 13px; color: var(--primary); }
.cl-testi-text { font-size: 13px; line-height: 1.75; color: hsl(0,0%,75%); margin-bottom: 22px; position: relative; z-index: 1; }
.cl-testi-author { display: flex; align-items: center; gap: 12px; }
.cl-testi-ava {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 800; color: #fff; flex-shrink: 0;
}
.cl-testi-name { font-size: 13px; font-weight: 700; }
.cl-testi-role { font-size: 11px; color: var(--muted-fg); }

/* ─── PRICING ───────────────────── */
.cl-pricing-tabs {
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 52px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 8px; padding: 4px; width: fit-content; margin-left: auto; margin-right: auto;
}
.cl-ptab {
  padding: 9px 24px; border-radius: 6px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all .2s; color: var(--muted-fg); user-select: none;
}
.cl-ptab.active { background: var(--primary); color: #fff; }
.cl-ptab .save {
  margin-left: 6px; background: rgba(73,125,203,0.2); color: var(--primary);
  font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 100px;
}
.cl-ptab.active .save { background: rgba(255,255,255,.2); color: #fff; }

.cl-pricing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; align-items: stretch; }
.cl-p-card {
  background: var(--card); border: 1.5px solid var(--border);
  border-radius: 12px; padding: 26px; transition: border-color .25s, transform .2s;
  display: flex; flex-direction: column;
}
.cl-p-feats { list-style: none; margin-bottom: 24px; flex: 1; }
.cl-p-card:hover { transform: translateY(-4px); }
.cl-p-card.featured {
  background: linear-gradient(160deg, rgba(73,125,203,0.12) 0%, rgba(73,125,203,0.04) 100%);
  border-color: rgba(73,125,203,0.5);
  box-shadow: 0 0 0 1px rgba(73,125,203,0.1), 0 24px 60px -12px rgba(73,125,203,0.2);
}
.cl-p-popular {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--primary); color: #fff;
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px;
  padding: 4px 12px; border-radius: 100px; margin-bottom: 16px;
}
.cl-p-popular i { font-size: 12px; }
.cl-p-tier { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: hsl(0,0%,58%); margin-bottom: 10px; }
.cl-p-card.featured .cl-p-tier { color: var(--primary); }
.cl-p-price { font-size: 42px; font-weight: 900; letter-spacing: -2px; line-height: 1; margin-bottom: 4px; }
.cl-p-price sup { font-size: 18px; font-weight: 700; vertical-align: super; letter-spacing: 0; }
.cl-p-mo { font-size: 12px; color: var(--muted-fg); margin-bottom: 14px; }
.cl-p-desc { font-size: 12px; color: var(--muted-fg); line-height: 1.6; padding-bottom: 18px; margin-bottom: 18px; border-bottom: 1px solid var(--border); }
.cl-p-card.featured .cl-p-desc { border-bottom-color: rgba(73,125,203,0.15); }
.cl-p-feat { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: var(--fg); padding: 5px 0; }
.cl-p-feat i { font-size: 14px; color: var(--primary); flex-shrink: 0; margin-top: 1px; }
.cl-p-card:not(.featured) .cl-p-feat { color: hsl(0,0%,70%); }

.cl-pb {
  display: block; text-align: center; padding: 11px 20px; border-radius: 6px;
  font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; border: none;
  transition: all .2s; width: 100%;
}
.cl-pb-outline { background: transparent; color: var(--fg); border: 1.5px solid var(--border); }
.cl-pb-outline:hover { border-color: var(--primary); color: var(--primary); }
.cl-pb-primary { background: var(--primary); color: #fff; border: 1.5px solid transparent; }
.cl-pb-primary:hover { background: #6b9fd4; }
.cl-pb-dark { background: var(--secondary); color: var(--fg); border: 1.5px solid var(--border); }
.cl-pb-dark:hover { border-color: var(--primary); color: var(--primary); }

/* ─── FAQ ───────────────────────── */
.cl-faq-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1px;
  background: var(--border); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden; max-width: 900px; margin: 0 auto;
}
.cl-faq-item { background: var(--card); padding: 16px 22px; cursor: pointer; transition: background .2s; }
.cl-faq-item:hover { background: var(--card-el); }
.cl-faq-q { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; font-weight: 700; margin-bottom: 0px; }
.cl-faq-q i { font-size: 16px; color: var(--primary); flex-shrink: 0; }
.cl-faq-a { font-size: 12px; color: var(--muted-fg); line-height: 1.5; overflow: hidden; }

/* ─── CTA ───────────────────────── */
.cl-cta-section { padding: 100px 0; text-align: center; position: relative; overflow: hidden; }
.cl-cta-glow {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 600px; height: 300px;
  background: radial-gradient(ellipse, rgba(73,125,203,0.15) 0%, transparent 70%);
  pointer-events: none;
}
.cl-cta-inner { position: relative; z-index: 1; }
.cl-cta-section h2 { font-size: clamp(30px, 5vw, 64px); font-weight: 900; letter-spacing: -2px; line-height: 1.1; margin-bottom: 16px; }
.cl-cta-section h2 em { font-style: normal; color: var(--primary); }
.cl-cta-section p { font-size: 16px; color: var(--muted-fg); margin-bottom: 36px; }
.cl-cta-btns { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }

/* ─── FOOTER ────────────────────── */
.cl-footer { overflow: hidden; background: var(--bg); }

/* CTA card */
.cl-footer-card {
  margin: 0 0px 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
}
.cl-footer-card-left h4 {
  font-size: 20px; font-weight: 800; letter-spacing: -.4px;
  margin-bottom: 10px; color: var(--fg);
}
.cl-footer-card-left p {
  font-size: 14px; color: var(--muted-fg); line-height: 1.65;
  max-width: 380px;
}
.cl-footer-chat-btn {
  display: flex; align-items: center; gap: 14px;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 18px;
  text-decoration: none;
  transition: border-color .2s, background .2s;
  flex-shrink: 0;
}
.cl-footer-chat-btn:hover {
  border-color: rgba(73,125,203,0.4);
  background: var(--card-el);
}
.cl-footer-chat-icon {
  width: 42px; height: 42px; border-radius: 10px;
  background: var(--primary);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cl-footer-chat-icon img { width: 22px; height: 22px; filter: brightness(0); }
.cl-footer-chat-icon i { font-size: 20px; color: #fff; }
.cl-footer-chat-text { display: flex; flex-direction: column; gap: 2px; }
.cl-footer-chat-text strong { font-size: 14px; font-weight: 700; color: var(--fg); }
.cl-footer-chat-text span { font-size: 12px; color: var(--muted-fg); }
.cl-footer-chat-arrow {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--primary-glow); border: 1px solid rgba(73,125,203,0.25);
  display: flex; align-items: center; justify-content: center;
}
.cl-footer-chat-arrow i { font-size: 16px; color: var(--primary); }

/* Bottom row */
.cl-footer-bottom {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 48px;
  align-items: start;
  padding: 36px 0 48px;
  border-top: 0px solid var(--border);
  margin-top: 0px;
}
.cl-footer-copy { font-size: 15px; color: hsl(0,0%,70%); line-height: 1.5; font-weight: 500; }
.cl-footer-nav-col { display: flex; flex-direction: column; gap: 2px; }
.cl-footer-nav-col a, .cl-footer-social-col a {
  font-size: 15px; color: hsl(0,0%,65%);
  text-decoration: none; padding: 5px 0;
  transition: color .15s; display: flex; align-items: center; gap: 8px;
}
.cl-footer-nav-col a:hover, .cl-footer-social-col a:hover { color: var(--fg); }
.cl-footer-social-col { display: flex; flex-direction: column; gap: 2px; }
.cl-footer-social-col a i { font-size: 15px; }

@media(max-width:768px) {
  .cl-footer-card { flex-direction: column; padding: 28px 24px; }
  .cl-footer-bottom { grid-template-columns: 1fr; gap: 28px; }
  .cl-footer-card { margin: 0 0; border-radius: 0; border-left: none; border-right: none; }
}

/* ─── GSAP INIT STATES (set by JS, not CSS – so content is visible if GSAP fails) ── */
.g-fade, .g-left, .g-right, .g-scale { transition: none; }

/* ─── RESPONSIVE ────────────────── */
@media(max-width: 960px) {
  .cl-col8, .cl-col4, .cl-col6 { grid-column: span 12; }
  .cl-steps-grid { grid-template-columns: 1fr; }
  .cl-step-arrow { display: none; }
  .cl-pricing-grid { grid-template-columns: 1fr 1fr; }
  .cl-testi-grid { grid-template-columns: 1fr; }
  .cl-footer-cols { grid-template-columns: 1fr; gap: 32px; }
  .cl-faq-grid { grid-template-columns: 1fr; }
  .cl-proof-bar { flex-direction: column; }
  .cl-proof-stat + .cl-proof-stat::before { display: none; }
  .cl-m-sidebar { width: 148px; }
  .m-stats { grid-template-columns: 1fr 1fr; }
}
@media(max-width: 640px) {
  .cl-nav-links, .cl-nav-actions .cl-btn-ghost { display: none; }
  .cl-pricing-grid { grid-template-columns: 1fr; }
  .cl-mockup-app { height: auto; }
  .m-pipeline { grid-template-columns: 1fr 1fr; }
  .cl-m-sidebar { display: none; }
}
`;

/** GSAP + ScrollTrigger (CDN) — typings for APIs used on this page only. */
type ScrollTriggerSelf = { scroll: () => number }
type ScrollTriggerApi = {
  create: (opts: { start?: string; onUpdate?: (self: ScrollTriggerSelf) => void }) => void
  getAll: () => Array<{ kill: () => void }>
}
type GsapTimeline = {
  fromTo: (
    targets: string,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>,
    position?: string
  ) => GsapTimeline
}
type GsapApi = {
  registerPlugin: (plugin: unknown) => void
  timeline: (opts?: { delay?: number }) => GsapTimeline
  fromTo: (
    targets: string | Element,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>,
    position?: string
  ) => void
  /** GSAP animates DOM nodes, selectors, and plain objects (e.g. counter `{ v: 0 }`). */
  to: (targets: string | Element | Record<string, unknown>, toVars: Record<string, unknown>) => void
  utils: { toArray: (selector: string) => Element[] }
}

function getGsapRuntime(): { gsap: GsapApi; ScrollTrigger: ScrollTriggerApi } | null {
  const w = window as Window & { gsap?: GsapApi; ScrollTrigger?: ScrollTriggerApi }
  if (!w.gsap || !w.ScrollTrigger) return null
  return { gsap: w.gsap, ScrollTrigger: w.ScrollTrigger }
}

export default function HomePage() {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const socialLinks = getSocialLinks();

  useEffect(() => {
    // ── Inject fonts & icons ──────────────────
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&display=swap';
    document.head.appendChild(fontLink);

    const riLink = document.createElement('link');
    riLink.rel = 'stylesheet';
    riLink.href = 'https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css';
    document.head.appendChild(riLink);

    // ── Load GSAP dynamically ─────────────────
    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        document.head.appendChild(s);
      });

    (async () => {
      await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js');

      const runtime = getGsapRuntime();
      if (!runtime) return;
      const { gsap, ScrollTrigger } = runtime;

      gsap.registerPlugin(ScrollTrigger);

      // ── Hero entrance ─────────────────────
      const tl = gsap.timeline({ delay: 0.1 });
      tl.fromTo('#hero-badge',  { opacity:0, y:20, scale:.92 }, { opacity:1, y:0, scale:1, duration:.6, ease:'back.out(1.8)' })
        .fromTo('#h1-line1',    { opacity:0, y:40, skewX:3   }, { opacity:1, y:0, skewX:0, duration:.7, ease:'power3.out' }, '-=.2')
        .fromTo('#h1-line2',    { opacity:0, y:40, skewX:-2  }, { opacity:1, y:0, skewX:0, duration:.7, ease:'power3.out' }, '-=.45')
        .fromTo('#hero-sub',    { opacity:0, y:20 }, { opacity:1, y:0, duration:.6, ease:'power2.out' }, '-=.3')
        .fromTo('#hero-ctas',   { opacity:0, y:20 }, { opacity:1, y:0, duration:.5, ease:'power2.out' }, '-=.3')
        .fromTo('#hero-note',   { opacity:0, y:12 }, { opacity:1, y:0, duration:.5, ease:'power2.out' }, '-=.2')
        .fromTo('#hero-mockup', { opacity:0, y:60, scale:.96 }, { opacity:1, y:0, scale:1, duration:1, ease:'power3.out' }, '-=.2');

      gsap.fromTo('#main-nav', { opacity:0, y:-20 }, { opacity:1, y:0, duration:.8, ease:'power2.out', delay:.05 });

      // ── Scroll reveals ────────────────────
      const reveal = (sel: string, fromVars: Record<string, unknown>) => {
        gsap.utils.toArray(sel).forEach((el, i: number) => {
          gsap.fromTo(el, { opacity:0, ...fromVars }, {
            opacity:1, x:0, y:0, scale:1,
            duration:.75, ease:'power2.out', delay: i * .08,
            scrollTrigger:{ trigger:el, start:'top 88%', toggleActions:'play none none none' }
          });
        });
      };
      reveal('.g-fade',  { y: 36 });
      reveal('.g-left',  { x: -40 });
      reveal('.g-right', { x: 40 });
      reveal('.g-scale', { scale: .9 });

      // Logos stagger
      gsap.fromTo('.cl-logo-item', { opacity:0, y:16 }, {
        opacity:1, y:0, duration:.5, stagger:.07, ease:'power2.out',
        scrollTrigger:{ trigger:'.cl-logos-row', start:'top 90%' }
      });

      // Feature cards stagger
      gsap.utils.toArray('.cl-feat-bento .cl-f-card').forEach((card, i: number) => {
        gsap.fromTo(card, { opacity:0, y:30 }, {
          opacity:1, y:0, duration:.65, ease:'power2.out', delay: i * .1,
          scrollTrigger:{ trigger:card, start:'top 90%', toggleActions:'play none none none' }
        });
      });

      // Mockup float
      gsap.to('.cl-mockup-frame', { y:-12, duration:4, ease:'sine.inOut', repeat:-1, yoyo:true });

      // Step numbers parallax
      gsap.utils.toArray('.cl-step-num').forEach((el) => {
        gsap.to(el, { y:-30, ease:'none', scrollTrigger:{ trigger:el, start:'top bottom', end:'bottom top', scrub:true } });
      });

      // Nav — hide on scroll down, slide back in on scroll up
      const nav = document.getElementById('main-nav');
      if (nav) {
        let lastY = 0;
        let isHidden = false;
        ScrollTrigger.create({
          start: 'top -80',
          onUpdate(self: ScrollTriggerSelf) {
            const y = self.scroll();
            const diff = y - lastY;

            // darken background once past hero
            nav.style.background = y > 60 ? 'hsla(0,0%,100%,0.96)' : 'hsla(0,0%,100%,0.86)';

            if (diff > 4 && !isHidden) {
              // scrolling down → hide
              isHidden = true;
              nav.classList.add('cl-nav--hidden');
              gsap.to(nav, {
                yPercent: -110,
                duration: 0.45,
                ease: 'power3.in',
              });
            } else if (diff < -4 && isHidden) {
              // scrolling up → reveal
              isHidden = false;
              nav.classList.remove('cl-nav--hidden');
              gsap.fromTo(nav,
                { yPercent: -110 },
                {
                  yPercent: 0,
                  duration: 0.5,
                  ease: 'expo.out',
                }
              );
            }
            lastY = y;
          },
        });
      }

      // Pipeline card hover
      document.querySelectorAll('.m-pipe-card').forEach((card) => {
        card.addEventListener('mouseenter', () => gsap.to(card, { scale:1.03, borderColor:'rgba(73,125,203,0.35)', duration:.2 }));
        card.addEventListener('mouseleave', () => gsap.to(card, { scale:1, borderColor:'var(--border)', duration:.2 }));
      });

    })();

    return () => {
      const w = window as Window & { ScrollTrigger?: ScrollTriggerApi }
      w.ScrollTrigger?.getAll().forEach((t) => t.kill())
    }
  }, []);

  return (
    <>
      {/* ── Inline global styles ── */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div id="smooth-wrapper">
        <div id="smooth-content">

          {/* ══ NAV ══ */}
          <nav className="cl-nav" id="main-nav">
            <div className="cl-nav-inner">
              <a href="/" className="cl-nav-logo">
                <Image
                  src="/logo.svg"
                  alt="Clars.ai"
                  width={120}
                  height={32}
                  className="h-8 w-auto"
                  priority
                />
              </a>
              <div className="cl-nav-links">
                <a href="#features">Features</a>
                <a href="#how">How It Works</a>
                <a href="#pricing">Pricing</a>
                <a href="#faq">FAQ</a>
              </div>
              <div className="cl-nav-actions">
                <a href="/signup" className="cl-btn-primary"><i className="ri-arrow-right-up-line" /> Start Free</a>
              </div>
            </div>
          </nav>

          {/* ══ HERO ══ */}
          <section className="cl-hero">
            <div className="cl-hero-grid" />
            <div className="cl-hero-orb cl-hero-orb-1" />
            <div className="cl-hero-orb cl-hero-orb-2" />

            <div className="cl-hero-inner">
              <div id="hero-badge">
                <span className="cl-badge"><span className="pulse" />Now in Beta — Free to Join</span>
              </div>
              <h1>
                <span className="line-wrap"><span id="h1-line1">Every Client Deal,</span></span>
                <span className="line-wrap"><span id="h1-line2"><em>Intelligently Closed.</em></span></span>
              </h1>
              <p className="cl-hero-sub" id="hero-sub">
                Clars.ai is the AI-powered CRM built for freelancers and solo entrepreneurs.
                Know every client, every deal, and every next step — automatically.
              </p>
              <div className="cl-hero-ctas" id="hero-ctas">
      <a href="/signup" className="cl-btn-primary"><i className="ri-flashlight-fill" /> Start for Free</a>
                <a href="/contact" className="cl-btn-ghost"><i className="ri-play-circle-line" /> Watch Demo</a>
              </div>
              <div className="cl-hero-note" id="hero-note">
                <span><i className="ri-shield-check-line" /> No credit card</span>
                <span><i className="ri-gift-line" /> Free forever plan</span>
                <span><i className="ri-time-line" /> Quick to get started</span>
              </div>
            </div>

            {/* Dashboard Mockup */}
            <div className="cl-mockup-wrap" id="hero-mockup">
              <div className="cl-mockup-glow" />
              <div className="cl-mockup-frame">
                <div className="cl-mockup-titlebar">
                  <div className="m-dot" /><div className="m-dot" /><div className="m-dot" />
                  <div className="m-url"><i className="ri-lock-line" />app.clars.ai/pipeline</div>
                  <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
                    <div style={{ background:'var(--secondary)', borderRadius:4, padding:'4px 10px', fontSize:10, color:'hsl(0,0%,60%)', display:'flex', alignItems:'center', gap:4 }}>
                      <i className="ri-notification-3-line" style={{ fontSize:11 }} /> 3
                    </div>
                  </div>
                </div>
                <div className="cl-mockup-app">
                    <div className="cl-m-sidebar">
                    <div className="cl-m-brand">
                      <div className="m-logo">
                        <Image
                          src="/logo.svg"
                          alt="Clars.ai logo"
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className="m-name">clars.ai</span>
                    </div>
                    <div className="m-nav-section">
                      <div className="m-nav-label">Main</div>
                      <div className="m-nav-item active"><i className="ri-kanban-view" /> Pipeline <span className="m-badge">24</span></div>
                      <div className="m-nav-item"><i className="ri-layout-grid-2-line" /> Dashboard</div>
                      <div className="m-nav-item"><i className="ri-group-3-line" /> Clients</div>
                      <div className="m-nav-item"><i className="ri-robot-2-line" /> AI Inbox</div>
                    </div>
                    <div className="m-nav-section">
                      <div className="m-nav-label">Tools</div>
                      <div className="m-nav-item"><i className="ri-calendar-check-line" /> Schedule</div>
                      <div className="m-nav-item"><i className="ri-bill-line" /> Invoices</div>
                      <div className="m-nav-item"><i className="ri-bar-chart-2-line" /> Reports</div>
                    </div>
                  </div>
                  <div className="cl-m-main">
                    <div className="m-topbar">
                      <h2>Pipeline</h2>
                      <div className="m-topbar-actions">
                        <div className="m-chip primary-chip"><i className="ri-sparkling-line" /> AI Active</div>
                        <div className="m-chip"><i className="ri-filter-3-line" /> Filter</div>
                        <div className="m-chip"><i className="ri-add-line" /> Add Deal</div>
                      </div>
                    </div>
                    <div className="m-stats">
                      {[
                        { icon:'ri-money-dollar-circle-line', lbl:'Pipeline', val:'$48.2k', delta:'+18% mo.', up:true },
                        { icon:'ri-focus-3-line', lbl:'Active Deals', val:'24', delta:'3 new', up:true },
                        { icon:'ri-trophy-line', lbl:'Win Rate', val:'68%', delta:'+5%', up:true },
                        { icon:'ri-timer-flash-line', lbl:'Avg Close', val:'12d', delta:'3d faster', up:false },
                      ].map((s, i) => (
                        <div className="m-stat" key={i}>
                          <div className="m-stat-lbl"><i className={s.icon} /> {s.lbl}</div>
                          <div className="m-stat-val">{s.val}</div>
                          <div className="m-stat-delta"><i className={s.up ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />{s.delta}</div>
                        </div>
                      ))}
                    </div>
                    <div className="m-pipeline">
                      {[
                        { head:'Lead', count:'6', cards:[
                          { name:'Ahmed K. — Logo', val:'$800', tag:'tag-muted', icon:'ri-mail-line', label:'New' },
                          { name:'Sara M. — Website', val:'$3,200', tag:'tag-lime', icon:'ri-checkbox-circle-line', label:'Replied' },
                        ]},
                        { head:'Proposal', count:'5', cards:[
                          { name:'TechCorp — CRM', val:'$12,000', tag:'tag-yellow', icon:'ri-send-plane-line', label:'Sent' },
                          { name:'Lena V. — Brand', val:'$2,500', tag:'tag-yellow', icon:'ri-eye-line', label:'Review' },
                        ]},
                        { head:'Negotiation', count:'4', cards:[
                          { name:'Riyadh Store', val:'$8,000', tag:'tag-red', icon:'ri-refresh-line', label:'Counter' },
                        ]},
                        { head:'Won', count:'8', cards:[
                          { name:'Kevin — WooCommerce', val:'$1,800', tag:'tag-lime', icon:'ri-verified-badge-line', label:'Signed' },
                          { name:'Wendy — Store', val:'$4,500', tag:'tag-lime', icon:'ri-verified-badge-line', label:'Signed' },
                        ]},
                      ].map((col, ci) => (
                        <div key={ci}>
                          <div className="m-pipe-head">
                            {col.head}
                            <span className="m-pipe-count" style={col.head==='Won'?{background:'rgba(73,125,203,0.15)',color:'var(--primary)'}:{}}>{col.count}</span>
                          </div>
                          {col.cards.map((c, i) => (
                            <div className="m-pipe-card" key={i}>
                              <div className="m-pipe-card-name">{c.name}</div>
                              <div className="m-pipe-card-val">{c.val}</div>
                              <span className={`m-tag ${c.tag}`}>
                                <i className={c.icon} style={{ fontSize:9 }} /> {c.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══ LOGOS ══ */}
          <div className="cl-logos-strip">
            <div className="cl-container">
              <div className="cl-logos-label">Trusted by freelancers working with</div>
              <div className="cl-logos-row">
                {[
                  { icon:'ri-briefcase-2-line', label:'Fiverr Pro' },
                  { icon:'ri-global-line', label:'Upwork' },
                  { icon:'ri-layout-masonry-line', label:'99designs' },
                  { icon:'ri-user-star-line', label:'Toptal' },
                  { icon:'ri-store-2-line', label:'Malt' },
                  { icon:'ri-medal-line', label:'DesignRush' },
                ].map((l, i) => (
                  <div className="cl-logo-item" key={i}><i className={l.icon} /> {l.label}</div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ FEATURES ══ */}
          <section className="cl-section cl-features-bg" id="features">
            <div className="cl-container">
              <div className="cl-section-header g-fade">
                <span className="cl-badge"><span className="pulse" /> Features</span>
                <h2>One platform.<br />Zero missed deals.</h2>
                <p>Everything you need to run your freelance business — replaced with one AI-powered workspace.</p>
              </div>
              <div className="cl-feat-bento">
                <div className="cl-f-card cl-highlight cl-col8">
                  <div className="cl-f-icon-wrap"><i className="ri-layout-grid-2-fill" /></div>
                  <div className="cl-f-eyebrow">AI Pipeline</div>
                  <h3>Your deals move forward —<br />even when you&apos;re not watching.</h3>
                  <p>Clars reads your messages, extracts deal status, and keeps your pipeline accurate without manual updates.</p>
                  <div className="cl-f-pipeline-mini">
                    {[
                      { head:'Lead', items:[{color:'hsl(0,0%,55%)', label:'Ahmed K.'},{color:'hsl(0,0%,55%)', label:'Sara M.'}] },
                      { head:'Proposal', items:[{color:'#FBBF24', label:'TechCorp'}] },
                      { head:'Won ✓', items:[{color:'var(--primary)', label:'Kevin'},{color:'var(--primary)', label:'Wendy'}] },
                    ].map((col, ci) => (
                      <div className="cl-f-pipe-mini-col" key={ci}>
                        <div className="cl-f-pipe-mini-head">{col.head}</div>
                        {col.items.map((item, ii) => (
                          <div className="cl-f-pipe-mini-item" key={ii}>
                            <span className="cl-f-pipe-dot" style={{ background: item.color }} />{item.label}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="cl-f-card cl-col4">
                  <div className="cl-f-icon-wrap"><i className="ri-robot-2-fill" /></div>
                  <div className="cl-f-eyebrow">AI Inbox</div>
                  <h3>Draft client replies in seconds</h3>
                  <p>Context-aware responses in Arabic or English — ready to send.</p>
                  <div className="cl-f-ai-mock">
                    <div className="cl-f-ai-mock-label"><i className="ri-sparkling-fill" /> AI Drafting…</div>
                    <div className="cl-f-ai-msg">Hi Sarah, thanks so much for your message. I would be happy to help…<span className="cl-f-ai-cursor" /></div>
                  </div>
                </div>
                <div className="cl-f-card cl-col6">
                  <div className="cl-f-icon-wrap"><i className="ri-bar-chart-grouped-fill" /></div>
                  <div className="cl-f-eyebrow">Revenue Tracking</div>
                  <h3>Know where every dollar is</h3>
                  <p>Forecast monthly revenue, track invoices, and spot high-value clients instantly.</p>
                  <div className="cl-f-bars">
                    {[30,50,42,70,85,90,100].map((h, i) => (
                      <div key={i} className={`cl-f-bar${h>=70?' hi':h>=40?' on':''}`} style={{ height:`${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="cl-f-card cl-col6 g-right">
                  <div className="cl-f-icon-wrap"><i className="ri-calendar-todo-fill" /></div>
                  <div className="cl-f-eyebrow">Smart Scheduling</div>
                  <h3>Never miss a follow-up</h3>
                  <p>AI analyzes deal patterns and pings you at the exact moment a client is about to go cold.</p>
                  <div className="cl-f-schedule">
                    {[
                      { time: "09:30", label: "Reply to Sara · Website", tone: "Warm", pill: "Now" },
                      { time: "14:00", label: "Nudge TechCorp · CRM", tone: "At risk", pill: "3 days quiet" },
                      { time: "Tomorrow", label: "Check-in with Ahmed · Logo", tone: "Stable", pill: "Scheduled" },
                    ].map((row, i) => (
                      <div className="cl-f-schedule-row" key={i}>
                        <span className="cl-f-schedule-time">{row.time}</span>
                        <span className="cl-f-schedule-label">{row.label}</span>
                        <span className="cl-f-schedule-pill">{row.pill}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="cl-f-card cl-col6">
                  <div className="cl-f-icon-wrap"><i className="ri-translate-2" /></div>
                  <div className="cl-f-eyebrow">Multilingual</div>
                  <h3>Arabic and English — natively</h3>
                  <p>Full RTL support, bilingual client profiles, and AI that writes naturally in both — built first for MENA freelancers.</p>
                </div>
                <div className="cl-f-card cl-col6">
                  <div className="cl-f-icon-wrap"><i className="ri-links-fill" /></div>
                  <div className="cl-f-eyebrow">Integrations</div>
                  <h3>Plugs into your stack immediately</h3>
                  <p>Connect your tools in one click. Clars pulls data so you never enter anything twice.</p>
                  <div className="cl-f-integrations">
                    {[
                      { icon:'ri-mail-line', label:'Gmail' },
                      { icon:'ri-whatsapp-line', label:'WhatsApp' },
                      { icon:'ri-store-2-line', label:'Fiverr' },
                      { icon:'ri-global-line', label:'Upwork' },
                      { icon:'ri-bank-card-line', label:'Whop' },
                      { icon:'ri-calendar-2-line', label:'Calendly' },
                    ].map((chip, i) => (
                      <div className="cl-f-int-chip" key={i}><i className={chip.icon} /> {chip.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══ HOW IT WORKS ══ */}
          <section className="cl-section" id="how">
            <div className="cl-container">
              <div className="cl-section-header g-fade">
                <span className="cl-badge"><span className="pulse" /> How It Works</span>
                <h2>From first message<br />to signed invoice — fast.</h2>
                <p>Three steps to turn your scattered client conversations into a focused, winning pipeline.</p>
              </div>
              <div className="cl-steps-grid">
                {[
                  { num:'01', icon:'ri-plug-2-fill', title:'Connect your channels', desc:'Link Gmail, WhatsApp, Fiverr, or Upwork. Clars imports every conversation and builds client profiles in seconds — zero manual work.', arrow:true, cls:'g-left' },
                  { num:'02', icon:'ri-robot-2-fill', title:'AI builds your pipeline', desc:"Our AI reads your threads, identifies deal stages, scores leads, and queues up smart follow-up drafts — without you lifting a finger.", arrow:true, cls:'g-fade' },
                  { num:'03', icon:'ri-trophy-fill', title:'Close more, earn more', desc:'Get crystal-clear next actions for every deal. Send proposals, track payments, and watch your win rate climb week over week.', arrow:false, cls:'g-right' },
                ].map((step, i) => (
                  <div className={`cl-step-block ${step.cls}`} key={i}>
                    <div className="cl-step-num">{step.num}</div>
                    <div className="cl-step-ico"><i className={step.icon} /></div>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══ PROOF ══ */}
          <section className="cl-section cl-proof-bg" id="testimonials">
            <div className="cl-container">
              <div className="cl-proof-bar g-scale">
                {[
                  { num:'AI-first', lbl:'From inbox to pipeline, without the busywork' },
                  { num:'One hub', lbl:'Clients, projects, invoices, and insights together' },
                  { num:'Minutes', lbl:'To a workspace you can actually use daily' },
                  { num:'You own it', lbl:'Your CRM data stays yours — export when you need' },
                ].map((s, i) => (
                  <div className="cl-proof-stat" key={i}>
                    <div className="cl-proof-num">{s.num}</div>
                    <div className="cl-proof-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>
              <div className="cl-section-header g-fade" style={{ marginBottom:40 }}>
                <span className="cl-badge"><span className="pulse" /> Testimonials</span>
                <h2>Freelancers who switched<br />never looked back.</h2>
                <p className="mx-auto mt-3 max-w-lg text-xs text-muted-foreground">
                  Illustrative examples — not endorsements; your results will vary.
                </p>
              </div>
              <div className="cl-testi-grid">
                {[
                  { text:'"I was tracking 60 clients in a Google Sheet. Clars.ai replaced three tools in a week. My pipeline visibility went from zero to $22k — because I finally knew what to focus on."', name:'Kevin R.', role:'WooCommerce Developer', color:'var(--primary)' },
                  { text:'"The AI inbox is insane. It reads my email threads and writes the reply before I even think about it. 40% less time on email and closing more than ever."', name:'Leila M.', role:'Brand Designer, Casablanca', color:'hsl(180,60%,40%)' },
                  { text:'"As a solo dev with 10+ clients in KSA, Clars.ai is like having a junior account manager who never sleeps. The Arabic RTL support alone made me switch."', name:'Omar A.', role:'Fullstack Dev, Dubai', color:'hsl(24,80%,50%)' },
                ].map((t, i) => (
                  <div className="cl-testi-card g-fade" key={i}>
                    <div className="cl-testi-stars">{[...Array(5)].map((_,j)=><i className="ri-star-fill" key={j}/>)}</div>
                    <p className="cl-testi-text">{t.text}</p>
                    <div className="cl-testi-author">
                      <div className="cl-testi-ava" style={{ background:t.color }}>
                        <i className="ri-user-3-fill" />
                      </div>
                      <div><div className="cl-testi-name">{t.name}</div><div className="cl-testi-role">{t.role}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══ PRICING ══ */}
          <section className="cl-section" id="pricing">
            <div className="cl-container">
              <div className="cl-section-header g-fade">
                <span className="cl-badge"><span className="pulse" /> Pricing</span>
                <h2>Start free.<br />Scale when you&apos;re ready.</h2>
                <p>No hidden fees. No per-seat traps. Built for how freelancers actually work.</p>
              </div>
              <div className="cl-pricing-tabs g-fade">
                <div className={`cl-ptab${plan==='monthly'?' active':''}`} onClick={()=>setPlan('monthly')}>Monthly</div>
                <div className={`cl-ptab${plan==='annual'?' active':''}`} onClick={()=>setPlan('annual')}>Annual <span className="save">Save 30%</span></div>
              </div>
              <div className="cl-pricing-grid">
                <div className="cl-p-card g-fade">
                  <div className="cl-p-tier">Starter</div>
                  <div className="cl-p-price"><sup>$</sup>0</div>
                  <div className="cl-p-mo">Free forever</div>
                  <div className="cl-p-desc">For freelancers just getting organized with their first CRM.</div>
                  <ul className="cl-p-feats">
                    {['Up to 5 active deals','Basic pipeline view','2 integrations','Email support'].map((f,i)=><li className="cl-p-feat" key={i}><i className="ri-check-line"/>{f}</li>)}
                  </ul>
                  <a href="/signup" className="cl-pb cl-pb-outline">Get Started Free</a>
                </div>
                <div className="cl-p-card g-fade">
                  <div className="cl-p-tier">Growth</div>
                  <div className="cl-p-price"><sup>$</sup>{plan==='annual'?'13':'19'}</div>
                  <div className="cl-p-mo">{plan==='annual'?'per month, billed annually':'per month'}</div>
                  <div className="cl-p-desc">For solo operators ready to automate and close more deals.</div>
                  <ul className="cl-p-feats">
                    {['Unlimited deals','AI Inbox (50 drafts/mo)','All integrations','Revenue forecasting'].map((f,i)=><li className="cl-p-feat" key={i}><i className="ri-check-line"/>{f}</li>)}
                  </ul>
                  <a href="/signup" className="cl-pb cl-pb-outline">Get Started</a>
                </div>
                <div className="cl-p-card featured g-fade">
                  <div className="cl-p-popular"><i className="ri-flashlight-fill" /> Most Popular</div>
                  <div className="cl-p-tier">Pro</div>
                  <div className="cl-p-price"><sup>$</sup>{plan==='annual'?'27':'39'}</div>
                  <div className="cl-p-mo">{plan==='annual'?'per month, billed annually':'per month'}</div>
                  <div className="cl-p-desc">For power freelancers running a real business, not a side hustle.</div>
                  <ul className="cl-p-feats">
                    {['Everything in Growth','Unlimited AI drafts','Arabic / English AI','Invoice & payment tracking','Priority support'].map((f,i)=><li className="cl-p-feat" key={i}><i className="ri-check-line"/>{f}</li>)}
                  </ul>
                  <a href="/signup" className="cl-pb cl-pb-primary">Get Started</a>
                </div>
                <div className="cl-p-card g-fade">
                  <div className="cl-p-tier">Agency</div>
                  <div className="cl-p-price" style={{ fontSize:28, letterSpacing:'-.5px' }}>Custom</div>
                  <div className="cl-p-mo">tailored pricing</div>
                  <div className="cl-p-desc">For small agencies and teams managing multiple clients and freelancers.</div>
                  <ul className="cl-p-feats">
                    {['Everything in Pro','Team workspaces','Client portal','Dedicated CSM'].map((f,i)=><li className="cl-p-feat" key={i}><i className="ri-check-line"/>{f}</li>)}
                  </ul>
                  <a href="/contact" className="cl-pb cl-pb-dark">Talk to Sales</a>
                </div>
              </div>
            </div>
          </section>

          {/* ══ FAQ ══ */}
          <section className="cl-section" id="faq" style={{ background:'var(--surface)' }}>
            <div className="cl-container">
              <div className="cl-section-header g-fade">
                <span className="cl-badge"><span className="pulse" /> FAQ</span>
                <h2>Everything you&apos;re wondering,<br />answered.</h2>
                <p>Still have questions? <a href="/contact" style={{ color:'var(--primary)', textDecoration:'none', fontWeight:700 }}>Message us <i className="ri-arrow-right-line" style={{ fontSize:13, verticalAlign:'middle' }} /></a></p>
              </div>
              <div className="cl-faq-grid g-fade">
                {[
                  { q:'How is Clars.ai different from regular CRMs?', a:'Regular CRMs were built for sales teams. Clars.ai was made specifically for freelancers — lighter, smarter, and AI-first from day one. No sales-speak, no bloat.' },
                  { q:'Does it work with Fiverr and Upwork?', a:'Yes. Clars integrates with Fiverr, Upwork, Gmail, WhatsApp Business, and more. Conversations are auto-synced and turned into deal records.' },
                  { q:'Is Arabic and English supported?', a:'Absolutely. Clars was built with the MENA market in mind. Full RTL, Arabic AI drafts and English — both first-class citizens.' },
                  { q:'Can I import my existing client data?', a:'Yes. Import from Google Sheets, CSV, or directly from HubSpot, Notion, and other CRMs. Migration takes under 10 minutes.' },
                  { q:'Is my data safe and private?', a:'All data is encrypted at rest and in transit. GDPR compliant. Your data is never used to train AI models without explicit consent.' },
                  { q:'Can I cancel anytime?', a:'Yes, cancel anytime — no penalties. Annual plan cancellations get prorated refunds for unused months, no questions asked.' },
                ].map((item, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div
                      className={`cl-faq-item${isOpen ? ' open' : ''}`}
                      key={i}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                    >
                      <div className="cl-faq-q">
                        <span>{item.q}</span>
                        <i
                          className="ri-add-line"
                          style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform .2s' }}
                        />
                      </div>
                      <div
                        className="cl-faq-a"
                        style={{
                          maxHeight: isOpen ? 400 : 0,
                          opacity: isOpen ? 1 : 0,
                          transition: 'max-height .25s ease, opacity .2s ease',
                        }}
                      >
                        {item.a}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ══ CTA ══ */}
          <section className="cl-cta-section">
            <div className="cl-cta-glow" />
            <div className="cl-container">
              <div className="cl-cta-inner g-scale">
                <h2>Know More. Act Faster.<br /><em>Close Smarter.</em></h2>
                <p>Join freelancers who are simplifying how they run client work with Clars.ai.</p>
                <div className="cl-cta-btns">
                  <a href="/signup" className="cl-btn-primary"><i className="ri-flashlight-fill" /> Get Started Free</a>
                  <a href="/contact" className="cl-btn-ghost"><i className="ri-calendar-schedule-line" /> Schedule a Demo</a>
                </div>
              </div>
            </div>
          </section>

          {/* ══ FOOTER ══ */}
<footer className="cl-footer">
  {/* Ghost wordmark */}
  {/* Giant logo mark */}
  {/* Talk to us card */}
  <div className="cl-container">
    <div className="cl-footer-card g-fade">
      <div className="cl-footer-card-left">
        <h4>Would you like to talk to us?</h4>
        <p>We are moving fast, and your feedback is super important. Feel free to schedule a chat with our team =)</p>
      </div>
      <a href="/contact" className="cl-footer-chat-btn">
        <div className="cl-footer-chat-icon">
          <i className="ri-calendar-schedule-line" />
        </div>
        <div className="cl-footer-chat-text">
          <strong>Schedule a chat</strong>
          <span>with one of our founders</span>
        </div>
        <div className="cl-footer-chat-arrow">
          <i className="ri-arrow-right-s-line" />
        </div>
      </a>
    </div>

    {/* Bottom links row */}
    <div className="cl-footer-bottom">
      <p className="cl-footer-copy">© 2026 Clars.ai</p>

      <nav className="cl-footer-nav-col">
        {[
          { label:'Home',           href:'/' },
          { label:'Features',       href:'#features' },
          { label:'Pricing',        href:'#pricing' },
          { label:'Testimonials',   href:'#testimonials' },
          { label:'Log in',         href:'/login' },
          { label:'Privacy Policy', href:'/privacy' },
          { label:'Terms of Service', href:'/terms' },
          { label:'Contact',          href:'/contact' },
        ].map((l, i) => <a href={l.href} key={i}>{l.label}</a>)}
      </nav>

      <div className="cl-footer-social-col">
        {socialLinks.length > 0 ? (
          socialLinks.map((s) => (
            <a href={s.href} key={s.key} target="_blank" rel="noopener noreferrer">
              <i className={s.icon} />{s.label}
            </a>
          ))
        ) : (
          <span className="text-[15px] text-muted-foreground">
            <a href="/contact" className="transition hover:text-foreground">Follow us — get in touch</a>
          </span>
        )}
      </div>
    </div>
  </div>
</footer>

        </div>{/* #smooth-content */}
      </div>{/* #smooth-wrapper */}
    </>
  );
}