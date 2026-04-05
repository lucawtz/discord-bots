# Server Management Dashboard — UI/UX Konzept

> Produktdesign-Dokument fuer das Developer-Team
> Version 1.0 | April 2026

---

## 1. Design Foundation

### 1.1 Design-Prinzipien

| Prinzip | Beschreibung |
|---|---|
| **Clarity first** | Jede Information ist sofort erfassbar — kein visuelles Rauschen |
| **Data density** | Maximale Information auf minimalem Raum, ohne ueberladen zu wirken |
| **Action proximity** | Aktionen befinden sich immer dort, wo der Kontext liegt |
| **Progressive disclosure** | Ueberblick zuerst, Details on demand |
| **Zero ambiguity** | Status, Fehler und Warnungen sind eindeutig farbcodiert |

### 1.2 Farbpalette

#### Dark Mode (Primary)

| Rolle | Farbe | Hex | Verwendung |
|---|---|---|---|
| Background | Tiefes Grauschwarz | `#0A0A0B` | Haupthintergrund |
| Surface | Dunkles Grau | `#141417` | Karten, Panels |
| Surface Elevated | Mittleres Grau | `#1C1C21` | Hover-States, Dropdowns |
| Border | Subtiles Grau | `#27272A` | Trennlinien, Kartenraender |
| Border Active | Helles Grau | `#3F3F46` | Fokussierte Elemente |
| Text Primary | Fast-Weiss | `#FAFAFA` | Ueberschriften, wichtige Werte |
| Text Secondary | Gedaempftes Grau | `#A1A1AA` | Labels, Beschreibungen |
| Text Tertiary | Dunkles Grau | `#71717A` | Platzhalter, Timestamps |
| Accent / Primary | Leuchtendes Blau | `#3B82F6` | Primaere Aktionen, Links, aktive Tabs |
| Accent Hover | Helleres Blau | `#60A5FA` | Hover auf Primaer-Elementen |
| Success | Grueon | `#22C55E` | Online, Running, Healthy |
| Warning | Amber | `#F59E0B` | Warnungen, hohe Auslastung |
| Danger | Rot | `#EF4444` | Offline, Crashed, Alerts |
| Info | Cyan | `#06B6D4` | Informative Badges, Links |

#### Light Mode (Optional)

| Rolle | Hex |
|---|---|
| Background | `#FAFAFA` |
| Surface | `#FFFFFF` |
| Border | `#E4E4E7` |
| Text Primary | `#09090B` |
| Text Secondary | `#71717A` |

### 1.3 Typografie

| Kategorie | Font | Gewicht | Groesse | Verwendung |
|---|---|---|---|---|
| Display | Inter | 700 (Bold) | 28px / 1.75rem | Seitentitel |
| Heading 1 | Inter | 600 (Semi) | 22px / 1.375rem | Bereichstitel |
| Heading 2 | Inter | 600 (Semi) | 18px / 1.125rem | Kartentitel |
| Heading 3 | Inter | 500 (Medium) | 15px / 0.9375rem | Untertitel |
| Body | Inter | 400 (Regular) | 14px / 0.875rem | Fliesstext, Labels |
| Small | Inter | 400 (Regular) | 12px / 0.75rem | Timestamps, Badges |
| Code / Mono | JetBrains Mono | 400 | 13px / 0.8125rem | Logs, Pfade, IPs, Terminal |

**Line Height:** 1.5 fuer Body, 1.3 fuer Headings
**Letter Spacing:** -0.01em fuer Headings, normal fuer Body

### 1.4 Spacing & Grid

- **Base Unit:** 4px
- **Spacing Scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px
- **Border Radius:** 6px (Karten), 8px (Modals), 4px (Buttons/Inputs), 9999px (Badges)
- **Grid:** 12-Spalten mit 24px Gutter
- **Max Content Width:** 1440px
- **Sidebar Breite:** 240px (collapsed: 64px)

### 1.5 Micro-Animationen & Hover-Effekte

| Element | Animation | Dauer | Easing |
|---|---|---|---|
| Karten-Hover | `translateY(-1px)` + subtiler Shadow | 150ms | `ease-out` |
| Button-Hover | Hintergrund-Transition | 120ms | `ease-in-out` |
| Sidebar-Collapse | Breite 240px -> 64px, Labels fade-out | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Status-Dot | Sanftes Pulsieren bei `running` | 2s loop | `ease-in-out` |
| Graph-Daten | Line-Draw von links nach rechts | 400ms | `ease-out` |
| Toast/Alert Einfliegen | `translateX(100%) -> 0` + Fade-in | 250ms | `spring` |
| Skeleton Loading | Schimmernder Gradient-Sweep | 1.5s loop | `linear` |
| Tab-Wechsel | Content Crossfade | 150ms | `ease` |
| Dropdown oeffnen | `scaleY(0) -> scaleY(1)` + Fade | 120ms | `ease-out` |
| Modale | Backdrop Fade + Panel `scale(0.95) -> scale(1)` | 200ms | `spring` |

---

## 2. Layout-Struktur

### 2.1 Shell (globales Layout)

```
+------------------------------------------------------------------+
| [=] Logo    Server Overview   Bots   Alerts (3)   [...] [Avatar] |  <- Top Bar (56px)
+--------+---------------------------------------------------------+
|        |                                                         |
| [icon] |                                                         |
| Server |                    CONTENT AREA                         |
| [icon] |                                                         |
| Bots   |                    (scrollbar)                          |
| [icon] |                                                         |
| Deploy |                                                         |
| [icon] |                                                         |
| Files  |                                                         |
| [icon] |                                                         |
| Network|                                                         |
| [icon] |                                                         |
| Alerts |                                                         |
| [icon] |                                                         |
| History|                                                         |
|        +---------------------------------------------------------+
| [icon] |                                                         |
| Users  |                                                         |
|--------+                                                         |
| [icon] |                                                         |
| Config |                                                         |
+--------+---------------------------------------------------------+
```

