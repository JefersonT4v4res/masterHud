import { BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import { dashboard } from '../pages/Dashboard/dashboard';

export const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<dashboard />} />
            </Routes>
        </BrowserRouter>
    );
}