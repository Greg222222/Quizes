export type NodeType = 
  | 'message' 
  | 'choice' 
  | 'input' 
  | 'date' 
  | 'email' 
  | 'file' 
  | 'rating' 
  | 'branching' 
  | 'score' 
  | 'terminal';

export interface NodeOption {
  id: string;
  label: string;
  value: any;
  isCorrect?: boolean;
  scoreValue?: number;
}

export interface BranchCondition {
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  nextNodeId: string;
}

export interface QuizNode {
  id: string;
  type: NodeType;
  content: string;
  data?: {
    options?: NodeOption[];
    placeholder?: string;
    validation?: string; // regex or preset like 'email', 'phone'
    variableName?: string; // to save the response
    scoreValue?: number;
    delay?: number; // ms to wait before showing
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    botAvatar?: string; // custom avatar for this specific node
  };
  nextId?: string;
  branches?: BranchCondition[];
  position?: { x: number; y: number }; // For the flow editor
}

export interface QuizFlow {
  id: string;
  name: string;
  startNodeId: string;
  nodes: QuizNode[];
  theme: {
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
    botAvatar?: string;
    botAvatarSize?: number;
  };
}

export interface QuizResponse {
  id: string;
  quizId: string;
  answers: Record<string, any>;
  variables: Record<string, any>;
  score: number;
  completed: boolean;
  startedAt: string;
  completedAt?: string;
}