**Top Bar (56px Hoehe):**
- Links: Hamburger-Icon (Sidebar toggle) + Logo/Produktname
- Mitte: Breadcrumb-Navigation (z.B. `Servers > oracle-prod-01 > Logs`)
- Rechts: Globale Suche (`Ctrl+K`), Notification-Bell mit Badge-Count, Dark/Light-Toggle, User-Avatar mit Dropdown

**Sidebar (240px / 64px collapsed):**
- Icon + Label fuer jeden Bereich
- Aktiver Bereich hervorgehoben mit `Accent` Hintergrund + linkem 2px-Balken
- Unten: Settings-Zahnrad + Collapse-Button
- Collapsed: Nur Icons, Tooltip bei Hover

---

## 3. Dashboard-Bereiche im Detail

---

### 3.1 Server Overview

**Pfad:** `/servers`
**Zweck:** Sofortige Uebersicht ueber alle Server mit Echtzeit-Status

#### Wireframe

```
+------------------------------------------------------------------+
| Server Overview                            [+ Add Server] [Filter]|
+------------------------------------------------------------------+
|                                                                   |
| [Search servers...]                   View: [Grid] [List] [Map]  |
|                                                                   |
| Tags: [All] [Production] [Testing] [Development] [Docker Host]   |
|                                                                   |
+-----------------------------------+-------------------------------+
|                                   |                               |
|  +-----------------------------+  |  +-------------------------+  |
|  | oracle-prod-01        [*ON] |  |  | hetzner-dev-02    [OFF] |  |
|  | 130.61.88.80     Ubuntu 22  |  |  | 168.119.x.x  Debian 12 |  |
|  |                             |  |  |                         |  |
|  | CPU [========--]  78%       |  |  | CPU [----------]   0%   |  |
|  | RAM [======----]  61%       |  |  | RAM [----------]   0%   |  |
|  | DSK [====------]  42%       |  |  | DSK [===-------]  34%   |  |
|  | NET  12.4 MB/s  |  3.1 MB/s|  |  | NET   0.0 MB/s |  0.0  |  |
|  |                             |  |  |                         |  |
|  | Bots: 4 running | 0 stopped |  |  | Bots: 0 running         |  |
|  | Tags: [Production] [Docker] |  |  | Tags: [Development]     |  |
|  | Uptime: 34d 12h             |  |  | Last seen: 2h ago       |  |
|  +-----------------------------+  |  +-------------------------+  |
|                                   |                               |
|  +-----------------------------+  |  +-------------------------+  |
|  | local-test-03        [*ON]  |  |  | backup-srv-04     [*ON] |  |
|  | 192.168.1.50    Windows 11  |  |  | 10.0.0.5    Ubuntu 24   |  |
|  |                             |  |  |                         |  |
|  | CPU [===-------]  32%       |  |  | CPU [==--------]  18%   |  |
|  | RAM [=====-----]  51%       |  |  | RAM [===-------]  29%   |  |
|  | DSK [=======---]  72%       |  |  | DSK [=========-]  89%   |  |
|  | NET   1.2 MB/s  |  0.4 MB/s|  |  | NET   0.1 MB/s |  5.2  |  |
|  |                             |  |  |                         |  |
|  | Bots: 2 running | 1 crashed |  |  | Bots: 1 running         |  |
|  | Tags: [Testing]             |  |  | Tags: [Production]      |  |
|  | Uptime: 5d 3h               |  |  | Uptime: 120d 8h         |  |
|  +-----------------------------+  |  +-------------------------+  |
|                                                                   |
+-------------------------------------------------------------------+
```

#### Listenansicht (alternativ)

```
+------------------------------------------------------------------+
| Name            | IP            | Status | CPU | RAM | DSK | Bots |
+------------------------------------------------------------------+
| oracle-prod-01  | 130.61.88.80  | * ON   | 78% | 61% | 42% | 4/4 |
| backup-srv-04   | 10.0.0.5      | * ON   | 18% | 29% | 89% | 1/1 |
| local-test-03   | 192.168.1.50  | * ON   | 32% | 51% | 72% | 2/3 |
| hetzner-dev-02  | 168.119.x.x  | - OFF  |  -  |  -  | 34% | 0/0 |
+------------------------------------------------------------------+
```

#### Karten-Details

- **Status-Indikator:** Gruener Dot (pulsierend) = Online, Roter Dot = Offline, Gelber Dot = Degraded
- **Ressourcen-Bars:** Farbverlauf: Gruen (0-60%), Gelb (60-80%), Rot (80-100%)
- **Klick auf Karte:** Navigiert zur Server-Detailseite
- **Rechtsklick / Drei-Punkte-Menu:** Quick-Actions (Restart, SSH, View Logs)
- **Drag & Drop:** Server koennen in Gruppen/Tags umsortiert werden

#### Aggregierte Stats (oberer Bereich, optional)

```
+------------+  +------------+  +-------------+  +-----------+
| 4 Servers  |  | 7 Bots     |  | 1 Alert     |  | 99.2%     |
| 3 online   |  | 7 running  |  | DSK > 80%   |  | Uptime    |
+------------+  +------------+  +-------------+  +-----------+
```

---

### 3.2 Server Detailseite

**Pfad:** `/servers/:id`
**Zweck:** Tiefes Monitoring und Management eines einzelnen Servers

#### Wireframe

