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
- [ ] **Onboarding aktivieren** (Servereinstellungen → Onboarding): „Wegen BeatByte oder EarTastic
      hier?" schaltet die passenden Kanäle frei — größter Conversion-Hebel, aktuell AUS
- [ ] **Willkommensbildschirm** einschalten, mit 2–3 Ziel-Kanälen (aktuell AUS)
- [ ] `#beatbyte-support` / `#eartastic-support` → **Forum-Kanäle** (Tags: Bug · Frage ·
      Web-Player/Dashboard · Gelöst); macht `-bugs`/`-ideen` überflüssig → durchsuchbarer Wissensspeicher
- [ ] `#ankündigungen` + `#changelog` → **Ankündigungs-Kanäle** (NEWS-Feature ist vorhanden),
      damit andere Server sie folgen können
- [ ] **Selbstvergebbare Rollen** (Channels & Roles): `@BeatByte`, `@EarTastic`, `@Ankündigungen`
      (Ping-Opt-in) — bisher nur `Team`/`Bots`
- [ ] **Banner + Invite-Splash** im ByteBots-Look setzen (Server-Icon ist schon gesetzt)
- [ ] Regeln-Screening prüfen (Spam-Schutz beim Beitritt)

**Mit Code (Repo — kann Claude umsetzen):**
- [ ] **Changelog→`#changelog`-Webhook**: neue `CHANGELOG.md`-Einträge automatisch nach Discord
      posten → erledigt „Changelog auf Support-Server aktuell halten" dauerhaft
- [x] **`/support`- + `/invite`-Command** in beide Bots (2026-07-14, `libs/links.js`; noch Prod-`npm run deploy`).
      Offen bleibt nur: `bytebots.de`-Footer auch in die Now-Playing-/Sound-Embeds (s. „Ideen für später")
- [ ] **`#status`-Kanal** aus den Web-APIs (Ports 3001/3002): „🟢 BeatByte / 🟢 EarTastic online"

### Rechtliche Seiten
- [ ] Nutzungsbedingungen-Seite (`/nutzungsbedingungen`) auf bytebots.de erstellen
- [ ] Datenschutz-Seite um die Bots ergänzen (welche Daten speichern BeatByte/EarTastic:
      User-IDs, Playlists, hochgeladene Sounds, …)
- [ ] Beide URLs im Developer Portal eintragen: **General Information →
      Privacy Policy URL / Terms of Service URL** (bei beiden Apps)

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
- [ ] „Deutscher Bot" als Alleinstellungsmerkmal prominent in jede Beschreibung
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
      („German-language music bot" = Nische hervorheben)
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
      Trio mit BeatByte + EarTastic ab, gleiche deutschsprachige Nische, gleiche Web-Dashboard-Logik.
- [ ] **Mehr Sprachen für die Bots (Standardsprachen):** Bot-UI ist aktuell nur Deutsch
      (CLAUDE.md-Konvention). Weitere gängige Sprachen ergänzen — Englisch zuerst, dann z.B.
      Spanisch/Französisch/Portugiesisch. Braucht eine i18n-Ebene für die Bot-Antworten +
      Discord-Command-Lokalisierung (`setNameLocalizations`/`setDescriptionLocalizations`),
      Sprachwahl pro Server oder per Discord-Locale. „Deutsch" bleibt USP, mehrsprachig
      vergrößert die Reichweite (App Directory ist englisch). Website-i18n (`de.js`/`en.js`) analog erweitern.
- [x] `/invite`-Command in beide Bots (teilt Invite-Link + Website) — erledigt 2026-07-14 (zusammen mit `/support`)
- [ ] Dezenter „bytebots.de"-Footer in Embeds
- [ ] Demo-Video/GIF für Website & Listings
- [ ] SEO-Content: „Discord Musik Bot deutsch", „Rythm Alternative"
- [ ] Meta-/OG-Tags der Website prüfen (schöne Link-Vorschau in Discord)
