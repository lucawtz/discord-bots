import { Box, Typography, Container } from "@mui/material";
import { useLanguage } from '../i18n/LanguageContext';

export default function Datenschutz() {
  const { t } = useLanguage();

  const s3Items = t('datenschutz.s3Items');
  const s7Items = t('datenschutz.s7Items');

  const renderWithLineBreaks = (text) => {
    if (typeof text !== 'string') return text;
    return text.split('\n').map((line, i, arr) => (
      <span key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  };

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
          {t('datenschutz.title')}
        </Typography>

        {/* 1. Verantwortlicher */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('datenschutz.s1Title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 2 }}
        >
          {renderWithLineBreaks(t('datenschutz.s1Text'))}
        </Typography>

        {/* 2. Allgemeines */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('datenschutz.s2Title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          {t('datenschutz.s2Text')}
        </Typography>

        {/* 3. Server-Logs */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('datenschutz.s3Title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, lineHeight: 1.8 }}
        >
          {t('datenschutz.s3Text')}
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
          {(Array.isArray(s3Items) ? s3Items : []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          {t('datenschutz.s3Footer')}
        </Typography>

        {/* 4. SSL */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('datenschutz.s4Title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          {t('datenschutz.s4Text')}
        </Typography>

        {/* 5. Externe Dienste */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('datenschutz.s5Title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          {t('datenschutz.s5Text')}
        </Typography>

        {/* 6. Discord Bot Daten */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('datenschutz.s6Title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          {t('datenschutz.s6Text')}
        </Typography>

        {/* 7. Betroffenenrechte */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('datenschutz.s7Title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, lineHeight: 1.8 }}
        >
          {t('datenschutz.s7Text')}
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
          {(Array.isArray(s7Items) ? s7Items : []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.8 }}
        >
          {t('datenschutz.s7Footer')}
        </Typography>

        {/* 8. Aktualität */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('datenschutz.s8Title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.8 }}
        >
          {t('datenschutz.s8Text')}
        </Typography>
      </Container>
    </Box>
  );
}
