import { Routes, Route } from "react-router-dom";
import "./App.css";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import Layout from "./components/Layout";
import NotFound from "./components/NotFound";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Play from "./pages/Play";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import VerifyEmail from "./pages/VerifyEmail";
import RequestPassword from "./pages/ForgotPassword";
import SetNewPassword from "./pages/ResetPassword";

function App() {
  const { isAuthenticated, authChecked } = useAuth();

  if (!authChecked) {
    return null;
  }

  return (
    <div className="font-sans">
      <Layout>
        <Routes>
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route element={<GuestRoute isAuthenticated={isAuthenticated} />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route path="*" element={<NotFound />} />
          <Route path="/play" element={<Play />} />
          <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<RequestPassword />} />
          <Route path="/reset-password" element={<SetNewPassword />} />
        </Routes>
      </Layout>
    </div>
  );
}

export default App;
