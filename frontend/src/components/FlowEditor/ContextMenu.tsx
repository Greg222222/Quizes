import React, { useEffect } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onDuplicate, onDelete, onClose }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: x,
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
        padding: '0.5rem 0',
        zIndex: 1000,
        minWidth: '150px'
      }}
    >
      <button
        onClick={onDuplicate}
        style={{
          display: 'block',
          width: '100%',
          padding: '0.5rem 1rem',
          border: 'none',
          background: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          color: '#1e293b',
          fontSize: '0.9rem'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        Dupliquer (Ctrl+D)
      </button>
      <button
        onClick={onDelete}
        style={{
          display: 'block',
          width: '100%',
          padding: '0.5rem 1rem',
          border: 'none',
          background: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          color: '#ef4444',
          fontSize: '0.9rem'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        Supprimer (Suppr)
      </button>
    </div>
  );
};
