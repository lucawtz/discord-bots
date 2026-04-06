import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

const Home = lazy(() => import('./pages/Home'));
const Bots = lazy(() => import('./pages/Bots'));
const MusicBot = lazy(() => import('./pages/MusicBot'));
const SoundboardBot = lazy(() => import('./pages/SoundboardBot'));
const Commands = lazy(() => import('./pages/Commands'));
const Premium = lazy(() => import('./pages/Premium'));
const Guide = lazy(() => import('./pages/Guide'));
const Profile = lazy(() => import('./pages/Profile'));
const Status = lazy(() => import('./pages/Status'));
const Changelog = lazy(() => import('./pages/Changelog'));
const Impressum = lazy(() => import('./pages/Impressum'));
const Datenschutz = lazy(() => import('./pages/Datenschutz'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
    return (
        <ErrorBoundary>
            <Suspense>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/bots" element={<Bots />} />
                        <Route path="/bots/music-bot" element={<MusicBot />} />
                        <Route path="/bots/soundboard-bot" element={<SoundboardBot />} />
                        <Route path="/commands" element={<Commands />} />
                        <Route path="/premium" element={<Premium />} />
                        <Route path="/guide" element={<Guide />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/status" element={<Status />} />
                        <Route path="/changelog" element={<Changelog />} />
                        <Route path="/impressum" element={<Impressum />} />
                        <Route path="/datenschutz" element={<Datenschutz />} />
                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Routes>
            </Suspense>
        </ErrorBoundary>
    );
}
