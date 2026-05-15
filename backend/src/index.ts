import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const uploadsDir = path.resolve(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Fallback for Chrome DevTools extension requests
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.json({});
});


// Flows in memory
let flows: any[] = [];
let responses: any[] = [];

function cleanGarbledFrenchText(text: string): string {
  return text
    .replace(/Ã©/g, 'é')
    .replace(/Ã /g, 'à')
    .replace(/Ã¨/g, 'è')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã´/g, 'ô')
    .replace(/Å“/g, 'œ')
    .replace(/Ã»/g, 'û')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã®/g, 'î')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã /g, 'à ');
}

function parseNewFormatToFlow(json: any, fileName: string): any {
  const quizId = `flow_${fileName.replace(/\.[^/.]+$/, "")}_${Date.now()}`;
  const nodes: any[] = [];
  
  const title = json.quiz_titre || json.title || 'Nouveau Quiz';
  const theme = json.theme || {
    primaryColor: '#6366f1',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter',
  };

  const questions = json.questions || [];
  let yOffset = 50;

  questions.forEach((q: any, index: number) => {
    const nodeId = `node_${q.id || index}_question`;
    const successId = `node_${q.id || index}_success`;
    const errorId = `node_${q.id || index}_error`;
    const nextNodeId = index < questions.length - 1 ? `node_${questions[index + 1].id || index + 1}_question` : `node_terminal`;

    // 1. Question node
    const branches: any[] = [];
    const options = (q.options || []).map((optLabel: string, optIdx: number) => {
      const optId = `opt_${q.id || index}_${optIdx}`;
      const isCorrect = optLabel === q.reponse_correcte;
      
      branches.push({
        operator: 'equals',
        value: optLabel,
        nextNodeId: isCorrect ? successId : errorId
      });

      return {
        id: optId,
        label: optLabel,
        value: optLabel,
        isCorrect,
        scoreValue: isCorrect ? 1 : undefined,
        nextId: isCorrect ? successId : errorId
      };
    });

    nodes.push({
      id: nodeId,
      type: 'choice',
      content: q.question || '',
      position: { x: 300, y: yOffset },
      data: {
        variableName: `q_${q.id || index}`,
        options
      },
      branches
    });

    // 2. Success feedback node
    nodes.push({
      id: successId,
      type: 'message',
      content: q.feedback_succes || 'Correct !',
      position: { x: 50, y: yOffset + 180 },
      nextId: nextNodeId,
      data: {}
    });

    // 3. Error feedback node
    nodes.push({
      id: errorId,
      type: 'message',
      content: q.feedback_erreur || 'Incorrect.',
      position: { x: 550, y: yOffset + 180 },
      nextId: nextNodeId,
      data: {}
    });

    yOffset += 380;
  });

  // 4. Concluding terminal node
  let terminalContent = 'Merci d\'avoir complété ce quiz !';
  if (json.message_conclusion) {
    terminalContent = `${json.message_conclusion.titre || ''}\n\n${json.message_conclusion.description || ''}\n\n${json.message_conclusion.appel_a_l_action || ''}`;
    if (json.message_conclusion.lien_don) {
      terminalContent += `\n\nFaire un don : ${json.message_conclusion.lien_don}`;
    }
  }

  nodes.push({
    id: `node_terminal`,
    type: 'terminal',
    content: terminalContent,
    position: { x: 300, y: yOffset },
    data: {}
  });

  return {
    id: quizId,
    name: title,
    startNodeId: nodes[0]?.id || '',
    theme,
    nodes
  };
}

