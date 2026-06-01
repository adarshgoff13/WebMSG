# WebMSG

WebMSG is a serverless, Peer-to-Peer (P2P) messaging web application built with vanilla HTML, CSS, and JavaScript. It utilizes **PeerJS (WebRTC)** to connect users directly to each other without needing a backend server or database. The "Server Maker" acts as the host node, and all chat history is securely stored in their browser's local storage.

## Features
- **Zero-Backend Architecture**: P2P messaging using WebRTC.
- **Premium UI**: Glassmorphism, animated backgrounds, and dark mode.
- **Persistent Storage**: Host chat history is saved to browser local storage.
- **Vercel Ready**: Can be deployed easily as a static site.
- **Emoji Support**: Built-in interactive emoji picker.

## Prerequisites for Linux Mint

Because this is a pure frontend application, you do **not** need to install Node.js, `npm`, or any external Python modules! 
Everything you need (like the PeerJS network library and icons) is automatically loaded via CDN in your browser.

To serve the files locally for testing on Linux Mint, we will simply use Python 3, which comes **pre-installed** on your operating system.

## How to Run Locally

1. Open your terminal in Linux Mint (`Ctrl + Alt + T`).
2. Navigate to the project folder:
   ```bash
   cd /home/adarsh5/.gemini/antigravity/scratch/termmsg-web
   ```
3. Start a local static web server using Python 3's built-in HTTP module:
   ```bash
   python3 -m http.server 8000
   ```
4. Open your web browser (like Firefox or Chrome) and go to:
   [http://localhost:8000](http://localhost:8000)

*(Pro tip: Open a normal tab to act as the Host, and an Incognito/Private tab to act as the Guest to test the connection locally!)*

## Modules / Dependencies
- **Frontend Libraries**: Loaded automatically via internet links in `index.html`.
  - [PeerJS](https://peerjs.com/) (P2P Networking)
  - [Phosphor Icons](https://phosphoricons.com/)
- **Python Modules**: **None**. No `pip install` is required. The `requirements.txt` is intentionally empty.