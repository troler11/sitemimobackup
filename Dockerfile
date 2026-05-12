# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia tudo para o ambiente de build
COPY . .

# Instala as ferramentas necessárias para compilar TypeScript e Webpack
RUN npm install webpack webpack-cli ts-loader typescript html-webpack-plugin copy-webpack-plugin style-loader css-loader @types/react @types/react-dom --save-dev

# Roda o build (isso gera a pasta /app/dist)
RUN npx webpack --config client/webpack.config.js
# Se você tiver um webpack para o server também, rode ele aqui. 
# Se for apenas o servidor em TS direto:
RUN npx tsc server/index.ts --outDir dist/server --esModuleInterop --skipLibCheck

# Etapa 2: Produção
FROM node:20-alpine

WORKDIR /app

# Instala apenas o básico para rodar o Express
COPY package*.json ./
RUN npm install --omit=dev

# Copia a pasta dist inteira (onde estão o server e o client)
COPY --from=builder /app/dist ./dist

# Garante que o Node encontre o arquivo no caminho certo
ENV PORT=3000
EXPOSE 3000

# 🔥 CORREÇÃO DO COMANDO DE INÍCIO 🔥
# Verifique se o seu arquivo compilado se chama index.js ou server.js
CMD ["node", "dist/server/index.js"]
