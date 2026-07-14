import { Box, Typography, Container } from "@mui/material";
import { useLanguage } from '../i18n/LanguageContext';

export default function Nutzungsbedingungen() {
  const { t } = useLanguage();

  const s3Items = t('nutzungsbedingungen.s3Items');

  // Textabschnitte ohne Liste – kompakt datengetrieben gerendert
  const sections = [
    ['s1Title', 's1Text'],
    ['s2Title', 's2Text'],
    // s3 (mit Liste) wird separat gerendert
    ['s4Title', 's4Text'],
    ['s5Title', 's5Text'],
    ['s6Title', 's6Text'],
    ['s7Title', 's7Text'],
    ['s8Title', 's8Text'],
    ['s9Title', 's9Text'],
    ['s10Title', 's10Text'],
  ];

  const Section = ({ titleKey, textKey }) => (
    <>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {t(`nutzungsbedingungen.${titleKey}`)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
        {t(`nutzungsbedingungen.${textKey}`)}
      </Typography>
    </>
  );

  return (
    <Box sx={{ py: 10, px: 3 }}>
      <Container maxWidth="sm">
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, mb: 2, fontSize: { xs: "1.75rem", md: "2.25rem" } }}
        >
          {t('nutzungsbedingungen.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
          {t('nutzungsbedingungen.intro')}
        </Typography>

        {/* 1. + 2. */}
        {sections.slice(0, 2).map(([titleKey, textKey]) => (
          <Section key={titleKey} titleKey={titleKey} textKey={textKey} />
        ))}

        {/* 3. Pflichten (mit Liste) */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {t('nutzungsbedingungen.s3Title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
          {t('nutzungsbedingungen.s3Text')}
        </Typography>
        <Box
          component="ul"
          sx={{
            color: "text.secondary",
            mb: 3,
            pl: 3,
            "& li": { fontSize: "0.875rem", mb: 0.5, lineHeight: 1.7 },
          }}
        >
          {(Array.isArray(s3Items) ? s3Items : []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </Box>

        {/* 4. – 10. */}
        {sections.slice(2).map(([titleKey, textKey]) => (
          <Section key={titleKey} titleKey={titleKey} textKey={textKey} />
        ))}
      </Container>
    </Box>
  );
}
