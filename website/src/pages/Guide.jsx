import { Link } from 'react-router-dom';
import {
    Box, Typography, Container, Stack, Card, Button,
} from '@mui/material';
import { useLanguage } from '../i18n/LanguageContext';
import {
    PageHead, Kicker, CmdChip, DISPLAY_FONT, PRIMARY_BTN_SX, GHOST_BTN_SX,
} from '../components/ui';

function StepNum({ children }) {
    return (
        <Box sx={{
            width: 46, height: 46, borderRadius: '13px',
            background: 'linear-gradient(135deg, #7c3aed, #d946ef)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: '1.25rem', color: '#fff',
            boxShadow: '0 10px 26px -10px rgba(168,85,247,0.6)',
        }}>
            {children}
        </Box>
    );
}

function TopicCard({ title, text }) {
    return (
        <Card elevation={0} sx={{ p: 3 }}>
            <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: '1.03rem', mb: 0.75 }}>{title}</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.895rem', lineHeight: 1.65 }}>{text}</Typography>
        </Card>
    );
}

export default function Guide() {
    const { t } = useLanguage();

    const setupTopics = [
        { title: t('guide.djRole'), text: t('guide.djRoleText') },
        { title: t('guide.webPlayerAccess'), text: t('guide.webPlayerAccessText') },
        { title: t('guide.autoDjHeading'), text: t('guide.autoDjText') },
        { title: t('guide.filtersHeading'), text: t('guide.filtersText') },
        { title: t('guide.soundboardDashboard'), text: t('guide.soundboardDashboardText') },
        { title: t('guide.soundUploadHeading'), text: t('guide.soundUploadText') },
    ];

    const troubleTopics = [
        { title: t('guide.botNotResponding'), text: t('guide.botNotRespondingText') },
        { title: t('guide.noSound'), text: t('guide.noSoundText') },
        { title: t('guide.webPlayerNotConnecting'), text: t('guide.webPlayerNotConnectingText') },
        { title: t('guide.uploadFails'), text: t('guide.uploadFailsText') },
    ];

    return (
        <Box sx={{ pb: { xs: 8, md: 10 } }}>
            <PageHead kicker="Guide" title={t('guide.pageTitle')} titleAccent={t('guide.pageTitleAccent')} lead={t('guide.lead')} />

            <Container maxWidth="lg" sx={{ mt: 4.5 }}>
                {/* 3 Schritte */}
                <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
                    <Card elevation={0} sx={{ p: 3.5 }}>
                        <StepNum>1</StepNum>
                        <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: '1.19rem', mt: 2.25, mb: 1 }}>
                            {t('guide.step1Title')}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.895rem', lineHeight: 1.6 }}>
                            {t('guide.step1Text')}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                            <Button component={Link} to="/bots" sx={{ ...PRIMARY_BTN_SX, height: 38, px: 1.9, fontSize: '0.85rem', borderRadius: '10px' }}>
                                {t('guide.step1Button')}
                            </Button>
                        </Box>
                    </Card>
                    <Card elevation={0} sx={{ p: 3.5 }}>
                        <StepNum>2</StepNum>
                        <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: '1.19rem', mt: 2.25, mb: 1 }}>
                            {t('guide.step2Title')}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.895rem', lineHeight: 1.6 }}>
                            {t('guide.step2Text')}
                        </Typography>
                        <Stack spacing={1} alignItems="flex-start" sx={{ mt: 2 }}>
                            <Box component="a" href="https://beatbyte.bytebots.de" target="_blank" rel="noopener" sx={{ textDecoration: 'none' }}>
                                <CmdChip>beatbyte.bytebots.de</CmdChip>
                            </Box>
                            <Box component="a" href="https://soundboard.bytebots.de" target="_blank" rel="noopener" sx={{ textDecoration: 'none' }}>
                                <CmdChip>soundboard.bytebots.de</CmdChip>
                            </Box>
                        </Stack>
                    </Card>
                    <Card elevation={0} sx={{ p: 3.5 }}>
                        <StepNum>3</StepNum>
                        <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: '1.19rem', mt: 2.25, mb: 1 }}>
                            {t('guide.step3Title')}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.895rem', lineHeight: 1.6 }}>
                            {t('guide.step3Text')}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                            <CmdChip>/play</CmdChip>
                            <CmdChip>/sound</CmdChip>
                            <CmdChip>/soundboard</CmdChip>
                        </Stack>
                    </Card>
                </Box>

                {/* Setup-Themen */}
                <Box sx={{ mt: { xs: 6, md: 8 } }}>
                    <Kicker>Setup</Kicker>
                    <Typography variant="h2" sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' }, mt: 1.25, mb: 3 }}>
                        {t('guide.setupTitle')}
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                        {setupTopics.map((topic) => (
                            <TopicCard key={topic.title} title={topic.title} text={topic.text} />
                        ))}
                    </Box>
                </Box>

                {/* Troubleshooting */}
                <Box sx={{ mt: { xs: 6, md: 8 } }}>
                    <Kicker>Troubleshooting</Kicker>
                    <Typography variant="h2" sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' }, mt: 1.25, mb: 3 }}>
                        {t('guide.troubleTitle')}
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                        {troubleTopics.map((topic) => (
                            <TopicCard key={topic.title} title={topic.title} text={topic.text} />
                        ))}
                    </Box>
                </Box>

                {/* Support */}
                <Card elevation={0} sx={{ mt: { xs: 6, md: 8 }, px: 3.75, py: 3.5 }}>
                    <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
                        <Box sx={{
                            width: 44, height: 44, borderRadius: '12px', fontSize: 20, flexShrink: 0,
                            bgcolor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.26)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            💬
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 240 }}>
                            <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: '1.19rem', mb: 0.5 }}>
                                {t('guide.supportTitle')}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.895rem', lineHeight: 1.6 }}>
                                {t('guide.supportText')}
                            </Typography>
                        </Box>
                        <Button href="mailto:kontakt@bytebots.de"
                            sx={{ ...GHOST_BTN_SX, height: 38, px: 1.9, fontSize: '0.85rem', borderRadius: '10px' }}>
                            {t('guide.supportButton')}
                        </Button>
                    </Stack>
                </Card>
            </Container>
        </Box>
    );
}
