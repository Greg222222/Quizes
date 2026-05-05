import type { QuizFlow, QuizNode, NodeType } from './types';

export function parseSimpleJsonToFlow(json: any): QuizFlow {
  if (json.quiz_titre || (json.questions && Array.isArray(json.questions) && json.questions.some((q: any) => q.question !== undefined))) {
    return parseNewFormatToFlow(json);
  }

  const quizId = `quiz_${Date.now()}`;
  const nodes: QuizNode[] = [];
  
  const title = json.title || 'Nouveau Quiz';
  const theme = json.theme || {
    primaryColor: '#6366f1',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter',
  };

  const questions = json.questions || [];
  
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Le fichier JSON doit contenir un tableau 'questions' valide avec au moins un élément.");
  }

  let yOffset = 50;
  const timestamp = Date.now(); // Base timestamp for IDs

  questions.forEach((q: any, index: number) => {
    const nodeId = `node_${timestamp}_${index}`;
    const nextId = index < questions.length - 1 ? `node_${timestamp}_${index + 1}` : `node_${timestamp}_terminal`;

    nodes.push({
      id: nodeId,
      type: (q.type as NodeType) || 'message',
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

  // Add the terminal node
  nodes.push({
    id: `node_${timestamp}_terminal`,
    type: 'terminal',
    content: 'Merci d\'avoir complété ce quiz !',
    position: { x: 250, y: yOffset },
    data: {}
  });

  return {
    id: quizId,
    name: title,
    startNodeId: nodes[0].id,
    theme: theme,
    nodes: nodes
  };
}

function parseNewFormatToFlow(json: any): QuizFlow {
  const quizId = `quiz_${Date.now()}`;
  const nodes: QuizNode[] = [];
  
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
