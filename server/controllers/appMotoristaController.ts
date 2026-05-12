import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db'; 

// ==========================================
// SCHEMAS DE VALIDAÇÃO (ZOD)
// ==========================================
const acaoMotoristaSchema = z.object({
    data_escala: z.string().min(8, "Data inválida"),
    empresa: z.string().min(1, "Empresa é obrigatória"),
    rota: z.string().min(1, "Rota é obrigatória"),
    h_real: z.string().min(4, "Horário é obrigatório"),
    veiculo: z.string().optional().nullable(),
    motivo: z.string().optional().nullable(),
    acao: z.enum(['CONFIRMAR', 'COBRIR'])
});

// ==========================================
// ROTA GET: BUSCAR A ESCALA DO MOTORISTA
// ==========================================
export const getMinhaEscala = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user; 
        const nomeMotorista = String(user.full_name || '').trim(); 
        
        let dataBusca = req.query.data as string;
        
        if (!dataBusca) {
            const fuso_br = 'America/Sao_Paulo';
            dataBusca = new Date().toLocaleDateString('pt-BR', { timeZone: fuso_br });
        }

        const query = `
            SELECT * FROM escalas 
            WHERE data_escala = $1 
            AND (motorista = $2 OR reserva = $2)
            ORDER BY h_real ASC
        `;
        
        const result = await pool.query(query, [dataBusca, nomeMotorista]);
        return res.json(result.rows);

    } catch (error) {
        console.error("Erro GET Minha Escala:", error);
        return res.status(500).json({ error: "Erro ao carregar sua escala." });
    }
};

// ==========================================
// ROTA POST: REGISTRAR AÇÃO (CONFIRMAR/COBRIR)
// ==========================================
export const registrarAcaoMotorista = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const nomeMotorista = String(user?.full_name || "Motorista App").trim();
        const validData = acaoMotoristaSchema.parse(req.body);

        const horaFiltro = validData.h_real.substring(0, 5);
        const horaConfirmacao = new Date().toLocaleTimeString('pt-BR', { 
            timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' 
        });

        let statusFinal = '';
        let frotaParaSalvar: string | null = null;
        let observacaoParaSalvar: string | null = null;

        if (validData.acao === 'CONFIRMAR') {
            statusFinal = 'CONFIRMADO';
            frotaParaSalvar = validData.veiculo ? String(validData.veiculo).trim() : null;
            if (!frotaParaSalvar) return res.status(400).json({ error: "Informe o prefixo." });
        } else {
            statusFinal = 'COBRIR';
            observacaoParaSalvar = validData.motivo ? String(validData.motivo).trim() : 'Não informado';
        }

        const updateQuery = `
            UPDATE escalas 
            SET 
                status = $1::text,
                frota_enviada = CASE WHEN $1::text = 'CONFIRMADO' THEN NULLIF($2, '')::integer ELSE frota_enviada END,
                frota_final = CASE WHEN $1::text = 'CONFIRMADO' THEN NULLIF($2, '')::integer ELSE frota_final END,
                obs = CASE WHEN $1::text = 'COBRIR' THEN $4::text ELSE obs END,
                usuario_confirmacao = $3::text,
                hora_confirmacao = $5::text
            WHERE data_escala = $6 AND empresa = $7 AND rota = $8 AND h_real::text LIKE $9 || '%'
        `;

        const result = await pool.query(updateQuery, [
            statusFinal, frotaParaSalvar, nomeMotorista, observacaoParaSalvar, 
            horaConfirmacao, validData.data_escala, validData.empresa, validData.rota, horaFiltro
        ]);

        if (result.rowCount === 0) return res.status(404).json({ error: "Viagem não encontrada." });
        return res.status(200).json({ success: true, message: "Ação registrada!" });

    } catch (error: any) {
        return res.status(500).json({ error: 'Erro ao gravar no banco.' });
    }
};
