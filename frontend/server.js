import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Nécessaire en type "module" pour obtenir le chemin du dossier courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 80;

// Servir les fichiers statiques du dossier dist généré par Vite
app.use(express.static(path.join(__dirname, 'dist')));

// Rediriger toutes les autres requêtes vers index.html (pour le routage SPA React)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Serveur Frontend démarré sur le port ${port}`);
});
