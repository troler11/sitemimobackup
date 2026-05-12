import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db'; 
import * as xlsx from 'xlsx';

// ==========================================
// SCHEMAS DE VALIDAÇÃO (ZOD)
// ==========================================
const updateEscalaSchema = z.object({
    id: z.coerce.number().min(1, "ID é obrigatório"), // 🔥 ADICIONAMOS O ID AQUI
    data_escala: z.coerce.string().min(6, "Data inválida"),
    empresa: z.coerce.string().min(1, "Empresa é obrigatória"),
    rota: z.coerce.string().min(1, "Rota é obrigatória"),
    h_real: z.coerce.string(), 
    novo_motorista: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform(v => v ? String(v) : ""),
    nova_frota: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform(v => v ? String(v) : ""),
    novo_status: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform(v => v ? String(v) : ""),
    nova_obs: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform(v => v ? String(v) : ""),
    usuario_confirmacao: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform(v => v ? String(v) : "Usuário")
});

// ==========================================
// ROTA GET: BUSCAR MOTORISTAS 
// ==========================================
export const getMotoristas = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT id, nome FROM motoristas ORDER BY nome ASC');
        return res.status(200).json(result.rows);
    } catch (error) {
       console.error("🚨 Erro SQL:", error);
        return res.status(500).json({ error: 'Erro ao buscar a lista de motoristas no banco de dados.' });
    }
};

// ==========================================
// ROTA GET: BUSCAR DADOS DA ESCALA (DIRETO DO BD)
// ==========================================
export const getEscala = async (req: Request, res: Response) => {
    const dataFiltro = req.query.data as string;
    
  const regexData = /^\d{2}\/\d{2}\/\d{4}$/;
if (!dataFiltro || !regexData.test(dataFiltro)) {
    return res.status(400).json({ error: "Data inválida ou não informada. Use o formato DD/MM/AAAA." });
}

    const user = (req as any).user;
    const isAdmin = user?.role === 'admin';
    const userCompanies = Array.isArray(user?.allowed_companies) ? user.allowed_companies.map((c: any) => String(c).trim()) : [];

    try {
        let query = `SELECT * FROM escalas WHERE data_escala = $1`;
        let params: any[] = [dataFiltro];

        if (!isAdmin) {
            // Se o usuário não é admin e não tem empresas, não retorna nada (Segurança)
            if (userCompanies.length === 0) return res.json([]); 
            
            // Filtra direto no Banco de Dados usando o array
            query += ` AND empresa = ANY($2)`;
            params.push(userCompanies);
        }

        query += ` ORDER BY h_real ASC`;
        
        const result = await pool.query(query, params);
        return res.json(result.rows);

    } catch (error) {
        console.error("🚨 Erro GET /escala (Banco de Dados):", error);
        return res.status(500).json({ error: "Erro interno ao buscar as escalas." });
    }
};

const parseExcelDate = (excelDate: any): string => {
    if (!excelDate) return '';
    
    // Se a data vier como string (ex: "05/07/2026")
    if (typeof excelDate === 'string' && excelDate.includes('/')) {
        const partes = excelDate.split('/');
        if (partes.length === 3) {
            // 🔥 CORREÇÃO DA DATA: Garante o formato DD/MM/AAAA
            // Se o primeiro número for maior que 12, ele com certeza é o dia.
            // Se for menor ou igual a 12, o Excel (ou a biblioteca) pode ter invertido para MM/DD/YYYY.
            
            let dia = partes[0].padStart(2, '0');
            let mes = partes[1].padStart(2, '0');
            let ano = partes[2].trim();
            
            if (ano.length === 2) ano = '20' + ano;

            // Se a biblioteca inverteu e enviou MM/DD/YYYY, mas queremos salvar como DD/MM/YYYY
            // Isso acontece muito quando o dia é menor ou igual a 12 (ex: 07 de maio = 05/07).
            // A melhor forma de resolver sem quebrar datas maiores que 12 é forçar a inversão 
            // baseada no comportamento conhecido da lib xlsx (que costuma trazer M/D/Y para strings formatadas)
            
            // Vamos testar se a data foi gerada a partir da Data do Computador do usuário na Rota POST
            // Se a requisição veio do frontend, o formato pt-BR já manda DD/MM/YYYY.
            // Então, vamos confiar na posição 0 como DIA e posição 1 como MÊS, 
            // EXATAMENTE O OPOSTO do que a biblioteca estava tentando forçar na sua função antiga.

            return `${dia}/${mes}/${ano}`;
        }
        return excelDate; 
    }
    
    // Se a data vier como número serial do Excel (ex: 46149)
    if (typeof excelDate === 'number') {
        const date = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
        const dia = String(date.getUTCDate()).padStart(2, '0');
        const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
        const ano = date.getUTCFullYear();
        return `${dia}/${mes}/${ano}`; 
    }
    
    return String(excelDate);
};

