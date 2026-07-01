import { Routes, Route } from "react-router-dom";
import Home       from "./pages/Home";
import UserLogin  from "./pages/UserLogin";
import AdminLogin from "./pages/AdminLogin";
import Dashboard  from "./pages/Dashboard";
import About      from "./pages/About";
import Services   from "./pages/Services";
import Gallery    from "./pages/Gallery";
import Contact    from "./pages/Contact";

function App() {
  return (
    <Routes>
      <Route path="/"            element={<Home />} />
      <Route path="/login"       element={<UserLogin />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/dashboard"   element={<Dashboard />} />
      <Route path="/about"       element={<About />} />
      <Route path="/services"    element={<Services />} />
      <Route path="/gallery"     element={<Gallery />} />
      <Route path="/contact"     element={<Contact />} />
    </Routes>
  );
}

export default App;
