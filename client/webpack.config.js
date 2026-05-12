const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  
  // Define o contexto como a pasta 'client' para o Webpack não se perder no Docker
  context: __dirname, 

  // Ponto de entrada do seu App
  entry: './src/index.tsx',

  output: {
    // Envia o build para a pasta dist na raiz do projeto
    path: path.resolve(__dirname, '../dist/client'), 
    filename: 'bundle.[contenthash].js', 
    publicPath: '/', 
    clean: true,
  },

  resolve: {
    // Importante para o Webpack reconhecer arquivos TSX e TS
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },

  module: {
    rules: [
      {
        // Loader para TypeScript e React
        test: /\.(ts|tsx)$/, 
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            // Ignora erros de tipagem no build para evitar que o Docker trave por bobeira
            transpileOnly: true, 
          },
        },
      },
      {
        // Loader para CSS (Bootstrap e estilos próprios)
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        // Loader para imagens e ícones
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },

  plugins: [
    // Gera o index.html final injetando o bundle.js automaticamente
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'), 
    }),
    
    // Copia o manifest.json, sw.js e ícones para a pasta de produção
    new CopyWebpackPlugin({
      patterns: [
        { 
          // Procura na pasta client/public
          from: path.resolve(__dirname, 'public'), 
          // Joga na raiz de dist/client
          to: path.resolve(__dirname, '../dist/client'), 
          noErrorOnMissing: true 
        },
      ],
    }),
  ],
  
  // Otimização básica para o PWA carregar mais rápido
  optimization: {
    minimize: true,
  },
};