// 🔥 BLINDAGEM CONTRA O "---" DO EXCEL
const cleanValue = (val: any) => {
    if (val == null) return null;
    const str = String(val).trim();
    if (str === '' || str === '---') return null; 
    return str;
};

// ==========================================
// ROTA POST: IMPORTAR ESCALA
// ==========================================
export const importarEscala = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (user?.role !== 'admin' && user?.role !== 'escalante') {
            return res.status(403).json({ error: "Acesso negado." });
        }

     if (!req.file) return res.status(400).json({ error: "Arquivo não enviado." });
      
        const isExcel = req.file.originalname.match(/\.(xls|xlsx)$/i) || 
                        req.file.mimetype.includes('spreadsheetml') || 
                        req.file.mimetype.includes('excel');
                        
        if (!isExcel) {
            return res.status(400).json({ error: "Formato inválido. Envie apenas planilhas Excel (.xlsx ou .xls)." });
        }
        
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet, { raw: false });

        if (data.length === 0) return res.status(400).json({ error: "Planilha vazia." });

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            for (const row of data as any[]) {
                const dataEscalaExcel = parseExcelDate(row['DATA'] || row['Data'] || row['data'] || req.body.data_escala);
                const empresa = row['CLIENTE'] ? String(row['CLIENTE']).trim() : ''; 
                const rota = row['LINHA'] ? String(row['LINHA']).trim() : '';
                const sentido = row['SEN'] ? String(row['SEN']).trim() : ''; 
                
                const id_linha = cleanValue(row['ID'] || row['id']);
                const h_real = cleanValue(row['INICIO']);
                const hr_sai = cleanValue(row['FIM']);
                
                const frota_escala = cleanValue(row['VEIC. PROGRAMADO']);
                const frota_enviada = cleanValue(row['VEIC. REALIZADO']); 
                
                const frota_final = frota_enviada ? frota_enviada : frota_escala;

                const motoristaNome = cleanValue(row['MOTORISTA']); 
                const cpfExcel = cleanValue(row['CPF'] || row['cpf']); 
                const reserva = cleanValue(row['MOT. REALIZADO']);
                
                const obs = cleanValue(row['OBSERVAÇÕES']);
                const ra = cleanValue(row['RA']);

                if (!empresa || !rota || !dataEscalaExcel) continue; 

                if (motoristaNome) {
                    const checkMot = await client.query('SELECT 1 FROM motoristas WHERE nome = $1', [motoristaNome]);
                    if (checkMot.rowCount === 0) {
                        try {
                            await client.query('INSERT INTO motoristas (nome, cpf) VALUES ($1, $2)', [motoristaNome, cpfExcel]);
                        } catch (e) {
                            console.log(`Motorista ${motoristaNome} já inserido por outra linha.`);
                        }
                    }
                }

                if (reserva) {
                    const checkRes = await client.query('SELECT 1 FROM motoristas WHERE nome = $1', [reserva]);
                    if (checkRes.rowCount === 0) {
                        try {
                            await client.query('INSERT INTO motoristas (nome) VALUES ($1)', [reserva]);
                        } catch (e) {
                            console.log(`Reserva ${reserva} já inserido por outra linha.`);
                        }
                    }
                }

                await client.query(
                    `INSERT INTO escalas 
                    (data_escala, empresa, rota, sentido, motorista, reserva, frota_escala, frota_enviada, h_real, hr_sai, obs, ra_val, status, id_linha, frota_final) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDENTE DE CONFIRMAÇÃO', $13, $14)`,
                    [dataEscalaExcel, empresa, rota, sentido, motoristaNome, reserva, frota_escala, frota_enviada, h_real, hr_sai, obs, ra, id_linha, frota_final]
                );
            }

            await client.query('COMMIT'); 
            return res.status(200).json({ success: true, message: "Escala e motoristas processados com sucesso!" });

        } catch (err) {
            await client.query('ROLLBACK'); 
            throw err;
        } finally {
            client.release();
        }

    } catch (error: any) {
        console.error("🚨 Erro na importação:", error.message);
        return res.status(500).json({ error: "Ocorreu um erro interno ao processar a solicitação." });
    }
};

