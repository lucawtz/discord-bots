import { Box, Typography, Container } from "@mui/material";
import { useLanguage } from '../i18n/LanguageContext';

export default function Impressum() {
  const { t } = useLanguage();

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
          {t('impressum.title')}
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('impressum.accordingTo')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 2 }}
        >
          {renderWithLineBreaks(t('impressum.address'))}
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('impressum.contact')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 2 }}
        >
          {t('impressum.contactEmail')}
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('impressum.responsibleFor')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 2 }}
        >
          {renderWithLineBreaks(t('impressum.responsibleAddress'))}
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('impressum.disclaimer')}
        </Typography>

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mt: 2, mb: 0.5 }}
        >
          {t('impressum.contentLiability')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, lineHeight: 1.8 }}
        >
          {t('impressum.contentLiabilityText')}
        </Typography>

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mt: 2, mb: 0.5 }}
        >
          {t('impressum.linkLiability')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, lineHeight: 1.8 }}
        >
          {t('impressum.linkLiabilityText')}
        </Typography>

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mt: 2, mb: 0.5 }}
        >
          {t('impressum.copyright')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.8 }}
        >
          {t('impressum.copyrightText')}
        </Typography>
      </Container>
    </Box>
  );
}
