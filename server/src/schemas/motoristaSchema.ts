import { z } from 'zod';

export const motoristaSchema = z.object({
  nome: z.string().min(3, "Nome muito curto"),
  
  // Usamos coerce.string() para transformar números em texto automaticamente
  chapa: z.coerce.string().min(1, "Chapa inválida"), 
  
  // É bom colocar no telefone e no CPF também, caso o banco retorne BIGINT
  telefone: z.coerce.string().min(10, "Telefone inválido (use DDD)"),
  
  cpf: z.coerce.string()
    .length(11, "O CPF deve ter 11 dígitos numéricos")
    .regex(/^\d+$/, "O CPF deve conter apenas números")
});

export type MotoristaInput = z.infer<typeof motoristaSchema>;
