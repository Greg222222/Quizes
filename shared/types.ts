export type NodeType = 
  | 'message' 
  | 'choice' 
  | 'input' 
  | 'date' 
  | 'file' 
  | 'rating' 
  | 'branching' 
  | 'score' 
  | 'terminal';

export interface ChoiceOption {
  id: string;
  label: string;
  value: string;
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
    options?: ChoiceOption[];
    placeholder?: string;
    validation?: string; // regex or preset like 'email', 'phone'
    variableName?: string; // to save the response
    scoreValue?: number;
    delay?: number; // ms to wait before showing
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
