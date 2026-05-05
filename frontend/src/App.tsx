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
  const urlParams = new URLSearchParams(window.location.search);
  const playFlowId = urlParams.get('play');
  const isStandalonePlayer = !!playFlowId;

  const [mode, setMode] = useState<'player' | 'editor'>('player')
  const [, setCompleted] = useState(false)
  const [, setResults] = useState<any>(null)
  const [allFlows, setAllFlows] = useState<QuizFlow[]>([])
  const [showShareModal, setShowShareModal] = useState(false);

  const [flow, setFlow] = useState<QuizFlow>(() => {
    if (isStandalonePlayer) return SAMPLE_FLOW; // Temporary until fetched

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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/flows`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setAllFlows(data);
          if (isStandalonePlayer) {
            const targetFlow = data.find((f: QuizFlow) => f.id === playFlowId);
            if (targetFlow) setFlow(targetFlow);
          } else {
            const currentExists = data.some((f: QuizFlow) => f.id === flow.id);
            if (!currentExists) {
              setFlow(data[0]);
            }
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
    if (!isStandalonePlayer) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flow));
    }
  }, [flow, isStandalonePlayer]);

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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/flows`, {
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

  if (isStandalonePlayer) {
    return (
      <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
        <ChatPlayer flow={flow} onComplete={handleComplete} />
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/?play=${flow.id}`;
  const popupHtml = `<a href="#" onclick="window.open('${shareUrl}', 'QuizPlayer', 'width=450,height=700,scrollbars=no,resizable=no'); return false;" style="display:inline-block;padding:10px 20px;background:${flow.theme?.primaryColor || '#6366f1'};color:#fff;text-decoration:none;border-radius:8px;font-family:sans-serif;font-weight:bold;">Jouer au Quiz</a>`;
  const iframeHtml = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></iframe>`;

  return (
    <div className="app-root">
      <nav className="app-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => { setMode('player'); setCompleted(false); }} style={{ background: mode === 'player' ? '#6366f1' : 'white', color: mode === 'player' ? 'white' : '#1e293b' }}>Player Mode</button>
          <button onClick={() => setMode('editor')} style={{ background: mode === 'editor' ? '#6366f1' : 'white', color: mode === 'editor' ? 'white' : '#1e293b' }}>Editor Mode (Admin)</button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowShareModal(true)}
            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            🔗 Partager
          </button>
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

      {showShareModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '16px',
            width: '90%', maxWidth: '600px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Intégrer le Quiz</h2>
              <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569' }}>Lien direct</label>
              <input readOnly value={shareUrl} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }} onClick={(e) => (e.target as HTMLInputElement).select()} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569' }}>Lien Popup HTML (Bouton cliquable)</label>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0 }}>Copiez ce code pour afficher un bouton qui ouvre le quiz dans une petite fenêtre flottante.</p>
              <textarea readOnly value={popupHtml} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.9rem' }} onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569' }}>Intégration Iframe (Dans la page)</label>
              <textarea readOnly value={iframeHtml} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.9rem' }} onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setShowShareModal(false)} style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