function parseSimpleJsonToFlow(json: any, fileName: string): any {
  const quizId = `flow_${fileName.replace(/\.[^/.]+$/, "")}_${Date.now()}`;
  const nodes: any[] = [];
  
  const title = json.title || 'Nouveau Quiz';
  const theme = json.theme || {
    primaryColor: '#6366f1',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter',
  };

  const questions = json.questions || [];
  
  let yOffset = 50;
  const timestamp = Date.now();

  questions.forEach((q: any, index: number) => {
    const nodeId = `node_${timestamp}_${index}`;
    const nextId = index < questions.length - 1 ? `node_${timestamp}_${index + 1}` : `node_${timestamp}_terminal`;

    nodes.push({
      id: nodeId,
      type: q.type || 'message',
      content: q.text || q.content || '',
      position: { x: 250, y: yOffset },
      nextId: nextId,
      data: {
        options: q.options ? q.options.map((opt: any, optIdx: number) => ({
          ...opt,
          id: opt.id || `opt_${timestamp}_${index}_${optIdx}`
        })) : undefined,
        placeholder: q.placeholder,
        variableName: q.variableName,
        scoreValue: q.scoreValue,
        delay: q.delay,
        mediaUrl: q.mediaUrl,
        mediaType: q.mediaType,
        botAvatar: q.botAvatar
      }
    });

    yOffset += 180;
  });

  // Add the terminal node if there isn't one already or no terminal node in the questions
  const hasTerminal = questions.some((q: any) => q.type === 'terminal');
  if (!hasTerminal) {
    nodes.push({
      id: `node_${timestamp}_terminal`,
      type: 'terminal',
      content: 'Merci d\'avoir complété ce quiz !',
      position: { x: 250, y: yOffset },
      data: {}
    });
  }

  return {
    id: quizId,
    name: title,
    startNodeId: nodes[0]?.id || '',
    theme: theme,
    nodes: nodes
  };
}

function loadFlowsFromDisk() {
  flows = []; // reset in-memory flows
  const jsonDir = path.resolve(__dirname, '../json');
  if (fs.existsSync(jsonDir)) {
    try {
      const files = fs.readdirSync(jsonDir);
      files.forEach((file) => {
        const filePath = path.join(jsonDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            const content = fs.readFileSync(filePath, 'utf8').trim();
            if (content) {
              const cleanedContent = cleanGarbledFrenchText(content);
              const json = JSON.parse(cleanedContent);
              // Check format
              if (json.nodes && Array.isArray(json.nodes)) {
                if (!json.id) json.id = `flow_${file.replace(/\.[^/.]+$/, "")}`;
                flows.push({ ...json, _fileName: file });
              } else if (json.quiz_titre || (json.questions && Array.isArray(json.questions) && json.questions.some((q: any) => q.question !== undefined))) {
                flows.push({ ...parseNewFormatToFlow(json, file), _fileName: file });
              } else if (json.questions && Array.isArray(json.questions)) {
                flows.push({ ...parseSimpleJsonToFlow(json, file), _fileName: file });
              }
            }
          }
        } catch (e) {
          console.error(`Error loading flow from file ${file}:`, e);
        }
      });
    } catch (err) {
      console.error('Error reading json directory:', err);
    }
  }
}

// Reload flows on every GET request to automatically see file changes
app.get('/api/flows', (req, res) => {
  loadFlowsFromDisk();
  res.json(flows);
});

app.get('/api/flows/:id', (req, res) => {
  loadFlowsFromDisk();
  const flow = flows.find(f => f.id === req.params.id);
  if (flow) {
    res.json(flow);
  } else {
    res.status(404).json({ message: 'Flow not found' });
  }
});

app.post('/api/flows', (req, res) => {
  const newFlow = { ...req.body, id: `flow_${Date.now()}` };
  newFlow._fileName = `${newFlow.id}.json`;
  flows.push(newFlow);

  try {
    const jsonDir = path.resolve(__dirname, '../json');
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }
    const filePath = path.join(jsonDir, `${newFlow.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(newFlow, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving new flow to disk:', err);
  }

  res.status(201).json(newFlow);
});

app.post('/api/responses', (req, res) => {
  const response = { ...req.body, id: Date.now().toString(), startedAt: new Date().toISOString() };
  responses.push(response);
  res.status(201).json(response);
});

// Image Upload Endpoint
app.post('/api/upload', (req, res) => {
  const { image, title } = req.body;
  if (!image) {
    return res.status(400).json({ success: false, message: 'Aucune image fournie' });
  }

  try {
    // Extract base64 data
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Format d\'image invalide' });
    }

    const extension = matches[1].split('/')[1] || 'png';
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `avatar_${Date.now()}.${extension}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, buffer);
    
    // Save metadata
    const metadataPath = path.join(uploadsDir, 'images.json');
    let images = [];
    if (fs.existsSync(metadataPath)) {
      try {
        images = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (e) {
        images = [];
      }
    }
    
    const newImage = {
      filename: fileName,
      url: `/uploads/${fileName}`,
      title: title || 'Image sans titre',
      createdAt: new Date().toISOString()
    };
    images.unshift(newImage); // Add at the beginning
    fs.writeFileSync(metadataPath, JSON.stringify(images, null, 2), 'utf8');

    res.status(201).json({ success: true, url: `/uploads/${fileName}` });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde de l\'image' });
  }
});

