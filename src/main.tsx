import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import './styles/global.css';
import './features/audio/audioStore'; // wires audio to session events at startup
import { Shell } from './app/Shell';
import { Dashboard } from './features/dashboard/Dashboard';
import { Room } from './features/room/Room';
import { SettingsPage } from './features/settings/SettingsPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { NotesPage } from './features/notes/NotesPage';
import { AchievementsPage } from './features/achievements/AchievementsPage';
import { requestPersistentStorage } from './data/db';

// Hash routing works on any static host (GitHub Pages included) with no server config.
const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/room', element: <Room /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/notes', element: <NotesPage /> },
      { path: '/achievements', element: <AchievementsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <Dashboard /> },
    ],
  },
]);

void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