// ==========================================
// ROTA DELETE: EXCLUIR ESCALA DO DIA INTEIRO
// ==========================================
export const deletarEscalaDia = async (req: Request, res: Response) => {
    try {
        // Pega a data que veio na URL (ex: /escala?data=06/05/2026)
       const dataFiltro = req.query.data as string;
        
        const regexData = /^\d{2}\/\d{2}\/\d{4}$/;
if (!dataFiltro || !regexData.test(dataFiltro)) {
    return res.status(400).json({ error: "Data inválida ou não informada. Use o formato DD/MM/AAAA." });
}

        const user = (req as any).user;
        const isAdmin = user?.role === 'admin';
        const isEscalante = user?.role === 'escalante';
        
        // Trava de Segurança: Apenas Admin ou Escalante podem deletar
        if (!isAdmin && !isEscalante) {
            return res.status(403).json({ error: "Acesso negado. Apenas escalantes podem excluir a escala." });
        }

        const userCompanies = Array.isArray(user?.allowed_companies) ? user.allowed_companies.map((c: any) => String(c).trim()) : [];

        let query = '';
        let params: any[] = [];

        // Se for admin, deleta o dia todo de todas as empresas
        if (isAdmin) {
            query = `DELETE FROM escalas WHERE data_escala = $1`;
            params = [dataFiltro];
        } 
        // Se for escalante, deleta apenas as rotas das empresas que ele controla naquele dia
        else {
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: "Você não possui empresas vinculadas para exclusão." });
            }
            query = `DELETE FROM escalas WHERE data_escala = $1 AND empresa = ANY($2)`;
            params = [dataFiltro, userCompanies];
        }

        const result = await pool.query(query, params);

        return res.status(200).json({ 
            success: true, 
            message: `Escala do dia ${dataFiltro} excluída com sucesso!`,
            linhasDeletadas: result.rowCount 
        });

    } catch (error: any) {
        console.error("🚨 Erro DELETE /escala:", error.message);
        return res.status(500).json({ error: "Erro interno ao tentar excluir a escala." });
    }
};

// ==========================================
// ROTA GET: BUSCAR EMPRESAS ÚNICAS
// ==========================================
export const getEmpresas = async (req: Request, res: Response) => {
    try {
        // Busca os nomes únicos, tira os espaços sobrando e organiza em ordem alfabética
        const result = await pool.query(`
            SELECT DISTINCT TRIM(empresa) AS nome 
            FROM escalas 
            WHERE empresa IS NOT NULL AND TRIM(empresa) != '' 
            ORDER BY nome ASC
        `);
        
        // Transforma o resultado num array simples de textos: ['EMPRESA A', 'EMPRESA B']
        const empresas = result.rows.map(row => row.nome);
        return res.status(200).json(empresas);
    } catch (error) {
        console.error("🚨 Erro SQL (Buscar Empresas):", error);
        return res.status(500).json({ error: "Erro interno ao buscar lista de empresas." });
    }
};


