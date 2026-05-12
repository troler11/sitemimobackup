import { Request, Response } from 'express';
import { motoristaSchema } from '../src/schemas/motoristaSchema';
import { pool } from '../db';
import { ZodError } from 'zod';

// ==========================================
// ROTA GET: LISTAR MOTORISTAS
// ==========================================
export const listarMotoristas = async (req: Request, res: Response) => {
  try {
    // 🔥 Proteção 1: Especificando colunas para evitar vazamento de dados futuros
    const result = await pool.query('SELECT id, nome, chapa, telefone, cpf FROM motoristas ORDER BY id DESC');
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("🚨 Erro SQL (Listar Motoristas):", error);
    return res.status(500).json({ error: "Erro interno ao buscar motoristas." });
  }
};

// ==========================================
// ROTA POST: CADASTRAR MOTORISTA
// ==========================================
export const cadastrarMotorista = async (req: Request, res: Response) => {
  try {
    const { nome, chapa, telefone, cpf } = motoristaSchema.parse(req.body);

    const query = `
      INSERT INTO motoristas (nome, chapa, telefone, cpf) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, nome, chapa, telefone, cpf
    `;
    
    const result = await pool.query(query, [nome, chapa, telefone, cpf]);
    
    return res.status(201).json({ 
      message: "Motorista cadastrado!", 
      motorista: result.rows[0] 
    });
  } catch (error: any) {
    if (error instanceof ZodError) return res.status(400).json({ errors: error.errors });
    
    // 🔥 Proteção 4: Log interno adicionado
    console.error("🚨 Erro SQL (Cadastrar Motorista):", error);
    return res.status(500).json({ error: "Erro interno no servidor ao cadastrar." });
  }
};

// ==========================================
// ROTA PUT: ATUALIZAR MOTORISTA
// ==========================================
export const atualizarMotorista = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 🔥 Proteção 2: Validação rigorosa do ID
    const motoristaId = parseInt(id, 10);
    if (isNaN(motoristaId)) {
        return res.status(400).json({ error: "ID de motorista inválido." });
    }

    const { nome, chapa, telefone, cpf } = motoristaSchema.parse(req.body);

    const query = `
      UPDATE motoristas 
      SET nome = $1, chapa = $2, telefone = $3, cpf = $4 
      WHERE id = $5 
      RETURNING id, nome, chapa, telefone, cpf
    `;

    const result = await pool.query(query, [nome, chapa, telefone, cpf, motoristaId]);

    if (result.rowCount === 0) return res.status(404).json({ error: "Motorista não encontrado." });

    return res.status(200).json({ 
      message: "Dados atualizados!", 
      motorista: result.rows[0] 
    });
  } catch (error: any) {
    if (error instanceof ZodError) return res.status(400).json({ errors: error.errors });

    console.error("🚨 Erro SQL (Atualizar Motorista):", error);
    return res.status(500).json({ error: "Erro interno ao atualizar motorista." });
  }
};

// ==========================================
// ROTA DELETE: EXCLUIR MOTORISTA
// ==========================================
export const excluirMotorista = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 🔥 Proteção 2: Validação rigorosa do ID
    const motoristaId = parseInt(id, 10);
    if (isNaN(motoristaId)) {
        return res.status(400).json({ error: "ID de motorista inválido." });
    }

    const result = await pool.query('DELETE FROM motoristas WHERE id = $1', [motoristaId]);
    
    // 🔥 Proteção 3: Validar se realmente apagou
    if (result.rowCount === 0) {
        return res.status(404).json({ error: "Motorista não encontrado ou já excluído." });
    }

    return res.status(200).json({ message: "Motorista removido com sucesso." });
  } catch (error) {
    // 🔥 Proteção 4: Log interno adicionado
    console.error("🚨 Erro SQL (Excluir Motorista):", error);
    return res.status(500).json({ error: "Erro interno ao excluir motorista." });
  }
};
