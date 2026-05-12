import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Interfaces
interface User {
    id?: number;
    username: string;
    full_name: string;
    role: string;
    allowed_companies: string[];
    allowed_menus: string[];
    password?: string;
}

const SISTEMA_MENUS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'rotas', label: 'Rotas' },
    { key: 'escala', label: 'Escala' },
    { key: 'relatorios', label: 'Power B.I' },
    { key: 'usuarios', label: 'Usuários' },
    { key: 'atrasos', label: 'Atrasos' },
    { key: 'motoristas', label: 'Motoristas' }
];

const Admin: React.FC = () => {
    // --- 1. LÓGICA DE SEGURANÇA ---
    const { currentUser, isLoggedIn, isInitializing } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isInitializing) {
            if (!isLoggedIn) {
                navigate('/login');
                return;
            }
            if (currentUser?.role !== 'admin') {
                navigate('/unauthorized');
            }
        }
    }, [isInitializing, isLoggedIn, currentUser, navigate]);

    const [users, setUsers] = useState<User[]>([]);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);
    
    const [listaEmpresas, setListaEmpresas] = useState<string[]>([]);
    
    // 🔥 NOVO ESTADO: Controla se a lista de empresas está em modo de edição
    const [isEditingCompanies, setIsEditingCompanies] = useState(false);

    const [formData, setFormData] = useState<User>({
        username: '', full_name: '', role: 'user', allowed_companies: [], allowed_menus: [], password: ''
    });

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data.users);
        } catch (error) {
            console.error("Erro ao carregar usuários", error);
        }
    };

    const fetchEmpresas = async () => {
        try {
            const res = await api.get('/empresas');
            setListaEmpresas(res.data);
        } catch (error) {
            console.error("Erro ao carregar empresas", error);
        }
    };

    useEffect(() => { 
        if (isLoggedIn && currentUser?.role === 'admin') {
            fetchUsers(); 
            fetchEmpresas();
        }
    }, [isLoggedIn, currentUser]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser && editingUser.id) {
                await api.put(`/users/${editingUser.id}`, formData);
            } else {
                await api.post('/users', formData);
            }
            setShowModal(false);
            fetchUsers();
        } catch (err) { 
            alert('Erro ao salvar usuário'); 
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza?')) return;
        try {
            await api.delete(`/users/${id}`);
            fetchUsers();
        } catch (err) { 
            alert('Erro ao excluir usuário'); 
        }
    };

    const openModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({ 
                ...user, 
                allowed_companies: user.allowed_companies || [], 
                allowed_menus: user.allowed_menus || [],         
                password: '' 
            });
            // 🔥 Se for editar alguém existente, mantém as empresas "fechadas" no início
            setIsEditingCompanies(false);
        } else {
            setEditingUser(null);
            setFormData({ username: '', full_name: '', role: 'user', allowed_companies: [], allowed_menus: [], password: '' });
            // 🔥 Se for usuário novo, já abre a lista de empresas para facilitar o cadastro
            setIsEditingCompanies(true);
        }
        setShowModal(true);
    };

    const toggleArrayItem = (field: 'allowed_companies' | 'allowed_menus', value: string) => {
        const current = formData[field];
        const updated = current.includes(value) ? current.filter(i => i !== value) : [...current, value];
        setFormData({ ...formData, [field]: updated });
    };

    if (isInitializing || !isLoggedIn || currentUser?.role !== 'admin') {
        return null;
    }

    return (
        <div className="container-fluid mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Gestão de Usuários</h3>
                <button className="btn btn-primary" onClick={() => openModal()}><i className="bi bi-person-plus"></i> Novo Usuário</button>
            </div>

            <div className="card border-0 shadow-sm">
                <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>Nome</th>
                            <th>Usuário</th>
                            <th>Nível</th>
                            <th>Empresas</th>
                            <th className="text-end">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td className="fw-bold">{u.full_name}</td>
                                <td>{u.username}</td>
                                <td>
                                    <span className={`badge ${
                                        u.role === 'admin' ? 'bg-danger' : 
                                        u.role === 'escalante' ? 'bg-warning text-dark' : 
                                        'bg-info'
                                    }`}>
                                        {u.role === 'admin' ? 'Administrador' : 
                                         u.role === 'escalante' ? 'Escalante' : 
                                         'Usuário Comum'}
                                    </span>
                                </td>
                                <td className="small text-muted">{u.allowed_companies?.length} empresas</td>
                                <td className="text-end">
                                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openModal(u)}><i className="bi bi-pencil"></i></button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u.id!)}><i className="bi bi-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <form className="modal-content" onSubmit={handleSave}>
                            <div className="modal-header">
                                <h5 className="modal-title">{editingUser ? 'Editar' : 'Novo'} Usuário</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Nome Completo</label>
                                        <input type="text" className="form-control" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Usuário (Login)</label>
                                        <input type="text" className="form-control" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Senha {editingUser && '(Deixe em branco para manter)'}</label>
                                        <input type="password" className="form-control" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Nível</label>
                                        <select className="form-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                            <option value="user">Usuário Comum</option>
                                            <option value="escalante">Escalante</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>

                                    {/* 🔥 LÓGICA DE EDIÇÃO CONDICIONAL DAS EMPRESAS */}
                                    <div className="col-12 mt-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <label className="fw-bold mb-0">Empresas Permitidas</label>
                                            
                                            {/* Se NÃO estiver editando as empresas, mostra o botão para Habilitar a Edição */}
                                            {!isEditingCompanies ? (
                                                <button 
                                                    type="button" 
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => setIsEditingCompanies(true)}
                                                >
                                                    <i className="bi bi-pencil"></i> Editar Empresas
                                                </button>
                                            ) : (
                                                /* Se ESTIVER editando, mostra os botões de controle Todas/Nenhuma */
                                                listaEmpresas.length > 0 && (
                                                    <div>
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-sm btn-outline-success me-2"
                                                            onClick={() => setFormData({ ...formData, allowed_companies: [...listaEmpresas] })}
                                                        >
                                                            <i className="bi bi-check-all"></i> Todas
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => setFormData({ ...formData, allowed_companies: [] })}
                                                        >
                                                            <i className="bi bi-x"></i> Nenhuma
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        <div className="card p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                            {!isEditingCompanies ? (
                                                // 🔥 MODO VISUALIZAÇÃO: Mostra apenas as empresas que o usuário já tem acesso
                                                formData.allowed_companies.length === 0 ? (
                                                    <span className="text-muted small p-2">Nenhuma empresa permitida no momento.</span>
                                                ) : (
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {formData.allowed_companies.map(emp => (
                                                            <span key={emp} className="badge bg-secondary">{emp}</span>
                                                        ))}
                                                    </div>
                                                )
                                            ) : (
                                                // 🔥 MODO EDIÇÃO: Mostra todos os checkboxes do banco de dados
                                                listaEmpresas.length === 0 ? (
                                                    <span className="text-muted small p-2">Nenhuma empresa encontrada no banco de dados.</span>
                                                ) : (
                                                    listaEmpresas.map(emp => (
                                                        <div className="form-check" key={emp}>
                                                            <input 
                                                                className="form-check-input" type="checkbox" 
                                                                checked={formData.allowed_companies.includes(emp)}
                                                                onChange={() => toggleArrayItem('allowed_companies', emp)}
                                                            />
                                                            <label className="form-check-label">{emp}</label>
                                                        </div>
                                                    ))
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-12 mt-2">
                                        <label className="fw-bold">Menus Permitidos</label>
                                        <div className="d-flex gap-3 flex-wrap">
                                            {SISTEMA_MENUS.map(m => (
                                                <div className="form-check" key={m.key}>
                                                    <input 
                                                        className="form-check-input" type="checkbox" 
                                                        checked={formData.allowed_menus.includes(m.key)}
                                                        onChange={() => toggleArrayItem('allowed_menus', m.key)}
                                                    />
                                                    <label className="form-check-label">{m.label}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