// ==========================================
// ROTA PUT: ATUALIZAR DADOS (DIRETO NO BD)
// ==========================================
export const atualizarEscala = async (req: Request, res: Response) => {
    try {
        const validData = updateEscalaSchema.parse(req.body);

        const user = (req as any).user;
        const isAdmin = user?.role === 'admin';
        const userCompanies = Array.isArray(user?.allowed_companies) ? user.allowed_companies.map((c: any) => String(c).trim()) : [];

        // Mantivemos a trava de segurança intacta
        if (!isAdmin && !userCompanies.includes(validData.empresa)) {
            return res.status(403).json({ error: "Você não tem permissão para editar dados desta empresa." });
        }

        const nomeUsuario = validData.usuario_confirmacao; 
        const horaConfirmacao = new Date().toLocaleTimeString('pt-BR', { 
            timeZone: 'America/Sao_Paulo', 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // 🔥 BUSCA ATUALIZADA: Busca a linha EXATA usando apenas o ID
        const buscaAtual = await pool.query(
            `SELECT motorista, obs, frota_escala FROM escalas WHERE id = $1`,
            [validData.id]
        );

        if (buscaAtual.rowCount === 0) {
            return res.status(404).json({ error: "Linha de escala não encontrada para atualização." });
        }

        const linhaAtual = buscaAtual.rows[0];
        
       let novoReserva: string | null = null;
       let novaObs: string | null = null;

       if (validData.novo_status === 'COBRIR') {
            // Se o status virou COBRIR, crava COBRIR na observação
            novaObs = 'COBRIR';
        } else {
            // Se o status mudou (a linha foi coberta), mas ainda estava escrito COBRIR na obs, ele apaga.
            let obsRecebida = validData.nova_obs.trim();
            if (obsRecebida.toUpperCase() === 'COBRIR') {
                obsRecebida = '';
            }
            
            novaObs = obsRecebida === '' ? null : obsRecebida; 

            const motTitular = String(linhaAtual.motorista).trim().toUpperCase();
            const motEnviado = String(validData.novo_motorista).trim().toUpperCase();
            const statusInvalidos = ['CONFIRMADO', 'MANUTENÇÃO', 'COBRIR', 'REALOCADO', 'PENDENTE DE CONFIRMAÇÃO', 'AGUARDANDO CARRO'];

            if (motEnviado !== motTitular && motEnviado !== "" && !statusInvalidos.includes(motEnviado)) {
                novoReserva = validData.novo_motorista; 
            } else if (statusInvalidos.includes(motEnviado) || motEnviado === "") {
                novoReserva = null; 
            }
        }

        let frotaParaSalvar = validData.nova_frota.trim() === '' ? null : validData.nova_frota.trim();

        if (frotaParaSalvar === String(linhaAtual.frota_escala).trim()) {
            frotaParaSalvar = null; 
        }

        const frotaFinalUpdate = frotaParaSalvar ? frotaParaSalvar : linhaAtual.frota_escala;
        
        // 🔥 UPDATE ATUALIZADO: Altera a linha EXATA usando apenas o ID
        const updateQuery = `
            UPDATE escalas 
            SET 
                frota_enviada = $1,
                reserva = $2,
                status = $3,
                obs = $4,
                usuario_confirmacao = $5,
                hora_confirmacao = $6,
                frota_final = $7
            WHERE 
                id = $8
        `;

        await pool.query(updateQuery, [
            frotaParaSalvar,        // $1
            novoReserva,            // $2
            validData.novo_status,  // $3
            novaObs,                // $4
            nomeUsuario,            // $5
            horaConfirmacao,        // $6
            frotaFinalUpdate,       // $7
            validData.id            // $8
        ]);

        return res.status(200).json({ success: true, message: 'Escala atualizada!' });

    } catch (error: any) { 
        if (error instanceof z.ZodError) {
            console.error("Erros do Zod:", error.errors);
            return res.status(400).json({ 
                error: "Dados de atualização inválidos.", 
                detalhes: error.errors 
            });
        }
        
        console.error("🚨 Erro SQL:", error.message);
        return res.status(500).json({ 
            error: 'Erro no banco de dados.', 
        });
    }
};
