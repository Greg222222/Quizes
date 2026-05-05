import React, { useState, useEffect, useRef } from 'react';
import './ChatPlayer.css';
import type { QuizFlow, QuizNode } from '../../shared/types';
import { Send } from 'lucide-react';

interface ChatPlayerProps {
  flow: QuizFlow;
  onComplete: (responses: any) => void;
}

interface DisplayMessage {
  id: string;
  role: 'bot' | 'user';
  text: string;
  type: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  botAvatar?: string;
}

export const ChatPlayer: React.FC<ChatPlayerProps> = ({ flow, onComplete }) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(flow.startNodeId);
  const [isTyping, setIsTyping] = useState(false);
  const [variables, setVariables] = useState<Record<string, any>>({ score: 0, maxScore: 0 });
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    let calculatedMaxScore = 0;
    flow.nodes.forEach(node => {
      if (node.type === 'choice' && node.data?.options) {
        const maxOptScore = Math.max(0, ...node.data.options.map((o: any) => o.isCorrect ? (o.scoreValue || 1) : 0));
        calculatedMaxScore += maxOptScore;
      }
    });
    setVariables(prev => ({ ...prev, score: 0, maxScore: calculatedMaxScore }));
  }, [flow]);

  useEffect(() => {
    let isActive = true;
    if (currentNodeId) {
      processNode(currentNodeId, () => isActive);
    }
    return () => { isActive = false; };
  }, [currentNodeId]);

  const replaceVariables = (text: string) => {
    return text.replace(/\{(\w+)\}/g, (_, key) => {
      const val = variables[key];
      return val !== undefined ? String(val) : `{${key}}`;
    });
  };

  const processNode = async (nodeId: string, getIsActive: () => boolean = () => true) => {
    const node = flow.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, node.data?.delay || 1000));
    if (!getIsActive()) return;
    setIsTyping(false);

    if (node.content) {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'bot',
        text: replaceVariables(node.content),
        type: node.type,
        mediaUrl: node.data?.mediaUrl,
        mediaType: node.data?.mediaType as 'image' | 'video' | undefined,
        botAvatar: node.data?.botAvatar || flow.theme.botAvatar
      }]);
    }

    if (node.type === 'message') {
      if (node.nextId) {
        setCurrentNodeId(node.nextId);
      }
    } else if (node.type === 'terminal') {
      onComplete(variables);
    }
    // For other types (input, choice, etc.), we wait for handleUserResponse
  };

  const handleUserResponse = (text: string, value: any, nextId?: string) => {
    const node = flow.nodes.find(n => n.id === currentNodeId);
    
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      role: 'user',
      text: text,
      type: 'response'
    }]);

    setInputValue('');

    setVariables(prev => {
      let newScore = prev.score || 0;
      if (node?.type === 'choice') {
        const selectedOpt = node.data?.options?.find((o: any) => o.value === value);
        if (selectedOpt?.isCorrect) {
          newScore += (selectedOpt.scoreValue || 1);
        }
      }

      const updated = { ...prev, score: newScore };
      if (node?.data?.variableName) {
        updated[node.data.variableName] = value;
      }
      return updated;
    });

    if (nextId) {
      setCurrentNodeId(nextId);
    } else {
      const branches = node?.branches;
      if (branches && branches.length > 0) {
        const matchingBranch = branches.find(branch => {
          if (branch.operator === 'equals') return value === branch.value;
          if (branch.operator === 'contains') return String(value).includes(branch.value);
          return false;
        });
        if (matchingBranch) {
          setCurrentNodeId(matchingBranch.nextNodeId);
          return;
        }
      }
      if (node?.nextId) {
        setCurrentNodeId(node.nextId);
      }
    }
  };

  const currentNode = flow.nodes.find(n => n.id === currentNodeId);

  return (
    <div className="chat-container">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: '30%' }}></div>
      </div>
      
      <header className="chat-header">
        {flow.theme.botAvatar ? (
          <img src={flow.theme.botAvatar} alt="Assistant" className="bot-avatar-img" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div className="bot-avatar">AI</div>
        )}
        <div className="bot-info">
          <strong>Assistant</strong>
          <span style={{ fontSize: '0.7rem', color: '#10b981' }}>● En ligne</span>
        </div>
      </header>

      <main className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message-row ${msg.role}`}>
            {msg.role === 'bot' && (
              msg.botAvatar ? (
                <img src={msg.botAvatar} alt="Bot Avatar" className="message-avatar" />
              ) : (
                <div className="message-avatar fallback-avatar">AI</div>
              )
            )}
            <div className={`message-bubble message-${msg.role}`}>
              {msg.mediaUrl && (
                <div className="message-media" style={{ marginBottom: msg.text ? '8px' : '0' }}>
                  {msg.mediaType === 'video' ? (
                    <video src={msg.mediaUrl} controls autoPlay loop muted style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
                  ) : (
                    <img src={msg.mediaUrl} alt="media" style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
                  )}
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className={`message-row bot`}>
            {flow.theme.botAvatar ? (
              <img src={flow.theme.botAvatar} alt="Bot Avatar" className="message-avatar" />
            ) : (
              <div className="message-avatar fallback-avatar">AI</div>
            )}
            <div className="typing-indicator">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="chat-controls">
        {currentNode?.type === 'choice' && !isTyping && (
          <div className="options-grid">
            {currentNode.data?.options?.map(opt => (
              <button 
                key={opt.id} 
                className="option-button"
                onClick={() => handleUserResponse(opt.label, opt.value, opt.nextId)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {currentNode?.type === 'input' && !isTyping && (
          <div className="input-field">
            <input 
              type="text" 
              placeholder={currentNode.data?.placeholder || "Type here..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUserResponse(inputValue, inputValue)}
            />
            <button 
              className="send-button"
              onClick={() => handleUserResponse(inputValue, inputValue)}
            >
              <Send size={18} />
            </button>
          </div>
        )}

        {currentNode?.type === 'date' && !isTyping && (
          <div className="input-field">
            <input 
              type="date" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button 
              className="send-button"
              onClick={() => handleUserResponse(inputValue, inputValue)}
            >
              <Send size={18} />
            </button>
          </div>
        )}

        {currentNode?.type === 'rating' && !isTyping && (
          <div className="rating-container">
            {[1, 2, 3, 4, 5].map(star => (
              <button 
                key={star} 
                className="star-button"
                onClick={() => handleUserResponse(`${star} Stars`, star)}
              >
                ★
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
};
