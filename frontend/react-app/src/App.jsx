import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CustomCursor from './components/CustomCursor';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import AnalysePage from './pages/AnalysePage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <Routes>
        {/* Landing page — no navbar, full-screen shader hero */}
        <Route path="/" element={<LandingPage />} />

        {/* Generator page */}
        <Route path="/generate" element={
          <>
            <Navbar />
            <HomePage />
          </>
        } />

        <Route path="/result" element={<ResultPage />} />
        <Route path="/analyse" element={<AnalysePage />} />
      </Routes>
    </BrowserRouter>
  );
}
