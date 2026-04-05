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

// Music Web App
import AppLayout from './components/app/AppLayout';
import AppHome from './pages/app/AppHome';
import Search from './pages/app/Search';
import Library from './pages/app/Library';
import LikedSongs from './pages/app/LikedSongs';
import History from './pages/app/History';
import ArtistPage from './pages/app/ArtistPage';
import AlbumPage from './pages/app/AlbumPage';
import PlaylistPage from './pages/app/PlaylistPage';

export default function App() {
    return (
        <Routes>
            {/* Landing Pages */}
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

            {/* Music Web App */}
            <Route path="/app" element={<AppLayout />}>
                <Route index element={<AppHome />} />
                <Route path="search" element={<Search />} />
                <Route path="artist/:id" element={<ArtistPage />} />
                <Route path="album/:id" element={<AlbumPage />} />
                <Route path="library" element={<Library />}>
                    <Route path="likes" element={<LikedSongs />} />
                    <Route path="history" element={<History />} />
                </Route>
                <Route path="playlist/:id" element={<PlaylistPage />} />
            </Route>
        </Routes>
    );
}
