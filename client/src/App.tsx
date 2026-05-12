import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth'; 
import AuthGuard from './components/AuthGuard';
import Sidebar from './components/Sidebar';
import RoutesList from './pages/RoutesList';
import RouteCreate from './pages/RouteCreate';
import MinhaEscala from './pages/MinhaEscala';

// Páginas
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import RotasPage from './pages/Rotas'; 
import AdminPage from './pages/Admin';
import MotoristaPage from './pages/FormularioMotorista';
import EscalaPage from './pages/Escala';
import AtrasosPage from './pages/RelatorioAtrasos';
import Relatorios from './pages/Relatorios';
import AcessoNegadoPage from './pages/AcessoNegadoPage';

// --- COMPONENTE DE POPUP DE INSTALAÇÃO ---
const InstallPWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Mostra o popup apenas em dispositivos móveis (opcional)
            if (window.innerWidth < 768) {
                setShowPopup(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowPopup(false);
            setDeferredPrompt(null);
        }
    };

    if (!showPopup) return null;

    return (
        <div style={{
            position: 'fixed', bottom: '20px', left: '20px', right: '20px',
            backgroundColor: '#fff', padding: '15px', borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)', zIndex: 9999,
            border: '1px solid #ddd'
        }}>
            <h6 style={{ color: '#333', marginBottom: '5px' }}>Instalar App Viação Mimo?</h6>
            <p style={{ fontSize: '12px', color: '#666' }}>Acesse sua escala rapidamente pela tela inicial.</p>
            <div className="d-flex gap-2">
                <button className="btn btn-sm btn-success w-100" onClick={handleInstall}>Instalar</button>
                <button className="btn btn-sm btn-light" onClick={() => setShowPopup(false)}>Agora não</button>
            </div>
        </div>
    );
};

// --- LAYOUT (Sidebar + Conteúdo) ---
const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const contentStyle = {
        marginLeft: isSidebarOpen ? '250px' : '80px',
        transition: 'margin-left 0.3s ease',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa'
    };

    return (
        <div className="d-flex">
            <Sidebar 
                isOpen={isSidebarOpen} 
                toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
            />
            
            <div style={contentStyle} className="w-100">
                <div className="p-3">
                    <Outlet context={{ toggleSidebar: () => setIsSidebarOpen(!isSidebarOpen) }} />
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                {/* O Popup fica aqui para aparecer sobre qualquer página */}
                <InstallPWA />
                
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/unauthorized" element={<AcessoNegadoPage />} />
                    
                    <Route element={<Layout />}>
                        <Route element={<AuthGuard requiredMenu="dashboard" />}>
                            <Route path="/" element={<DashboardPage />} />
                        </Route>

                        <Route element={<AuthGuard requiredMenu="rotas" />}>
                            <Route path="/rotas" element={<RoutesList />} />
                            <Route path="/rotas/nova" element={<RouteCreate />} />
                            <Route path="/rotas/editar/:id" element={<RouteCreate />} />
                        </Route>

                        <Route element={<AuthGuard requiredMenu="escala" />}>
                            <Route path="/escala" element={<EscalaPage />} />
                        </Route>

                        <Route element={<AuthGuard requiredMenu="atrasos" />}>
                            <Route path="/atrasos" element={<AtrasosPage />} />
                        </Route>
                        
                        <Route element={<AuthGuard requiredMenu="motoristas" />}>
                            <Route path="/motorista" element={<MotoristaPage />} />
                        </Route>

                        <Route element={<AuthGuard requiredMenu="relatorios" />}>
                            <Route path="/relatorios" element={<Relatorios />} />
                        </Route>

                        <Route element={<AuthGuard requiredMenu="usuarios" />}>
                            <Route path="/admin/usuarios" element={<AdminPage />} />
                        </Route>

                        <Route path="/minha-escala" element={<MinhaEscala />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