```
+------------------------------------------------------------------+
| <- Back   oracle-prod-01                 [Restart] [SSH] [Power] |
|           130.61.88.80 | Ubuntu 22.04 | Uptime: 34d 12h         |
|           Tags: [Production] [Docker]    Status: * Online        |
+------------------------------------------------------------------+
|                                                                   |
| [Overview] [Processes] [Logs] [Terminal] [Settings]    <- Tabs   |
|                                                                   |
| == Overview Tab ==================================================|
|                                                                   |
| +---CPU Usage (24h)-------------------+ +---RAM Usage (24h)----+ |
| |                                     | |                      | |
| |         .---.    .                  | |    ___               | |
| |    .--''    '---' '--.              | |  -'   '---.          | |
| | --'                   '---          | | '          '-------- | |
| |                                     | |                      | |
| | Now: 78%    Avg: 64%   Peak: 92%   | | Now: 61%   Avg: 58%  | |
| +-------------------------------------+ +----------------------+ |
|                                                                   |
| +---Disk I/O (24h)-----------------+ +---Network (24h)--------+ |
| |                                   | |                        | |
| |   Read: ____/--\___/--\____      | |  IN:  ....--''--....   | |
| |   Write: --__/--__/--__/--       | |  OUT: ----..--..----   | |
| |                                   | |                        | |
| | Read: 45 MB/s  Write: 12 MB/s    | | In: 12.4 MB/s Out: 3.1| |
| +-----------------------------------+ +------------------------+ |
|                                                                   |
| +---Disk Partitions----------------------------------------------+|
| | Mount     | Size  | Used  |  %   | [==========]               ||
| | /         | 50 GB | 21 GB | 42%  | [====------]               ||
| | /var/log  | 20 GB | 14 GB | 70%  | [=======---]               ||
| | /data     | 100GB | 67 GB | 67%  | [======----]               ||
| +----------------------------------------------------------------+|
|                                                                   |
| +---Running Bots-------------------------------------------------+|
| | Name              | Status  | CPU  | RAM    | Uptime  | Action ||
| | music-bot         | * Run   | 12%  | 210 MB | 34d 12h | [...] ||
| | moderation-bot    | * Run   |  4%  | 145 MB | 34d 12h | [...] ||
| | soundboard-bot    | * Run   |  2%  |  98 MB | 12d 5h  | [...] ||
| | analytics-bot     | * Run   |  1%  |  67 MB | 34d 12h | [...] ||
| +----------------------------------------------------------------+|
+-------------------------------------------------------------------+
```

#### Processes Tab

```
| == Processes Tab =================================================|
|                                                                   |
| [Search processes...]   Filter: [All] [Bots] [System] [Docker]  |
|                                                                   |
| PID    | Name               | User   | CPU  | RAM    | Status    |
| 1024   | music-bot          | ubuntu | 12%  | 210 MB | running   |
| 1056   | moderation-bot     | ubuntu |  4%  | 145 MB | running   |
| 1089   | node (soundboard)  | ubuntu |  2%  |  98 MB | running   |
| 1102   | analytics-bot      | ubuntu |  1%  |  67 MB | running   |
| 892    | nginx              | root   |  1%  |  32 MB | running   |
| 445    | dockerd            | root   |  3%  | 180 MB | running   |
|                                                                   |
| [Kill] [Signal] aktiv wenn Zeile selektiert                      |
```

#### Logs Tab

```
| == Logs Tab ======================================================|
|                                                                   |
| Source: [All ▼] [music-bot ▼] [system ▼]    Level: [All] [Warn] |
| [Search in logs...]                          [Auto-scroll: ON]   |
|                                                                   |
| +---------------------------------------------------------------+|
| | 2026-04-05 14:23:01  INFO   music-bot     Player connected    ||
| | 2026-04-05 14:23:01  INFO   music-bot     Queue: 3 tracks     ||
| | 2026-04-05 14:22:58  WARN   system        CPU spike: 92%      ||
| | 2026-04-05 14:22:45  INFO   nginx         GET /api/health 200 ||
| | 2026-04-05 14:22:30  ERROR  analytics-bot DB timeout 5000ms   ||
| | 2026-04-05 14:22:01  INFO   music-bot     Track ended          ||
| |                                                                ||
| | [=====  Loading older entries...  =====]                       ||
| +---------------------------------------------------------------+|
|                                                                   |
| [Download Logs]  [Clear]                   Showing: last 500 lines|
```

**Log-Farbcodierung:**
- `INFO` = `#A1A1AA` (gedaempftes Grau)
- `WARN` = `#F59E0B` (Amber)
- `ERROR` = `#EF4444` (Rot)
- `DEBUG` = `#06B6D4` (Cyan)
- Timestamps = `#71717A` (Tertiary Text)

#### Terminal Tab (eingebettete SSH-Konsole)

```
| == Terminal Tab ===================================================|
|                                                                    |
| +----------------------------------------------------------------+|
| | ubuntu@oracle-prod-01:~$                                       ||
| | ubuntu@oracle-prod-01:~$ htop                                  ||
| | ubuntu@oracle-prod-01:~$ docker ps                             ||
| | CONTAINER ID   IMAGE          STATUS         NAMES             ||
| | a1b2c3d4e5f6   music-bot      Up 34 days     music-bot         ||
| | f6e5d4c3b2a1   mod-bot        Up 34 days     moderation-bot    ||
| | ubuntu@oracle-prod-01:~$ _                                     ||
| |                                                                ||
| +----------------------------------------------------------------+|
|                                                                    |
| Font: JetBrains Mono 13px | Theme: matches Dashboard Dark Mode   |
```

---

### 3.3 Bot Deployment Panel

