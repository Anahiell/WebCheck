#!/bin/sh
# Run only from a reviewed checkout. Never executed by the update timer.
set -eu
[ "$(id -u)" = 0 ] || { echo 'Run with sudo'; exit 1; }
cd "$(dirname "$0")/.."
command -v nginx >/dev/null
command -v git >/dev/null
command -v python3 >/dev/null
for account in observer-metrics observer-update; do
    id "$account" >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin "$account"
done
install -d -m 0755 /srv/observer/releases /usr/local/lib/observer /var/lib/observer
chown observer-metrics:observer-metrics /var/lib/observer
install -d -o observer-update -g observer-update -m 0750 /var/lib/observer-update
if [ ! -d /var/lib/observer-update/repo.git ]; then
    runuser -u observer-update -- git init --bare /var/lib/observer-update/repo.git
fi
install -m 0644 deploy/collect.py deploy/update.py /usr/local/lib/observer/
install -m 0644 deploy/observer-*.service deploy/observer-*.timer /etc/systemd/system/
# Seed the reviewed commit; existing /srv/observer files remain as migration backup.
sha=$(runuser -u "${SUDO_USER:-root}" -- git rev-parse HEAD)
install -d -m 0755 "/srv/observer/releases/$sha"
for name in index.html styles.css app.js topology.js; do
    [ -f "$name" ] && [ ! -L "$name" ]
    install -m 0644 "$name" "/srv/observer/releases/$sha/$name"
done
ln -sfn "/srv/observer/releases/$sha" /srv/observer/.current-install
mv -Tf /srv/observer/.current-install /srv/observer/current
# Validate Nginx BEFORE stopping the old server. Preserve other sites/firewall.
install -m 0644 deploy/observer.nginx /etc/nginx/sites-available/observer
ln -sfn /etc/nginx/sites-available/observer /etc/nginx/sites-enabled/observer
nginx -t
systemctl daemon-reload
systemctl start observer-metrics.service
systemctl disable --now observer.service
systemctl enable --now nginx
systemctl reload nginx
curl --fail --silent http://127.0.0.1:8080/ >/dev/null
systemctl enable --now observer-metrics.timer
echo 'Installed. Enable observer-update.timer only after this commit is merged into main.'
