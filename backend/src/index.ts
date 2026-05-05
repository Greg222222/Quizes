import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
                flows.push(json);
              } else if (json.quiz_titre || (json.questions && Array.isArray(json.questions) && json.questions.some((q: any) => q.question !== undefined))) {
                flows.push(parseNewFormatToFlow(json, file));
              } else if (json.questions && Array.isArray(json.questions)) {
                flows.push(parseSimpleJsonToFlow(json, file));
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