**Pfad:** `/bots` (globale Uebersicht) oder `/servers/:id/bots/:botId` (pro Server)
**Zweck:** Verwaltung, Konfiguration und Deployment aller Bots

#### Wireframe — Globale Bot-Uebersicht

```
+------------------------------------------------------------------+
| Bot Management                                   [+ Deploy Bot]  |
+------------------------------------------------------------------+
|                                                                   |
| [Search bots...]        Filter: [All] [Running] [Stopped] [Err] |
|                                                                   |
| +-----------------------------+  +-----------------------------+  |
| | music-bot             * RUN |  | moderation-bot        * RUN |  |
| | Server: oracle-prod-01      |  | Server: oracle-prod-01      |  |
| | Method: Docker              |  | Method: PM2                 |  |
| | Port: 3001                  |  | Port: --                    |  |
| | Uptime: 34d 12h             |  | Uptime: 34d 12h             |  |
| | CPU: 12%  RAM: 210 MB       |  | CPU: 4%   RAM: 145 MB       |  |
| | Restarts: 0                 |  | Restarts: 2                 |  |
| |                             |  |                             |  |
| | [Stop] [Restart] [Logs] [>] |  | [Stop] [Restart] [Logs] [>] |  |
| +-----------------------------+  +-----------------------------+  |
|                                                                   |
| +-----------------------------+  +-----------------------------+  |
| | soundboard-bot        * RUN |  | test-bot            X CRASH |  |
| | Server: oracle-prod-01      |  | Server: local-test-03       |  |
| | Method: Docker              |  | Method: PM2                 |  |
| | Port: 3002                  |  | Port: 3005                  |  |
| | Uptime: 12d 5h              |  | Crashed: 15 min ago         |  |
| | CPU: 2%   RAM: 98 MB        |  | Exit Code: 1 (SIGTERM)      |  |
| | Restarts: 1                 |  | Last Log: "Cannot read..." |  |
| |                             |  |                             |  |
| | [Stop] [Restart] [Logs] [>] |  | [Start] [Logs] [Debug] [>] |  |
| +-----------------------------+  +-----------------------------+  |
```

#### Wireframe — Bot Detail

```
+------------------------------------------------------------------+
| <- Back   music-bot                      [Stop] [Restart] [Edit] |
|           Server: oracle-prod-01 | Docker | Port: 3001           |
|           Status: * Running | Uptime: 34d 12h                   |
+------------------------------------------------------------------+
|                                                                   |
| [Status] [Config] [Env Vars] [Logs] [Deployments]    <- Tabs    |
|                                                                   |
| == Config Tab ====================================================|
|                                                                   |
| +---Deployment Configuration-------------------------------------+|
| |                                                                ||
| | Method:        [Docker ▼]                                      ||
| | Image:         discord-bots/music-bot:latest                   ||
| | Container:     music-bot                                       ||
| | Restart Policy:[unless-stopped ▼]                              ||
| | Network:       bridge                                          ||
| |                                                                ||
| | Port Mappings:                                                 ||
| |   Host 3001  ->  Container 3001                                ||
| |   [+ Add Port]                                                 ||
| |                                                                ||
| | Volume Mounts:                                                 ||
| |   /data/music-bot/logs  ->  /app/logs                          ||
| |   /data/music-bot/config -> /app/config                        ||
| |   [+ Add Volume]                                               ||
| |                                                                ||
| +----------------------------------------------------------------+|
|                                                                   |
| == Env Vars Tab ==================================================|
|                                                                   |
| +---Environment Variables----------------------------------------+|
| |                                                                ||
| | Key                    | Value                    | Actions    ||
| | DISCORD_TOKEN          | ******** [Show]          | [Edit][X]  ||
| | NODE_ENV               | production               | [Edit][X]  ||
| | LOG_LEVEL              | info                     | [Edit][X]  ||
| | DATABASE_URL           | ******** [Show]          | [Edit][X]  ||
| | PORT                   | 3001                     | [Edit][X]  ||
| |                                                                ||
| | [+ Add Variable]                    [Import .env] [Export]     ||
| +----------------------------------------------------------------+|
|                                                                   |
| == Crash Recovery Settings =======================================|
|                                                                   |
| +---Auto-Restart-------------------------------------------------+|
| |                                                                ||
| |  Auto-Restart:          [ON / off]                             ||
| |  Max Restarts:          [ 5 ]  innerhalb von  [ 10 ] Minuten  ||
| |  Restart Delay:         [ 3 ] Sekunden                        ||
| |  Backoff-Strategie:     [Exponential ▼]                       ||
| |  Health Check URL:      [ http://localhost:3001/health ]       ||
| |  Health Check Interval: [ 30 ] Sekunden                       ||
| |                                                                ||
| |  Bei permanentem Crash:                                        ||
| |  [x] Alert senden                                             ||
| |  [ ] Letztes stabiles Image deployen (Rollback)               ||
| |  [ ] Server-Admin benachrichtigen via Discord Webhook          ||
| +----------------------------------------------------------------+|
```

#### Deployment-Methoden Vergleich (im UI als Toggle/Dropdown)

```
+---Docker------------------+---PM2--------------------+---Systemd-----------------+
| Image tag                 | Script path              | Service file path         |
| Container name            | Interpreter (node/bun)   | ExecStart command         |
| Restart policy            | Instances (cluster mode) | Restart= policy           |
| Port mapping              | Max memory restart       | WatchdogSec               |
| Volume mounts             | Log rotation             | Environment file          |
| Network mode              | Cron restart             | After= dependencies       |
| Resource limits           | Watch & reload           | Resource limits (cgroups) |
+---------------------------+------------------------+---------------------------+
```

---

### 3.4 Storage & Files

