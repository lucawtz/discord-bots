# ByteBots — Checkliste

Sammelstelle für alles, was nicht vergessen werden darf.

---

## Nicht vergessen (Sonstiges)

<!-- Hier alles eintragen, was sonst nirgends reinpasst -->

### Gmail: alle Postfaecher in ein Fenster mit Auswahl links
Ziel: Ein Gmail-Fenster, links pro Konto ein anklickbares Label (Outlook-Gefuehl).
Aktuell laufen `lucawirtz4@` und `luca@webundprint.de` schon in EIN Postfach; zwei
weitere Konten sollen dazu.
- [ ] Die 2 fehlenden Konten reinholen: **Einstellungen → Konten & Import →
      „E-Mail aus anderen Konten abrufen" → Konto hinzufuegen** und dabei „Eingehende
      Nachrichten mit Label versehen" aktivieren (Label = Kontoname). Alternativ
      Weiterleitung aus den beiden Konten hierher einrichten.
- [ ] Fuer die schon reinkommenden Adressen je einen Filter mit Label bauen:
      **Filter und blockierte Adressen → Neuen Filter erstellen → „An" = Adresse →
      Label anwenden** (`luca@webundprint.de`, `lucawirtz4@…`).
      Beim Test pruefen, ob `to:` oder `deliveredto:` die Mail zuverlaessig findet.
- [ ] **Einstellungen → Labels**: alle Konto-Labels auf „anzeigen", nach oben ziehen,
      einfaerben — das ist dann die Auswahl links.
- [ ] Optional strengere Trennung: **Einstellungen → Posteingang → „Mehrere
      Posteingaenge"** statt/zusaetzlich zu den Labels.
- [ ] Optional zum Antworten mit der richtigen Absenderadresse:
      **Konten & Import → „Senden als"** pro Adresse einrichten.

---

# Technik & Robustheit

Aus dem End-to-End-Test beider Bots (2026-07-13). Nach Hebel sortiert —
kein akuter Bug, alles läuft (BeatByte 31/31, EarTastic 13/13 grün getestet).

## YouTube-Pipeline absichern (größtes Betriebsrisiko)
- [ ] `/play` hängt an yt-dlp + WARP-Proxy + POT-Provider + EJS — vier bewegliche
      Teile, die brechen, sobald YouTube die Signatur ändert oder ein Docker-Alias
      wegfällt. Monitoring bauen (z.B. periodischer `/play`-Selbsttest auf dem
      Server, der bei Stille Alarm schlägt).
- [ ] Klare Fehlermeldung an den Nutzer, wenn ein Stream endgültig fehlschlägt —
      statt stiller Buffering-/Retry-Schleife.

## Monitoring & Alerting
- [x] **Fehler-/Crash-Alerting nach Discord** (2026-07-17, `libs/notify.js`): beide Bots
      posten `unhandledRejection`/`uncaughtException`/`client error` + einen `🟢 online`-Ping
      an einen Webhook (`ALERT_WEBHOOK_URL`), mit Dedup + Rate-Limit. Fehler landen nicht mehr
      nur in den Coolify-Logs, die niemand liest.
- [x] **`ALERT_WEBHOOK_URL` in Coolify setzen** (2026-07-18 verifiziert): bei **beiden** Bots gesetzt
      (`GET /applications/<uuid>/envs`) → Alerting ist scharf, kein No-op mehr. Der Endpoint gibt
      Werte nie zurueck, geprueft ist also nur die Existenz des Keys.
- [ ] Periodischer **`/play`-Selbsttest** auf dem Server, der bei Stille über denselben
      Webhook Alarm schlägt (deckt das YouTube-Pipeline-Risiko oben aktiv ab) — Alert-Weg steht bereits.
