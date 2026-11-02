# BSIT Tracker: Termux Setup

## 1. Install
```bash
pkg update && pkg upgrade -y
pkg install mariadb nodejs git -y
```

## 2. MariaDB (first time only)
```bash
mariadb-install-db
nohup mysqld_safe --datadir="$PREFIX/var/lib/mysql" >/dev/null 2>&1 &
sleep 6
mariadb -u root
```
Sa loob ng MariaDB prompt (palitan ang password):
```sql
CREATE DATABASE bsit_tracker CHARACTER SET utf8mb4;
CREATE USER 'bsit_tracker'@'localhost' IDENTIFIED BY 'palitan_mo_ito';
CREATE USER 'bsit_tracker'@'127.0.0.1' IDENTIFIED BY 'palitan_mo_ito';
GRANT ALL ON bsit_tracker.* TO 'bsit_tracker'@'localhost';
GRANT ALL ON bsit_tracker.* TO 'bsit_tracker'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```
I-load ang tables (nasa project folder):
```bash
mariadb -u root bsit_tracker < sql/schema.sql
```

## 3. Connect via .env
```bash
cp .env.example .env
nano .env     # ilagay ang parehong password na ginamit sa CREATE USER
```
```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=bsit_tracker
DB_PASSWORD=palitan_mo_ito
DB_NAME=bsit_tracker
```
Binabasa ito ng `server/src/index.js` gamit ang `dotenv`, at ginagamit ng `server/src/db.js`. Huwag i-commit ang `.env`.

## 4. Install at run
```bash
npm install
npm start
```
Buksan sa browser ng phone: `http://localhost:3000`

## 5. Start araw-araw
Isang command lang (MariaDB + server):
```bash
chmod +x scripts/start.sh
echo "alias ct='bash ~/bsit-tracker/scripts/start.sh'" >> ~/.bashrc
source ~/.bashrc
```
Tuwing bubuksan ang Termux, i-type lang: `ct`

**Auto-start pag nag-on ang phone (optional):** i-install ang **Termux:Boot** app, buksan ito nang isang beses, tapos:
```bash
mkdir -p ~/.termux/boot
printf '#!/data/data/com.termux/files/usr/bin/bash\nbash ~/bsit-tracker/scripts/start.sh\n' > ~/.termux/boot/bsit-tracker.sh
chmod +x ~/.termux/boot/bsit-tracker.sh
```
Para hindi patayin ng Android: i-off ang battery optimization para sa Termux at Termux:Boot.

## 6. Problema?
- **"Hindi maabot ang database"**: patay ang MariaDB. Patakbuhin ang `ct` o ang `mysqld_safe` command sa step 2.
- **Access denied**: hindi tugma ang password sa `.env` at sa `CREATE USER`.
- **Walang style / blangko**: hindi pa nag-`npm install` (kailangan ang `bootstrap` package sa `node_modules`).
- **Port busy**: palitan ang `PORT` sa `.env`.

## 7. Updating to a new version
```bash
cd ~/bsit-tracker
mariadb -u root bsit_tracker < sql/migrate_v2.sql   # one time only: adds the notes columns
npm install                                         # installs the Poppins font package
npm start
```
Your existing data is kept.

## 8. Access the database and delete records
```bash
mariadb -u bsit_tracker -p bsit_tracker      # enter your password
```
```sql
SHOW TABLES;
SELECT id, full_name FROM students LIMIT 10;
SELECT * FROM payments ORDER BY id DESC LIMIT 10;
DELETE FROM payments WHERE id = 12;   -- one payment
DELETE FROM students WHERE id = 5;    -- also deletes that student's payments and attendance
EXIT;
```
Always include `WHERE`. `DELETE FROM payments;` with no `WHERE` deletes every row, and there is no undo.

Back up before deleting (and restore if needed):
```bash
mysqldump -u bsit_tracker -p bsit_tracker > backup.sql
mariadb -u bsit_tracker -p bsit_tracker < backup.sql
```
Everything can also be deleted inside the app, each with an "Are you sure?" confirmation.