**Pfad:** `/servers/:id/files`
**Zweck:** Dateien browsen, Backups verwalten, Speicherverbrauch ueberblicken

#### Wireframe

```
+------------------------------------------------------------------+
| Storage & Files — oracle-prod-01                                 |
+------------------------------------------------------------------+
|                                                                   |
| +---Storage Overview---------------------------------------------+|
| |                                                                ||
| |  Total: 50 GB                                                  ||
| |  [===========|=======|====|===|------]                         ||
| |   System 11GB  Bots 7GB  Logs 4GB  Backups 3GB  Free 25GB     ||
| |                                                                ||
| +----------------------------------------------------------------+|
|                                                                   |
| == File Browser ==================================================|
|                                                                   |
| Path: /home/ubuntu/  [Up] [Refresh] [Upload] [New Folder]       |
|                                                                   |
| +----------------------------------------------------------------+|
| | Type | Name                | Size    | Modified         | Act  ||
| | [D]  | bots/               | 1.2 GB  | 2026-04-05 12:00 | ... ||
| | [D]  | backups/            | 3.1 GB  | 2026-04-04 03:00 | ... ||
| | [D]  | logs/               | 890 MB  | 2026-04-05 14:23 | ... ||
| | [D]  | configs/            | 12 MB   | 2026-03-28 09:15 | ... ||
| | [F]  | docker-compose.yml  | 2.4 KB  | 2026-04-01 16:00 | ... ||
| | [F]  | .env                | 340 B   | 2026-03-15 10:00 | ... ||
| | [F]  | deploy.sh           | 1.1 KB  | 2026-04-01 16:00 | ... ||
| +----------------------------------------------------------------+|
|                                                                   |
| == Backup Management =============================================|
|                                                                   |
| +----------------------------------------------------------------+|
| | Name                    | Size   | Date       | Type    | Act  ||
| | full-backup-20260405    | 2.1 GB | 2026-04-05 | Auto    | [R] ||
| | full-backup-20260404    | 2.0 GB | 2026-04-04 | Auto    | [R] ||
| | pre-deploy-20260401     | 1.8 GB | 2026-04-01 | Manual  | [R] ||
| +----------------------------------------------------------------+|
|                                                                   |
| Schedule: Daily at 03:00 UTC | Retention: 7 days | [Configure]  |
| [Create Backup Now]                                              |
```

**Datei-Aktionen (Drei-Punkte-Menu pro Zeile):**
- View / Edit (oeffnet eingebetteten Code-Editor mit Syntax-Highlighting)
- Download
- Rename
- Delete (mit Confirmation-Modal)
- Copy Path

**Speicherverbrauch-Visualisierung:**
- Treemap oder gestapelter Balken
- Farblich nach Kategorie (System, Bots, Logs, Backups, Other)
- Klick auf Segment filtert File-Browser

---

### 3.5 Networking

**Pfad:** `/servers/:id/network`
**Zweck:** Ports, Firewall, Bandbreite und Latenz ueberwachen

#### Wireframe

```
+------------------------------------------------------------------+
| Networking — oracle-prod-01                                      |
+------------------------------------------------------------------+
|                                                                   |
| +---Bandwidth (24h)---------------------------------------------+|
| |                                                                ||
| |  Inbound:  ....--''--.......--''--....    Avg: 8.2 MB/s       ||
| |  Outbound: ----..--..------..--..----    Avg: 2.1 MB/s       ||
| |                                                                ||
| |  Total today:  In: 340 GB  |  Out: 86 GB                      ||
| +----------------------------------------------------------------+|
|                                                                   |
| == Open Ports ====================================================|
|                                                                   |
| +----------------------------------------------------------------+|
| | Port  | Protocol | Service        | State  | Bound To         ||
| | 22    | TCP      | SSH            | LISTEN | 0.0.0.0          ||
| | 80    | TCP      | nginx          | LISTEN | 0.0.0.0          ||
| | 443   | TCP      | nginx (SSL)    | LISTEN | 0.0.0.0          ||
| | 3001  | TCP      | music-bot      | LISTEN | 0.0.0.0          ||
| | 3002  | TCP      | soundboard-bot | LISTEN | 0.0.0.0          ||
| | 5432  | TCP      | postgres       | LISTEN | 127.0.0.1        ||
| +----------------------------------------------------------------+|
|                                                                   |
| == Firewall Rules (iptables / ufw) ==============================|
|                                                                   |
| +----------------------------------------------------------------+|
| | #  | Action | From         | To        | Port  | Protocol     ||
| | 1  | ALLOW  | Anywhere     | *         | 22    | TCP          ||
| | 2  | ALLOW  | Anywhere     | *         | 80    | TCP          ||
| | 3  | ALLOW  | Anywhere     | *         | 443   | TCP          ||
| | 4  | ALLOW  | 10.0.0.0/8   | *         | 3001  | TCP          ||
| | 5  | DENY   | Anywhere     | *         | 5432  | TCP          ||
| | -- | DENY   | Anywhere     | *         | *     | * (default)  ||
| +----------------------------------------------------------------+|
| [+ Add Rule]  [Import]  [Export]                                 |
|                                                                   |
| == Connection Latency ============================================|
|                                                                   |
| +---Ping-Ziele---------------------------------------------------+|
| | Target               | Latency | Status | Packet Loss          ||
| | Cloudflare (1.1.1.1) | 2.1 ms  | * OK   | 0.0%                ||
| | Google (8.8.8.8)     | 3.4 ms  | * OK   | 0.0%                ||
| | hetzner-dev-02       | 18.2 ms | - DOWN | 100%                ||
| | backup-srv-04        | 0.8 ms  | * OK   | 0.0%                ||
| +----------------------------------------------------------------+|
```

