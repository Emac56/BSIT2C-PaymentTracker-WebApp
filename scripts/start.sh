#!/data/data/com.termux/files/usr/bin/bash
# Start MariaDB (if off) then the BSIT Tracker server.
cd "$(dirname "$0")/.."
termux-wake-lock 2>/dev/null
if ! pgrep -f 'mariadbd|mysqld' >/dev/null; then
  echo "Starting MariaDB..."
  nohup mysqld_safe --datadir="$PREFIX/var/lib/mysql" >/dev/null 2>&1 &
  sleep 6
fi
npm start
