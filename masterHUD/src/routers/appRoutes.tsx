import { BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard/dashboard';

export const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </BrowserRouter>
    );
}