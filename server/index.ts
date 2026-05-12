import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import routes from './routes'; 

const app = express();

// 1. HELMET: Esconde a identidade do servidor e protege contra injeções
app.use(helmet({ contentSecurityPolicy: false }));

// 2. CORS RESTRITO
const originPermitida = process.env.NODE_ENV === 'production' 
    ? 'https://mimo-mimopainel.3sbqz4.easypanel.host' 
    : '*'; 

app.use(cors({
    origin: originPermitida,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. PROTEÇÃO DE PAYLOAD
app.use(express.json({ limit: '1mb' })); 

// 4. DELEGAÇÃO DE ROTAS API
app.use('/api', routes); 


// --- SERVINDO O FRONTEND (Conforme seu código original que funcionava) ---

const clientPath = path.join(__dirname, '../client');
const distPath = path.join(__dirname, '../client/dist');
const publicPath = path.join(__dirname, '../client/public');

// 1. Libera a pasta 'public' (onde estão o manifest e os ícones do PWA)
app.use(express.static(publicPath));

// 2. Serve os arquivos de produção gerados pelo build (JS, CSS)
app.use(express.static(distPath));

// 3. Serve a raiz do client (para outras mídias soltas)
app.use(express.static(clientPath));

// 4. Rota Curinga (*) que entrega o index.html (DEVE ficar por último)
app.get('*', (req: Request, res: Response) => {
    // Tenta entregar o HTML de produção primeiro (mais rápido e seguro)
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
            // Se o build ainda não rodou, entrega o HTML de desenvolvimento
            res.sendFile(path.join(clientPath, 'index.html'));
        }
    });
});


// 5. TRATAMENTO DE ERRO GLOBAL
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('🚨 Erro Global:', err.message);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = parseInt(process.env.PORT || '3000');

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT} e IP 0.0.0.0`);
});
