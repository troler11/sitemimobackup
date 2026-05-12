import { Request, Response } from 'express';
import { pool } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { registrarLogLogin } from '../utils/auditLogger';

export const loginUnificado = async (req: Request, res: Response) => {
    // Recebe 'identifier' (que pode ser username ou cpf) e password
    const { identifier, password } = req.body;
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        console.error("ERRO FATAL: JWT_SECRET não está definido!");
        return res.status(500).json({ message: "Erro interno do servidor." });
    }

    try {
        // 1. TENTATIVA: Buscar na tabela de usuários (Escritório/Admin)
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [identifier]);
        
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const storedHash = user.password?.replace('$2y$', '$2a$');
            const validPassword = await bcrypt.compare(password, storedHash);

            if (validPassword) {
                const empresas = typeof user.allowed_companies === 'string' ? JSON.parse(user.allowed_companies) : (user.allowed_companies || []);
                const menus = typeof user.allowed_menus === 'string' ? JSON.parse(user.allowed_menus) : (user.allowed_menus || []);

                const token = jwt.sign(
                    { id: user.id, role: user.role, allowed_companies: empresas }, 
                    jwtSecret, 
                    { expiresIn: '24h' }
                );

                await registrarLogLogin(req, identifier, 'PAINEL', 'SUCESSO', 'Login administrativo');
                return res.json({
                    token,
                    user: { id: user.id, name: user.full_name, role: user.role, allowed_companies: empresas, menus }
                });
            }
        }

        // 2. TENTATIVA: Buscar na tabela de motoristas (CPF)
        // Remove pontos e traços caso o usuário tenha digitado o CPF formatado
        const cpfLimpo = identifier.replace(/\D/g, '');
        const motoristaResult = await pool.query('SELECT * FROM motoristas WHERE cpf = $1 OR cpf = $2', [identifier, cpfLimpo]);

        if (motoristaResult.rows.length > 0) {
            const motorista = motoristaResult.rows[0];
            const storedHash = motorista.senha?.replace('$2y$', '$2a$');

            if (storedHash && await bcrypt.compare(password, storedHash)) {
                const token = jwt.sign(
                    { id: motorista.id, full_name: motorista.nome, role: 'motorista' },
                    jwtSecret,
                    { expiresIn: '30d' } // Token mais longo para o app do motorista
                );

                await registrarLogLogin(req, identifier, 'MOTORISTA', 'SUCESSO', 'Acesso motorista liberado');
                return res.json({
                    token,
                    user: { id: motorista.id, name: motorista.nome, role: 'motorista' }
                });
            }
        }

        // 3. SE CHEGOU AQUI, NADA DEU CERTO
        await registrarLogLogin(req, identifier || 'VAZIO', 'UNIFICADO', 'FALHA', 'Credenciais inválidas');
        return res.status(401).json({ message: 'Usuário/CPF ou senha incorretos.' });

    } catch (error) {
        console.error("Erro no Login Unificado:", error);
        return res.status(500).json({ message: "Erro interno no servidor" });
    }
};
