'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, CopilotSource } from '@/lib/types';
import { streamCopilot, getSourceTypeLabel } from '@/lib/api';
import { EditableActions } from './EditableActions';

interface CopilotChatProps {
  patientId: string;
  patientName: string;
  onSourceClick: (source: CopilotSource) => void;
}

const SUGGESTED_PROMPTS = [
  "Why was the Lisinopril dose reduced from 20mg to 10mg?",
  "How has the A1C and blood pressure changed since December?",
  "What medications were adjusted and why?",
  "What are the key findings from the January follow-up visit?",
];

// Helper function to render markdown-style formatting
function renderMarkdown(text: string): React.ReactNode {
  // Split by **bold** patterns and render appropriately
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Remove the ** and render as bold
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function CopilotChat({ patientId, patientName, onSourceClick }: CopilotChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    setInput('');
  };

  const handleSubmit = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder message that will be updated with streamed content
    const assistantMessageId = `assistant-${Date.now()}`;
    let streamedContent = '';
    let streamedSources: CopilotSource[] = [];
    let streamedActions: string[] = [];
    let retrievalMethod = '';

    try {
      // Add initial placeholder message for streaming
      const initialMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        sources: [],
        next_actions: [],
        retrieval_method: undefined,
        isStreaming: true,
      };
      setMessages(prev => [...prev, initialMessage]);

      // Stream the response
      await streamCopilot(
        patientId,
        {
          question: question.trim(),
          max_sources: 5,
        },
        {
          onMetadata: (data) => {
            retrievalMethod = data.retrieval_method;
          },
          onSource: (source) => {
            streamedSources = [...streamedSources, source];
            // Update message with new source
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, sources: streamedSources }
                : msg
            ));
          },
          onDelta: (text) => {
            streamedContent += text;
            // Update message with new content
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: streamedContent }
                : msg
            ));
          },
          onActions: (actions) => {
            streamedActions = actions;
            // Update message with actions
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, next_actions: actions }
                : msg
            ));
          },
          onDone: (data) => {
            // Finalize the message
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    retrieval_method: data.retrieval_method || retrievalMethod,
                    isStreaming: false 
                  }
                : msg
            ));
          },
          onError: (error) => {
            // Update message with error
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    content: `Sorry, I encountered an error: ${error}. Please try again.`,
                    isStreaming: false 
                  }
                : msg
            ));
          },
        }
      );
    } catch (err) {
      // Handle fetch/connection errors
      setMessages(prev => {
        const hasPlaceholder = prev.some(msg => msg.id === assistantMessageId);
        if (hasPlaceholder) {
          return prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
                  isStreaming: false 
                }
              : msg
          );
        } else {
          return [...prev, {
            id: `error-${Date.now()}`,
            role: 'assistant' as const,
            content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
            timestamp: new Date(),
          }];
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Clinical Copilot</h3>
              <p className="text-xs text-gray-500">AI insights for {patientName}</p>
            </div>
          </div>
          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
              title="Clear chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 chat-scroll bg-gradient-to-b from-gray-50/50 to-white">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">Ask about {patientName}</h4>
            <p className="text-sm text-gray-500 mb-6">Get AI-powered clinical insights based on patient records</p>
            
            {/* Suggested Prompts */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Suggested questions</p>
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(prompt)}
                  className="block w-full text-left px-4 py-3 text-sm bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-xl transition-all duration-200 text-gray-700 hover:text-blue-700 shadow-sm hover:shadow"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            // Find the previous user message for context
            let relatedQuestion: string | undefined;
            if (message.role === 'assistant') {
              for (let i = index - 1; i >= 0; i--) {
                if (messages[i].role === 'user') {
                  relatedQuestion = messages[i].content;
                  break;
                }
              }
            }
            return (
              <MessageBubble
                key={message.id}
                message={message}
                patientId={patientId}
                onSourceClick={onSourceClick}
                relatedQuestion={relatedQuestion}
              />
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-5 border-t border-gray-100 bg-white">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the patient..."
            className="flex-1 resize-none rounded-xl border border-gray-200 p-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 max-h-32 shadow-sm transition-all duration-200"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg shadow-blue-200 hover:shadow-blue-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Responses are grounded in patient data. Click sources to view details.
        </p>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  patientId: string;
  onSourceClick: (source: CopilotSource) => void;
  relatedQuestion?: string;
}

function MessageBubble({ message, patientId, onSourceClick, relatedQuestion }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
        isUser 
          ? 'bg-gradient-to-br from-gray-100 to-gray-200'
          : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-purple-200'
      }`}>
        {isUser ? (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
      </div>

      {/* Message Content */}
      <div className={`max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`rounded-2xl p-4 ${
          isUser
            ? 'user-message'
            : 'copilot-message'
        }`}>
          <div className="prose-copilot whitespace-pre-wrap text-sm">
            {message.content ? renderMarkdown(message.content) : null}
            {/* Streaming cursor */}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle rounded-sm"></span>
            )}
            {/* Show loading dots when streaming but no content yet */}
            {message.isStreaming && !message.content && (
              <span className="inline-flex items-center gap-1 ml-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            )}
          </div>
        </div>

        {/* Editable Next Actions - only show when not streaming */}
        {!isUser && message.next_actions && message.next_actions.length > 0 && !message.isStreaming && (
          <EditableActions
            actions={message.next_actions}
            patientId={patientId}
            question={relatedQuestion}
          />
        )}

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 bg-white/80 rounded-xl p-3 border border-gray-100">
            <h5 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-2">
              Sources
              {message.isStreaming && (
                <span className="text-blue-500 text-xs font-normal">(loading...)</span>
              )}
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((source, idx) => (
                <button
                  key={idx}
                  onClick={() => onSourceClick(source)}
                  className={`source-citation ${source.source_type}`}
                >
                  {source.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        {!isUser && message.retrieval_method && !message.isStreaming && (
          <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Retrieved via {message.retrieval_method} search
          </div>
        )}
      </div>
    </div>
  );
}
