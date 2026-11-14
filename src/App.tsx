import { Routes, Route, Navigate } from "react-router-dom";
import { useUser } from "./store/UserContext";
import Onboarding from "./screens/Onboarding";
import Layout from "./components/Layout";
import Home from "./screens/Home";
import Upgrades from "./screens/Upgrades";
import MiniGames from "./screens/MiniGames";
import KsuhaRun from "./screens/KsuhaRun";
import Leaderboard from "./screens/Leaderboard";
import Puzzle from "./screens/Puzzle";
import Match3 from "./screens/Match3";
import JiraFight from "./screens/JiraFight";
import Exchange from "./screens/Exchange";
import AdminPage from "./admin/AdminPage";

const Center = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen items-center justify-center p-6 text-center">{children}</div>
);

// Основная игра: онбординг для новых, вкладки для остальных
function Game() {
  const { user, loading, error, telegramId } = useUser();
  if (loading) return <Center>Загрузка…</Center>;
  if (error) return <Center>Ошибка: {error}</Center>;
  if (!telegramId) return <Center>Откройте игру через Telegram</Center>;
  if (!user) return <Onboarding />; // новый игрок → онбординг

  return (
    <Routes>
      {/* Ksuha Run — на весь экран, без нижнего меню */}
      <Route path="/games/ksuha-run" element={<KsuhaRun />} />
      <Route path="/games/puzzle" element={<Puzzle />} />
      <Route path="/games/match3" element={<Match3 />} />
      <Route path="/games/jira" element={<JiraFight />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/upgrades" element={<Upgrades />} />
        <Route path="/games" element={<MiniGames />} />
        <Route path="/exchange" element={<Exchange />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  // Админка работает независимо от онбординга
  return (
    <Routes>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Game />} />
    </Routes>
  );
}
