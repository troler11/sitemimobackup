import crypto from 'crypto';

// A chave secreta PRECISA ter exatamente 32 caracteres. 
// ⚠️ Coloque isso no seu painel Easypanel nas Variáveis de Ambiente (.env) e NUNCA compartilhe!
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'ChaveSeguraMimo32Caracteres12345'; 
const ALGORITHM = 'aes-256-cbc';

export const criptografarPlaca = (placa: string): string => {
    // Cria um "Vetor de Inicialização" aleatório. Isso garante que a mesma placa (ex: ABC1234)
    // gere um link completamente diferente toda vez que você chamar essa função.
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let encrypted = cipher.update(placa);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Retorna o IV + o texto criptografado unidos por um ponto e convertidos para HEX (seguro para URLs)
    return iv.toString('hex') + '.' + encrypted.toString('hex');
};

export const descriptografarPlaca = (hash: string): string => {
    try {
        const textParts = hash.split('.');
        const iv = Buffer.from(textParts.shift() as string, 'hex');
        const encryptedText = Buffer.from(textParts.join('.'), 'hex');
        
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString();
    } catch (error) {
        throw new Error("HASH_INVALIDO");
    }
};
