import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; 
import './Login.css';

const Login: React.FC = () => {
    const [identifier, setIdentifier] = useState(''); // Valor único (CPF ou Usuário)
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const navigate = useNavigate();
    const { login, isLoggedIn } = useAuth(); 

    useEffect(() => {
        if (isLoggedIn) {
            const userDataText = localStorage.getItem('userData');
            if (userDataText) {
                const userObj = JSON.parse(userDataText);
                // Redirecionamento automático baseado no cargo retornado pelo servidor
                if (userObj.role === 'motorista') {
                    navigate('/minha-escala', { replace: true });
                } else {
                    navigate('/', { replace: true });
                }
            }
        }
    }, [isLoggedIn, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        try {
            // Chamamos uma única rota que aceita tanto CPF quanto Username
            const res = await api.post('/login', { 
                identifier: identifier.trim(), 
                password 
            });
            
            login(res.data.token, res.data.user);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Credenciais incorretas.');
        }
    };

    return (
        <div className="login-bg-wrapper">
            <div className="card-login-custom">
                <div className="card-login-header">
                    <img 
                        src="https://viacaomimo.com.br/wp-content/uploads/2023/07/Logo.png" 
                        alt="Logo" 
                        className="logo-login" 
                    />
                    <h5 className="text-secondary mt-2">Acesso ao Sistema</h5>
                </div>
                
                <div className="card-body p-4">
                    {error && (
                        <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            <div>{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="mb-3">
                            <label htmlFor="identifier" className="login-label">IDENTIFICAÇÃO</label>
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0">
                                    <i className="bi bi-person-fill text-secondary"></i>
                                </span>
                                <input 
                                    type="text" 
                                    className="form-control border-start-0 ps-0" 
                                    id="identifier" 
                                    placeholder="Usuário ou CPF" 
                                    required 
                                    autoFocus
                                    value={identifier}
                                    onChange={e => setIdentifier(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="password" className="login-label">SENHA</label>
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0">
                                    <i className="bi bi-lock-fill text-secondary"></i>
                                </span>
                                <input 
                                    type="password" 
                                    className="form-control border-start-0 ps-0" 
                                    id="password" 
                                    placeholder="Sua senha" 
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="d-grid">
                            <button type="submit" className="btn-login-custom">
                                Entrar
                            </button>
                        </div>
                    </form>
                </div>

                <div className="login-footer">
                    <small className="text-muted d-block">&copy; {new Date().getFullYear()} Viação Mimo</small>
                </div>
            </div>
        </div>
    );
};

export default Login;