---

### 3.6 Alerts & Notifications

**Pfad:** `/alerts`
**Zweck:** Schwellenwert-basiertes Alerting mit konfigurierbaren Regeln

#### Wireframe — Alert-Uebersicht

```
+------------------------------------------------------------------+
| Alerts & Notifications                          [+ Create Rule]  |
+------------------------------------------------------------------+
|                                                                   |
| [Active (3)] [Resolved] [Rules] [Channels]          <- Tabs     |
|                                                                   |
| == Active Alerts =================================================|
|                                                                   |
| +---CRITICAL-----------------------------------------------------+|
| | !  test-bot crashed on local-test-03                           ||
| |    Triggered: 15 min ago | Exit Code: 1                        ||
| |    Last log: "TypeError: Cannot read properties of undefined"  ||
| |    [View Bot] [View Logs] [Acknowledge] [Resolve]             ||
| +----------------------------------------------------------------+|
|                                                                   |
| +---WARNING------------------------------------------------------+|
| | !  Disk usage 89% on backup-srv-04                             ||
| |    Triggered: 2h ago | Threshold: 80% | Current: 89%          ||
| |    Mount: / (50 GB total, 44.5 GB used)                        ||
| |    [View Server] [Acknowledge]                                 ||
| +----------------------------------------------------------------+|
|                                                                   |
| +---WARNING------------------------------------------------------+|
| | !  CPU spike 92% on oracle-prod-01                             ||
| |    Triggered: 4h ago (resolved briefly, re-triggered)          ||
| |    Threshold: 80% | Current: 78% (recovering)                 ||
| |    [View Server] [Acknowledge]                                 ||
| +----------------------------------------------------------------+|
|                                                                   |
| == Alert Rules Tab ===============================================|
|                                                                   |
| +----------------------------------------------------------------+|
| | Rule                  | Threshold | Duration | Target  | State ||
| | CPU High              | > 80%     | 5 min    | All     | ON   ||
| | RAM Critical          | > 90%     | 2 min    | All     | ON   ||
| | Disk Space Low        | > 80%     | instant  | All     | ON   ||
| | Bot Crashed           | exit != 0 | instant  | All     | ON   ||
| | Network Packet Loss   | > 5%      | 1 min    | Prod    | ON   ||
| | High Restart Count    | > 3/10min | 10 min   | All     | OFF  ||
| +----------------------------------------------------------------+|
| [+ Add Rule]                                                     |
|                                                                   |
| == Notification Channels Tab =====================================|
|                                                                   |
| +----------------------------------------------------------------+|
| | Channel              | Type     | Target          | Status     ||
| | #ops-alerts          | Discord  | Webhook URL     | * Active   ||
| | admin@example.com    | Email    | SMTP            | * Active   ||
| | Luca (Push)          | Push     | Browser         | * Active   ||
| +----------------------------------------------------------------+|
| [+ Add Channel]                                                  |
```

#### Alert-Rule Editor (Modal)

```
+--------------------------------------------+
| Create Alert Rule                    [X]   |
+--------------------------------------------+
|                                            |
| Name:    [ CPU High Usage            ]     |
|                                            |
| Metric:  [ CPU Usage %          ▼]        |
|                                            |
| Condition:                                 |
|   [ Greater than ▼]  [ 80 ] [% ▼]        |
|                                            |
| Duration:                                  |
|   Sustain for [ 5 ] [ minutes ▼]          |
|                                            |
| Target:                                    |
|   [x] All Servers                          |
|   [ ] Specific: [Select servers...]        |
|                                            |
| Severity:  ( ) Info  (*) Warning  ( ) Crit |
|                                            |
| Notify via:                                |
|   [x] Discord #ops-alerts                  |
|   [x] Browser Push                         |
|   [ ] Email                                |
|                                            |
| [Cancel]                     [Create Rule] |
+--------------------------------------------+
```

---

### 3.7 Deployment History

**Pfad:** `/deployments`
**Zweck:** Vollstaendiger Audit-Trail aller Deployments und Aenderungen

#### Wireframe

```
+------------------------------------------------------------------+
| Deployment History                            [Deploy Now ▼]     |
+------------------------------------------------------------------+
|                                                                   |
| Filter: [All Servers ▼] [All Bots ▼] [All Users ▼] [Date Range] |
|                                                                   |
| == Timeline ======================================================|
|                                                                   |
| Today, 5. April 2026                                             |
| +----------------------------------------------------------------+|
| | 14:15  music-bot restarted on oracle-prod-01                   ||
| |        By: Luca (manual) | Reason: Config update               ||
| |        Duration: 2.1s | Status: * Success                     ||
| |        [View Diff] [Rollback]                                  ||
| +----------------------------------------------------------------+|
| | 10:30  soundboard-bot deployed on oracle-prod-01               ||
| |        By: GitHub Actions (auto) | Commit: a1b2c3d            ||
| |        Image: soundboard-bot:1.4.2 -> 1.4.3                   ||
| |        Duration: 14.2s | Status: * Success                    ||
| |        Changes: +42 -18 lines in 3 files                      ||
| |        [View Diff] [View Commit] [Rollback]                   ||
| +----------------------------------------------------------------+|
|                                                                   |
| Yesterday, 4. April 2026                                         |
| +----------------------------------------------------------------+|
| | 22:45  test-bot deployment FAILED on local-test-03             ||
| |        By: Luca (manual) | Error: Health check timeout         ||
| |        Image: test-bot:0.9.1 -> 0.9.2                         ||
| |        Auto-rollback to 0.9.1: * Success                      ||
| |        [View Logs] [View Error] [Retry]                        ||
| +----------------------------------------------------------------+|
| | 03:00  Automatic backup on all servers                         ||
| |        By: System (scheduled) | Status: * Success              ||
| |        Servers: 3/3 completed                                  ||
| |        [View Details]                                          ||
| +----------------------------------------------------------------+|
|                                                                   |
| [Load older entries...]                                          |
```

