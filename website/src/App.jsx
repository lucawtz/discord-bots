import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import MusicBot from './pages/MusicBot';
import SoundboardBot from './pages/SoundboardBot';
import Impressum from './pages/Impressum';
import Datenschutz from './pages/Datenschutz';

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/bots/music-bot" element={<MusicBot />} />
                <Route path="/bots/soundboard-bot" element={<SoundboardBot />} />
                <Route path="/impressum" element={<Impressum />} />
                <Route path="/datenschutz" element={<Datenschutz />} />
            </Route>
        </Routes>
    );
}
