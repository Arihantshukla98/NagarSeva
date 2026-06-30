/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Report from './pages/Report';
import Dashboard from './pages/Dashboard';
import IssueDetail from './pages/IssueDetail';
import Authority from './pages/Authority';
import Leaderboard from './pages/Leaderboard';
import Terms from './pages/Terms';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0f172a] text-slate-50 flex flex-col font-sans">
          {/* Navigation Header */}
          <Navbar />

          {/* Primary Page Canvas Content wrapper */}
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/report" element={<Report />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/issue/:id" element={<IssueDetail />} />
              <Route path="/authority" element={<Authority />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/terms" element={<Terms />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