// Get Uploaded Images Endpoint
app.get('/api/uploads', (req, res) => {
  const metadataPath = path.join(uploadsDir, 'images.json');
  let images = [];
  if (fs.existsSync(metadataPath)) {
    try {
      images = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    } catch (e) {
      images = [];
    }
  } else {
    // Fallback: list directory if images.json doesn't exist
    try {
      const files = fs.readdirSync(uploadsDir);
      images = files
        .filter(f => f !== 'images.json')
        .map(f => ({
          filename: f,
          url: `/uploads/${f}`,
          title: f,
          createdAt: fs.statSync(path.join(uploadsDir, f)).birthtime.toISOString()
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error('Error reading uploads directory', e);
    }
  }
  res.json({ success: true, images });
});

// Rename Image Endpoint
app.put('/api/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Titre manquant' });
  }

  const metadataPath = path.join(uploadsDir, 'images.json');
  if (fs.existsSync(metadataPath)) {
    try {
      const images = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const imgIndex = images.findIndex((img: any) => img.filename === filename);
      if (imgIndex > -1) {
        images[imgIndex].title = title;
        fs.writeFileSync(metadataPath, JSON.stringify(images, null, 2), 'utf8');
        return res.json({ success: true, message: 'Image renommée' });
      }
    } catch (e) {
      console.error('Error updating image title', e);
    }
  }
  res.status(404).json({ success: false, message: 'Image non trouvée' });
});

// Delete Image Endpoint
app.delete('/api/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);

  // Remove from metadata
  const metadataPath = path.join(uploadsDir, 'images.json');
  if (fs.existsSync(metadataPath)) {
    try {
      const images = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const filteredImages = images.filter((img: any) => img.filename !== filename);
      fs.writeFileSync(metadataPath, JSON.stringify(filteredImages, null, 2), 'utf8');
    } catch (e) {
      console.error('Error updating images metadata on delete', e);
    }
  }

  // Remove physical file
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: 'Image supprimée' });
    } catch (e) {
      console.error('Error deleting image file', e);
      return res.status(500).json({ success: false, message: 'Erreur lors de la suppression du fichier' });
    }
  }

  res.status(404).json({ success: false, message: 'Fichier non trouvé' });
});


// Admin Authentication Endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  if (password === adminPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
  }
});

// Delete Flow Endpoint
app.delete('/api/flows/:id', (req, res) => {
  const flowIndex = flows.findIndex(f => f.id === req.params.id);
  if (flowIndex > -1) {
    const flow = flows[flowIndex];
    const fileName = flow._fileName || `${flow.id}.json`;
    const filePath = path.join(__dirname, '../json', fileName);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      flows.splice(flowIndex, 1);
      res.status(200).json({ success: true, message: 'Quiz supprimé' });
    } catch (e) {
      console.error('Error deleting file:', e);
      res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Quiz non trouvé' });
  }
});

// Update Flow Endpoint
app.put('/api/flows/:id', (req, res) => {
  const { id } = req.params;
  const updatedFlow = req.body;

  // Find existing flow to preserve filename if not provided
  const flowIndex = flows.findIndex(f => f.id === id);
  
  let fileName = updatedFlow._fileName;
  if (!fileName && flowIndex > -1) {
    fileName = flows[flowIndex]._fileName;
  }
  if (!fileName) {
    fileName = `${id}.json`;
  }

  // Update in-memory
  const flowToSave = { ...updatedFlow, id, _fileName: fileName };
  if (flowIndex > -1) {
    flows[flowIndex] = flowToSave;
  } else {
    flows.push(flowToSave);
  }

  try {
    const jsonDir = path.resolve(__dirname, '../json');
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }
    const filePath = path.join(jsonDir, fileName);
    
    // Don't save the internal _fileName to the actual JSON file if possible, 
    // or just save the whole thing. The loader handles it.
    fs.writeFileSync(filePath, JSON.stringify(flowToSave, null, 2), 'utf8');
    res.json({ success: true, flow: flowToSave });
  } catch (err) {
    console.error('Error updating flow on disk:', err);
    res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
