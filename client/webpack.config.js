const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin'); // <-- 1. Adicione esta linha

module.exports = {
  mode: 'production',
  context: __dirname, 
  entry: './src/index.tsx',

  output: {
    path: path.resolve(__dirname, '../dist/client'), 
    filename: 'bundle.[contenthash].js', // Usar hash ajuda a limpar cache no PWA
    publicPath: '/', 
    clean: true,
  },

  // ... resolve e module continuam iguais ...

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'), 
    }),
    
    // 🔥 2. ADICIONE ESTE PLUGIN AQUI 🔥
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: path.resolve(__dirname, 'public'), // Copia da pasta 'client/public'
          to: path.resolve(__dirname, '../dist/client'), // Para a raiz do site compilado
          noErrorOnMissing: true 
        },
      ],
    }),
  ],
};
