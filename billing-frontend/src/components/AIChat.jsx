import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { processAIQuery, getFallbackResponse } from '../services/aiChatApi';
import { useAuth } from '../context/AuthContext';

// Simple markdown-like formatter for chat messages
const MessageContent = ({ content }) => {
  const formatMessage = (text) => {
    // Split by lines first
    const lines = text.split('\n');
    const elements = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines but add spacing
      if (!line.trim()) {
        elements.push(<div key={i} className="h-2"></div>);
        continue;
      }
      
      // Handle numbered lists (1. 2. 3.)
      const numberedMatch = line.match(/^(\d+\.\s)(.*)$/);
      if (numberedMatch) {
        elements.push(
          <div key={i} className="flex mb-1">
            <span className="font-bold text-violet-700 mr-2">{numberedMatch[1]}</span>
            <span className="flex-1">{formatInlineText(numberedMatch[2])}</span>
          </div>
        );
        continue;
      }
      
      // Handle bullet points (• or -)
      const bulletMatch = line.match(/^[•\-]\s(.*)$/);
      if (bulletMatch) {
        elements.push(
          <div key={i} className="flex mb-1">
            <span className="text-violet-700 font-bold mr-2">•</span>
            <span className="flex-1">{formatInlineText(bulletMatch[1])}</span>
          </div>
        );
        continue;
      }
      
      // Regular paragraph
      elements.push(
        <div key={i} className="mb-2">
          {formatInlineText(line)}
        </div>
      );
    }
    
    return elements;
  };
  
  const formatInlineText = (text) => {
    // Handle bold text **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={index} className="font-bold text-violet-700">
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  return <div className="text-sm">{formatMessage(content)}</div>;
};

const AIChat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: '¡Hola! Soy tu asistente de IA. Puedo ayudarte con consultas sobre tiempo, contratos, clientes y proyectos. ¿En qué puedo ayudarte?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearChatHistory = () => {
    setMessages([
      {
        id: 1,
        type: 'bot',
        content: '¡Hola! Soy tu asistente de IA. Puedo ayudarte con consultas sobre tiempo, contratos, clientes y proyectos. ¿En qué puedo ayudarte?',
        timestamp: new Date()
      }
    ]);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    clearChatHistory();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Try AI processing first, fallback to simple responses
      let responseContent;
      
      // Temporarily disable OpenAI due to build issues, use fallback only
      if (false && import.meta.env.VITE_OPENAI_API_KEY) {
        const aiResponse = await processAIQuery(inputMessage, user?.id);
        responseContent = aiResponse.success ? aiResponse.response : aiResponse.error;
      } else {
        // Fallback to simple pattern matching
        responseContent = getFallbackResponse(inputMessage);
      }

      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: responseContent,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Try fallback response as last resort
      let errorContent;
      try {
        errorContent = getFallbackResponse(inputMessage);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        errorContent = 'Lo siento, ocurrió un error. Por favor intenta de nuevo.';
      }
      
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Chat Widget Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-violet-600 text-white rounded-full shadow-lg hover:bg-violet-700 transition-all duration-200 flex items-center justify-center z-40 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-violet-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <h3 className="font-semibold">Asistente IA</h3>
            </div>
            <button
              onClick={handleCloseChat}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'bot' && (
                      <Bot className="w-4 h-4 mt-0.5 text-violet-600" />
                    )}
                    {message.type === 'user' && (
                      <User className="w-4 h-4 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {message.type === 'bot' ? (
                        <MessageContent content={message.content} />
                      ) : (
                        <div className="text-sm">{message.content}</div>
                      )}
                      <span className={`text-xs mt-1 block ${
                        message.type === 'user' ? 'text-violet-200' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 border border-gray-200 rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-violet-600" />
                    <div className="flex items-center space-x-1">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                      <span className="text-sm text-gray-500">Procesando...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex space-x-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pregúntame sobre tiempo, contratos, clientes..."
                className="flex-1 p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChat;