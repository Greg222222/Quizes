import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export const CustomNode = ({ data, isConnectable }: NodeProps) => {
  const isChoice = data.type === 'choice';

  return (
    <div 
      onClick={() => console.log('CustomNode div clicked!', data.id)}
      style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '10px 15px',
      minWidth: '150px',
      boxShadow: data.isStartNode ? '0 0 0 2px #10b981' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      position: 'relative'
    }}>
      {data.isStartNode && (
        <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          DÉBUT
        </div>
      )}
      {/* Target Handle (Top) */}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        style={{ background: '#6366f1' }}
      />
      
      <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#6366f1', marginBottom: '5px' }}>
        {data.type.toUpperCase()}
      </div>
      <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
        {data.label || 'No label'}
      </div>

      {/* Default Source Handle (Bottom) */}
      {!isChoice && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          isConnectable={isConnectable}
          style={{ background: '#6366f1' }}
        />
      )}

      {/* Choice Source Handles */}
      {isChoice && data.options && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>Branchements</div>
          {data.options.map((opt: any) => (
            <div key={opt.id} style={{ position: 'relative', background: opt.isCorrect ? '#ecfdf5' : '#f8fafc', color: '#1e293b', padding: '5px', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'center', border: opt.isCorrect ? '1px solid #10b981' : '1px solid #e2e8f0' }}>
              {opt.label}
              {opt.isCorrect && (
                <span style={{ marginLeft: '6px', fontSize: '0.65rem', background: '#10b981', color: 'white', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
                  +{opt.scoreValue || 1}
                </span>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={opt.id}
                style={{ top: '50%', background: '#10b981' }}
                isConnectable={isConnectable}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
