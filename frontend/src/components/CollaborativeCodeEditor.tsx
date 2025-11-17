'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import io, { Socket } from 'socket.io-client';

interface TeamMember {
  userId: string;
  username: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system';
}

interface CollaborativeCodeEditorProps {
  teamId: string;
  problemId: string;
  language?: string;
  initialCode?: string;
  readOnly?: boolean;
  onCodeChange?: (code: string) => void;
}

// Generate consistent color for user
const generateUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', // red
    '#4ECDC4', // teal
    '#45B7D1', // blue
    '#FFA07A', // orange
    '#98D8C8', // mint
    '#F7DC6F', // yellow
    '#BB8FCE', // purple
    '#85C1E2', // sky blue
  ];
  
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

export const CollaborativeCodeEditor = ({
  teamId,
  problemId,
  language = 'python',
  initialCode = '',
  readOnly = false,
  onCodeChange,
}: CollaborativeCodeEditorProps) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [onlineMembers, setOnlineMembers] = useState<TeamMember[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Get current user info
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || '';
    const username = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    if (!token || !userId) {
      console.error('No authentication token or user ID found');
      return;
    }

    // Initialize Socket.io for team features (chat, presence)
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001', {
      path: '/collaboration',
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to collaboration server');
      setConnected(true);
      socket.emit('join-team', teamId);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setConnected(false);
    });

    socket.on('team-joined', (data: any) => {
      console.log('Joined team:', data);
      setOnlineMembers(data.presence || []);
      setChatMessages(data.chatHistory || []);
    });

    socket.on('user-joined', (data: any) => {
      console.log('User joined:', data);
      setOnlineMembers((prev) => {
        const filtered = prev.filter((m) => m.userId !== data.userId);
        return [...filtered, data.presence];
      });

      // Add system message
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          userId: 'system',
          username: 'System',
          message: `${data.presence.username} joined the team`,
          timestamp: new Date(),
          type: 'system',
        },
      ]);
    });

    socket.on('user-left', (data: any) => {
      setOnlineMembers((prev) => prev.filter((m) => m.userId !== data.userId));

      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          userId: 'system',
          username: 'System',
          message: `User left the team`,
          timestamp: new Date(),
          type: 'system',
        },
      ]);
    });

    socket.on('chat-message', (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    socket.on('cursor-moved', (data: any) => {
      setOnlineMembers((prev) =>
        prev.map((m) =>
          m.userId === data.userId
            ? { ...m, cursor: data.position }
            : m
        )
      );
    });

    return () => {
      socket.emit('leave-team');
      socket.disconnect();
    };
  }, [teamId]);

  // Initialize Yjs collaborative editing
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Initialize Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // For local development, we'll use in-memory collaboration
    // In production, you would set up a WebSocket server for Yjs
    // For now, we'll use the Socket.io connection for code sync

    const ytext = ydoc.getText('monaco');
    
    // Set initial code if provided
    if (initialCode && ytext.toString() === '') {
      ytext.insert(0, initialCode);
    }

    // Bind Yjs to Monaco
    const model = editor.getModel();
    if (model) {
      // Simple binding without WebSocket provider for now
      // In production, you'd use: new WebsocketProvider('ws://localhost:1234', 'room-name', ydoc)
      
      // Listen to Yjs changes and update Monaco
      ytext.observe(() => {
        const content = ytext.toString();
        if (model.getValue() !== content) {
          const position = editor.getPosition();
          model.setValue(content);
          if (position) editor.setPosition(position);
        }
        
        // Call parent onChange
        if (onCodeChange) {
          onCodeChange(content);
        }
      });

      // Listen to Monaco changes and update Yjs
      model.onDidChangeContent(() => {
        const content = model.getValue();
        if (ytext.toString() !== content) {
          ydoc.transact(() => {
            ytext.delete(0, ytext.length);
            ytext.insert(0, content);
          });
        }

        // Emit code update to team via Socket.io
        if (socketRef.current) {
          const position = editor.getPosition();
          socketRef.current.emit('code-update', {
            code: content,
            cursorPosition: position ? {
              line: position.lineNumber,
              column: position.column,
            } : undefined,
          });
        }
      });

      // Listen to cursor changes
      editor.onDidChangeCursorPosition((e: any) => {
        if (socketRef.current) {
          socketRef.current.emit('cursor-move', {
            line: e.position.lineNumber,
            column: e.position.column,
          });
        }
      });
    }

    // Receive code updates from teammates
    if (socketRef.current) {
      socketRef.current.on('code-updated', (data: any) => {
        const model = editor.getModel();
        if (model && data.code !== model.getValue()) {
          const position = editor.getPosition();
          model.setValue(data.code);
          if (position) editor.setPosition(position);
        }
      });
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !socketRef.current) return;

    socketRef.current.emit('send-message', {
      message: chatInput,
    });

    setChatInput('');
  };

  return (
    <div className="flex h-full gap-4">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-dark-800 border border-gray-700 rounded-t-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Language:</span>
            <span className="text-sm font-medium text-white">{language}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className={`flex items-center gap-2 text-xs ${
              connected ? 'text-green-400' : 'text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-400' : 'bg-red-400'
              } ${connected ? '' : 'animate-pulse'}`}></div>
              {connected ? 'Connected' : 'Connecting...'}
            </div>

            {/* Online members count */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {onlineMembers.slice(0, 3).map((member) => (
                  <div
                    key={member.userId}
                    className="w-6 h-6 rounded-full border-2 border-dark-800 flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: member.color || generateUserColor(member.userId) }}
                    title={member.username}
                  >
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              {onlineMembers.length > 3 && (
                <span className="text-xs text-gray-400">+{onlineMembers.length - 3}</span>
              )}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 border-x border-b border-gray-700 rounded-b-lg overflow-hidden">
          <Editor
            height="100%"
            language={language}
            defaultValue={initialCode}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              readOnly,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              padding: { top: 16, bottom: 16 },
            }}
          />
        </div>
      </div>

      {/* Team Chat Sidebar */}
      {showChat && (
        <div className="w-80 flex flex-col bg-dark-800 border border-gray-700 rounded-lg">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Team Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Online Members */}
          <div className="p-3 border-b border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Online ({onlineMembers.length})</div>
            <div className="space-y-1">
              {onlineMembers.map((member) => (
                <div key={member.userId} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: member.color || generateUserColor(member.userId) }}
                  ></div>
                  <span className="text-gray-300">{member.username}</span>
                  {member.cursor && (
                    <span className="text-xs text-gray-500">
                      L{member.cursor.line}:{member.cursor.column}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={msg.type === 'system' ? 'text-center' : ''}>
                {msg.type === 'system' ? (
                  <div className="text-xs text-gray-500 italic">{msg.message}</div>
                ) : (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      {msg.username} • {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-gray-300 bg-dark-700 rounded p-2">
                      {msg.message}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-dark-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim()}
                className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Chat Button (when hidden) */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
          title="Show team chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
};
