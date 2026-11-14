import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useUser } from "./store/UserContext";
import Onboarding from "./screens/Onboarding";
import Прелоадер from "./screens/Прелоадер";
import Layout from "./components/Layout";
import Home from "./screens/Home";
import Upgrades from "./screens/Upgrades";
import MiniGames from "./screens/MiniGames";
import Exchange from "./screens/Exchange";
import Leaderboard from "./screens/Leaderboard";
import KsuhaRun from "./screens/KsuhaRun";
import Puzzle from "./screens/Puzzle";
import Match3 from "./screens/Match3";
import JiraFight from "./screens/JiraFight";
import Babka from "./screens/Babka";
import AdminPage from "./admin/AdminPage";
import { ПРЕЛОАДЕР } from "./config";
import { Т } from "./texts";
import { загрузитьСписокФайлов } from "./lib/assets";
import { звук } from "./lib/sound";

const Центр = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen items-center justify-center p-6 text-center">{children}</div>
);

// Основная игра: заставка → онбординг для новых → вкладки для остальных
function Game() {
  const { user, loading, error, telegramId } = useUser();
  const [заставкаПоказана, setЗаставкаПоказана] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setЗаставкаПоказана(true), ПРЕЛОАДЕР.минМс);
    return () => clearTimeout(t);
  }, []);

  if (loading || !заставкаПоказана) return <Прелоадер />;
  if (error) return <Центр>{Т.общее.ошибка(error)}</Центр>;
  if (!telegramId) return <Центр>{Т.приложение.откройтеЧерезТелеграм}</Центр>;
  if (!user) return <Onboarding />; // новый игрок → онбординг

  return (
    <Routes>
      {/* Игры на весь экран, без нижнего меню */}
      <Route path="/games/ksuha-run" element={<KsuhaRun />} />
      <Route path="/games/puzzle" element={<Puzzle />} />
      <Route path="/games/match3" element={<Match3 />} />
      <Route path="/games/jira" element={<JiraFight />} />
      <Route path="/games/babka" element={<Babka />} />
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
  // Один раз при старте: список картинок/звуков, звуковой менеджер и «клик» на любую кнопку
  useEffect(() => {
    загрузитьСписокФайлов();
    звук.инициализировать();
    const клик = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("button, a")) звук.sfx("клик");
    };
    document.addEventListener("click", клик);
    return () => document.removeEventListener("click", клик);
  }, []);

  // Админка работает независимо от онбординга
  return (
    <Routes>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Game />} />
    </Routes>
  );
}
