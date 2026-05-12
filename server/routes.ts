import { Router } from 'express';
import multer from 'multer';
import { loginUnificado } from './controllers/authController';
import { getDashboardData } from './controllers/dashboardController';
import { calculateRoute, gerarLink } from './controllers/mapController';
import { getUsers, createUser, updateUser, deleteUser } from './controllers/userController';
import { getEscala, atualizarEscala, getMotoristas, deletarEscalaDia, importarEscala, getEmpresas } from './controllers/escalaController';
import { verifyToken, authorizeRole } from './middleware/auth';
import { getFrotaExterna } from './src/controllers/ExternalApiController'; // 
import { createRota, getRotas, getRotaById, updateRota, deleteRota } from './controllers/rotaController';
import { cadastrarMotorista, atualizarMotorista, listarMotoristas, excluirMotorista  } from './controllers/motoristaController';
import { getMinhaEscala, registrarAcaoMotorista } from './controllers/appMotoristaController';

const router = Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB em bytes
});

// ==========================================
// --- ROTAS PÚBLICAS ---
// ==========================================
router.post('/login', loginUnificado);

// ==========================================
// --- ROTAS PROTEGIDAS (Exigem Token) ---
// ==========================================

// Dashboard & Mapa
router.get('/dashboard', verifyToken, getDashboardData);
//router.get('/rota/rastreio/:hash/:tipo?', verifyToken, calculateRoute);
//router.get('/gerar-link-rastreio/:placa', verifyToken, gerarLink);
router.post('/rota/rastreio', verifyToken, calculateRoute);

// Admin (Usuários)
router.get('/users', verifyToken, authorizeRole('admin'), getUsers);
router.post('/users', verifyToken, authorizeRole('admin'), createUser);
router.delete('/users/:id', verifyToken, authorizeRole('admin'), deleteUser);
router.put('/users/:id', verifyToken, authorizeRole('admin'), updateUser);

// Escala 
router.get('/escala', verifyToken, getEscala);
router.put('/escala/atualizar', verifyToken, atualizarEscala);
router.get('/motoristas', verifyToken, getMotoristas);         
router.post('/escala/importar', verifyToken, authorizeRole('admin'), upload.single('file'), importarEscala);
router.delete('/escala', verifyToken, authorizeRole('admin'), deletarEscalaDia);

// Rota para integração externa
router.get('/v1/monitoramento/frota', verifyToken, getFrotaExterna); 

// Operações de Rotas (Painel)
router.post('/rotas', verifyToken, createRota);
router.get('/rotas', verifyToken, getRotas);
router.get('/rotas/:id', verifyToken, getRotaById);
router.put('/rotas/:id', verifyToken, updateRota);
router.delete('/rotas/:id', verifyToken, authorizeRole('admin'), deleteRota); // 🔥 Admin apenas

// Cadastro Motorista (Painel)
router.post('/motorista', verifyToken, cadastrarMotorista);
router.put('/motorista/:id', verifyToken, atualizarMotorista);
router.get('/motorista', verifyToken, listarMotoristas);
router.delete('/motorista/:id', verifyToken, authorizeRole('admin'), excluirMotorista); // 🔥 Corrigido: Colocado o verifyToken!

// Empresas
router.get('/empresas', verifyToken, getEmpresas);

// ==========================================
// --- ROTAS DO APP DO MOTORISTA (Celular) ---
// ==========================================
router.get('/app-motorista/escala', verifyToken, getMinhaEscala);
router.post('/app-motorista/acao', verifyToken, registrarAcaoMotorista);

// 🔥 CORRIGIDO: Export sempre deve ser a última linha do arquivo!
export default router;
