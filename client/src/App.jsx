import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import ProtectedRoute from "./Components/common/ProtectedRoute.jsx";

import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard.jsx";
import Repositories from "./pages/Repositories.jsx";
import RepoExplorer from "./pages/RepoExplorer.jsx";
import AnalysisHistory from "./pages/AnalysisHistory.jsx";
import V15Dashboard from "./pages/V15Dashboard.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import CodeExplorer from "./pages/CodeExplorer.jsx";
import CompareScans from "./pages/CompareScans.jsx";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected dashboard routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/repositories"
              element={
                <ProtectedRoute>
                  <Repositories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/repositories/:owner/:repo"
              element={
                <ProtectedRoute>
                  <RepoExplorer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analysis"
              element={
                <ProtectedRoute>
                  <AnalysisHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/compare"
              element={
                <ProtectedRoute>
                  <CompareScans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scan/:id"
              element={
                <ProtectedRoute>
                  <V15Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/explorer"
              element={
                <ProtectedRoute>
                  <CodeExplorer />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
