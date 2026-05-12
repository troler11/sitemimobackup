import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; 

// IMPORTANTE: Importar o CSS específico aqui
import './Login.css';

const Login: React.FC = () => {
    // Adicionamos o estado para controlar qual aba está ativa
    const [tipoLogin, setTipoLogin] = useState<'padrao' | 'motorista'>('padrao');
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const navigate = useNavigate();
    const { login, isLoggedIn } = useAuth(); 

    // 1. Efeito que "assiste" o login. Redireciona com base no "role" (Nível de Acesso)
    useEffect(() => {
        if (isLoggedIn) {
            try {
                // Lê os dados do usuário salvos no localStorage pelo hook useAuth
                const userDataText = localStorage.getItem('userData');
                if (userDataText) {
                    const userObj = JSON.parse(userDataText);
                    
                    // Se for motorista, manda para a tela do celular
                    if (userObj.role === 'motorista') {
                        navigate('/minha-escala', { replace: true });
                        return;
                    }
                }
            } catch (e) {
                console.error("Erro ao ler dados do usuário.");
            }
            
            // Se for escritório (admin, escalante, etc), manda pro Dashboard
            navigate('/', { replace: true });
        }
    }, [isLoggedIn, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        try {
            let res;
            
            // 2. Chama a rota certa e manda o Payload certo dependendo da aba escolhida
            if (tipoLogin === 'padrao') {
                res = await api.post('/login', { username, password });
            } else {
                // ⚠️ Verifique se a sua base URL no api.ts já inclui o /auth. 
                // Se o padrão é /login, a do motorista deve ser a que você configurou (ex: /login-motorista)
                res = await api.post('/login-motorista', { 
                    cpf: username.trim(), 
                    senha: password 
                });
            }
            
            // Atualiza o estado global e dispara o useEffect acima
            login(res.data.token, res.data.user);

        } catch (err: any) {
            setError(err.response?.data?.message || 'Usuário, CPF ou senha incorretos.');
        }
    };

    return (
        // Wrapper do Fundo Degradê
        <div className="login-bg-wrapper">
            
            {/* Cartão Centralizado */}
            <div className="card-login-custom">
                
                {/* Header com Logo */}
                <div className="card-login-header">
                    <img 
                        src="https://viacaomimo.com.br/wp-content/uploads/2023/07/Logo.png" 
                        alt="Logo" 
                        className="logo-login" 
                    />
                    <h5 className="text-secondary mt-2">Acesso ao Sistema</h5>
                </div>
                
                <div className="card-body p-4">
                    
                    {/* 🔥 SELETOR DE TIPO DE LOGIN (ABAS) */}
                    <div className="d-flex justify-content-center mb-4 gap-2 bg-light p-1 rounded-pill">
                        <button 
                            type="button"
                            className={`btn rounded-pill flex-fill fw-bold ${tipoLogin === 'padrao' ? 'btn-danger text-white' : 'btn-light text-muted border-0'}`}
                            onClick={() => { setTipoLogin('padrao'); setError(''); setUsername(''); setPassword(''); }}
                        >
                            Escritório
                        </button>
                        <button 
                            type="button"
                            className={`btn rounded-pill flex-fill fw-bold ${tipoLogin === 'motorista' ? 'btn-danger text-white' : 'btn-light text-muted border-0'}`}
                            onClick={() => { setTipoLogin('motorista'); setError(''); setUsername(''); setPassword(''); }}
                        >
                            Motorista
                        </button>
                    </div>

                    {error && (
                        <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            <div>{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        {/* Usuário / CPF dinâmico */}
                        <div className="mb-3">
                            <label htmlFor="username" className="login-label">
                                {tipoLogin === 'padrao' ? 'USUÁRIO' : 'CPF'}
                            </label>
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0">
                                    {tipoLogin === 'padrao' 
                                        ? <i className="bi bi-person-fill text-secondary"></i>
                                        : <i className="bi bi-person-badge text-secondary"></i>
                                    }
                                </span>
                                <input 
                                    type="text" 
                                    className="form-control border-start-0 ps-0" 
                                    id="username" 
                                    placeholder={tipoLogin === 'padrao' ? 'Seu usuário' : 'Digite seu CPF'} 
                                    required 
                                    autoFocus
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Senha */}
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

                        {/* Botão */}
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
