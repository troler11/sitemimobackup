// server/utils/auditLogger.ts
import { Request } from 'express';
import { pool } from '../db'; // Ajuste o caminho do seu banco de dados

export const registrarLogLogin = async (
    req: Request,
    identificacao: string,
    tipoUsuario: 'PAINEL' | 'MOTORISTA',
    status: 'SUCESSO' | 'FALHA',
    motivo: string = ''
) => {
    try {
        // Pega o IP real do usuário. 
        // Como você usa hospedagem na nuvem (Easypanel), o x-forwarded-for é crucial aqui.
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Desconhecido';
        
        // Se vier uma lista de IPs, pega o primeiro
        if (Array.isArray(ip)) ip = ip[0];
        else if (ip.includes(',')) ip = ip.split(',')[0];

        // Pega os dados do aparelho/navegador
        const userAgent = req.headers['user-agent'] || 'Desconhecido';

        const query = `
            INSERT INTO logs_login (identificacao, tipo_usuario, status, motivo, ip, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;

        // Executamos de forma assíncrona, mas NÃO seguramos o retorno do login caso dê erro no log
        await pool.query(query, [identificacao, tipoUsuario, status, motivo, ip, userAgent]);

    } catch (error) {
        console.error("🚨 Erro interno ao gravar log de acesso:", error);
    }
};
