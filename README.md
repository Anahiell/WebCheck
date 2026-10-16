# Robot Observatory

Read-only dashboard for Raspberry Pi host metrics and public Anahiell/RobotProj repository status.

Nginx serves an explicit static allowlist and an atomic JSON snapshot. There is no CAN/GPIO/actuator interface, command endpoint, robot executable, or fabricated telemetry. Missing or stale host snapshots hide the readings. Hardware connection state is unknown.

The topology supports dragging, keyboard movement, zoom, saved layout, and pausable illustrative flow particles. Host and repository refresh can be paused separately.

See [deployment and rollback guide](deploy/DEPLOYMENT.md) for Debian ARM64 installation, systemd startup, constrained static updates, SSH prerequisites, named Cloudflare tunnel setup and validation.

Local static preview: `python3 -m http.server 8080 --bind 127.0.0.1` (development only; metrics unavailable). Production uses the Nginx configuration in deploy/.

Tests: `python3 -m unittest discover -s tests -v`. Linux integration checks are in `.github/workflows/observer.yml`.
