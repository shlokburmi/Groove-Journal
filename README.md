<div align="center">

# ◎ groove

**your sound diary**

*Every day has a soundtrack. Capture yours.*

[Live Demo](https://groove-journal.vercel.app) · [Report Bug](https://github.com/shlokburmi/Groove-Journal/issues) · [Request Feature](https://github.com/shlokburmi/Groove-Journal/issues)

---

</div>

## ✦ What is Groove?

Groove is a **music journal** — a beautiful calendar where you save the songs that defined your days. Upload audio files or paste links from Spotify, YouTube Music, or Apple Music. Each memory becomes a vinyl record you can play back anytime.

## ✦ Features

| | Feature | Description |
|---|---------|-------------|
| 🎵 | **Sound Memories** | Save songs to any date on the calendar |
| 💿 | **Vinyl Playback** | Animated vinyl + tonearm that spins while music plays |
| ✂️ | **Clip Selection** | Save only your favourite moment (start & end time) |
| 🔗 | **Multi-Platform** | Spotify, YouTube Music, Apple Music, or local files |
| 🔐 | **Real OAuth** | Sign in with Spotify or Google (YouTube Music) |
| 📱 | **Responsive** | Works on desktop, tablet, and mobile |
| 🌑 | **Dark Aesthetic** | Moody, premium design inspired by vinyl & journals |

## ✦ Quick Start

```bash
# Clone the repo
git clone https://github.com/shlokburmi/Groove-Journal.git

# Open with Live Server (VS Code) or any static server
# No build step required — it's pure HTML/CSS/JS
```

Or just visit → **[groove-journal.vercel.app](https://groove-journal.vercel.app)**

## ✦ How It Works

```
1. Sign in with Spotify, YouTube Music, Apple Music, or skip as guest
2. Click any date on the calendar
3. Paste a song link or upload an audio file
4. Select your favourite time range (clip)
5. Press "Press into wax" — your memory is saved as a vinyl
6. Click the vinyl anytime to play it back
```

## ✦ Tech Stack

```
HTML  ·  CSS  ·  JavaScript
```

No frameworks. No dependencies. No build tools.  
Just clean, vanilla code — deployed on **Vercel**.

## ✦ Integrations

| Platform | Auth | Playback |
|----------|------|----------|
| **Spotify** | OAuth 2.0 PKCE | Embedded player |
| **YouTube Music** | Google OAuth (Implicit) | YouTube IFrame API |
| **Apple Music** | — | Embedded player |
| **Local Files** | — | HTML5 Audio |

## ✦ Project Structure

```
groove/
├── index.html      ← markup & structure
├── style.css       ← all styles + responsive breakpoints
├── app.js          ← auth, calendar, playback, persistence
└── README.md
```

## ✦ Data & Privacy

All your data stays in your browser (`localStorage`).  
Nothing is sent to any server. No database. No tracking.  
Each user has their own private, independent diary.

---

<div align="center">

**[⭐ Star this repo](https://github.com/shlokburmi/Groove-Journal)** if you like the project!

Made with ♪ by [shlokburmi](https://github.com/shlokburmi)

</div>
