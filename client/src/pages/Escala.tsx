import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Search, Plus, Download, Trash2, Edit2, ArrowLeft, RotateCcw, Save, Ban, Upload, RefreshCcw } from 'lucide-react';

// Reutilizamos o CSS do Dashboard para manter a identidade visual
import './Dashboard.css';
const colors = {
    bg: '#f3f4f6',
    white: '#ffffff',
    primary: '#00a86b',
    textGray: '#6b7280',
    textDark: '#111827',
    border: '#e5e7eb'
  };

interface ItemEscala {
    id: number; 
    empresa: string;
    rota: string;
    motorista: string;
    reserva: string;
    frota_escala: string;
    frota_enviada: string;
    h_prog: string;
    h_real: string;
    hr_sai: string;
    obs: string;
    sentido: string;
    ra_val: string;
    status: string; 
    usuario_confirmacao?: string; 
    hora_confirmacao?: string; 
    manutencao: string | boolean;
    aguardando: string | boolean;
    cobrir: string | boolean;
    confirmado: string | boolean;
    realocado: string | boolean;
}

const Escala: React.FC = () => {
    // --- ESTADOS GERAIS ---
    const [dados, setDados] = useState<ItemEscala[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroData, setFiltroData] = useState(new Date().toLocaleDateString('pt-BR'));
    
    // --- ESTADOS DE PERMISSÃO E IMPORTAÇÃO ---
    const [userRole, setUserRole] = useState<string>('');
    const [importando, setImportando] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- ESTADOS DE FILTRO ---
    const [filtroEmpresa, setFiltroEmpresa] = useState('');
    const [filtroStatus, setFiltroStatus] = useState(''); 
    const [busca, setBusca] = useState('');
const [filtroTurno, setFiltroTurno] = useState('todos');


    // --- ESTADOS PARA EDIÇÃO ---
    const [linhaEmEdicao, setLinhaEmEdicao] = useState<number | null>(null);
    const [formEdicao, setFormEdicao] = useState({ frota_enviada: '', motorista: '', status: '', obs: '' });
    const [salvando, setSalvando] = useState(false);
    
    // --- ESTADOS DO AUTOCOMPLETE ---
    const [listaMotoristas, setListaMotoristas] = useState<string[]>([]);
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

    // --- BUSCA OS DADOS DA ESCALA ---
    const fetchData = useCallback(async (isAutoUpdate = false) => {
        if (!isAutoUpdate && linhaEmEdicao === null) setLoading(true);
        try {
           const res = await api.get('/escala', { params: { data: filtroData } });
           setDados(Array.isArray(res.data) ? res.data : []);
        } catch (err) { 
            console.error("Erro ao carregar escala:", err); 
        } finally { 
            setLoading(false); 
        }
    }, [filtroData, linhaEmEdicao]);

    // --- VERIFICAÇÃO DE USUÁRIO (NOME E ROLE) ---
    useEffect(() => {
        try {
            const userDataText = localStorage.getItem('userData');
            if (userDataText) {
                const userObj = JSON.parse(userDataText);
                setUserRole(userObj.role || '');
            }
        } catch (e) {
            console.error("Erro ao ler dados do usuário.");
        }
        
        fetchData(); 
    }, [fetchData]);

    useEffect(() => {
        const intervalo = setInterval(() => {
            if (linhaEmEdicao === null) fetchData(true); 
        }, 60000);
        return () => clearInterval(intervalo);
    }, [fetchData, linhaEmEdicao]);

    useEffect(() => {
        const fetchMotoristas = async () => {
            try {
                const res = await api.get(`/motorista`);
                
                let dadosMotoristas = res.data;
                if (typeof dadosMotoristas === 'string') {
                    try { dadosMotoristas = JSON.parse(dadosMotoristas); } catch (e) {}
                }
                
                if (Array.isArray(dadosMotoristas)) {
                    const apenasNomes = dadosMotoristas.map((mot: any) => mot.nome ? mot.nome : mot);
                    setListaMotoristas(apenasNomes);
                }
            } catch (err) {
                console.error("Erro ao carregar lista de motoristas:", err);
            }
        };
        fetchMotoristas();
    }, []);

    // --- FUNÇÕES DO AUTOCOMPLETE ---
    const sugestoesFiltradas = useMemo(() => {
        if (!formEdicao.motorista) return listaMotoristas;
        const termo = formEdicao.motorista.toLowerCase();
        return listaMotoristas.filter(mot => mot.toLowerCase().includes(termo));
    }, [listaMotoristas, formEdicao.motorista]);

    const selecionarMotorista = (nome: string) => {
        setFormEdicao({ ...formEdicao, motorista: nome });
        setMostrarSugestoes(false); 
    };

    const handleDeleteEscala = async () => {
    // 🔥 Trocamos dataFiltro por filtroData
    const confirmar = window.confirm(`Tem certeza que deseja excluir toda a escala do dia ${filtroData}? Esta ação não pode ser desfeita.`);
    if (!confirmar) return;

    try {
        // 🔥 Trocamos dataFiltro por filtroData
        const response = await api.delete(`/escala?data=${filtroData}`); // Se você usar axios direto, mude 'api' para 'axios'

        if (response.data.success) {
            alert(response.data.message);
            // 🔥 Trocamos buscarDadosEscala() por fetchData(false)
            fetchData(false); 
        }
    } catch (error: any) {
        alert(error.response?.data?.error || "Erro ao tentar excluir a escala.");
    }
};

    // --- FUNÇÃO DE IMPORTAÇÃO DE EXCEL ---
    const handleImportarExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        // Opcional: Se quiser mandar a data selecionada no input para o backend
        formData.append('data_escala', filtroData); 

        setImportando(true);
        try {
            // OBS: Você precisará criar essa rota no backend recebendo Multer (multipart/form-data)
            await api.post('/escala/importar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Escala importada com sucesso!');
            fetchData(false); // Recarrega a tabela
        } catch (err: any) {
            console.error("Erro ao importar escala:", err);
            alert(err.response?.data?.error || 'Erro ao importar o arquivo. Verifique o formato.');
        } finally {
            setImportando(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Limpa o input file
        }
    };

    // --- PROCESSAMENTO DE DADOS (MEMOIZADOS) ---
    const empresasUnicas = useMemo(() => Array.from(new Set(dados.map(d => d.empresa))).sort(), [dados]);

    const dadosFiltrados = useMemo(() => {
        return dados.filter(item => {
            // 1. Filtro de Empresa
            if (filtroEmpresa && item.empresa !== filtroEmpresa) return false;
            
            // 2. Filtro de Horário (Turno) 🔥 NOVO
            if (filtroTurno !== 'todos') {
                const horaStr = item.h_real || '00:00';
                const horaNum = parseInt(horaStr.split(':')[0], 10); // Pega só a hora (ex: "04:30" vira 4)

                // Madrugada configurada das 00:00 até 03:59 (ajuste se a sua madrugada for até as 04:59)
                if (filtroTurno === 'madrugada' && (horaNum < 0 || horaNum >= 4)) return false;
                if (filtroTurno === 'manha' && (horaNum < 4 || horaNum >= 12)) return false;
                if (filtroTurno === 'tarde' && (horaNum < 12 || horaNum >= 18)) return false;
                if (filtroTurno === 'noite' && (horaNum < 18 || horaNum >= 24)) return false;
            }

            // 3. Filtro de Status
            const realizou = item.ra_val && String(item.ra_val).trim() !== '' && String(item.ra_val).trim() !== '0';
            const obsTexto = (item.obs || '').toLowerCase();
            const isCobrir = item.status === 'COBRIR' || obsTexto.includes('cobrir');

            let statusItem = 'pendente';
            if (item.status === 'MANUTENÇÃO') statusItem = 'manutencao';
            else if (item.status === 'AGUARDANDO CARRO') statusItem = 'aguardando';
            else if (item.status === 'CONFIRMADO' || realizou) statusItem = 'confirmado';
            
            if (filtroStatus) {
                if (filtroStatus === 'cobrir') {
                    if (!isCobrir) return false;
                } else if (filtroStatus !== statusItem) return false;
            }

            // 4. Filtro de Busca (Texto)
            if (busca) {
                const termo = busca.toLowerCase();
                const texto = `${item.empresa} ${item.rota} ${item.motorista} ${item.frota_escala} ${item.obs}`.toLowerCase();
                if (!texto.includes(termo)) return false;
            }
            
            return true;
        });
    // 🔥 IMPORTANTE: Adicione o filtroTurno no final do array de dependências abaixo:
    }, [dados, filtroEmpresa, filtroStatus, filtroTurno, busca]);

    const kpis = useMemo(() => {
        let k = { total: 0, confirmados: 0, pendentes: 0, manutencao: 0, aguardando: 0, cobrir: 0 };
        const baseCalculo = filtroEmpresa ? dados.filter(d => d.empresa === filtroEmpresa) : dados;

        baseCalculo.forEach(row => {
            k.total++;
            const realizou = row.ra_val && String(row.ra_val).trim() !== '' && String(row.ra_val).trim() !== '0';
            const obsTexto = (row.obs || '').toLowerCase();
            const isCobrir = row.status === 'COBRIR' || obsTexto.includes('cobrir');

            if (row.status === 'MANUTENÇÃO') {
                k.manutencao++;
            } else if (row.status === 'CONFIRMADO' || realizou) {
                k.confirmados++;
            } else {
                k.pendentes++;
            }

            if (row.status === 'AGUARDANDO CARRO') k.aguardando++;
            if (isCobrir) k.cobrir++;
        });
        return k;
    }, [dados, filtroEmpresa]);

    // --- FUNÇÕES DE EDIÇÃO ---
    const iniciarEdicao = (index: number, row: ItemEscala) => {
        setLinhaEmEdicao(index);
        
        let statusAtual = row.status || 'PENDENTE DE CONFIRMAÇÃO'; 

        const statusInvalidos = ['CONFIRMADO', 'MANUTENÇÃO', 'COBRIR', 'REALOCADO', 'PENDENTE DE CONFIRMAÇÃO', 'AGUARDANDO CARRO'];
        let motoristaParaEditar = row.motorista;
        
        if (row.reserva && !statusInvalidos.includes(String(row.reserva).trim().toUpperCase())) {
            motoristaParaEditar = row.reserva;
        }

        const frotaAtual = (row.frota_enviada && row.frota_enviada !== '---' && row.frota_enviada !== '') 
            ? row.frota_enviada 
            : row.frota_escala;

        setFormEdicao({
            frota_enviada: frotaAtual,
            motorista: motoristaParaEditar, 
            status: statusAtual,
            obs: row.obs || '' 
        });
        setMostrarSugestoes(false);
    };

    const cancelarEdicao = () => {
        setLinhaEmEdicao(null);
        setMostrarSugestoes(false);
    };

    const salvarEdicao = async (row: ItemEscala) => {
        setSalvando(true);
        try {
            let nomeLogado = "Usuário";
            
            try {
                const userDataText = localStorage.getItem('userData'); 
                if (userDataText) {
                    const userObj = JSON.parse(userDataText);
                    nomeLogado = userObj.full_name || userObj.username || "Usuário";
                }
            } catch (e) {
                console.log("Aviso: Falha ao ler o usuário do localStorage.");
            }

            const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // 🔥 AUTOMAÇÃO DA OBSERVAÇÃO
            let obsTratada = formEdicao.obs;
            if (formEdicao.status === 'COBRIR') {
                obsTratada = 'COBRIR'; // Força a palavra se precisar cobrir
            } else if (obsTratada.trim().toUpperCase() === 'COBRIR') {
                obsTratada = ''; // Limpa a palavra se a linha já foi coberta
            }

            await api.put('/escala/atualizar', {
                id: row.id, 
                data_escala: filtroData, 
                empresa: row.empresa, 
                rota: row.rota,
                h_real: row.h_real, 
                novo_motorista: formEdicao.motorista, 
                nova_frota: formEdicao.frota_enviada || "",
                novo_status: formEdicao.status,
                nova_obs: obsTratada, // 🔥 Usa a observação inteligente aqui
                usuario_confirmacao: nomeLogado
            });
            
            setDados(prevDados => prevDados.map(item => {
                if (item.id === row.id) { 
                    
                    let novoReserva = item.reserva;
                    const motTitular = String(item.motorista).trim().toUpperCase();
                    const motEnviado = String(formEdicao.motorista).trim().toUpperCase();

                    if (motEnviado !== motTitular && motEnviado !== "") {
                        novoReserva = formEdicao.motorista;
                    } else {
                        novoReserva = "";
                    }
                    
                    return { 
                        ...item, 
                        reserva: novoReserva,
                        frota_enviada: formEdicao.frota_enviada || '---',
                        status: formEdicao.status,
                        obs: obsTratada, // 🔥 Usa a observação inteligente aqui também
                        usuario_confirmacao: nomeLogado, 
                        hora_confirmacao: horaAtual,     
                        manutencao: formEdicao.status === 'MANUTENÇÃO' ? 'sim' : '', 
                        aguardando: formEdicao.status === 'AGUARDANDO CARRO' ? 'sim' : '',
                        cobrir: formEdicao.status === 'COBRIR' ? 'sim' : '' ,
                        confirmado: formEdicao.status === 'CONFIRMADO' ? 'sim' : '',
                        realocado: formEdicao.status === 'REALOCADO' ? 'sim' : '' ,
                    };
                }
                return item;
            }));
            
            setLinhaEmEdicao(null);
        } catch (err: any) {
            console.error("Erro ao salvar:", err);
            const msgErro = err.response?.data?.error || "Erro ao salvar as alterações.";
            alert(msgErro);
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="main-content">
            
            {/* --- HEADER --- */}
            <div className="header-flex mb-4">
                <div>
                    <h2 className="page-title">Escala Diária</h2>
                    <p className="text-muted small mb-0 mt-1">
                        <i className="fas fa-sync-alt me-1"></i> Atualização automática (1m)
                    </p>
                </div>
                <div className="d-flex gap-2 align-items-center">
                    <input 
                        type="text" 
                        className="form-control red-border text-center fw-bold" 
                        value={filtroData} 
                        onChange={e => setFiltroData(e.target.value)} 
                        placeholder="dd/mm/aaaa"
                        style={{width: '140px'}}
                    />

                     <RefreshCcw size={18} onClick={() => fetchData(false)} style={{ cursor: 'pointer', color: colors.textGray }} />
                    
                    {/* 🔥 BOTÕES DE AÇÃO: Só aparecem para Admin e Escalante */}
                    {(userRole === 'admin' || userRole === 'escalante') && (
                        <>
                            {/* Botão de Excluir o Dia */}
                            <button 
                                className="btn btn-danger" 
                                title="Excluir Escala do Dia"
                                onClick={handleDeleteEscala}
                                style={{ 
                                    cursor: 'pointer', 
                                    height: '100%', 
                                    margin: 0, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px' 
                                }}
                            >
                                {/* Lembre-se de importar o Trash2 do lucide-react lá em cima! */}
                                <Trash2 size={18} />
                                <span>Excluir</span>
                            </button>

                            {/* Botão de Importação */}
                            <label 
                                className="btn btn-success" 
                                title="Importar Excel (XLSX)" 
                                style={{ 
                                    cursor: 'pointer', 
                                    height: '100%', 
                                    margin: 0, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px' 
                                }}
                            >
                                {importando ? (
                                    <>
                                        <RefreshCcw size={18} className="animate-spin" />
                                        <span>Importando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        <span>Nova Escala</span>
                                    </>
                                )}

                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls" 
                                    style={{ display: 'none' }} 
                                    onChange={handleImportarExcel} 
                                    ref={fileInputRef}
                                    disabled={importando}
                                />
                            </label>
                        </>
                    )}
                </div>
            </div>

            {/* --- KPI CARDS --- */}
            <div className="kpi-row mb-4">
                
                <div className="kpi-card">
                    <div className="kpi-icon text-dark">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-label">TOTAL LINHAS</span>
                        <span className="kpi-number text-dark">{kpis.total}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon text-green">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-label">CONFIRMADAS</span>
                        <span className="kpi-number text-green">{kpis.confirmados}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon text-warning">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-label">PENDENTES</span>
                        <span className="kpi-number text-warning">{kpis.pendentes}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon text-red">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-label">MANUTENÇÃO</span>
                        <span className="kpi-number text-red">{kpis.manutencao}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon text-warning">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 22h14"></path>
                            <path d="M5 2h14"></path>
                            <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
                            <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
                        </svg>
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-label">AGUARDANDO</span>
                        <span className="kpi-number text-warning">{kpis.aguardando}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon text-red">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-label">COBRIR</span>
                        <span className="kpi-number text-red">{kpis.cobrir}</span>
                    </div>
                </div>
            </div>

            {/* --- FILTROS --- */}
            {/* --- FILTROS --- */}
            <div className="filters-flex mb-4 d-flex gap-2">
                <div style={{width: '20%'}}>
                    <select className="form-select red-border" value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
                        <option value="">Todas as Empresas</option>
                        {empresasUnicas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                
                {/* 🔥 NOVO DROPDOWN DE HORÁRIOS */}
                <div style={{width: '20%'}}>
                    <select className="form-select red-border" value={filtroTurno} onChange={e => setFiltroTurno(e.target.value)}>
                        <option value="todos">Todos os Horários</option>
                        <option value="madrugada">Apenas Madrugada (00h-04h)</option>
                        <option value="manha">Manhã (04h-12h)</option>
                        <option value="tarde">Tarde (12h-18h)</option>
                        <option value="noite">Noite (18h-00h)</option>
                    </select>
                </div>

                <div style={{width: '20%'}}>
                    <select className="form-select red-border" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                        <option value="">Status Visual: Todos</option>
                        <option value="pendente">Pendentes</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="manutencao">Manutenção</option>
                        <option value="aguardando">Aguardando carro</option>
                        <option value="cobrir">Cobrir</option>
                    </select>
                </div>
                <div style={{flex: 1}}>
                    <input 
                        type="text" 
                        className="form-control red-border" 
                        placeholder="Buscar motorista, frota, rota..." 
                        value={busca} 
                        onChange={e => setBusca(e.target.value)} 
                    />
                </div>
            </div>

            {/* --- TABELA --- */}
            <div className="table-responsive table-card" style={{ overflow: 'visible' }}>
                <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                        <tr>
                            <th className="text-left" style={{width: '5%'}}>STATUS</th>
                            <th className="text-left" style={{width: '19%'}}>MOTORISTA</th>
                            <th style={{width: '5%'}}>CLIENTE</th>
                            <th style={{width: '20%'}}>LINHA</th>
                            <th className="text-left" style={{width: '05%'}}>SENTIDO</th>
                            <th className="text-left" style={{width: '5%'}}>INICIO</th>
                            <th className="text-left" style={{width: '5%'}}>FIM</th>
                            <th className="text-left" style={{width: '5%'}}>PREFIXO</th>
                            <th className="text-left" style={{width: '10%'}}>OBSERVAÇÕES</th>
                            <th className="text-center" style={{width: '5%'}}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={10} className="text-center py-5">Carregando escala...</td></tr>
                        ) : dadosFiltrados.length === 0 ? (
                            <tr><td colSpan={10} className="text-center py-5 text-muted">Nenhum registro encontrado.</td></tr>
                        ) : (
                            dadosFiltrados.map((row, i) => {
                                const realizou = row.ra_val && String(row.ra_val).trim() !== '' && String(row.ra_val).trim() !== '0';
                                const isCobrir = (row.obs || '').toLowerCase().includes('cobrir');
                                const emEdicao = linhaEmEdicao === i; 
                                
                                return (
                                   <tr key={i} className={emEdicao ? 'table-warning' : isCobrir ? 'table-danger' : ''}>

                                         {/* STATUS COM DROPDOWN */}
                                       <td className="text-center">
                                            {emEdicao ? (
                                                <select 
                                                    className="form-select form-select-sm border-warning text-left"
                                                    value={formEdicao.status}
                                                    onChange={e => setFormEdicao({...formEdicao, status: e.target.value})}
                                                >
                                                    <option value="PENDENTE DE CONFIRMAÇÃO">Pendente</option>
                                                    <option value="AGUARDANDO CARRO">Aguardando Carro</option>
                                                    <option value="MANUTENÇÃO">Manutenção</option>
                                                    <option value="CONFIRMADO">Confirmado</option>
                                                    <option value="COBRIR">Cobrir</option>
                                                    <option value="REALOCADO">Realocado</option>
                                                    <option value="CANCELADA">Cancelada</option>
                                                </select>
                                            ) : (
                                               row.status === 'MANUTENÇÃO' ? <span className="badge badge-red">Manutenção</span> :
                                               
                                               row.status === 'CONFIRMADO' ? (
                                                   <span 
                                                       className="badge badge-green" 
                                                       title={`Confirmado por: ${row.usuario_confirmacao || 'Desconhecido'} às ${row.hora_confirmacao || '--:--'}`}
                                                       style={{ cursor: 'help' }}
                                                   >
                                                       CONFIRMADO
                                                   </span>
                                               ) :
                                               
                                               row.status === 'AGUARDANDO CARRO' ? <span className="badge badge-warning text-dark">Aguardando</span> :
                                             row.status === 'CANCELADA' ? <span className="badge badge-dark text-light">Cancelada</span> :
                                               row.status === 'REALOCADO' ? <span className="badge badge-info text-dark">Realocado</span> : 
                                               row.status === 'COBRIR' ? <span className="badge badge-dark" style={{background: '#6f42c1', color: '#fff'}}>Cobrir</span> :
                                               <span className="badge badge-dark">Pendente</span>
                                            )} 
                                        </td>
                                        
                                        {/* MOTORISTA COM AUTOCOMPLETE */}
                                        <td style={{ position: 'relative' }}>
                                            {emEdicao ? (
                                                <>
                                                    <input 
                                                        type="text" 
                                                        className="form-control form-control-sm border-warning" 
                                                        value={formEdicao.motorista} 
                                                        onChange={e => {
                                                            setFormEdicao({...formEdicao, motorista: e.target.value});
                                                            setMostrarSugestoes(true);
                                                        }}
                                                        onFocus={() => setMostrarSugestoes(true)}
                                                        onClick={() => setMostrarSugestoes(true)}
                                                        onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                                                        placeholder="Pesquise o Motorista..."
                                                        autoComplete="off"
                                                    />
                                                    
                                                    {mostrarSugestoes && sugestoesFiltradas.length > 0 && (
                                                        <ul className="list-group position-absolute w-100 shadow-lg border border-secondary" 
                                                            style={{ zIndex: 9999, maxHeight: '250px', overflowY: 'auto', top: '100%', left: 0, backgroundColor: 'white' }}>
                                                            {sugestoesFiltradas.map((mot, idx) => (
                                                                <li 
                                                                    key={idx} 
                                                                    className="list-group-item list-group-item-action py-2 px-2 small"
                                                                    style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault(); 
                                                                        selecionarMotorista(mot);
                                                                    }}
                                                                >
                                                                    {mot}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="fw-bold text-dark small">{row.motorista}</div>
                                                    {row.reserva && <small className="text-muted d-block" style={{fontSize: '0.75rem'}}>Reserva: {row.reserva}</small>}
                                                </>
                                            )}
                                        </td>

                                          {/* EMPRESA */}
                                        <td>
                                            <div className="fw-bold text-dark">{row.empresa}</div>
                                        </td>
                                        
                                        {/* LINHA */}
                                        <td>
                                        <div className="fw-bold text-dark" style={{maxWidth: '250px'}} title={row.rota}>
                                                {row.rota}
                                            </div>
                                        </td>
                                      
                                        {/* SENTIDO */}
                                        <td>
                                        <div className="fw-bold text-dark" style={{maxWidth: '250px'}} title={row.sentido}>
                                                {row.sentido}
                                            </div>
                                        </td>
                                        
                                    {/* INICIO */}
                                         <td className="text-end">
                                            <div className="fw-bold text-dark">{row.h_real}</div>
                                            {(row.h_real && row.h_real.length > 2) && (
                                                <div className={row.h_real > row.h_real ? 'text-red fw-bold small' : 'text-green fw-bold small'}>
                                                </div>
                                            )}
                                        </td>

                                          {/* FIM */}
                                        <td className="text-end">
                                            <div className="fw-bold text-dark">{row.hr_sai}</div>
                                            {(row.h_real && row.h_real.length > 2) && (
                                                <div className={row.hr_sai > row.hr_sai ? 'text-red fw-bold small' : 'text-green fw-bold small'}>
                                                </div>
                                            )}
                                        </td>
                                        
                                       {/* FROTA */}
                                        <td className="text-center">
                                            {emEdicao ? (
                                                <input 
                                                    type="text" 
                                                    className="form-control form-control-sm text-center border-warning" 
                                                    value={formEdicao.frota_enviada} 
                                                    onChange={e => setFormEdicao({...formEdicao, frota_enviada: e.target.value})}
                                                    placeholder="Nova Frota"
                                                />
                                            ) : (
                                                <div className="d-flex flex-column align-items-left">
                                                    {/* Frota programada */}
                                                    <span className="badge badge-dark">{row.frota_escala}</span>
                                                    
                                                    {/* Só exibe a frota de baixo se ela for preenchida E diferente da programada */}
                                                    {(row.frota_enviada && 
                                                      row.frota_enviada !== '---' && 
                                                      String(row.frota_enviada).trim() !== String(row.frota_escala).trim()) && (
                                                        <span className="badge badge-red">{row.frota_enviada}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* OBSERVAÇÕES */}
                                        <td>
                                            {emEdicao ? (
                                                <input 
                                                    type="text" 
                                                    className="form-control form-control-sm border-warning" 
                                                    value={formEdicao.obs} 
                                                    onChange={e => setFormEdicao({...formEdicao, obs: e.target.value})}
                                                    placeholder="Adicionar observação..."
                                                />
                                            ) : (
                                                <div className="d-flex flex-column">
                                                    {row.obs && (
                                                        <small className="fw-bold text-dark small" style={{color: isCobrir ? '#6f42c1' : '#6c757d', fontWeight: isCobrir ? 'bold' : 'normal'}}>
                                                            {isCobrir && <i className="fas fa-sync-alt me-1"></i>}
                                                            {row.obs}
                                                        </small>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        <td className="text-center">
                                            {emEdicao ? (
                                                <div className="d-flex gap-1 justify-content-center">

                                                     <Save size={16} onClick={() => salvarEdicao(row)} style={{ cursor: 'pointer', color: colors.textGray }} />

                                                    
                                                    <Ban size={16} onClick={() => cancelarEdicao()} style={{ cursor: 'pointer', color: colors.textGray }} />
                                                </div>
                                            ) : (

                                        <Edit2 size={16} onClick={() => iniciarEdicao(i, row)} style={{ cursor: 'pointer', color: colors.textGray }} />
                                               
                                            )}
                                        </td>
                                        
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Escala;
