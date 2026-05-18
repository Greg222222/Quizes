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
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [responsesList, setResponsesList] = useState<any[]>([]);
  const [responseSearch, setResponseSearch] = useState('');
  const [currentResponseId, setCurrentResponseId] = useState(() => Date.now().toString());
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('quizz_admin') === 'true';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedJson, setLastSavedJson] = useState<string>("");

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
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
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

  const fetchResponses = async () => {
    try {
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
      const response = await fetch(`${apiUrl}/api/responses`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setResponsesList(data);
        }
      }
    } catch (e) {
      console.error('Error fetching responses from backend:', e);
    }
  };

  useEffect(() => {
    fetchFlows();
    if (isAdmin) {
      fetchResponses();
    }
  }, [isAdmin]);

  // Keep localStorage in sync
  useEffect(() => {
    if (!isStandalonePlayer) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flow));
    }
  }, [flow, isStandalonePlayer]);

  const saveFlowToBackend = async (flowToSave: QuizFlow) => {
    if (!isAdmin || isStandalonePlayer) return;
    
    const currentJson = JSON.stringify(flowToSave);
    if (currentJson === lastSavedJson) return;

    setIsSaving(true);
    try {
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
      const response = await fetch(`${apiUrl}/api/flows/${flowToSave.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: currentJson
      });
      if (response.ok) {
        setLastSavedJson(currentJson);
        setAllFlows(prev => prev.map(f => f.id === flowToSave.id ? flowToSave : f));
      }
    } catch (e) {
      console.error('Error autosaving flow:', e);
    } finally {
      // Small delay for the indicator to be visible
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  // Autosave effect
  useEffect(() => {
    if (mode !== 'editor' || !isAdmin || isStandalonePlayer) return;

    const timer = setTimeout(() => {
      saveFlowToBackend(flow);
    }, 1500);

    return () => clearTimeout(timer);
  }, [flow, mode, isAdmin, isStandalonePlayer]);

  const handleComplete = async (variables: any) => {
    console.log('Quiz completed:', variables)
    setCompleted(true)
    setResults(variables)

    try {
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
      const responsePayload = {
        id: currentResponseId,
        quizId: flow.id,
        variables: variables,
        score: variables.score || 0,
        completed: true,
        completedAt: new Date().toISOString()
      };
      await fetch(`${apiUrl}/api/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responsePayload)
      });
      fetchResponses();
    } catch (e) {
      console.error('Error saving quiz response:', e);
    }
  }

  const handleResponse = async (_variableName: string, _value: any, updatedVariables: any) => {
    try {
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
      const responsePayload = {
        id: currentResponseId,
        quizId: flow.id,
        variables: updatedVariables,
        score: updatedVariables.score || 0,
        completed: false,
        completedAt: null
      };
      await fetch(`${apiUrl}/api/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responsePayload)
      });
      fetchResponses();
    } catch (e) {
      console.error('Error saving incremental response:', e);
    }
  };

  const handleSelectFlow = (flowId: string) => {
    const selected = allFlows.find(f => f.id === flowId);
    if (selected) {
      setFlow(selected);
      setCompleted(false);
      setCurrentResponseId(Date.now().toString());
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
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
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

  const handleLogin = async () => {
    const password = window.prompt("Mot de passe administrateur :");
    if (!password) return;

    try {
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsAdmin(true);
          localStorage.setItem('quizz_admin', 'true');
          setMode('editor');
        } else {
          alert('Mot de passe incorrect');
        }
      } else {
        alert('Mot de passe incorrect');
      }
    } catch (e) {
      console.error('Error during login:', e);
      alert('Erreur de connexion au serveur');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('quizz_admin');
    setMode('player');
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce quiz définitivement ?')) {
      return;
    }

    try {
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
      const response = await fetch(`${apiUrl}/api/flows/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setAllFlows(prev => prev.filter(f => f.id !== id));
        if (flow.id === id) {
          const remaining = allFlows.filter(f => f.id !== id);
          if (remaining.length > 0) {
            setFlow(remaining[0]);
          } else {
            setFlow(SAMPLE_FLOW);
          }
          setMode('player');
        }
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (e) {
      console.error('Error deleting quiz:', e);
      alert('Erreur de connexion au serveur');
    }
  };

  if (isStandalonePlayer) {
    return (
      <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
        <ChatPlayer key={flow.id} flow={flow} onComplete={handleComplete} />
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/?play=${flow.id}`;
  const popupHtml = `<a href="#" onclick="window.open('${shareUrl}', 'QuizPlayer', 'width=450,height=700,scrollbars=no,resizable=no'); return false;" style="display:inline-block;padding:10px 20px;background:${flow.theme?.primaryColor || '#6366f1'};color:#fff;text-decoration:none;border-radius:8px;font-family:sans-serif;font-weight:bold;">Jouer au Quiz</a>`;
  const iframeHtml = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></iframe>`;

  return (
    <div className="app-root">
      <nav className="app-nav">
        <div className="nav-group">
          {isAdmin && (
            <button onClick={() => { setMode('player'); setCompleted(false); }} style={{ background: mode === 'player' ? '#6366f1' : 'white', color: mode === 'player' ? 'white' : '#1e293b' }}>Player Mode</button>
          )}
          {isAdmin ? (
            <button onClick={() => setMode('editor')} style={{ background: mode === 'editor' ? '#6366f1' : 'white', color: mode === 'editor' ? 'white' : '#1e293b' }}>Editor Mode</button>
          ) : (
            <button onClick={handleLogin} style={{ background: 'white', color: '#1e293b' }}>Log in as Admin</button>
          )}
          
          {isAdmin && mode === 'editor' && (
            <div style={{ marginLeft: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: isSaving ? '#6366f1' : '#10b981', fontWeight: 'bold', minWidth: '110px' }}>
              {isSaving ? (
                <>
                  <span className="saving-spinner" style={{ width: '12px', height: '12px', border: '2px solid #e2e8f0', borderTop: '2px solid #6366f1', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <span>✓</span> Enregistré
                </>
              )}
            </div>
          )}
        </div>

        <div className="nav-group">
          <button 
            onClick={() => setShowShareModal(true)}
            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            🔗 Partager
          </button>
          {isAdmin && (
            <>
              <button 
                onClick={() => { fetchResponses(); setShowResponsesModal(true); }}
                style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                📊 Réponses
              </button>
              <button 
                onClick={handleCreateQuiz}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                + Créer un Quiz
              </button>
            </>
          )}

          {allFlows.length > 0 && (
            <div className="nav-group" style={{ borderLeft: isAdmin ? '1px solid #e2e8f0' : 'none', paddingLeft: isAdmin ? '10px' : '0' }}>
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
              {isAdmin && (
                <button
                  onClick={() => handleDeleteQuiz(flow.id)}
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginLeft: '4px' }}
                  title="Supprimer ce quiz"
                >
                  🗑️
                </button>
              )}
              <button 
                onClick={fetchFlows}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                title="Rafraîchir les quiz du serveur"
              >
                🔄
              </button>
              {isAdmin && (
                <button
                  onClick={handleLogout}
                  style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer', marginLeft: '10px' }}
                  title="Déconnexion admin"
                >
                  Déconnexion
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {mode === 'editor' ? (
        <FlowEditor initialFlow={flow} onFlowChange={setFlow} />
      ) : (
        <div className="player-wrapper">
          <ChatPlayer key={flow.id} flow={flow} onComplete={handleComplete} onResponse={handleResponse} />
        </div>
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

      {showResponsesModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '16px',
            width: '95%', maxWidth: '900px', maxHeight: '85vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Tableau des Réponses</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>Consultez et gérez les emails et données saisis par vos utilisateurs.</p>
              </div>
              <button onClick={() => setShowResponsesModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="Rechercher par quiz, email ou texte..." 
                value={responseSearch}
                onChange={e => setResponseSearch(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
              />
              <button 
                onClick={() => {
                  const emails = responsesList
                    .map(r => {
                      if (!r.variables) return '-';
                      const emailKeys = ['email', 'user_email', 'mail', 'user_mail', 'adresse_email'];
                      for (const key of emailKeys) {
                        if (r.variables[key]) return r.variables[key];
                      }
                      for (const val of Object.values(r.variables)) {
                        if (typeof val === 'string' && val.includes('@')) return val;
                      }
                      return '-';
                    })
                    .filter(email => email !== '-');
                  if (emails.length === 0) {
                    alert("Aucun email à copier.");
                    return;
                  }
                  navigator.clipboard.writeText(emails.join(', '));
                  alert(`${emails.length} email(s) copié(s) !`);
                }}
                style={{ background: '#475569', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📋 Copier les Emails
              </button>
              <button 
                onClick={() => {
                  const headers = ['Date', 'Quiz ID', 'Nom du Quiz', 'Email', 'Score', 'Autres Variables'];
                  const rows = responsesList.map(resp => {
                    const quizName = allFlows.find(f => f.id === resp.quizId)?.name || resp.quizId;
                    const dateStr = new Date(resp.completedAt || resp.startedAt || Date.now()).toLocaleString();
                    
                    let email = '-';
                    if (resp.variables) {
                      const emailKeys = ['email', 'user_email', 'mail', 'user_mail', 'adresse_email'];
                      for (const key of emailKeys) {
                        if (resp.variables[key]) { email = resp.variables[key]; break; }
                      }
                      if (email === '-') {
                        for (const val of Object.values(resp.variables)) {
                          if (typeof val === 'string' && val.includes('@')) { email = val; break; }
                        }
                      }
                    }

                    const scoreStr = `${resp.score || 0}/${resp.variables?.maxScore || '-'}`;
                    
                    let otherVars = '';
                    if (resp.variables) {
                      otherVars = Object.entries(resp.variables)
                        .filter(([key]) => !['score', 'maxScore', 'email', 'user_email', 'mail', 'user_mail', 'adresse_email'].includes(key))
                        .map(([key, val]) => `${key}: ${val}`)
                        .join(', ');
                    }

                    return [dateStr, resp.quizId, quizName, email, scoreStr, otherVars];
                  });

                  const csvRows = [headers.join(';'), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))];
                  const csvString = '\uFEFF' + csvRows.join('\r\n');
                  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `reponses_quiz_${Date.now()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📥 Exporter en CSV
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Date</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Quiz</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Email</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Score</th>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Autres Variables</th>
                  </tr>
                </thead>
                <tbody>
                  {responsesList
                    .filter(resp => {
                      const quizName = allFlows.find(f => f.id === resp.quizId)?.name || resp.quizId;
                      const dateStr = new Date(resp.completedAt || resp.startedAt || Date.now()).toLocaleString();
                      
                      let email = '-';
                      if (resp.variables) {
                        const emailKeys = ['email', 'user_email', 'mail', 'user_mail', 'adresse_email'];
                        for (const key of emailKeys) {
                          if (resp.variables[key]) { email = resp.variables[key]; break; }
                        }
                        if (email === '-') {
                          for (const val of Object.values(resp.variables)) {
                            if (typeof val === 'string' && val.includes('@')) { email = val; break; }
                          }
                        }
                      }
                      
                      const searchStr = `${quizName} ${dateStr} ${email} ${JSON.stringify(resp.variables || {})}`.toLowerCase();
                      return searchStr.includes(responseSearch.toLowerCase());
                    })
                    .map((resp, i) => {
                      const quizName = allFlows.find(f => f.id === resp.quizId)?.name || resp.quizId;
                      const dateStr = new Date(resp.completedAt || resp.startedAt || Date.now()).toLocaleString();
                      
                      let email = '-';
                      if (resp.variables) {
                        const emailKeys = ['email', 'user_email', 'mail', 'user_mail', 'adresse_email'];
                        for (const key of emailKeys) {
                          if (resp.variables[key]) { email = resp.variables[key]; break; }
                        }
                        if (email === '-') {
                          for (const val of Object.values(resp.variables)) {
                            if (typeof val === 'string' && val.includes('@')) { email = val; break; }
                          }
                        }
                      }

                      const scoreStr = `${resp.score || 0}/${resp.variables?.maxScore || '-'}`;
                      
                      let otherVars = '-';
                      if (resp.variables) {
                        const filtered = Object.entries(resp.variables)
                          .filter(([key]) => !['score', 'maxScore', 'email', 'user_email', 'mail', 'user_mail', 'adresse_email'].includes(key));
                        if (filtered.length > 0) {
                          otherVars = filtered.map(([key, val]) => `${key}: ${val}`).join(', ');
                        }
                      }

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                          <td style={{ padding: '12px 16px' }}>{dateStr}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '500' }}>{quizName}</td>
                          <td style={{ padding: '12px 16px', color: '#6366f1', fontWeight: 'bold' }}>{email}</td>
                          <td style={{ padding: '12px 16px' }}>{scoreStr}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{otherVars}</td>
                        </tr>
                      );
                    })}
                  {responsesList.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        Aucune réponse enregistrée pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setShowResponsesModal(false)} style={{ padding: '10px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

