import React, { useState, useCallback } from 'react';
import 'reactflow/dist/style.css';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import type { 
  Connection, 
  Edge, 
  Node,
  NodeChange,
  EdgeChange
} from 'reactflow';
import type { QuizFlow, QuizNode, BranchCondition } from '../../shared/types';
import { parseSimpleJsonToFlow } from '../../shared/importUtils';
import { CustomNode } from './CustomNode';
import { ContextMenu } from './ContextMenu';

const nodeTypes = {
  custom: CustomNode,
};

const ImageBrowserModal = ({ onClose, onSelect }: { onClose: () => void, onSelect: (url: string) => void }) => {
  const [images, setImages] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchImages = useCallback(async () => {
    const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
    try {
      const res = await fetch(`${apiUrl}/api/uploads`);
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  React.useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleRename = async (e: React.MouseEvent, img: any) => {
    e.stopPropagation();
    const newTitle = window.prompt("Nouveau titre pour l'image :", img.title || img.filename);
    if (!newTitle) return;

    const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
    try {
      const res = await fetch(`${apiUrl}/api/uploads/${img.filename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) fetchImages();
    } catch (err) {
      console.error('Error renaming', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, img: any) => {
    e.stopPropagation();
    if (!window.confirm(`Voulez-vous vraiment supprimer "${img.title || img.filename}" ? Cette action est irréversible.`)) return;

    const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
    try {
      const res = await fetch(`${apiUrl}/api/uploads/${img.filename}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchImages();
    } catch (err) {
      console.error('Error deleting', err);
    }
  };

  const filteredImages = images.filter(img => img.title?.toLowerCase().includes(search.toLowerCase()) || img.filename?.toLowerCase().includes(search.toLowerCase()));

  const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#1e293b' }}>Parcourir les images</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>
        <input 
          type="text" 
          placeholder="Rechercher par titre..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
        />
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px', paddingRight: '5px' }}>
          {filteredImages.map((img, i) => (
            <div key={i} onClick={() => onSelect(`${apiUrl}${img.url}`)} style={{ position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
              <img src={`${apiUrl}${img.url}`} alt={img.title} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
              <span style={{ fontSize: '0.75rem', textAlign: 'center', wordBreak: 'break-word', width: '100%', color: '#475569', paddingBottom: '20px' }}>{img.title || img.filename}</span>
              
              <div style={{ position: 'absolute', bottom: '5px', display: 'flex', gap: '10px' }}>
                <button 
                  onClick={(e) => handleRename(e, img)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '0' }}
                  title="Renommer"
                >
                  ✏️
                </button>
                <button 
                  onClick={(e) => handleDelete(e, img)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '0' }}
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {filteredImages.length === 0 && <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b' }}>Aucune image trouvée.</p>}
        </div>
      </div>
    </div>
  );
}

interface FlowEditorProps {
  initialFlow: QuizFlow;
  onFlowChange: (flow: QuizFlow) => void;
}

export const FlowEditor: React.FC<FlowEditorProps> = ({ initialFlow, onFlowChange }) => {
  const initNodes = initialFlow.nodes.map(n => ({
    id: n.id,
    type: 'custom',
    position: n.position || { x: Math.random() * 400, y: Math.random() * 400 },
    data: {
      type: n.type,
      label: n.content,
      content: n.content,
      ...n.data
    }
  }));

  const initEdges: Edge[] = [];
  initialFlow.nodes.forEach(n => {
    if (n.nextId) {
      initEdges.push({ id: `e-${n.id}-${n.nextId}`, source: n.id, target: n.nextId });
    }
    if (n.branches) {
      n.branches.forEach((b, idx) => {
        const opt = n.data?.options?.find(o => o.value === b.value);
        if (opt) {
          initEdges.push({ id: `e-${n.id}-${b.nextNodeId}-${idx}`, source: n.id, sourceHandle: opt.id, target: b.nextNodeId });
        }
      });
    }
  });

  const [nodes, setNodes] = useState<Node[]>(initNodes);
  const [edges, setEdges] = useState<Edge[]>(initEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [menu, setMenu] = useState<{ x: number, y: number } | null>(null);
  const [clipboard, setClipboard] = useState<Node[]>([]);
  const [startNodeId, setStartNodeId] = useState<string>(initialFlow.startNodeId);
  const [theme, setTheme] = useState(initialFlow.theme);
  const [showBrowserFor, setShowBrowserFor] = useState<'node' | 'theme' | null>(null);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const newFlow = parseSimpleJsonToFlow(json);
        
        const newNodes = newFlow.nodes.map(n => ({
          id: n.id,
          type: 'custom',
          position: n.position || { x: 250, y: 100 },
          data: {
            type: n.type,
            label: n.content,
            content: n.content,
            ...n.data
          }
        }));

        const newEdges: Edge[] = [];
        newFlow.nodes.forEach(n => {
          if (n.nextId) {
            newEdges.push({ id: `e-${n.id}-${n.nextId}`, source: n.id, target: n.nextId });
          }
        });

        setNodes(newNodes);
        setEdges(newEdges);
        setStartNodeId(newFlow.startNodeId);
        setTheme(newFlow.theme);
        setSelectedNode(null);
        
        if (event.target) event.target.value = '';
      } catch (err) {
        alert("Erreur lors de la lecture du fichier JSON : " + err);
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const title = window.prompt("Donnez un titre à cette image (optionnel) :", file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const apiUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;
        
        const response = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, title: title || file.name })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            callback(`${apiUrl}${data.url}`);
          } else {
            alert("Erreur: " + data.message);
          }
        }
      } catch (err) {
        console.error('Error uploading image', err);
        alert('Erreur de connexion');
      }
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset the input
  };

  // Sync isStartNode visually
  React.useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, isStartNode: n.id === startNodeId }
    })));
  }, [startNodeId]);

  // Advanced Operations
  const copyNodes = useCallback(() => {
    setClipboard(nodes.filter(n => n.selected));
  }, [nodes]);

  const pasteNodes = useCallback(() => {
    if (clipboard.length === 0) return;
    const newNodes = clipboard.map(node => ({
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      position: { x: node.position.x + 30, y: node.position.y + 30 },
      selected: true
    }));
    setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), ...newNodes]);
  }, [clipboard]);

  const duplicateNodes = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    if (selected.length === 0) return;
    const newNodes = selected.map(node => ({
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      position: { x: node.position.x + 30, y: node.position.y + 30 },
      selected: true
    }));
    setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), ...newNodes]);
    setMenu(null);
  }, [nodes]);

  const deleteSelectedNodes = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    const remainingNodes = nodes.filter(n => !n.selected);
    setNodes(remainingNodes);
    setEdges(eds => eds.filter(e => {
       const sourceSelected = selected.some(n => n.id === e.source);
       const targetSelected = selected.some(n => n.id === e.target);
       return !sourceSelected && !targetSelected;
    }));
    if (remainingNodes.length > 0 && selected.some(n => n.id === startNodeId)) {
      setStartNodeId(remainingNodes[0].id);
    }
    setMenu(null);
    setSelectedNode(null);
  }, [nodes, startNodeId]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        copyNodes();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        pasteNodes();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateNodes();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedNodes();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyNodes, pasteNodes, duplicateNodes, deleteSelectedNodes]);

  React.useEffect(() => {
    const newQuizNodes: QuizNode[] = nodes.map(nd => {
      const nextEdge = edges.find(e => e.source === nd.id && !e.sourceHandle);
      const branchEdges = edges.filter(e => e.source === nd.id && e.sourceHandle);
      
      const branches: BranchCondition[] = branchEdges.map(e => {
        const opt = nd.data.options?.find((o: any) => o.id === e.sourceHandle);
        return {
          operator: 'equals',
          value: opt ? opt.value : e.sourceHandle,
          nextNodeId: e.target
        };
      });

      return {
        id: nd.id,
        type: nd.data.type || 'message',
        content: nd.data.content || '',
        position: nd.position,
        data: nd.data,
        nextId: nextEdge?.target,
        branches: branches.length > 0 ? branches : undefined
      };
    });

    onFlowChange({
      ...initialFlow,
      theme,
      startNodeId,
      nodes: newQuizNodes
    });
  }, [nodes, edges, startNodeId, theme]); // intentionally omitted initialFlow and onFlowChange to prevent loop

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    console.log('NODE CLICKED!', node);
    setSelectedNode(node);
    setMenu(null);
  };

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    if (!node.selected) {
      setNodes(nds => nds.map(n => ({ ...n, selected: n.id === node.id })));
    }
    setMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const onPaneClick = useCallback(() => {
    setMenu(null);
  }, []);

  const updateNodeData = (newData: any) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const newContent = newData.content !== undefined ? newData.content : node.data.content;
          return {
            ...node,
            data: { ...node.data, ...newData, content: newContent, label: newContent },
          };
        }
        return node;
      })
    );
    setSelectedNode(prev => {
      if (!prev) return null;
      const newContent = newData.content !== undefined ? newData.content : prev.data.content;
      return { ...prev, data: { ...prev.data, ...newData, content: newContent, label: newContent } };
    });
  };

  return (
    <div className="editor-layout" style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex' }}>
      
      {selectedNode ? (
        <div className="editor-sidebar" style={{ 
          background: 'white', 
          borderRight: '1px solid #e2e8f0', 
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          overflowY: 'auto',
          color: '#1e293b'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#1e293b' }}>Propriétés du Node</h2>
            <button onClick={() => setSelectedNode(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
          </div>

          <div className="property-group" style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="startNode"
                checked={startNodeId === selectedNode.id}
                onChange={() => setStartNodeId(selectedNode.id)}
                style={{ width: '1.2rem', height: '1.2rem', accentColor: '#10b981' }}
              />
              <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 'bold' }}>Point de départ du Quiz</span>
            </label>
          </div>

          <div className="property-group">
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>ID</label>
            <input type="text" value={selectedNode.id} disabled style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b' }} />
          </div>

          <div className="property-group">
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Type de Question</label>
            <select 
              value={selectedNode.data.type || 'message'} 
              onChange={(e) => updateNodeData({ type: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b', background: 'white' }}
            >
              <option value="message">Message Simple</option>
              <option value="input">Champ Texte</option>
              <option value="choice">Choix Multiples</option>
              <option value="date">Sélecteur de Date</option>
              <option value="rating">Évaluation (Étoiles)</option>
              <option value="terminal">Fin de Quiz</option>
            </select>
          </div>

          <div className="property-group">
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Contenu (Texte affiché)</label>
            <textarea 
              value={selectedNode.data.content || ''} 
              onChange={(e) => updateNodeData({ content: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', minHeight: '80px', color: '#1e293b', background: 'white' }}
            />
          </div>

          <div className="property-group">
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Média (URL de l'image, vidéo ou GIF)</label>
            <input 
              type="text" 
              value={selectedNode.data.mediaUrl || ''} 
              onChange={(e) => updateNodeData({ mediaUrl: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '0.5rem', color: '#1e293b', background: 'white' }}
              placeholder="https://exemple.com/image.gif"
            />
            {selectedNode.data.mediaUrl && (
              <select 
                value={selectedNode.data.mediaType || 'image'} 
                onChange={(e) => updateNodeData({ mediaType: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b', background: 'white' }}
              >
                <option value="image">Image / GIF</option>
                <option value="video">Vidéo (MP4, WebM)</option>
              </select>
            )}
          </div>

          <div className="property-group">
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Avatar de l'assistant (Spécifique à ce nœud)</label>
            <input 
              type="text" 
              value={selectedNode.data.botAvatar || ''} 
              onChange={(e) => updateNodeData({ botAvatar: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b', background: 'white' }}
              placeholder="URL de l'image, ou téléversez ci-dessous"
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
              <label style={{ 
                padding: '4px 8px', 
                background: '#f1f5f9', 
                border: '1px solid #cbd5e1', 
                borderRadius: '4px', 
                fontSize: '0.75rem', 
                cursor: 'pointer',
                color: '#475569'
              }}>
                📤 Téléverser
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, (url) => updateNodeData({ botAvatar: url }))}
                  style={{ display: 'none' }}
                />
              </label>
              <button 
                onClick={() => setShowBrowserFor('node')}
                style={{ 
                  padding: '4px 8px', 
                  background: '#f8fafc', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                🔍 Parcourir
              </button>
            </div>
            {selectedNode.data.botAvatar && (
              <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', background: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
                <img src={selectedNode.data.botAvatar} alt="Avatar spécifique" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          {['input', 'choice', 'date', 'rating'].includes(selectedNode.data.type) && (
            <div className="property-group">
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Nom de la Variable (pour stocker la réponse)</label>
              <input 
                type="text" 
                value={selectedNode.data.variableName || ''} 
                onChange={(e) => updateNodeData({ variableName: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b', background: 'white' }}
                placeholder="ex: user_name"
              />
            </div>
          )}

          {selectedNode.data.type === 'choice' && (
            <div className="property-group">
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Options</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(selectedNode.data.options || []).map((opt: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: '#f1f5f9', padding: '8px', borderRadius: '4px', border: opt.isCorrect ? '1px solid #10b981' : '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input 
                        type="text" 
                        value={opt.label} 
                        onChange={(e) => {
                          const newOpts = [...(selectedNode.data.options || [])];
                          newOpts[idx] = { ...newOpts[idx], label: e.target.value, value: e.target.value };
                          updateNodeData({ options: newOpts });
                        }}
                        style={{ flex: 1, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#1e293b', background: 'white' }}
                      />
                      <button
                        onClick={() => {
                          const newOpts = (selectedNode.data.options || []).filter((_: any, i: number) => i !== idx);
                          updateNodeData({ options: newOpts });
                        }}
                        style={{ padding: '0 0.6rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                        title="Supprimer cette option"
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#475569' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={opt.isCorrect || false}
                          onChange={(e) => {
                            const newOpts = [...(selectedNode.data.options || [])];
                            newOpts[idx] = { ...newOpts[idx], isCorrect: e.target.checked, scoreValue: e.target.checked ? (opt.scoreValue || 1) : undefined };
                            updateNodeData({ options: newOpts });
                          }}
                          style={{ accentColor: '#10b981' }}
                        />
                        Bonne réponse
                      </label>
                      {opt.isCorrect && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Points :
                          <input 
                            type="number" 
                            value={opt.scoreValue || 1}
                            onChange={(e) => {
                              const newOpts = [...(selectedNode.data.options || [])];
                              newOpts[idx] = { ...newOpts[idx], scoreValue: Number(e.target.value) };
                              updateNodeData({ options: newOpts });
                            }}
                            style={{ width: '50px', padding: '0.2rem', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#1e293b', background: 'white' }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const newOpts = [...(selectedNode.data.options || []), { id: `opt_${Date.now()}`, label: 'Nouvelle Option', value: 'option' }];
                    updateNodeData({ options: newOpts });
                  }}
                  style={{ padding: '5px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: '#1e293b' }}
                >
                  + Ajouter une option
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="editor-sidebar" style={{ 
          background: 'white', 
          borderRight: '1px solid #e2e8f0', 
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          overflowY: 'auto',
          color: '#1e293b'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: '#1e293b' }}>Paramètres du Quiz</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Configurez les options globales du parcours.</p>
          </div>

          <div className="property-group">
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Avatar de l'assistant par défaut</label>
            <input 
              type="text" 
              value={theme.botAvatar || ''} 
              onChange={(e) => setTheme(prev => ({ ...prev, botAvatar: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b', background: 'white' }}
              placeholder="URL de l'image, ou téléversez ci-dessous"
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
              <label style={{ 
                padding: '4px 8px', 
                background: '#f1f5f9', 
                border: '1px solid #cbd5e1', 
                borderRadius: '4px', 
                fontSize: '0.75rem', 
                cursor: 'pointer',
                color: '#475569'
              }}>
                📤 Téléverser
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, (url) => setTheme(prev => ({ ...prev, botAvatar: url })))}
                  style={{ display: 'none' }}
                />
              </label>
              <button 
                onClick={() => setShowBrowserFor('theme')}
                style={{ 
                  padding: '4px 8px', 
                  background: '#f8fafc', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                🔍 Parcourir
              </button>
            </div>
            {theme.botAvatar && (
              <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', background: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
                <img src={theme.botAvatar} alt="Avatar par défaut" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          <div className="property-group">
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Couleur Principale (Boutons, Avatar)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="color" 
                value={theme.primaryColor || '#6366f1'} 
                onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              />
              <input 
                type="text" 
                value={theme.primaryColor || '#6366f1'} 
                onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b', background: 'white' }}
              />
            </div>
          </div>

          <div className="property-group">
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Couleur de Fond du Chat</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="color" 
                value={theme.backgroundColor || '#f0f2f5'} 
                onChange={(e) => setTheme(prev => ({ ...prev, backgroundColor: e.target.value }))}
                style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              />
              <input 
                type="text" 
                value={theme.backgroundColor || '#f0f2f5'} 
                onChange={(e) => setTheme(prev => ({ ...prev, backgroundColor: e.target.value }))}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b', background: 'white' }}
              />
            </div>
          </div>

          <div className="property-group">
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Police (Font Family)</label>
            <input 
              type="text" 
              value={theme.fontFamily || 'Inter'} 
              onChange={(e) => setTheme(prev => ({ ...prev, fontFamily: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b', background: 'white' }}
              placeholder="ex: Inter, sans-serif"
            />
          </div>

          <div className="property-group" style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.5rem' }}>Importer un Quiz</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Importez un fichier JSON pour générer automatiquement un nouveau parcours complet.
            </p>
            <label style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              width: '100%', 
              padding: '0.8rem', 
              background: '#f8fafc', 
              border: '2px dashed #cbd5e1', 
              borderRadius: '8px', 
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#6366f1'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
            >
              📥 Choisir un fichier JSON
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          fitView
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls />
        </ReactFlow>
        
        <div style={{ 
          position: 'absolute', 
          top: 20, 
          left: 20, 
          zIndex: 10,
          background: 'white',
          padding: '0.8rem 1.2rem',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          color: '#1e293b'
        }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Flow Controls</h3>
          <button 
            style={{ padding: '6px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            onClick={() => {
              const id = `node_${Date.now()}`;
              setNodes(nds => [...nds, {
                id,
                type: 'custom',
                data: { label: 'Nouveau Message', content: 'Nouveau Message', type: 'message' },
                position: { x: Math.random() * 400, y: Math.random() * 400 },
              }]);
            }}
          >
            + Add Node
          </button>
        </div>

        {menu && (
          <ContextMenu 
            x={menu.x} 
            y={menu.y} 
            onDuplicate={duplicateNodes} 
            onDelete={deleteSelectedNodes} 
            onClose={() => setMenu(null)} 
          />
        )}

        {showBrowserFor === 'node' && (
          <ImageBrowserModal 
            onClose={() => setShowBrowserFor(null)} 
            onSelect={(url) => {
              updateNodeData({ botAvatar: url });
              setShowBrowserFor(null);
            }} 
          />
        )}
        {showBrowserFor === 'theme' && (
          <ImageBrowserModal 
            onClose={() => setShowBrowserFor(null)} 
            onSelect={(url) => {
              setTheme(prev => ({ ...prev, botAvatar: url }));
              setShowBrowserFor(null);
            }} 
          />
        )}
      </div>
    </div>
  );
};
