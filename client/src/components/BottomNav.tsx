import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const BottomNav: React.FC = () => {
    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const isActive = (path: string) => location.pathname === path ? 'text-white' : 'text-white-50';

    const hasPermission = (menuKey: string) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        return currentUser.allowed_menus?.includes(menuKey);
    };

    if (window.innerWidth >= 768) return null;

    return (
        <div className="bg-danger fixed-bottom d-flex justify-content-around align-items-center shadow-lg" 
             style={{ height: '70px', zIndex: 1050, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            
            {hasPermission('dashboard') && (
                <Link to="/" className={`d-flex flex-column align-items-center text-decoration-none ${isActive('/')}`}>
                    <i className="bi bi-speedometer2 fs-4"></i>
                    <span style={{ fontSize: '10px' }}>Início</span>
                </Link>
            )}

            <Link to="/minha-escala" className={`d-flex flex-column align-items-center text-decoration-none ${isActive('/minha-escala')}`}>
                <i className="bi bi-clipboard-check fs-4"></i>
                <span style={{ fontSize: '10px' }}>Minha Escala</span>
            </Link>

            {hasPermission('escala') && (
                <Link to="/escala" className={`d-flex flex-column align-items-center text-decoration-none ${isActive('/escala')}`}>
                    <i className="bi bi-calendar-week fs-4"></i>
                    <span style={{ fontSize: '10px' }}>Escala</span>
                </Link>
            )}

            {hasPermission('atrasos') && (
                <Link to="/atrasos" className={`d-flex flex-column align-items-center text-decoration-none ${isActive('/atrasos')}`}>
                    <i className="bi bi-clock fs-5 me-3"></i>
                    <span style={{ fontSize: '10px' }}>Atrasos</span>
                </Link>
            )}

            <button 
                onClick={handleLogout}
                className="btn d-flex flex-column align-items-center text-decoration-none border-0 p-0 text-white-50"
                style={{ background: 'none' }}
                title="Sair do Sistema"
            >
                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center" 
                     style={{ width: '28px', height: '28px' }}>
                    <i className="bi bi-box-arrow-left text-danger" style={{ fontSize: '14px' }}></i>
                </div>
                <span style={{ fontSize: '10px' }}>Sair</span>
            </button>
        </div>
    );
};

export default BottomNav;
