# WebMSG

WebMSG is a serverless, Peer-to-Peer (P2P) messaging web application built with vanilla HTML, CSS, and JavaScript. It uses **PeerJS (WebRTC)** to connect users directly without any backend server or database. The "Server Maker" acts as the host node, and all chat history is stored in their browser's local storage.

## Overview

![overview-1](https://github.com/youruser/webmsg/raw/main/docs/screenshots/overview-1.png)
![overview-2](https://github.com/youruser/webmsg/raw/main/docs/screenshots/overview-2.png)

## Features
- **Zero-Backend**: P2P messaging via WebRTC — no server needed.
- **Premium UI**: Glassmorphism, animated backgrounds, dark mode.
- **Persistent Storage**: Host chat history saved to browser local storage.
- **Vercel Ready**: Deploy as a static site with zero config.
- **Emoji Support**: Built-in interactive emoji picker.

## Dependencies

No `npm install`, no `pip install`. Everything loads via CDN:
- [PeerJS](https://peerjs.com/) — P2P networking
- [Phosphor Icons](https://phosphoricons.com/) — icons

The only local requirement is a static file server. Python 3's built-in `http.server` is the easiest option on all platforms.

---

## How to Run Locally

### Debian / Ubuntu / Linux Mint / Lubuntu / Xubuntu / Pop!_OS / Kali

Python 3 comes pre-installed. Just run:

```bash
python3 --version          # should print 3.x.x
```

If missing (unlikely):
```bash
sudo apt update && sudo apt install python3 -y
```

Start the server:
```bash
cd /path/to/webmsg
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser.

---

### Fedora / RHEL / CentOS Stream / AlmaLinux / Rocky Linux

Python 3 is pre-installed on Fedora 28+. On minimal RHEL/CentOS installs it may be missing:

```bash
sudo dnf install python3 -y
```

Start the server:
```bash
cd /path/to/webmsg
python3 -m http.server 8000
```

---

### Arch Linux / Manjaro / EndeavourOS / Garuda

On Arch, the binary is `python`, not `python3`. Install if missing:

```bash
sudo pacman -S python
```

Start the server:
```bash
cd /path/to/webmsg
python -m http.server 8000
```

---

### openSUSE Leap / Tumbleweed / SLES

```bash
sudo zypper install python3
```

Start the server:
```bash
cd /path/to/webmsg
python3 -m http.server 8000
```

---

### Alpine Linux

Alpine doesn't ship Python by default:

```bash
apk add python3 git
```

Start the server:
```bash
cd /path/to/webmsg
python3 -m http.server 8000
```

---

### Windows 10 / 11 / Windows Server 2019+

You have four options — pick whichever fits your setup:

#### Option A — Python (simplest)

1. Download Python 3 from [python.org/downloads](https://www.python.org/downloads/windows/)
2. During install, check **"Add Python to PATH"**
3. Open PowerShell or CMD:

```powershell
cd C:\path\to\webmsg
python -m http.server 8000
```

4. Open `http://localhost:8000` in your browser.

> Windows may prompt to allow Python through the firewall. Allow it for private networks.

#### Option B — Node.js (if Python isn't installed)

1. Install Node.js from [nodejs.org](https://nodejs.org)
2. Run:

```powershell
cd C:\path\to\webmsg
npx serve . -p 8000
```

#### Option C — WSL (Windows Subsystem for Linux)

If you have WSL set up, open your WSL terminal and follow the Debian steps above exactly:

```bash
wsl
cd /path/to/webmsg
python3 -m http.server 8000
```

#### Option D — IIS (Windows Server / advanced)

Copy the project files to `C:\inetpub\wwwroot\webmsg\` and browse to `http://localhost/webmsg`. No extra software needed if IIS is already enabled.

---

### macOS Monterey / Ventura / Sonoma

Python 3 ships with macOS Monterey and later:

```bash
python3 --version
```

If missing or outdated, use Homebrew:

```bash
brew install python3
```

Start the server:
```bash
cd /path/to/webmsg
python3 -m http.server 8000
```

---

## Testing Locally (All Platforms)

Open **two tabs** in your browser:
- Tab 1 (normal) → acts as the **Host**
- Tab 2 (Incognito/Private) → acts as the **Guest**

This simulates a two-user P2P connection on a single machine.