---

### 3.8 User & Permission Management

**Pfad:** `/settings/users`
**Zweck:** Rollenbasierte Zugriffskontrolle (RBAC)

#### Wireframe

```
+------------------------------------------------------------------+
| User & Permissions                              [+ Invite User]  |
+------------------------------------------------------------------+
|                                                                   |
| [Users] [Roles] [Audit Log]                         <- Tabs     |
|                                                                   |
| == Users Tab =====================================================|
|                                                                   |
| +----------------------------------------------------------------+|
| | User             | Email               | Role    | Status      ||
| | Luca Wirtz       | luca@itfabrik.de    | Admin   | * Active    ||
| | Max Mustermann   | max@itfabrik.de     | Dev     | * Active    ||
| | Bot Account      | --                  | Service | * Active    ||
| | Ex-Mitarbeiter   | ex@example.de       | Dev     | - Disabled  ||
| +----------------------------------------------------------------+|
|                                                                   |
| == Roles Tab =====================================================|
|                                                                   |
| +---Admin (full access)-----------------------------------------+|
| | [x] Server: View, Create, Edit, Delete, Power Control         ||
| | [x] Bots: View, Deploy, Start, Stop, Restart, Configure       ||
| | [x] Files: Browse, Edit, Upload, Delete                       ||
| | [x] Network: View, Edit Firewall                              ||
| | [x] Alerts: View, Create, Edit, Acknowledge                   ||
| | [x] Users: Manage                                             ||
| | [x] Deployments: Deploy, Rollback                             ||
| +----------------------------------------------------------------+|
|                                                                   |
| +---Dev---------------------------------------------------------+|
| | [x] Server: View                                              ||
| | [x] Bots: View, Deploy, Start, Stop, Restart                  ||
| | [x] Files: Browse, Edit (keine Loeschrechte)                  ||
| | [x] Network: View                                             ||
| | [x] Alerts: View, Acknowledge                                 ||
| | [ ] Users: --                                                  ||
| | [x] Deployments: Deploy (kein Rollback)                       ||
| +----------------------------------------------------------------+|
|                                                                   |
| +---Support (read-only + basic ops)------------------------------+|
| | [x] Server: View                                              ||
| | [x] Bots: View, Restart                                       ||
| | [x] Files: Browse (read-only)                                 ||
| | [x] Network: View                                             ||
| | [x] Alerts: View                                              ||
| | [ ] Users: --                                                  ||
| | [ ] Deployments: --                                            ||
| +----------------------------------------------------------------+|
|                                                                   |
| [+ Create Custom Role]                                           |
|                                                                   |
| == Audit Log Tab =================================================|
|                                                                   |
| | Time                | User         | Action                    |
| | 2026-04-05 14:15    | Luca Wirtz   | Restarted music-bot       |
| | 2026-04-05 10:30    | GitHub CI    | Deployed soundboard-bot   |
| | 2026-04-04 22:45    | Luca Wirtz   | Deploy test-bot (failed)  |
| | 2026-04-04 16:00    | Max M.       | Edited .env on prod-01    |
```

---

## 4. Responsive Design

### 4.1 Breakpoints

| Breakpoint | Breite | Layout |
|---|---|---|
| Desktop XL | >= 1440px | Sidebar + volle Content-Breite, 4-Spalten Grid |
| Desktop | 1024-1439px | Sidebar + Content, 3-Spalten Grid |
| Tablet | 768-1023px | Collapsed Sidebar (Overlay), 2-Spalten Grid |
| Mobile | < 768px | Bottom Navigation, 1-Spalte, gestackte Karten |

### 4.2 Tablet-Layout (768-1023px)

```
+------------------------------------------------------------------+
| [=]  Server Overview          [Search] [Bell] [Avatar]           |
+------------------------------------------------------------------+
|                                                                   |
| +---oracle-prod-01---+ +---hetzner-dev-02---+                    |
| | * ON    CPU: 78%   | | - OFF              |                    |
| | RAM: 61% DSK: 42%  | | Last: 2h ago       |                    |
| | Bots: 4 running    | | Bots: 0            |                    |
| +--------------------+ +--------------------+                    |
|                                                                   |
| +---local-test-03----+ +---backup-srv-04----+                    |
| | * ON    CPU: 32%   | | * ON    CPU: 18%   |                    |
| | RAM: 51% DSK: 72%  | | RAM: 29% DSK: 89%  |                    |
| | Bots: 2/3          | | Bots: 1 running    |                    |
| +--------------------+ +--------------------+                    |
```

- Sidebar wird zum Overlay (oeffnet ueber Hamburger-Menu)
- Graphen nehmen volle Breite ein und stacken vertikal
- Tabellen werden horizontal scrollbar

### 4.3 Mobile-Layout (< 768px)

```
+-------------------------------+
| [=]  Servers     [Bell] [Ava] |
+-------------------------------+
|                               |
| [Search servers...]           |
|                               |
| Tags: [All] [Prod] [Dev] [>] |
|                               |
| +---------------------------+ |
| | oracle-prod-01      * ON  | |
| | 130.61.88.80              | |
| |                           | |
| | CPU 78%  [========--]     | |
| | RAM 61%  [======----]     | |
| | DSK 42%  [====------]     | |
| |                           | |
| | Bots: 4 running           | |
| | [Production] [Docker]     | |
| +---------------------------+ |
|                               |
| +---------------------------+ |
| | hetzner-dev-02      - OFF | |
| | 168.119.x.x              | |
| | Last seen: 2h ago         | |
| | [Development]             | |
| +---------------------------+ |
|                               |
| +---------------------------+ |
| | local-test-03       * ON  | |
| | ...                       | |
| +---------------------------+ |
|                               |
+-------------------------------+
| [Servers] [Bots] [Alerts] [+] |  <- Bottom Navigation
+-------------------------------+
```

