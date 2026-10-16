# Raspberry Pi deployment

## Boundary and reviewed state

Target: robot@robobrain, Debian 13 ARM64. Tailscale discovery on 2026-10-16 returned
100.125.52.39. The existing Windows SSH key was rejected (publickey); no remote
changes have been made by this work. Verify hostname, OS, services, permissions
and port ownership on the actual host before installing. Do not change UFW or
open 8080 to LAN/Internet. Keep a second SSH session during migration.

RobotProj review: `master` contains RobotCore, encoder/decoder and a SocketCAN
wrapper. `main.cpp` has an unfinished `runCan` and does not dispatch `--can`.
CI/software tests and bench prototypes do not establish physical connectivity.
The Observer never clones, builds, updates or runs the robot working checkout.
It reads public GitHub repository, commit and workflow metadata every five minutes.
This is remote repository status, not local deployment/dirty-tree/runtime status.

Only CPU usage, used/total RAM, temperature and uptime are published. No hostname,
IPs, serial numbers, environment, processes, logs, credentials or filesystem paths.
Collector has no capabilities, private devices, hidden home, read-only filesystem
except its state directory, and only INET/INET6/UNIX address families (no AF_CAN).
There is no command endpoint or robot import. Public snapshots are intentionally
public; Cloudflare Access can restrict the entire site if desired.

## SSH prerequisite

Use an existing trusted console/session to add this computer's **public** key to
`/home/robot/.ssh/authorized_keys` if you want Codex to complete deployment.
Never copy a private key. Preserve existing keys and keep permissions 0700 on
`.ssh`, 0600 on `authorized_keys`, owned by robot. The public key fingerprint
observed here is `SHA256:CqrMmBTzrNj9qnz2EjqNVHOb7eT/u8E1Sq+SlwJq7mM`.
Alternatively run the reviewed commands yourself and return their output.

## Preflight and installation

After reviewing and merging the PR, on the Pi:

```sh
hostname
uname -m
cat /etc/os-release
sudo ss -lntp
sudo systemctl cat observer
sudo nginx -T # if already installed; inspect existing listeners/sites
git -C /home/robot/projects/WebCheck status --short
```

Stop if unexpected changes, other 8080 listeners, nonstandard `/srv/observer/current`,
or incompatible existing Nginx config are found. Save the existing service and
Nginx configuration before migration. Keep old `/srv/observer` files for rollback.

```sh
sudo apt update
sudo apt install -y nginx git python3 curl
cd /home/robot/projects/WebCheck
git pull --ff-only origin main
git log -1 --oneline
# Review deploy/ scripts and the commit before running them with sudo.
sudo sh deploy/install.sh
sh deploy/verify.sh
sudo systemctl enable --now observer-update.timer
sudo systemctl list-timers 'observer-*'
sudo ss -lntp
```

Installer validates Nginx before stopping observer.service. If migration fails,
inspect the journal and restore the prior config/service using the rollback below.
Nginx listens on 127.0.0.1:8080; only `/`, four static assets and `/api/status` are
served. Everything else is 404. POST/PUT/DELETE/PATCH are rejected. Autoindex is off.
Distribution Nginx may already have a default :80 site: inspect and disable that
default site if unused; it is outside this loopback site's allowlist. UFW stays intact.

After reboot, verify Nginx, metrics timer, update timer and tunnel service are
enabled and healthy, rerun verify.sh and check the public site. A reboot has not
been performed by Codex. Journal commands:

```sh
sudo journalctl -u observer-metrics -u observer-update -u nginx -n 80 --no-pager
```

## Automated updates and rollback

The root-owned installed updater fetches ONLY WebCheck `main` as observer-update,
with hooks disabled. It checks forward ancestry, file modes and size, copies ONLY
index.html/styles.css/app.js/topology.js into root-owned releases, atomically swaps
current, and restores the old link if the HTTP health check fails. It never runs
downloaded scripts, package installers or builds. GitHub main write access still
grants control over public JavaScript: protect main with required review and CI.
Structural validation is not a proof that a dashboard update is correct; review
and browser tests remain required. Old releases are retained for manual rollback.
Collector, units, updater and Nginx changes require a new reviewed manual install.

```sh
sudo systemctl disable --now observer-update.timer
ls -l /srv/observer/current
ls /srv/observer/releases
# Select a previously verified 40-character SHA from that list:
sudo ln -s /srv/observer/releases/KNOWN_GOOD_SHA /srv/observer/.rollback
sudo mv -Tf /srv/observer/.rollback /srv/observer/current
sh deploy/verify.sh
```

Emergency return to Python service: remove only the Observer Nginx site symlink,
reload Nginx to release 8080, stop both Observer timers, then enable/start the old
observer.service. Its working directory still contains the old static files.
Python's directory listing is restored too: use it only temporarily, preferably
with the public tunnel stopped. Do not remove other Nginx sites or firewall rules.

## Permanent Cloudflare named tunnel (requires a domain/account)

No domain or Cloudflare credentials were supplied, so no DNS route or permanent
tunnel is created automatically. Preferred path: Cloudflare Zero Trust dashboard
→ Networks → Tunnels → create a named Cloudflared tunnel → choose Debian ARM64.
Run its connector installation command locally on the Pi, keeping its token out
of chat, Git and shell logs. Set the published hostname to your chosen domain and
service to `http://127.0.0.1:8080`. Do not expose SSH, robot services or a wildcard
private network route. The connector must run as a systemd service at boot.

Alternatively a locally managed named tunnel uses `/etc/cloudflared/config.yml`:

```yaml
tunnel: YOUR_TUNNEL_UUID
credentials-file: /etc/cloudflared/YOUR_TUNNEL_UUID.json
ingress:
  - hostname: observatory.YOUR_DOMAIN
    service: http://127.0.0.1:8080
  - service: http_status:404
```

Create/login/route DNS using Cloudflare's documented named-tunnel flow. Credentials
must be readable only by the chosen service user/root. Validate ingress, install
the service with the explicit config, and verify public HTTPS and 404/405 behavior.
Disable caching for `/api/status`. Retire the temporary quick tunnel only after
the named hostname passes checks. Package-installed cloudflared is updated via apt,
not the dashboard static updater. No inbound router port forwarding is needed.

References: https://developers.cloudflare.com/tunnel/ and
https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/configuration-file/

## Validation

`python3 -m unittest discover -s tests -v` checks metric computation, repository
allowlisting and stale cache behavior. `deploy/verify.sh` probes Nginx exposure and
HTTP methods. GitHub CI installs the services in an Ubuntu VM and runs these checks;
this does not replace Debian ARM64 host/reboot/tunnel acceptance tests.
Particles use path geometry on requestAnimationFrame, above node layer, and update
after dragging. They are illustrative design flow, not measured CAN packets.
Motion has its own pause button and respects reduced-motion preference.
