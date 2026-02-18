AST [AiSeekTruth] - Icon Package
================================

This package contains all logo and icon files for the AiSeekTruth project.

FILES INCLUDED:
===============

1. ast-favicon.svg (64x64)
   - Browser favicon
   - Use in: website/ast-favicon.svg
   - Referenced in: website/index.html

2. ast-logo.svg (400x400)
   - Main logo with terminal window
   - Use in: website/ast-logo.svg
   - For: Marketing, social media, website header

3. ast-icon-256.svg (256x256)
   - Medium resolution app icon
   - Use in: build/icons/ast-icon-256.svg
   - For: Taskbar, dock icons

4. ast-icon-512.svg (512x512)
   - High resolution app icon
   - Use in: build/icons/ast-icon-512.svg
   - For: macOS .app, Windows .exe, Linux .desktop

INSTALLATION:
=============

Option 1: Manual Copy
---------------------
1. Extract this zip file
2. Copy files to your AiSeekTruth project:
   
   cp ast-favicon.svg ~/Projects/AiSeekTruth/website/
   cp ast-logo.svg ~/Projects/AiSeekTruth/website/
   cp ast-icon-256.svg ~/Projects/AiSeekTruth/website/
   cp ast-icon-512.svg ~/Projects/AiSeekTruth/website/
   cp ast-icon-256.svg ~/Projects/AiSeekTruth/build/icons/
   cp ast-icon-512.svg ~/Projects/AiSeekTruth/build/icons/

Option 2: Upload to Claude Code
--------------------------------
1. Download this zip file
2. In terminal, navigate to your project:
   cd ~/Projects/AiSeekTruth

3. Upload the zip to terminal (drag & drop or use upload feature)

4. Extract:
   unzip ast-icons.zip
   
5. Move files:
   mv icons/*.svg website/
   cp website/ast-icon-*.svg build/icons/

Option 3: Use Claude Code to Download
--------------------------------------
1. Start Claude Code:
   cd ~/Projects/AiSeekTruth
   claude code

2. Tell Claude Code:
   "Download the icon files from the chat and place them in:
    - website/ (all 4 SVG files)
    - build/icons/ (ast-icon-256.svg and ast-icon-512.svg)"

COLORS:
=======
- Primary: #00ff41 (Terminal Green)
- Accent: #00ffff (Cyan)
- Background: #000000 (Black)

All icons use terminal/hacker aesthetic with neon green glow effects.

USAGE:
======

In website/index.html:
<link rel="icon" type="image/svg+xml" href="ast-favicon.svg">
<link rel="apple-touch-icon" href="ast-icon-256.svg">

In package.json (electron-builder):
"build": {
  "mac": {
    "icon": "build/icons/ast-icon-512.svg"
  },
  "win": {
    "icon": "build/icons/ast-icon-512.svg"
  },
  "linux": {
    "icon": "build/icons/ast-icon-512.svg"
  }
}

DESIGN NOTES:
=============
- All icons have transparent backgrounds
- Terminal window aesthetic
- Monospace "AST" text
- Glowing effects (use filters for rendering)
- Scalable vector format (SVG)

Created by: Claude AI
For: github.com/LoFiTerminal/AiSeekTruth
License: GPL-3.0 (same as project)
