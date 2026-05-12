import { Request, Response } from 'express';
import { fetchDashboardData } from '../src/services/DashboardService';
import { pool } from '../db'; // 🔥 CORREÇÃO 1: Importação do pool adicionada

export const getDashboardData = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user; 
        if (!user) return res.status(401).json({ error: "Sessão inválida" });

        const isAdmin = user.role === 'admin';
        let empresasParaABM: string[] | null = null;

        if (!isAdmin) {
            const allowed = Array.isArray(user.allowed_companies) ? user.allowed_companies : [];

            // 🔥 BUSCA O MAPEAMENTO DIRETO NO BANCO
            const queryMapeamento = `
                SELECT nome_abm 
                FROM mapeamento_empresas 
                WHERE nome_escala = ANY($1)
            `;
            const result = await pool.query(queryMapeamento, [allowed]);
            
            // Extrai os nomes do ABM
            empresasParaABM = result.rows.map(r => r.nome_abm);

            // Se o usuário tem permissão mas nada foi mapeado ainda, 
            // usamos o nome original para não vir vazio
            if (empresasParaABM.length === 0 && allowed.length > 0) {
                empresasParaABM = allowed;
            }
        }

        const data = await fetchDashboardData(empresasParaABM);
        return res.json(data);

    } catch (error) {
        console.error("Erro no Dashboard:", error);
        return res.status(500).json({ error: "Erro interno" });
    }
};
