# Robot Observatory

A lightweight, responsive engineering dashboard for **RobotProj** running on Raspberry Pi 5.

> **Status: UI prototype.** The dashboard currently uses explicitly labeled simulated telemetry. It does **not** connect to SocketCAN, control actuators, or claim to display real robot data.

## Features

- Dark industrial control-room UI, responsive on mobile and desktop
- Overview of host CPU, memory, temperature and simulated bus traffic
- Per-node cards (Head, Cooling, Eyes, Arms, Base) with connection state
- CAN activity table with ID, direction, DLC and payload
- Event log, simulated warning/healthy status, pause/resume demo
- No external JS dependencies, CDN calls, or build tools

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080` on your Raspberry Pi or LAN.

## Roadmap

1. Define a **read-only** JSON telemetry contract with RobotProj.
2. Implement a small Pi-hosted HTTP/WebSocket bridge to real system status.
3. Add authenticated remote access and explicit connection indicators.
4. Only later consider command controls, with safety interlocks and independent emergency-stop logic.

## Architecture

```
ESP32 nodes <-- CAN --> Raspberry Pi / RobotProj
                                |
                         read-only bridge
                                |
                      Robot Observatory UI
```

The UI must never communicate directly with actuators. Real telemetry is a future integration task. See [GitHub Issues](https://github.com/Anahiell/WebCheck/issues).