**Mobile-Anpassungen:**
- Bottom Tab Bar (56px) ersetzt Sidebar
- Karten nehmen volle Breite ein (1-Spalte)
- Graphen: vereinfachte Sparklines statt grosse Charts
- Tabellen: Card-View statt Tabellenzeilen
- Aktionen: Bottom Sheet statt Dropdown
- Terminal/SSH: Fullscreen-Modus mit angepasster Tastatur
- Pull-to-Refresh auf allen Listen

---

## 5. Komponenten-Bibliothek (Key Components)

### 5.1 Status Badge

```
  [* Running]     bg: #22C55E/15%   text: #22C55E   dot: pulsing
  [- Offline]     bg: #EF4444/15%   text: #EF4444   dot: static
  [! Warning]     bg: #F59E0B/15%   text: #F59E0B   dot: static
  [~ Deploying]   bg: #3B82F6/15%   text: #3B82F6   dot: spinning
  [? Unknown]     bg: #71717A/15%   text: #71717A   dot: static
```

### 5.2 Resource Bar

```
  Healthy:    [==========---------]  48%    fill: #22C55E
  Warning:    [===============----]  76%    fill: #F59E0B
  Critical:   [==================-]  94%    fill: #EF4444
```

### 5.3 Button Hierarchy

```
  [Deploy Now]       Primary    bg: #3B82F6   text: white    hover: #60A5FA
  [View Logs]        Secondary  bg: transparent  border: #3F3F46  hover: #1C1C21
  [Stop]             Danger     bg: transparent  text: #EF4444  hover: bg #EF4444/10%
  [Acknowledge]      Ghost      bg: transparent  text: #A1A1AA  hover: text #FAFAFA
```

### 5.4 Toast Notifications

```
  +--------------------------------------------+
  | * Deploy successful                    [X] |    bg: #22C55E/10%  border-left: #22C55E
  | music-bot v1.4.3 on oracle-prod-01         |
  +--------------------------------------------+

  +--------------------------------------------+
  | ! Alert triggered                      [X] |    bg: #EF4444/10%  border-left: #EF4444
  | CPU > 80% on oracle-prod-01                |
  +--------------------------------------------+
```

---

## 6. Interaktionsmuster

### 6.1 Globale Suche (Cmd+K / Ctrl+K)

```
+--------------------------------------------+
| > Search servers, bots, commands...        |
+--------------------------------------------+
| Servers                                    |
|   oracle-prod-01         130.61.88.80      |
|   local-test-03          192.168.1.50      |
| Bots                                       |
|   music-bot              oracle-prod-01    |
|   moderation-bot         oracle-prod-01    |
| Commands                                   |
|   Restart music-bot                        |
|   Open SSH to oracle-prod-01               |
|   View system logs                         |
+--------------------------------------------+
```

### 6.2 Confirmation Modals (destruktive Aktionen)

```
+--------------------------------------------+
| Stop music-bot?                      [X]   |
+--------------------------------------------+
|                                            |
|  This will stop the bot on                 |
|  oracle-prod-01. Connected users           |
|  will be disconnected.                     |
|                                            |
|  Type "music-bot" to confirm:              |
|  [                              ]          |
|                                            |
|  [Cancel]                         [Stop]   |
+--------------------------------------------+
```

### 6.3 Keyboard Shortcuts

| Shortcut | Aktion |
|---|---|
| `Ctrl+K` | Globale Suche |
| `G` then `S` | Go to Servers |
| `G` then `B` | Go to Bots |
| `G` then `A` | Go to Alerts |
| `R` | Refresh aktuelle Seite |
| `?` | Shortcut-Hilfe anzeigen |
| `Esc` | Modal/Overlay schliessen |

---

## 7. Technologie-Empfehlung

| Bereich | Empfehlung |
|---|---|
| Frontend Framework | **React 19** + Next.js 15 (App Router) |
| Styling | **Tailwind CSS 4** + Radix UI Primitives |
| Charts | **Recharts** oder **Tremor** |
| Terminal | **xterm.js** (WebSocket-basiert) |
| State Management | **Zustand** oder React Server Components |
| Real-time | **WebSocket** (Socket.io) fuer Live-Metriken |
| Icons | **Lucide Icons** (konsistent, scharf) |
| Code Editor | **Monaco Editor** (fuer Config-Editing) |
| Auth | **NextAuth.js** mit RBAC |
| API | **tRPC** oder REST mit OpenAPI |

---

## 8. Zusammenfassung der Seitenstruktur

```
/                           -> Redirect zu /servers
/servers                    -> Server Overview (Grid/List/Map)
/servers/:id                -> Server Detail (Tabs: Overview, Processes, Logs, Terminal, Settings)
/servers/:id/files          -> Storage & Files
/servers/:id/network        -> Networking
/bots                       -> Globale Bot-Uebersicht
/bots/:id                   -> Bot Detail (Tabs: Status, Config, Env, Logs, Deployments)
/alerts                     -> Alerts (Tabs: Active, Resolved, Rules, Channels)
/deployments                -> Deployment History (Timeline)
/settings/users             -> User Management (Tabs: Users, Roles, Audit Log)
/settings/general           -> Allgemeine Einstellungen (Theme, Notifications, API Keys)
```
