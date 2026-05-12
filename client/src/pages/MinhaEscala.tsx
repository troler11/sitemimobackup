import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, ShieldAlert, Bus, Clock, MapPin, X } from 'lucide-react';

// Reutilizamos seu CSS principal
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
    reserva: string;
}

const MinhaEscala: React.FC = () => {
    const { isLoggedIn, logout } = useAuth();
    const navigate = useNavigate();
    
    const [escala, setEscala] = useState<LinhaMotorista[]>([]);
    const [loading, setLoading] = useState(true);
    const [dataFiltro, setDataFiltro] = useState(new Date().toLocaleDateString('pt-BR'));
    
    // Estados do Modal de Ação
    const [modalConfig, setModalConfig] = useState<{
        show: boolean;
        tipo: 'CONFIRMAR' | 'COBRIR';
        linha: LinhaMotorista | null;
    }>({ show: false, tipo: 'CONFIRMAR', linha: null });
    
    const [veiculoPlaca, setVeiculoPlaca] = useState('');
    const [enviando, setEnviando] = useState(false);

    // --- BUSCA A ESCALA ---
    const fetchMinhaEscala = useCallback(async () => {
        if (!isLoggedIn) return;
        setLoading(true);
        try {
            const res = await api.get('/app-motorista/escala', { params: { data: dataFiltro } });
            setEscala(Array.isArray(res.data) ? res.data : []);
        } catch (error: any) {
            console.error("Erro ao buscar escala:", error);
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

    // --- ABRIR MODAL ---
    const abrirModal = (linha: LinhaMotorista, tipo: 'CONFIRMAR' | 'COBRIR') => {
        // Já preenche o input com o carro programado para facilitar a vida do motorista
        setVeiculoPlaca(linha.frota_escala && linha.frota_escala !== '---' ? linha.frota_escala : '');
        setModalConfig({ show: true, tipo, linha });
    };

    // --- ENVIAR AÇÃO (POST) ---
    const handleEnviarAcao = async () => {
        if (!veiculoPlaca.trim()) {
            alert("Por favor, informe qual veículo você pegou.");
            return;
        }

        setEnviando(true);
        try {
            await api.post('/app-motorista/acao', {
                data_escala: dataFiltro,
                empresa: modalConfig.linha?.empresa,
                rota: modalConfig.linha?.rota,
                h_real: modalConfig.linha?.h_real,
                veiculo: veiculoPlaca.toUpperCase(),
                acao: modalConfig.tipo
            });

            // Sucesso! Fecha o modal e recarrega a lista
            setModalConfig({ show: false, tipo: 'CONFIRMAR', linha: null });
            setVeiculoPlaca('');
            fetchMinhaEscala();
            
        } catch (error: any) {
            alert(error.response?.data?.error || "Erro ao registrar ação.");
        } finally {
            setEnviando(false);
        }
    };

    if (!isLoggedIn) return null;

    return (
        <div className="main-content" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
            
            {/* --- HEADER MOBILE --- */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="page-title mb-0" style={{ fontSize: '1.5rem' }}>Minhas Viagens</h2>
                <input 
                    type="text" 
                    className="form-control red-border text-center fw-bold" 
                    value={dataFiltro} 
                    onChange={e => setDataFiltro(e.target.value)} 
                    placeholder="dd/mm/aaaa"
                    style={{ width: '120px' }}
                />
            </div>

            {/* --- LISTA DE CARDS --- */}
            {loading ? (
                <div className="text-center py-5 text-muted">Buscando sua escala...</div>
            ) : escala.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <Bus size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Nenhuma viagem programada para você neste dia.</p>
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {escala.map((linha, index) => {
                        const isConfirmado = linha.status === 'CONFIRMADO';
                        const isCoberto = linha.status === 'COBRIR';
                        const resolvido = isConfirmado || isCoberto;

                        return (
                            <div key={index} className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
                                <div className="card-header bg-light border-0 d-flex justify-content-between align-items-center" style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px', paddingTop: '12px' }}>
                                    <div className="d-flex align-items-center gap-2 text-dark fw-bold" style={{ fontSize: '1.2rem' }}>
                                        <Clock size={20} className="text-danger" />
                                        {linha.h_real}
                                    </div>
                                    {resolvido ? (
                                        <span className={`badge ${isConfirmado ? 'bg-success' : 'bg-primary'}`}>
                                            {isConfirmado ? 'Confirmado' : 'Coberto'}
                                        </span>
                                    ) : (
                                        <span className="badge bg-warning text-dark">Pendente</span>
                                    )}
                                </div>
                                
                                <div className="card-body py-3">
                                    <h5 className="card-title text-dark fw-bold mb-1">{linha.rota}</h5>
                                    <p className="card-text text-muted small mb-3">
                                        <MapPin size={14} className="me-1 inline" /> 
                                        {linha.empresa} • {Number(linha.sentido) === 1 ? 'Entrada' : 'Saída'}
                                    </p>
                                    
                                    <div className="d-flex justify-content-between align-items-end">
                                        <div className="bg-light px-3 py-2 rounded">
                                            <span className="d-block small text-muted">Veículo Previsto</span>
                                            <span className="fw-bold fs-5 text-dark">{linha.frota_escala}</span>
                                        </div>

                                        {/* Botões de Ação só aparecem se não estiver resolvido */}
                                        {!resolvido && (
                                            <div className="d-flex flex-column gap-2">
                                                <button 
                                                    className="btn btn-success btn-sm d-flex align-items-center gap-1"
                                                    onClick={() => abrirModal(linha, 'CONFIRMAR')}
                                                >
                                                    <CheckCircle size={16} /> Confirmar
                                                </button>
                                                <button 
                                                    className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                                                    onClick={() => abrirModal(linha, 'COBRIR')}
                                                >
                                                    <ShieldAlert size={16} /> Cobrir
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Se resolvido, mostra com qual carro ele está rodando */}
                                        {resolvido && linha.frota_enviada && (
                                            <div className="text-end">
                                                <span className="d-block small text-muted">Carro na Rua</span>
                                                <span className={`fw-bold fs-5 ${isConfirmado ? 'text-success' : 'text-primary'}`}>
                                                    {linha.frota_enviada}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- MODAL DE AÇÃO --- */}
            {modalConfig.show && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
                }}>
                    <div className="bg-white w-100 p-4" style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px', maxWidth: '600px' }}>
                        
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="fw-bold mb-0 text-dark">
                                {modalConfig.tipo === 'CONFIRMAR' ? 'Confirmar Viagem' : 'Cobrir Viagem'}
                            </h4>
                            <button className="btn btn-light rounded-circle p-2" onClick={() => setModalConfig({ show: false, tipo: 'CONFIRMAR', linha: null })}>
                                <X size={24} />
                            </button>
                        </div>

                        <p className="text-muted mb-4">
                            Você está {modalConfig.tipo === 'CONFIRMAR' ? 'assumindo' : 'cobrindo'} a rota <strong>{modalConfig.linha?.rota}</strong> das <strong>{modalConfig.linha?.h_real}</strong>.
                        </p>

                        <div className="mb-4">
                            <label className="form-label fw-bold text-dark">Qual veículo você pegou?</label>
                            <input 
                                type="text" 
                                className="form-control form-control-lg text-center fw-bold fs-3" 
                                placeholder="EX: 1010"
                                value={veiculoPlaca}
                                onChange={e => setVeiculoPlaca(e.target.value.toUpperCase())}
                                autoFocus
                            />
                        </div>

                        <button 
                            className={`btn btn-lg w-100 fw-bold text-white ${modalConfig.tipo === 'CONFIRMAR' ? 'bg-success border-success' : 'bg-primary border-primary'}`}
                            onClick={handleEnviarAcao}
                            disabled={enviando}
                        >
                            {enviando ? 'Enviando...' : (modalConfig.tipo === 'CONFIRMAR' ? 'Confirmar Viagem' : 'Registrar Cobertura')}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MinhaEscala;
