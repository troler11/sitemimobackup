import { Request, Response } from 'express';
import { pool } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { registrarLogLogin } from '../utils/auditLogger';

// ==========================================
// LOGIN PADRÃO (Administradores, Escalantes)
// ==========================================
export const login = async (req: Request, res: Response) => {
    // 1. Recebe 'username' do Front-end
    const { username, password } = req.body;

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (userResult.rows.length === 0) {
            await registrarLogLogin(req, username || 'VAZIO', 'PAINEL', 'FALHA', 'Usuário não existe');
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const user = userResult.rows[0];

        let storedHash = user.password;
        if (storedHash && storedHash.startsWith('$2y$')) {
            storedHash = storedHash.replace('$2y$', '$2a$');
        }

        const validPassword = await bcrypt.compare(password, storedHash);
        if (!validPassword) {
            await registrarLogLogin(req, username, 'PAINEL', 'FALHA', 'Senha incorreta');
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // 🔥 AQUI DEFINIMOS A VARIÁVEL QUE FALTAVA 🔥
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("ERRO FATAL: JWT_SECRET não está definido!");
            return res.status(500).json({ message: "Erro interno do servidor." });
        }

        const empresasPermitidas = typeof user.allowed_companies === 'string'
            ? JSON.parse(user.allowed_companies)
            : (user.allowed_companies || []);

        const menusPermitidos = typeof user.allowed_menus === 'string'
            ? JSON.parse(user.allowed_menus)
            : (user.allowed_menus || []);

        // Sucesso! Gera o Token com as empresas permitidas na bagagem
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.role,
                allowed_companies: empresasPermitidas
            }, 
            jwtSecret,
            { expiresIn: '24h' }
        );

        await registrarLogLogin(req, username, 'PAINEL', 'SUCESSO', 'Login autorizado');

        return res.json({
            message: 'Login com sucesso',
            token,
            user: {
                id: user.id,
                name: user.full_name,
                role: user.role,
                allowed_companies: empresasPermitidas,
                menus: menusPermitidos
            }
        });

    } catch (error) {
        console.error("Erro Login Normal:", error);
        return res.status(500).json({ message: "Erro interno no servidor" });
    }
};

// ==========================================
// LOGIN DO APP MOTORISTA (Via CPF e Senha)
// ==========================================
export const loginMotorista = async (req: Request, res: Response) => {
    const { cpf, senha } = req.body;

    try {
        const result = await pool.query('SELECT * FROM motoristas WHERE cpf = $1', [cpf]);
        
        if (result.rows.length === 0) {
            await registrarLogLogin(req, cpf || 'VAZIO', 'MOTORISTA', 'FALHA', 'CPF não cadastrado');
            return res.status(401).json({ message: "CPF ou senha inválidos." });
        }

        const motorista = result.rows[0];
        
        if (!motorista.senha) {
            await registrarLogLogin(req, cpf, 'MOTORISTA', 'FALHA', 'Senha não configurada no banco');
            return res.status(401).json({ message: "Senha não cadastrada. Procure a administração." });
        }

        let storedHash = motorista.senha;
        if (storedHash.startsWith('$2y$')) {
            storedHash = storedHash.replace('$2y$', '$2a$');
        }

        const validPassword = await bcrypt.compare(senha, storedHash);
        
        if (!validPassword) {
            await registrarLogLogin(req, cpf, 'MOTORISTA', 'FALHA', 'Senha incorreta');
            return res.status(401).json({ message: "CPF ou senha inválidos." });
        }

        // 🔥 AQUI DEFINIMOS A VARIÁVEL DE NOVO PARA O MOTORISTA 🔥
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("ERRO FATAL: JWT_SECRET não está definido!");
            return res.status(500).json({ message: "Erro interno do servidor." });
        }
        
        const token = jwt.sign(
            { 
                id: motorista.id, 
                full_name: motorista.nome, 
                role: 'motorista' 
            },
            jwtSecret,
            { expiresIn: '30d' } 
        );

        await registrarLogLogin(req, cpf, 'MOTORISTA', 'SUCESSO', 'Acesso liberado');

        return res.json({
            message: 'Login com sucesso',
            token,
            user: {
                id: motorista.id,
                name: motorista.nome,
                role: 'motorista'
            }
        });

    } catch (error) {
        console.error("Erro Login Motorista:", error);
        return res.status(500).json({ message: "Erro interno no servidor." });
    }
};
