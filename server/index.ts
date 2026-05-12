import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import routes from './routes'; 

const app = express();

// 1. HELMET: Ajustado para permitir carregamento de recursos locais do PWA
app.use(helmet({ 
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS RESTRITO
const originPermitida = process.env.NODE_ENV === 'production' 
    ? 'https://mimo-mimotestes.3sbqz4.easypanel.host' 
    : '*'; 

app.use(cors({
    origin: originPermitida,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' })); 

// 4. DELEGAÇÃO DE ROTAS API
app.use('/api', routes); 

// --- SERVINDO O FRONTEND (AJUSTE PARA WEBPACK + DOCKER) ---

// No Docker, __dirname costuma ser /app/dist/server ou /app/server
// O process.cwd() garante que pegamos a raiz /app
const rootDir = process.cwd();
const distPath = path.resolve(rootDir, 'dist/client');

// 1. Servir arquivos estáticos (JS, CSS, Imagens)
// Importante: Deve vir ANTES de qualquer rota de fallback
app.use(express.static(distPath));

// 2. Rota explícita para o ícone e manifest (evita erro de Download no PWA)
app.get(['/manifest.json', '/sw.js', '/icon-192.png', '/icon-512.png'], (req, res) => {
    res.sendFile(path.join(distPath, req.path));
});

// 3. Rota Curinga (*) que entrega o index.html
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
            res.status(404).send("Frontend não encontrado. Verifique o build.");
        }
    });
});

// 5. TRATAMENTO DE ERRO GLOBAL
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('🚨 Erro Global:', err.message);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
});

const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
