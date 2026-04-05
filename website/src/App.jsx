import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import MusicBot from './pages/MusicBot';
import SoundboardBot from './pages/SoundboardBot';
import Impressum from './pages/Impressum';
import Datenschutz from './pages/Datenschutz';
import Bots from './pages/Bots';
import Guide from './pages/Guide';
import Commands from './pages/Commands';
import Premium from './pages/Premium';
import Status from './pages/Status';
import Changelog from './pages/Changelog';

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/bots" element={<Bots />} />
                <Route path="/bots/music-bot" element={<MusicBot />} />
                <Route path="/bots/soundboard-bot" element={<SoundboardBot />} />
                <Route path="/commands" element={<Commands />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="/guide" element={<Guide />} />
                <Route path="/status" element={<Status />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/impressum" element={<Impressum />} />
                <Route path="/datenschutz" element={<Datenschutz />} />
            </Route>
        </Routes>
    );
}
