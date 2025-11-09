# Papirklips Jagt (Game A)

## Overview
Survival game where player collects paperclips while avoiding obstacles.

## Files
- `game.js` - Main game logic (formerly main.js)

## Gameplay
**Objective**: Survive as long as possible while collecting paperclips

**Controls**:
- Mouse/Touch: Move player
- Click "Start Spillet!" to begin

**Features**:
- Paperclip collection system
- Obstacle avoidance
- Power-ups system
- Survival timer
- Leaderboard with initials

## Game Mechanics
- Player follows mouse/touch position
- Collect paperclips for points
- Avoid obstacles that move randomly
- Power-ups appear periodically
- Session-based anti-cheat system

## Database Integration
- Stores highscores in `leaderboard` table
- Session tokens prevent replay attacks
- Rate limiting: 5 submissions per minute per user

## API Endpoints
- `POST /api/start-game` - Get session token
- `POST /api/submit-score` - Submit score with token
- `GET /api/leaderboard` - Get top 100 scores

## Usage
Game automatically initializes when:
- User clicks "Game A: Papirklips Jagt" in game dialog
- `startGameA()` is called from landing page
