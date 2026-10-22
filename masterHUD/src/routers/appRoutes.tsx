import { BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard/dashboard';
import { Login } from '../pages/Login/Login';

export const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </BrowserRouter>
    );
}