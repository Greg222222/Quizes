import { useState, useEffect } from 'react'
import './App.css'
import { ChatPlayer } from './components/ChatPlayer/ChatPlayer'
import { FlowEditor } from './components/FlowEditor/FlowEditor'
import type { QuizFlow } from './shared/types'

const SAMPLE_FLOW: QuizFlow = {
  id: '1',
  name: 'Onboarding Quiz',
  startNodeId: 'node_1',
  theme: {
    primaryColor: '#6366f1',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter'
  },
  nodes: [
    {
      id: 'node_1',
      type: 'message',
      content: 'Bonjour ! Bienvenue sur notre plateforme.',
      data: { 
        delay: 1000,
        mediaUrl: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif',
        mediaType: 'image'
      },
      nextId: 'node_2'
    },
    {
      id: 'node_2',
      type: 'input',
      content: 'Comment vous appelez-vous ?',
      data: { variableName: 'name', placeholder: 'Votre prénom' },
      nextId: 'node_3'
    },
    {
      id: 'node_3',
      type: 'message',
      content: 'Enchanté {name} ! Quel est votre objectif aujourd\'hui ?',
      data: { delay: 1200 },
      nextId: 'node_4'
    },
    {
      id: 'node_4',
      type: 'choice',
      content: 'Choisissez une option :',
      data: {
        variableName: 'goal',
        options: [
          { id: 'opt1', label: 'Apprendre React', value: 'react' },
          { id: 'opt2', label: 'Créer un Chatbot', value: 'chatbot' },
          { id: 'opt3', label: 'Juste curieux', value: 'curious' }
        ]
      },
      nextId: 'node_5'
    },
    {
      id: 'node_5',
      type: 'terminal',
      content: 'Parfait ! {name}, nous allons vous aider à {goal}. À bientôt !'
    }
  ]
}

const LOCAL_STORAGE_KEY = 'quizz_flow_data';

function App() {
  const [mode, setMode] = useState<'player' | 'editor'>('player')
  const [completed, setCompleted] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [allFlows, setAllFlows] = useState<QuizFlow[]>([])

  const [flow, setFlow] = useState<QuizFlow>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved flow', e);
      }
    }
    return SAMPLE_FLOW;
  });

  // Fetch flows from backend
  const fetchFlows = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/flows');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setAllFlows(data);
          const currentExists = data.some(f => f.id === flow.id);
          if (!currentExists) {
            setFlow(data[0]);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching flows from backend:', e);
    }
  }

  useEffect(() => {
    fetchFlows();
  }, []);

  // Keep localStorage in sync
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flow));
  }, [flow]);

  const handleComplete = (data: any) => {
    console.log('Quiz completed:', data)
    setCompleted(true)
    setResults(data)
  }

  const handleSelectFlow = (flowId: string) => {
    const selected = allFlows.find(f => f.id === flowId);
    if (selected) {
      setFlow(selected);
      setCompleted(false);
    }
  }

  const handleCreateQuiz = async () => {
    const title = window.prompt("Titre du nouveau quiz :", "Mon Nouveau Quiz");
    if (!title) return;

    const newFlow: QuizFlow = {
      id: `flow_${Date.now()}`,
      name: title,
      startNodeId: 'node_1',
      theme: {
        primaryColor: '#6366f1',
        backgroundColor: '#f8fafc',
        fontFamily: 'Inter'
      },
      nodes: [
        {
          id: 'node_1',
          type: 'message',
          content: 'Bienvenue dans votre nouveau quiz !',
          position: { x: 250, y: 50 },
          data: { delay: 1000 }
        }
      ]
    };

    try {
      const response = await fetch('http://localhost:3001/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFlow)
      });
      if (response.ok) {
        const savedFlow = await response.json();
        setAllFlows(prev => [...prev, savedFlow]);
        setFlow(savedFlow);
        setMode('editor');
        setCompleted(false);
      }
    } catch (e) {
      console.error('Error creating quiz:', e);
    }
  };

  return (
    <div className="app-root">
      <nav className="app-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => { setMode('player'); setCompleted(false); }} style={{ background: mode === 'player' ? '#6366f1' : 'white', color: mode === 'player' ? 'white' : '#1e293b' }}>Player Mode</button>
          <button onClick={() => setMode('editor')} style={{ background: mode === 'editor' ? '#6366f1' : 'white', color: mode === 'editor' ? 'white' : '#1e293b' }}>Editor Mode (Admin)</button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={handleCreateQuiz}
            style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            + Créer un Quiz
          </button>

          {allFlows.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Charger un Quiz :</span>
              <select 
                value={flow.id} 
                onChange={(e) => handleSelectFlow(e.target.value)}
                style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '20px', fontSize: '0.85rem', outline: 'none', background: '#f8fafc', color: '#1e293b', cursor: 'pointer' }}
              >
                {allFlows.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button 
                onClick={fetchFlows}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                title="Rafraîchir les quiz du serveur"
              >
                🔄
              </button>
            </div>
          )}
        </div>
      </nav>

      {mode === 'editor' ? (
        <FlowEditor initialFlow={flow} onFlowChange={setFlow} />
      ) : (
        <ChatPlayer flow={flow} onComplete={handleComplete} />
      )}
    </div>
  )
}

export default App
