import { Box, Typography, Container } from "@mui/material";

export default function Impressum() {
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
          Impressum
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Angaben gemaess § 5 DDG
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
          Deutschland
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Kontakt
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 2 }}
        >
          E-Mail: kontakt@bytebots.de
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Verantwortlich fuer den Inhalt nach § 18 Abs. 2 MStV
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
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Haftungsausschluss
        </Typography>

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mt: 2, mb: 0.5 }}
        >
          Haftung fuer Inhalte
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, lineHeight: 1.8 }}
        >
          Die Inhalte dieser Seiten wurden mit groesster Sorgfalt erstellt. Fuer
          die Richtigkeit, Vollstaendigkeit und Aktualitaet der Inhalte kann
          jedoch keine Gewaehr uebernommen werden. Als Diensteanbieter bin ich
          gemaess § 7 Abs. 1 DDG fuer eigene Inhalte auf diesen Seiten nach den
          allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG bin ich als
          Diensteanbieter jedoch nicht verpflichtet, uebermittelte oder
          gespeicherte fremde Informationen zu ueberwachen.
        </Typography>

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mt: 2, mb: 0.5 }}
        >
          Haftung fuer Links
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, lineHeight: 1.8 }}
        >
          Diese Website enthaelt Links zu externen Webseiten Dritter, auf deren
          Inhalte ich keinen Einfluss habe. Fuer die Inhalte der verlinkten
          Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
          verantwortlich. Eine permanente inhaltliche Kontrolle der verlinkten
          Seiten ist ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht
          zumutbar.
        </Typography>

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mt: 2, mb: 0.5 }}
        >
          Urheberrecht
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.8 }}
        >
          Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen
          Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfaeltigung,
          Bearbeitung, Verbreitung und jede Art der Verwertung ausserhalb der
          Grenzen des Urheberrechtes beduerfen der schriftlichen Zustimmung des
          jeweiligen Autors bzw. Erstellers.
        </Typography>
      </Container>
    </Box>
  );
}
