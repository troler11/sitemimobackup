import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, ShieldAlert, Bus, Clock, MapPin, X } from 'lucide-react';

import './Dashboard.css';

interface LinhaMotorista {
    data_escala: string;
    empresa: string;
    rota: string;
    sentido: string;
    h_real: string;
    frota_escala: string;
    frota_enviada: string;
    status: string;
    motorista: string;
}

const MinhaEscala: React.FC = () => {
    const { isLoggedIn, logout } = useAuth();
    const navigate = useNavigate();
    
    const [escala, setEscala] = useState<LinhaMotorista[]>([]);
    const [loading, setLoading] = useState(true);
    const [dataFiltro, setDataFiltro] = useState(new Date().toLocaleDateString('pt-BR'));
    
    const [modalConfig, setModalConfig] = useState<{
        show: boolean;
        tipo: 'CONFIRMAR' | 'COBRIR';
        linha: LinhaMotorista | null;
    }>({ show: false, tipo: 'CONFIRMAR', linha: null });
    
    const [valorInput, setValorInput] = useState('');
    const [enviando, setEnviando] = useState(false);

    const fetchMinhaEscala = useCallback(async () => {
        if (!isLoggedIn) return;
        setLoading(true);
        try {
            const res = await api.get('/app-motorista/escala', { params: { data: dataFiltro } });
            setEscala(Array.isArray(res.data) ? res.data : []);
        } catch (error: any) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                logout();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [dataFiltro, isLoggedIn, logout, navigate]);

    useEffect(() => {
        fetchMinhaEscala();
    }, [fetchMinhaEscala]);

    const abrirModal = (linha: LinhaMotorista, tipo: 'CONFIRMAR' | 'COBRIR') => {
        setValorInput(tipo === 'CONFIRMAR' && linha.frota_escala !== '---' ? linha.frota_escala : '');
        setModalConfig({ show: true, tipo, linha });
    };const abrirModal = (linha: LinhaMotorista, tipo: 'CONFIRMAR' | 'COBRIR') => {
    // 🔥 Forçamos o valor a ser sempre uma STRING usando String(...)
    // Isso evita que um prefixo numérico (ex: 580) quebre o .trim() depois
    const valorInicial = tipo === 'CONFIRMAR' && linha.frota_escala && linha.frota_escala !== '---' 
        ? String(linha.frota_escala) 
        : '';
        
    setValorInput(valorInicial);
    setModalConfig({ show: true, tipo, linha });
};

// --- ENVIAR AÇÃO (AJUSTADO) ---
const handleEnviarAcao = async () => {
    // 🔥 Garantimos que valorInput seja tratado como string antes do trim
    const textoInput = String(valorInput || '');

    if (!textoInput.trim()) {
        alert(modalConfig.tipo === 'CONFIRMAR' ? "Por favor, informe o veículo." : "Por favor, informe o motivo.");
        return;
    }

    setEnviando(true);
    try {
        await api.post('/app-motorista/acao', {
            data_escala: dataFiltro,
            empresa: modalConfig.linha?.empresa,
            rota: modalConfig.linha?.rota,
            h_real: modalConfig.linha?.h_real,
            // Enviamos o valor já limpo e em maiúsculo
            veiculo: modalConfig.tipo === 'CONFIRMAR' ? textoInput.trim().toUpperCase() : null,
            motivo: modalConfig.tipo === 'COBRIR' ? textoInput.trim() : null,
            acao: modalConfig.tipo
        });

        setModalConfig({ show: false, tipo: 'CONFIRMAR', linha: null });
        setValorInput('');
        fetchMinhaEscala();
        
    } catch (error: any) {
        alert(error.response?.data?.error || "Erro ao registrar ação.");
    } finally {
        setEnviando(false);
    }
};

    if (!isLoggedIn) return null;

    return (
        <div className="main-content" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="page-title mb-0" style={{ fontSize: '1.5rem' }}>Minhas Viagens</h2>
                <input 
                    type="text" 
                    className="form-control red-border text-center fw-bold" 
                    value={dataFiltro} 
                    onChange={e => setDataFiltro(e.target.value)} 
                    style={{ width: '120px' }}
                />
            </div>

            {loading ? (
                <div className="text-center py-5 text-muted">Buscando sua escala...</div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {escala.map((linha, index) => {
                        const resolvido = ['CONFIRMADO', 'COBRIR'].includes(linha.status);
                        return (
                            <div key={index} className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
                                <div className="card-header bg-light border-0 d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center gap-2 text-dark fw-bold">
                                        <Clock size={20} className="text-danger" /> {linha.h_real}
                                    </div>
                                    {resolvido && (
                                        <span className={`badge ${linha.status === 'CONFIRMADO' ? 'bg-success' : 'bg-primary'}`}>
                                            {linha.status === 'CONFIRMADO' ? 'Confirmado' : 'Não Realizada'}
                                        </span>
                                    )}
                                </div>
                                <div className="card-body">
                                    <h5 className="fw-bold mb-1">{linha.rota}</h5>
                                    <p className="text-muted small">{linha.empresa} • {linha.sentido}</p>
                                    <div className="d-flex justify-content-between align-items-end">
                                        <div className="bg-light px-3 py-2 rounded">
                                            <span className="d-block small text-muted">Previsto</span>
                                            <span className="fw-bold fs-5">{linha.frota_escala}</span>
                                        </div>
                                        {!resolvido && (
                                            <div className="d-flex flex-column gap-2">
                                                <button className="btn btn-success btn-sm" onClick={() => abrirModal(linha, 'CONFIRMAR')}>Confirmar</button>
                                                <button className="btn btn-outline-danger btn-sm" onClick={() => abrirModal(linha, 'COBRIR')}>Não farei</button>
                                            </div>
                                        )}
                                        {linha.status === 'CONFIRMADO' && (
                                            <div className="text-end">
                                                <span className="d-block small text-muted">Realizado</span>
                                                <span className="fw-bold fs-5 text-success">{linha.frota_enviada}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- MODAL AJUSTADO (CENTRALIZADO) --- */}
            {modalConfig.show && (
                <div className="modal-overlay" style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000, 
                    display: 'flex', alignItems: 'center', // 🔥 Agora centralizado
                    justifyContent: 'center', padding: '20px' 
                }}>
                    <div className="bg-white w-100 p-4 shadow-lg" style={{ 
                        borderRadius: '24px', // Arredondado completo
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="fw-bold mb-0">{modalConfig.tipo === 'CONFIRMAR' ? 'Confirmar Viagem' : 'Informar Motivo'}</h4>
                            <button className="btn btn-light rounded-circle" onClick={() => setModalConfig({ show: false, tipo: 'CONFIRMAR', linha: null })}><X /></button>
                        </div>
                        <div className="mb-4">
                            <label className="form-label fw-bold">
                                {modalConfig.tipo === 'CONFIRMAR' ? 'Confirme o prefixo do veículo:' : 'Por que você não realizará esta linha?'}
                            </label>
                            {modalConfig.tipo === 'CONFIRMAR' ? (
                                <input 
                                    type="text" 
                                    className="form-control form-control-lg text-center fw-bold fs-2" 
                                    value={valorInput} 
                                    onChange={e => setValorInput(e.target.value.toUpperCase())} 
                                    autoFocus 
                                />
                            ) : (
                                <textarea 
                                    className="form-control" 
                                    rows={3} 
                                    value={valorInput} 
                                    onChange={e => setValorInput(e.target.value)} 
                                    placeholder="Descreva o motivo aqui..."
                                    autoFocus 
                                />
                            )}
                        </div>
                        <button 
                            className={`btn btn-lg w-100 fw-bold text-white ${modalConfig.tipo === 'CONFIRMAR' ? 'bg-success border-success' : 'bg-danger border-danger'}`} 
                            onClick={handleEnviarAcao} 
                            disabled={enviando}
                        >
                            {enviando ? 'Enviando...' : (modalConfig.tipo === 'CONFIRMAR' ? 'Confirmar Agora' : 'Gravar Motivo')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MinhaEscala;
