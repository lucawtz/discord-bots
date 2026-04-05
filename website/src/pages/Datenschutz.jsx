import { Box, Typography, Container } from "@mui/material";

export default function Datenschutz() {
  return (
    <Box sx={{ py: 10, px: 3 }}>
      <Container maxWidth="sm">
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 4,
            fontSize: { xs: "1.75rem", md: "2.25rem" },
          }}
        >
          Datenschutzerklaerung
        </Typography>

        {/* 1. Verantwortlicher */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          1. Verantwortlicher
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 2 }}
        >
          Luca Wirtz
          <br />
          Schönecker Straße 14
          <br />
          54570 Mürlenbach
          <br />
          E-Mail: kontakt@bytebots.de
        </Typography>

        {/* 2. Allgemeines */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          2. Allgemeines zur Datenverarbeitung
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          Der Schutz deiner persoenlichen Daten ist mir wichtig. Diese
          Datenschutzerklaerung informiert dich darueber, welche Daten bei der
          Nutzung dieser Website erhoben werden und wie diese verwendet werden.
          Diese Website setzt keine Cookies und verwendet keine Tracking- oder
          Analyse-Tools.
        </Typography>

        {/* 3. Server-Logs */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          3. Server-Log-Dateien
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, lineHeight: 1.8 }}
        >
          Der Hosting-Provider dieser Seiten erhebt und speichert automatisch
          Informationen in sogenannten Server-Log-Dateien, die dein Browser
          automatisch uebermittelt. Dies sind:
        </Typography>
        <Box
          component="ul"
          sx={{
            color: "text.secondary",
            mb: 1,
            pl: 3,
            "& li": { fontSize: "0.875rem", mb: 0.5 },
          }}
        >
          <li>Browsertyp und Browserversion</li>
          <li>Verwendetes Betriebssystem</li>
          <li>Referrer URL</li>
          <li>IP-Adresse (anonymisiert)</li>
          <li>Uhrzeit der Serveranfrage</li>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          Diese Daten sind nicht bestimmten Personen zuordenbar. Eine
          Zusammenfuehrung dieser Daten mit anderen Datenquellen wird nicht
          vorgenommen. Die Erfassung erfolgt auf Grundlage von Art. 6 Abs. 1
          lit. f DSGVO (berechtigtes Interesse an der sicheren Bereitstellung
          der Website).
        </Typography>

        {/* 4. SSL */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          4. SSL-Verschluesselung
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          Diese Seite nutzt aus Sicherheitsgruenden eine SSL-Verschluesselung.
          Eine verschluesselte Verbindung erkennst du daran, dass die
          Adresszeile des Browsers von "http://" auf "https://" wechselt und an
          dem Schloss-Symbol in deiner Browserzeile.
        </Typography>

        {/* 5. Externe Dienste */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          5. Externe Dienste
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          Diese Website laedt Schriftarten von Google Fonts
          (fonts.googleapis.com). Dabei wird eine Verbindung zu Servern von
          Google hergestellt, wobei deine IP-Adresse an Google uebertragen wird.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Weitere Informationen
          findest du in der Datenschutzerklaerung von Google:
          https://policies.google.com/privacy
        </Typography>

        {/* 6. Discord Bot Daten */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          6. Discord Bot Dienste
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          Die auf dieser Website vorgestellten Discord Bots verarbeiten Daten im
          Rahmen der Discord-Plattform. Dazu gehoeren Server-IDs, Channel-IDs
          und Nutzernamen, die fuer die Funktionalitaet der Bots erforderlich
          sind. Diese Daten werden ausschliesslich auf eigenen Servern
          verarbeitet und nicht an Dritte weitergegeben. Die Verarbeitung
          erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
        </Typography>

        {/* 7. Betroffenenrechte */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          7. Deine Rechte
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, lineHeight: 1.8 }}
        >
          Du hast gegenueber mir folgende Rechte hinsichtlich deiner
          personenbezogenen Daten:
        </Typography>
        <Box
          component="ul"
          sx={{
            color: "text.secondary",
            mb: 1,
            pl: 3,
            "& li": { fontSize: "0.875rem", mb: 0.5 },
          }}
        >
          <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
          <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
          <li>Recht auf Loeschung (Art. 17 DSGVO)</li>
          <li>Recht auf Einschraenkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Recht auf Widerspruch (Art. 21 DSGVO)</li>
          <li>Recht auf Datenuebertagbarkeit (Art. 20 DSGVO)</li>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          Zur Ausuebung dieser Rechte kannst du dich jederzeit per E-Mail an
          mich wenden. Darueber hinaus hast du das Recht, dich bei einer
          Datenschutz-Aufsichtsbehoerde ueber die Verarbeitung deiner
          personenbezogenen Daten zu beschweren.
        </Typography>

        {/* 8. Aktualitaet */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          8. Aktualitaet dieser Datenschutzerklaerung
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.8 }}
        >
          Diese Datenschutzerklaerung ist aktuell gueltig und hat den Stand
          April 2026. Durch die Weiterentwicklung der Website oder aufgrund
          geaenderter gesetzlicher Vorgaben kann eine Anpassung dieser
          Datenschutzerklaerung erforderlich werden.
        </Typography>
      </Container>
    </Box>
  );
}