- [ ] **`#status`-Kanal** aus den Web-APIs (Ports 3001/3002) — kann denselben Webhook/`notify.js` nutzen.
      *(Dublette zu Phase-1 „#status-Kanal" unten — dort abhaken, wenn erledigt.)*
- [ ] Optional: **Backup-Restore einmal testen** — die täglichen `data/backups/` (7 behalten,
      `database.js`) wurden noch nie zurückgespielt; einmal durchspielen + Mini-Runbook festhalten.

## Testbarkeit & CI
- [ ] `index.js` (2100+ Zeilen, `ctx` mit ~40 Feldern) ist ein Monolith und war
      nicht zum Testen strukturiert (für die Tests musste `client`/`ctx` exportiert
      werden). Schrittweise in Module zerlegen (Queue, Voice, Suche, API).
- [ ] Keine automatischen Verhaltenstests in der CI — nur Syntax-Check + Build.
      Die neuen `bots/*/dev-test.js`-Runner regelmäßig laufen lassen (brauchen
      Live-Dev-Tokens → z.B. Pre-Deploy-Check oder GitHub-Action mit Secret).

## Wartbarkeit
- [ ] Env-Präfix-Mechanik (`MUSIC_`/`SOUNDBOARD_` → `loadEnv`) ist elegant, aber
      Indirektion mit Falle: unpräfixte Namen (`DISCORD_TOKEN` etc.) kollidieren,
      wenn beide Bots in einem Prozess laufen. Für neue Entwickler in
      CLAUDE.md/README dokumentieren.

## Server
- [ ] RAM ist der Engpass (1,9 GB total, swappt bereits ~780 MB) — bremst Prod
      real, nur per Server-Upgrade lösbar. Upgrade einplanen, sobald die
      Nutzerzahl steigt.

---

# Mehrsprachigkeit (i18n)

Ziel (auf Luca-Wunsch): **genau Deutsch + Englisch**, kein offener Mehr-Sprachen-Fahrplan.
Die Website ist schon DE+EN; seit **2026-07-17 sind es auch beide Bots** (Code umgesetzt).
Fallback immer Deutsch.

- [x] **i18n-Ebene für die Bot-Antworten** — **erledigt 2026-07-17**. Geteilte Basis
      `libs/i18n.js` (`t(key, locale, vars)` + `normalizeLocale`), pro Bot ein Katalog
      `src/i18n/de.js`+`en.js` (music-bot 83 Keys, soundboard 35, DE=EN-Parität). music-bot
      über `ctx.t`/`ctx.localeFor`, soundboard über `i18n.localeFor(interaction)` (kein ctx).
- [x] **Discord-Command-Lokalisierung** — **erledigt 2026-07-17**. `setDescriptionLocalizations`
      an allen Command- + Options-Beschreibungen beider Bots (Command-*Namen* bleiben englisch:
      `/play`, `/sound`…); `setNameLocalizations` bei der `/language`-Option (`sprache`→`language`)
      und bei loop/filter-Choices.
- [x] **Sprachwahl pro Server** — **erledigt 2026-07-17**. Neuer `/language`-Command (nur
      „Server verwalten") + `guild_settings.language`-Spalte (music-bot Migration, soundboard
      neue Tabelle). Auflösung: Einstellung > `guildLocale` > User-Locale > `de`.
- [x] **Englisch als Zweitsprache** — **erledigt 2026-07-17** für die gesamte sichtbare
      Bot-Oberfläche (Commands, Embeds, Buttons, Now-Playing). **Bewusst offen:** ~20
      provider-spezifische Wurf-Fehler im music-bot-Such-Stack (z.B. „Keine Ergebnisse")
      bleiben vorerst DE; Web-Player/Dashboard (eigene React-Apps) bleiben vorerst DE.
- [x] **Website-i18n** (`de.js`/`en.js`) — war bereits DE+EN; bleibt konsistent.

---

# Bewerbung & Wachstum

Fahrplan, um BeatByte und EarTastic bekannt zu machen. Reihenfolge: erst Grundlagen,
dann Bot-Listen, Verifizierung erst ab 75 Servern (pro Bot!).

---

## Phase 1: Grundlagen (jetzt)

### Support-Server einrichten
- [x] Discord-Server „ByteBots Support" erstellen (einer für beide Bots reicht)
- [x] Kanäle anlegen: Info + eigene Support-Bereiche pro Bot (BeatByte / EarTastic) + Community
- [x] Servereinstellungen → **Community aktivieren** (Pflicht fürs App Directory später)
- [x] Permanenten Invite-Link erstellen (nicht ablaufend) und notieren
- [x] Link auf der Website einbauen (Footer / Navbar) — `SUPPORT_INVITE`, Footer + Navbar (Desktop-Icon + Mobile), 2026-07-13
- [x] **EarTastic** auf den Server einladen (damit Nutzer beide Bots dort testen können) — live bestätigt 2026-07-13

> **Server-Infos:** Guild-ID `1525977525400895668` · Invite https://discord.gg/F5UdSh5NnY

### Support-Server aufwerten (Ist-Zustand ausgelesen 2026-07-13)
> Server jederzeit read-only prüfbar: `npm run inspect:discord` (`scripts/discord-inspect.js`).
> Ist-Stand: 4 Kategorien (INFO / BEATBYTE / EARTASTIC / COMMUNITY), Rollen `Team`+`Bots`,
> Community + AutoMod an, beide Bots + read-only „ByteBots Admin"-Bot drauf. Offene Hebel:

**Nur in der Discord-UI (du):**
- [x] **Onboarding aktivieren** (Servereinstellungen → Onboarding) — **erledigt 2026-07-15** (per API):
      Prompt „Welchen Bot nutzt du?" (Mehrfachauswahl, beim Beitritt), Optionen 🎵 BeatByte / 🔊 EarTastic
      vergeben die Rollen `BeatByte 🎵`/`EarTastic 🔊`. **MIT Kanal-Gating** (nachgerüstet): die Kategorien
      BeatByte/EarTastic sind für `@everyone` versteckt, die jeweilige Rolle (+ Team + ByteBots Admin) sieht sie →
      Wahl im Onboarding schaltet die passenden Kanäle frei. Simulation bestätigt (BeatByte-Wahl sieht nur BeatByte, usw.).
      ⚠️ Testen nur mit **Zweit-Account ohne Team-Rolle** — Owner/Admins umgehen Kanalrechte und sehen immer alles.
      Discord-Mindest-Regel (≥7 sichtbar/≥5 schreibbar) wird formal unterschritten, greift aber nicht rückwirkend
      (Onboarding blieb aktiv); saubere Ausbaustufe: 2–3 öffentliche Community-Kanäle ergänzen.
- [x] **Willkommensbildschirm** einschalten, mit 2–3 Ziel-Kanälen — **erledigt 2026-07-15** (per API gesetzt:
      Beschreibung + 📢 #regeln / 🎵 #beatbyte-support / 🔊 #eartastic-support; `WELCOME_SCREEN_ENABLED` aktiv). Vorlage: `.devtools/support-server-setup.md` §2
- [ ] `#beatbyte-support` / `#eartastic-support` → **Forum-Kanäle** (Tags: Bug · Frage ·
      Web-Player/Dashboard · Gelöst); macht `-bugs`/`-ideen` überflüssig → durchsuchbarer Wissensspeicher
- [ ] `#ankündigungen` + `#changelog` → **Ankündigungs-Kanäle** (NEWS-Feature ist vorhanden),
      damit andere Server sie folgen können
- [~] **Selbstvergebbare Rollen** (Channels & Roles): `@BeatByte`, `@EarTastic`, `@Ankündigungen`
      (Ping-Opt-in) — bisher nur `Team`/`Bots`. **2026-07-15:** `BeatByte 🎵` (#a855f7) + `EarTastic 🔊` (#22d3ee)
      per API angelegt (pingbar, via Onboarding-Prompt vergebbar; Emoji im Namen → keine Kollision mit den Bot-Rollen).
      **Offen:** `@Ankündigungen` + optional die Rollen zusätzlich unter „Channels & Roles" self-serve schalten.
- [ ] **Banner + Invite-Splash** im ByteBots-Look setzen (Server-Icon ist schon gesetzt)
      → Grafiken FERTIG im ByteBots-Look: `.devtools/banner-bytebots.*` + `splash-bytebots.*`.
      ⛔ **Upload durch Discord gesperrt bis Boost:** Invite-Splash braucht Boost-Level 1 (2 Boosts),
      Banner Boost-Level 2 (7 Boosts) — Server hat 0. Upload-Steps in `.devtools/support-server-setup.md` §1
- [ ] Regeln-Screening prüfen (Spam-Schutz beim Beitritt)

**Mit Code (Repo — kann Claude umsetzen):**
- [ ] **Changelog→`#changelog`-Webhook**: neue `CHANGELOG.md`-Einträge automatisch nach Discord
      posten → erledigt „Changelog auf Support-Server aktuell halten" dauerhaft
- [x] **`/support`- + `/invite`-Command** in beide Bots (2026-07-14, `libs/links.js`; noch Prod-`npm run deploy`).
      Offen bleibt nur: `bytebots.de`-Footer auch in die Now-Playing-/Sound-Embeds (s. „Ideen für später")
- [ ] **`#status`-Kanal** aus den Web-APIs (Ports 3001/3002): „🟢 BeatByte / 🟢 EarTastic online"

### Rechtliche Seiten
- [x] Nutzungsbedingungen-Seite (`/nutzungsbedingungen`) auf bytebots.de erstellen —
      **erledigt 2026-07-15** (`pages/Nutzungsbedingungen.jsx`, 10 Abschnitte, Route + Footer-Link, i18n de+en)
- [x] Datenschutz-Seite um die Bots ergänzen (welche Daten speichern BeatByte/EarTastic:
      User-IDs, Playlists, hochgeladene Sounds, …) — **erledigt 2026-07-15** (Datenschutz §6:
      aus den DB-Schemata verifiziert — Playlists/Historie/Likes/Follows + Guild-Settings; Sounds/Favoriten/Volume;
      Web-Login via Discord-OAuth; inkl. Hosting Hetzner/DE, Rechtsgrundlagen, Löschung; de+en)
- [ ] Beide URLs im Developer Portal eintragen: **General Information →
      Privacy Policy URL / Terms of Service URL** (bei beiden Apps) —
      URLs stehen bereit: `bytebots.de/nutzungsbedingungen` bzw. `/datenschutz`

### Developer-Portal-Hygiene
- [ ] 2FA auf dem Discord-Account aktivieren
- [ ] Prüfen, welche Privileged Intents aktiviert sind — ungenutzte abschalten
      (Slash-Command-Bots brauchen meist weder Message Content noch Members Intent)
- [ ] Optional: Team anlegen und beide Apps ins Team übertragen

---

## Phase 2: Bot-Listen (jetzt — keine Mindestgrenze)

- [ ] **top.gg**: beide Bots eintragen (Beschreibung DE/EN, Tags, Support-Server-Link)
- [ ] discordbotlist.com eintragen
- [ ] discords.com/bots eintragen
- [ ] botlist.me eintragen
- [ ] Gute Screenshots/Assets erstellen: Now-Playing-Embed mit Fortschrittsbalken,
      Web Player, Soundboard-Dashboard (werden auch fürs App Directory gebraucht)
- [ ] **Mehrsprachig** (DE + EN) konsistent in jede Beschreibung — passend zur Website-Positionierung
      (2026-07-15), nicht mehr als „nur deutscher Bot" vermarkten
- [ ] Optional: top.gg-Vote-Webhook einbauen, Votern kleinen Perk geben

---

## Phase 3: Feedback-Phase (laufend)

- [ ] Feedback aus `#feedback` / `#bug-report` sammeln und priorisieren
- [ ] Changelog auf Website & Support-Server aktuell halten
- [ ] In Reddit-Threads (r/discordapp, r/Discord_Bots) antworten, wo nach
      Musik-/Soundboard-Bots gefragt wird — nicht spammen
- [ ] Server-Anzahl im Blick behalten (Developer Portal)

---

## Phase 4: Verifizierung (ab 75 Servern, pro Bot — nicht bis 100 warten!)

> Bei 100 Servern kann ein unverifizierter Bot keinen Servern mehr beitreten.
> Prozess dauert Tage bis Wochen → bei ~75 starten.
> Verifizierung ist KEIN Feature-Freeze — danach normal weiterentwickeln.

- [ ] Developer Portal → App → Tab **„App Verification"** öffnen
- [ ] Identitätsprüfung über Stripe Identity durchlaufen (Ausweis + Selfie)
- [ ] Bot-Funktionalität ehrlich und konkret beschreiben
- [ ] Antrag absenden, auf Freigabe warten

---

## Phase 5: App Directory (nach Verifizierung)

- [ ] Developer Portal → App → Tab **„Discovery"** öffnen
- [ ] Kurz- & Langbeschreibung auf Englisch schreiben
      (mehrsprachig positionieren — DE + EN; nicht als reinen deutschen Bot vermarkten)
- [ ] Tags wählen: BeatByte → Music/Entertainment, EarTastic → Entertainment/Fun
- [ ] Bis zu 5 Bilder/Videos hochladen (min. 1 Pflicht — Assets aus Phase 2)
- [ ] Support-Server verlinken (muss Community-Server sein ✓ Phase 1)
- [ ] Alle Checks grün? → **„Enable Discovery"** klicken

---

## Ideen für später

- [ ] **Verwaltungs-Bot als drittes ByteBots-Produkt:** den read-only „ByteBots Admin"-Bot
      (aktuell nur Server-Inspektion, `scripts/discord-inspect.js`) später zu einem vollwertigen
      Verwaltungs-/Moderations-Bot ausbauen und verkaufen — z.B. Moderation (Warn/Mute/Ban,
      AutoMod), Reaction-Roles, Willkommen/Onboarding, Ticket-System, Audit-Logging. Rundet das
      Trio mit BeatByte + EarTastic ab, gleiche mehrsprachige Nische, gleiche Web-Dashboard-Logik.
- [x] `/invite`-Command in beide Bots (teilt Invite-Link + Website) — erledigt 2026-07-14 (zusammen mit `/support`)
- [ ] Dezenter „bytebots.de"-Footer in Embeds
- [ ] Demo-Video/GIF für Website & Listings
- [x] SEO-Content: „Discord Musik Bot deutsch", „Rythm Alternative" — **erledigt 2026-07-15**
      (keyword-reicher Titel/Description in `index.html` inkl. beider Keywords, `keywords`/`author`/`canonical`,
      `robots.txt` + `sitemap.xml` mit 12 Routen)
- [x] Meta-/OG-Tags der Website prüfen (schöne Link-Vorschau in Discord) — **erledigt 2026-07-15**
      (vollständige Open-Graph-/Twitter-Tags mit absoluter Bild-URL + `summary_large_image` + `og:locale`;
      neues OG-Banner `public/og-image.png` 1200×630)
