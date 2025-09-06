import { useState, useEffect } from 'react';
import { ExternalLink, Eye, AlertCircle } from 'lucide-react';

const GoogleDrivePreview = ({ driveUrl, onUrlChange, label = "Enlace de Google Drive" }) => {
  const [previewMode, setPreviewMode] = useState(false);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Function to extract file ID from Google Drive URL
  const extractFileId = (url) => {
    if (!url) return null;
    
    console.log('Extracting file ID from:', url);
    
    // Handle different Google Drive URL formats
    const patterns = [
      // Standard sharing URLs
      /\/file\/d\/([a-zA-Z0-9-_]{10,})/,              // /file/d/FILE_ID
      /\/document\/d\/([a-zA-Z0-9-_]{10,})/,           // /document/d/FILE_ID  
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]{10,})/,       // /spreadsheets/d/FILE_ID
      /\/presentation\/d\/([a-zA-Z0-9-_]{10,})/,       // /presentation/d/FILE_ID
      /\/forms\/d\/([a-zA-Z0-9-_]{10,})/,              // /forms/d/FILE_ID
      
      // Query parameter formats
      /[?&]id=([a-zA-Z0-9-_]{10,})/,                   // ?id=FILE_ID or &id=FILE_ID
      /\/open\?id=([a-zA-Z0-9-_]{10,})/,               // /open?id=FILE_ID
      
      // Alternative formats
      /\/view\?id=([a-zA-Z0-9-_]{10,})/,               // /view?id=FILE_ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        console.log('File ID found:', match[1]);
        return match[1];
      }
    }
    
    console.log('No file ID found');
    return null;
  };

  // Function to get preview URL
  const getPreviewUrl = (url) => {
    const fileId = extractFileId(url);
    if (!fileId) return null;
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  // Function to get direct view URL
  const getViewUrl = (url) => {
    const fileId = extractFileId(url);
    if (!fileId) return null;
    return `https://drive.google.com/file/d/${fileId}/view`;
  };

  // Validate if URL is a valid Google Drive URL
  const isValidGoogleDriveUrl = (url) => {
    if (!url) return true; // Empty is valid
    
    console.log('Validating URL:', url);
    
    // Check if it's a Google Drive or Google Docs URL
    const isGoogleDrive = url.includes('drive.google.com') || 
                         url.includes('docs.google.com') ||
                         url.includes('sheets.google.com') ||
                         url.includes('slides.google.com');
    
    if (!isGoogleDrive) {
      console.log('Not a Google Drive URL');
      return false;
    }
    
    // Try to extract file ID - if successful, it's valid
    const fileId = extractFileId(url);
    const isValid = fileId !== null && fileId.length >= 10;
    
    console.log('Validation result:', isValid, 'File ID:', fileId);
    return isValid;
  };

  const fileId = extractFileId(driveUrl);
  const isValid = isValidGoogleDriveUrl(driveUrl);
  
  // Fetch document info when URL changes
  useEffect(() => {
    if (isValid && fileId && driveUrl) {
      fetchDocumentInfo(fileId).then(setDocumentInfo);
    } else {
      setDocumentInfo(null);
    }
  }, [driveUrl, fileId, isValid]);

  // Function to fetch real document metadata
  const fetchDocumentInfo = async (fileId) => {
    if (!fileId) return null;
    
    setLoading(true);
    try {
      // Method 1: Try to get document title from Open Graph meta tags
      const previewUrl = `https://drive.google.com/file/d/${fileId}/view`;
      
      // Use a CORS proxy to fetch the page and extract title
      const corsProxy = 'https://api.allorigins.win/get?url=';
      const targetUrl = encodeURIComponent(previewUrl);
      
      const response = await fetch(`${corsProxy}${targetUrl}`);
      
      if (response.ok) {
        const data = await response.json();
        const html = data.contents;
        
        // Extract title from various possible sources
        let title = null;
        
        // Try Open Graph title
        const ogTitleMatch = html.match(/<meta property="og:title" content="(.*?)"/i);
        if (ogTitleMatch) {
          title = ogTitleMatch[1];
        }
        
        // Try regular title tag
        if (!title) {
          const titleMatch = html.match(/<title>(.*?)<\/title>/i);
          if (titleMatch) {
            title = titleMatch[1]
              .replace(' - Google Docs', '')
              .replace(' - Google Sheets', '')
              .replace(' - Google Slides', '')
              .replace(' - Google Drive', '')
              .trim();
          }
        }
        
        // Clean up the title
        if (title && title !== 'Google Docs' && title !== 'Google Drive' && title.length > 0) {
          return {
            name: title,
            type: getDocumentTypeFromUrl(driveUrl),
            iconUrl: null,
            webViewLink: previewUrl
          };
        }
      }
      
      // Fallback to type-based naming
      const type = getDocumentTypeFromUrl(driveUrl);
      return {
        name: `${type} compartido`,
        type: type,
        iconUrl: null,
        webViewLink: previewUrl
      };
      
    } catch (error) {
      console.log('Error fetching document info:', error);
      
      // Final fallback
      const type = getDocumentTypeFromUrl(driveUrl);
      return {
        name: `${type} compartido`,
        type: type,
        iconUrl: null,
        webViewLink: `https://drive.google.com/file/d/${fileId}/view`
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to determine document type from URL
  const getDocumentTypeFromUrl = (url) => {
    if (!url) return 'Archivo';
    if (url.includes('/document/')) return 'Documento';
    if (url.includes('/spreadsheets/')) return 'Hoja de cálculo';
    if (url.includes('/presentation/')) return 'Presentación';
    if (url.includes('/forms/')) return 'Formulario';
    return 'Archivo';
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} *
        </label>
        
        {/* Show embed preview if URL is valid */}
        {isValid && driveUrl ? (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center space-x-3">
              {/* Google Drive Icon */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center border">
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    {/* Google Drive official logo */}
                    <path fill="#FFC107" d="M17 6L31 6L44 26L30 26z"/>
                    <path fill="#1976D2" d="M9.875 42L16.938 30L45.063 30L38 42z"/>
                    <path fill="#4CAF50" d="M3 26L17 6L23 18L9 38z"/>
                  </svg>
                </div>
              </div>
              
              {/* Document info */}
              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                    <p className="text-sm text-gray-500">Cargando...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {documentInfo?.name || getDocumentTypeFromUrl(driveUrl)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {documentInfo?.type || 'Google Drive'}
                    </p>
                  </>
                )}
              </div>
              
              {/* Edit button */}
              <button
                type="button"
                onClick={() => onUrlChange('')}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
                title="Cambiar enlace"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* URL input field */
          <>
            <input
              type="url"
              value={driveUrl || ''}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="Pega el enlace de Google Drive aquí..."
              className={`w-full rounded-md border px-3 py-2 text-sm focus:ring-1 ${
                isValid 
                  ? 'border-gray-300 focus:border-blue-500 focus:ring-blue-500' 
                  : 'border-red-300 focus:border-red-500 focus:ring-red-500'
              }`}
            />
            
            {!isValid && driveUrl && (
              <div className="mt-1 flex items-center text-red-600 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                URL de Google Drive inválida
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {isValid && fileId && (
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Eye className="w-3 h-3 mr-1" />
            {previewMode ? 'Ocultar' : 'Preview'}
          </button>
          
          <a
            href={getViewUrl(driveUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Abrir
          </a>
        </div>
      )}

      {/* Preview iframe */}
      {previewMode && isValid && fileId && (
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-600">Preview del Documento</p>
          </div>
          <iframe
            src={getPreviewUrl(driveUrl)}
            className="w-full h-96"
            frameBorder="0"
            title="Google Drive Preview"
          />
        </div>
      )}

    </div>
  );
};

export default GoogleDrivePreview;