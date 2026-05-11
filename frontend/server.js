const express = require('express');
const path = require('path');

const app = express();
const port = 80;

// Servir les fichiers statiques du dossier dist généré par Vite
app.use(express.static(path.join(__dirname, 'dist')));

// Rediriger toutes les autres requêtes vers index.html (pour le routage SPA React)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Serveur Frontend démarré sur le port ${port}`);
});
