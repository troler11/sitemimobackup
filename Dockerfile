# Etapa 1: Build
FROM node:20-alpine as builder

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala todas as dependências (incluindo devDependencies para o build)
RUN npm install

# Copia o restante do código fonte
COPY . .

# Executa o build (compila Server e Client)
RUN npm run build

# Etapa 2: Produção
FROM node:20-alpine

WORKDIR /app

# Copia o package.json para instalar apenas dependências de produção
COPY package*.json ./

# Instala apenas dependências necessárias para rodar (economiza espaço)
RUN npm install --omit=dev

# Copia a pasta 'dist' gerada na etapa de build anterior
COPY --from=builder /app/dist ./dist

# 🔥 A MÁGICA ENTRA AQUI 🔥
# Copiamos a pasta client original para o servidor achar a pasta 'public' (onde estão o manifest e os ícones do PWA)
COPY --from=builder /app/client ./client

# Define a porta (O Easypanel usa a 3000 ou 80 por padrão, mas é bom explicitar)
ENV PORT=3000
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]
