#!/usr/bin/env bash
# Первичная подготовка VPS (Ubuntu 22.04/24.04). Запускать один раз от root:
#   bash scripts/server-setup.sh
# После выполнения: вход по SSH только ключом, пользователь deploy, UFW 22/80/443, fail2ban, Docker.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get -y upgrade
apt-get install -y ufw fail2ban ca-certificates curl git

# Пользователь deploy без парольного логина
if ! id deploy >/dev/null 2>&1; then
  useradd -m -s /bin/bash deploy
fi
mkdir -p /home/deploy/.ssh
# Скопируйте свой публичный ключ в authorized_keys до запуска или положите его рядом:
if [ -f /root/.ssh/authorized_keys ]; then
  cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
fi
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
[ -f /home/deploy/.ssh/authorized_keys ] && chmod 600 /home/deploy/.ssh/authorized_keys

# SSH: запрет root-логина и входа по паролю
cat >/etc/ssh/sshd_config.d/99-buty.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
EOF
systemctl reload ssh || systemctl reload sshd || true

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable --now fail2ban

# Docker + compose plugin
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker deploy

# Каталог приложения
mkdir -p /opt/buty /opt/buty-backups
chown -R deploy:deploy /opt/buty /opt/buty-backups

echo "Готово. Дальше от пользователя deploy:"
echo "  cd /opt/buty && git clone <repo> ."
echo "  cp .env.example .env  # заполнить DOMAIN, POSTGRES_PASSWORD, NEXTAUTH_SECRET, CRON_SECRET, ADMIN_EMAILS"
echo "  docker compose -f docker-compose.prod.yml up -d --build"
