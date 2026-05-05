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
    <div style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex' }}>
      
      {selectedNode ? (
        <div style={{ 
          width: '350px', 
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
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Avatar de l'assistant (Spécifique à ce nœud, URL d'image/GIF)</label>
            <input 
              type="text" 
              value={selectedNode.data.botAvatar || ''} 
              onChange={(e) => updateNodeData({ botAvatar: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b', background: 'white' }}
              placeholder="Laisser vide pour utiliser l'avatar par défaut"
            />
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
        <div style={{ 
          width: '350px', 
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
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Avatar de l'assistant par défaut (URL d'image/GIF)</label>
            <input 
              type="text" 
              value={theme.botAvatar || ''} 
              onChange={(e) => setTheme(prev => ({ ...prev, botAvatar: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#1e293b', background: 'white' }}
              placeholder="https://exemple.com/bot-avatar.gif"
            />
            {theme.botAvatar && (
              <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', background: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
                <img src={theme.botAvatar} alt="Avatar par défaut" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
            )}
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
      </div>
    </div>
  );
};
