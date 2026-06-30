import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const location = useLocation();

  // background is stored in state when navigating to /login as a modal overlay.
  // When present, Home stays mounted underneath and Login renders on top.
  const background = location.state?.background;

  return (
    <>
      {/* Primary routes — render using the background location when modal is active */}
      <Routes location={background || location}>
        <Route path="/" element={<Home />} />
        {/* Fallback: if user visits /login directly (no background state), render standalone */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>

      {/* Modal overlay route — rendered on top of the primary route when background state exists */}
      {background && (
        <Routes>
          <Route path="/login" element={<Login modal />} />
        </Routes>
      )}
    </>
  );
}

export default App;
