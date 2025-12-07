import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import TenSecondChallenge from './pages/TenSecondChallenge';
import SuiPet from './pages/SuiPet';
import SuiBank from './pages/SuiBank';
import CardBattle from './pages/CardBattle';
import DiceGame from './pages/DiceGame';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <div className="app-shell">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/games/ten-second-challenge" element={<TenSecondChallenge />} />
                    <Route path="/games/sui-pet" element={<SuiPet />} />
                    <Route path="/games/sui-bank" element={<SuiBank />} />
                    <Route path="/games/card-battle" element={<CardBattle />} />
                    <Route path="/games/dice-game" element={<DiceGame />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
