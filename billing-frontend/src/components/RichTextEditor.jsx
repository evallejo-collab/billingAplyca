import { useState, useRef } from 'react';
import { Bold, Italic, Link, Type, List } from 'lucide-react';

const RichTextEditor = ({ value = '', onChange, placeholder = '', className = '' }) => {
  const textareaRef = useRef(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const handleFormat = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    let newText = value;

    switch (format) {
      case 'bold':
        if (selectedText) {
          newText = value.substring(0, start) + `**${selectedText}**` + value.substring(end);
        } else {
          newText = value.substring(0, start) + '**texto en negrita**' + value.substring(end);
        }
        break;
      case 'italic':
        if (selectedText) {
          newText = value.substring(0, start) + `*${selectedText}*` + value.substring(end);
        } else {
          newText = value.substring(0, start) + '*texto en cursiva*' + value.substring(end);
        }
        break;
      case 'link':
        if (selectedText) {
          setLinkText(selectedText);
          setIsLinkModalOpen(true);
        } else {
          setLinkText('');
          setIsLinkModalOpen(true);
        }
        return;
      case 'list':
        const lines = value.split('\n');
        const startLine = value.substring(0, start).split('\n').length - 1;
        const endLine = value.substring(0, end).split('\n').length - 1;
        
        for (let i = startLine; i <= endLine; i++) {
          if (lines[i] && !lines[i].startsWith('• ')) {
            lines[i] = '• ' + lines[i];
          }
        }
        newText = lines.join('\n');
        break;
    }

    onChange(newText);
    
    // Mantener el foco en el textarea
    setTimeout(() => {
      textarea.focus();
      if (format === 'bold' || format === 'italic') {
        const newStart = start + (selectedText ? format === 'bold' ? 2 : 1 : 0);
        const newEnd = newStart + (selectedText ? selectedText.length : format === 'bold' ? 18 : 17);
        textarea.setSelectionRange(newStart, newEnd);
      }
    }, 0);
  };

  const handleLinkInsert = () => {
    if (!linkUrl) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const displayText = linkText || linkUrl;
    const linkMarkdown = `[${displayText}](${linkUrl})`;
    
    const newText = value.substring(0, start) + linkMarkdown + value.substring(end);
    onChange(newText);
    
    setIsLinkModalOpen(false);
    setLinkText('');
    setLinkUrl('');
    
    setTimeout(() => textarea.focus(), 0);
  };

  return (
    <div className={`border border-gray-300 rounded-md focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => handleFormat('bold')}
          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
          title="Negrita (**texto**)"
        >
          <Bold className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => handleFormat('italic')}
          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
          title="Cursiva (*texto*)"
        >
          <Italic className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => handleFormat('link')}
          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
          title="Enlace"
        >
          <Link className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => handleFormat('list')}
          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
          title="Lista con viñetas"
        >
          <List className="w-4 h-4" />
        </button>
        
        <div className="ml-auto text-xs text-gray-500 flex items-center">
          <Type className="w-3 h-3 mr-1" />
          Texto enriquecido
        </div>
      </div>
      
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border-0 resize-none focus:outline-none text-sm"
        rows={4}
      />
      
      {/* Preview hint */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <strong>Formato:</strong> **negrita** *cursiva* [enlace](url) • listas
        </div>
      </div>

      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Insertar Enlace</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="linkText" className="block text-sm font-medium text-gray-700 mb-1">
                  Texto a mostrar (opcional)
                </label>
                <input
                  id="linkText"
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Texto del enlace"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  URL *
                </label>
                <input
                  id="linkUrl"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://ejemplo.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkText('');
                  setLinkUrl('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLinkInsert}
                disabled={!linkUrl}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                Insertar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;