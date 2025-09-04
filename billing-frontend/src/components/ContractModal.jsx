import { useState, useEffect } from 'react';
import { contractsApi, clientsApi } from '../services/api';
import { X, Save, FileText, User, Calendar, DollarSign, Clock, Upload, Download, Trash2, File, Eye, AlertCircle, CheckCircle } from 'lucide-react';

// Temporary document storage utility
const TempDocumentStorage = {
  // Store document with file content as base64
  async store(contractId, document) {
    try {
      console.log('TempDocumentStorage.store called with:', contractId, document.name);
      const key = `contract_docs_${contractId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      console.log('Existing documents:', existing.length);
      
      // Convert file to base64 for storage
      const base64Content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          console.log('File converted to base64, size:', reader.result.length);
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(document.file);
      });
      
      const storedDoc = {
        ...document,
        fileContent: base64Content,
        file: null, // Remove file object for storage
        isTemporary: false, // Mark as stored
        stored_at: new Date().toISOString()
      };
      
      existing.push(storedDoc);
      localStorage.setItem(key, JSON.stringify(existing));
      console.log('Document stored successfully, total documents:', existing.length);
      return storedDoc;
    } catch (error) {
      console.error('Error in TempDocumentStorage.store:', error);
      throw error;
    }
  },

  // Retrieve documents for a contract
  async retrieve(contractId) {
    try {
      console.log('TempDocumentStorage.retrieve called with:', contractId);
      const key = `contract_docs_${contractId}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      console.log('Retrieved documents from localStorage:', stored.length);
      
      // Reconstruct file objects from base64
      const reconstructed = stored.map(doc => {
        const reconstructedFile = doc.fileContent ? this.base64ToFile(doc.fileContent, doc.name, doc.type) : null;
        return {
          ...doc,
          file: reconstructedFile,
          isTemporary: false // Mark as stored (not temporary anymore)
        };
      }).filter(doc => doc !== null); // Remove any failed reconstructions
      
      console.log('Reconstructed documents:', reconstructed.length);
      return reconstructed;
    } catch (error) {
      console.error('Error in TempDocumentStorage.retrieve:', error);
      return [];
    }
  },

  // Convert base64 back to File object
  base64ToFile(base64, filename, mimeType) {
    try {
      const byteCharacters = atob(base64.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      // Create a Blob first, then try to create File
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Try to create File, fallback to Blob if File constructor not available
      try {
        return new File([blob], filename, { type: mimeType });
      } catch (fileError) {
        console.log('File constructor not available, using Blob with name property');
        // Add name property to blob as fallback
        blob.name = filename;
        blob.lastModified = Date.now();
        return blob;
      }
    } catch (error) {
      console.error('Error converting base64 to file:', error);
      return null;
    }
  },

  // Delete document
  async delete(contractId, documentId) {
    const key = `contract_docs_${contractId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter(doc => doc.id !== documentId);
    localStorage.setItem(key, JSON.stringify(filtered));
  },

  // Clear all documents for a contract
  async clear(contractId) {
    const key = `contract_docs_${contractId}`;
    localStorage.removeItem(key);
  }
};

const ContractModal = ({ isOpen, onClose, contract, isEditing, onContractSaved }) => {
  const [formData, setFormData] = useState({
    client_id: '',
    contract_number: '',
    description: '',
    total_hours: '',
    hourly_rate: '',
    start_date: '',
    end_date: '',
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClients();
      if (contract) {
        setFormData({
          client_id: contract.client_id || '',
          contract_number: contract.contract_number || '',
          description: contract.description || '',
          total_hours: contract.total_hours || '',
          hourly_rate: contract.hourly_rate || '',
          start_date: contract.start_date || '',
          end_date: contract.end_date || '',
        });
        // Load documents for existing contract - both in edit and view mode
        if (contract.id) {
          console.log('Loading documents for contract in modal:', contract.id, 'isEditing:', isEditing);
          loadDocuments(contract.id);
        }
      } else {
        resetForm();
        setDocuments([]);
      }
      setError(null);
    }
  }, [isOpen, contract]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const response = await clientsApi.getAll();
      if (response.data.success) {
        setClients(response.data.clients);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      contract_number: '',
      description: '',
      total_hours: '',
      hourly_rate: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        total_hours: parseFloat(formData.total_hours) || 0,
        hourly_rate: parseFloat(formData.hourly_rate) || 0,
        client_id: parseInt(formData.client_id),
      };

      // Remove empty end_date
      if (!submitData.end_date) {
        delete submitData.end_date;
      }

      console.log('Submitting contract data:', submitData);
      console.log('Form validation:', {
        client_id: !!submitData.client_id,
        description: !!submitData.description,
        total_hours: submitData.total_hours > 0,
        start_date: !!submitData.start_date
      });

      let response;
      if (isEditing && contract) {
        console.log('Updating contract:', contract.id);
        response = await contractsApi.update(contract.id, submitData);
      } else {
        console.log('Creating new contract');
        response = await contractsApi.create(submitData);
      }
      
      if (response.data.success) {
        const contractId = isEditing ? contract.id : response.data.contract?.id;
        
        // If creating a new contract and there are temporary documents, store them
        if (!isEditing && documents.some(doc => doc.isTemporary) && contractId) {
          try {
            console.log('Storing temporary documents for new contract:', contractId);
            console.log('Documents to store:', documents.filter(doc => doc.isTemporary));
            const temporaryDocs = documents.filter(doc => doc.isTemporary);
            for (const doc of temporaryDocs) {
              if (doc.file) {
                const storedDoc = await TempDocumentStorage.store(contractId, doc);
                console.log('Stored document:', doc.name, 'Result:', storedDoc);
              } else {
                console.log('Document has no file object:', doc);
              }
            }
            console.log('All documents stored successfully in localStorage');
            // Verify storage
            const key = `contract_docs_${contractId}`;
            const verification = localStorage.getItem(key);
            console.log('Verification - localStorage content:', verification);
          } catch (uploadError) {
            console.error('Error storing documents:', uploadError);
            // Don't fail the contract creation if document storage fails
          }
        }
        
        // If editing and there are new temporary documents, store them
        if (isEditing && documents.some(doc => doc.isTemporary) && contractId) {
          try {
            const temporaryDocs = documents.filter(doc => doc.isTemporary);
            for (const doc of temporaryDocs) {
              if (doc.file) {
                await TempDocumentStorage.store(contractId, doc);
                console.log('Stored new document for existing contract:', doc.name);
              }
            }
          } catch (uploadError) {
            console.error('Error storing new documents:', uploadError);
          }
        }
        
        onContractSaved();
        onClose();
      } else {
        console.log('API response error:', response.data);
        setError(response.data.message || 'Error al guardar el contrato');
      }
    } catch (err) {
      console.error('Contract submission error:', err);
      console.log('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        setError('Errores de validación: ' + Object.values(err.response.data.errors).join(', '));
      } else {
        setError('Error al guardar el contrato: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const calculateTotal = () => {
    const hours = parseFloat(formData.total_hours) || 0;
    const rate = parseFloat(formData.hourly_rate) || 0;
    return hours * rate;
  };

  // Document management functions
  const loadDocuments = async (contractId) => {
    try {
      console.log('Loading documents for contract:', contractId);
      
      // Try to load from temporary storage first
      const tempDocs = await TempDocumentStorage.retrieve(contractId);
      console.log('Loaded temporary documents:', tempDocs);
      
      // TODO: Also load from API when available
      // const apiResponse = await contractsApi.getDocuments(contractId);
      // const apiDocs = apiResponse.data.success ? apiResponse.data.documents : [];
      
      // Combine temporary and API documents
      const allDocs = [...tempDocs]; // Later: [...tempDocs, ...apiDocs]
      setDocuments(allDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) {
      console.log('No files provided');
      return;
    }
    
    console.log('Processing files:', files);
    setUploadingDocument(true);
    setError(null);
    
    try {
      const validFiles = [];
      const errors = [];

      for (const file of files) {
        console.log('Validating file:', file.name, file.type, file.size);
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          errors.push(`El archivo "${file.name}" excede el tamaño máximo de 10MB`);
          continue;
        }

        // Validate file type - more permissive validation
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'text/plain'
        ];
        
        // Also check by file extension as fallback
        const fileExtension = file.name.toLowerCase().split('.').pop();
        const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt'];
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
          errors.push(`El archivo "${file.name}" no es de un tipo permitido`);
          continue;
        }

        validFiles.push(file);
      }

      console.log('Valid files:', validFiles.length);
      
      // Show errors if any but still process valid files
      if (errors.length > 0) {
        console.log('Validation errors:', errors);
        setError(errors.join('. '));
        setTimeout(() => setError(null), 5000);
      }

      // Process valid files immediately
      if (validFiles.length > 0) {
        const newDocuments = validFiles.map(file => {
          const newDoc = {
            id: `temp_${Date.now()}_${Math.random()}`,
            name: file.name,
            size: file.size,
            type: file.type || `application/${file.name.split('.').pop()}`,
            uploaded_at: new Date().toISOString(),
            uploaded_by: 'Usuario Actual',
            file: file,
            isTemporary: true // Always start as temporary, will be updated after storage
          };
          console.log('Created document:', newDoc);
          return newDoc;
        });

        setDocuments(prev => {
          const updated = [...prev, ...newDocuments];
          console.log('Updated documents state:', updated);
          return updated;
        });

        // For existing contracts, store immediately in localStorage
        if (contract?.id) {
          console.log('Storing document immediately for existing contract:', contract.id);
          console.log('New documents to store:', newDocuments);
          try {
            for (const doc of newDocuments) {
              console.log('Processing document for storage:', doc.name, 'isTemporary:', doc.isTemporary, 'hasFile:', !!doc.file);
              if (doc.file && doc.isTemporary) {
                console.log('About to call TempDocumentStorage.store for:', doc.name);
                const storedDoc = await TempDocumentStorage.store(contract.id, doc);
                console.log('Immediately stored document:', doc.name, 'Result:', storedDoc);
                // Update the document state to mark as stored
                setDocuments(prev => prev.map(d => 
                  d.id === doc.id ? { ...d, isTemporary: false, fileContent: storedDoc.fileContent } : d
                ));
              } else {
                console.log('Skipping document (no file or not temporary):', doc.name);
              }
            }
          } catch (error) {
            console.error('Error storing document immediately:', error);
            setError('Error al guardar el documento: ' + error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error processing files:', error);
      setError('Error al procesar el documento: ' + error.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      return;
    }

    try {
      const docToDelete = documents.find(doc => doc.id === documentId);
      
      // If document exists in temporary storage, delete it
      if (contract?.id && docToDelete) {
        await TempDocumentStorage.delete(contract.id, documentId);
        console.log('Deleted document from temporary storage:', docToDelete.name);
      }
      
      // If it's a permanent document, delete from server
      if (docToDelete && !docToDelete.isTemporary && !docToDelete.fileContent) {
        // TODO: Implement API call to delete document
        // await contractsApi.deleteDocument(documentId);
      }
      
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Error al eliminar el documento: ' + error.message);
    }
  };

  const handleDownloadDocument = async (document) => {
    try {
      // If document has a file object (temporary or reconstructed from storage)
      if (document.file) {
        const url = URL.createObjectURL(document.file);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.name;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Downloaded document:', document.name);
        return;
      }
      
      // If document has base64 content but no file object
      if (document.fileContent) {
        const a = window.document.createElement('a');
        a.href = document.fileContent;
        a.download = document.name;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        console.log('Downloaded document from base64:', document.name);
        return;
      }
      
      // For permanent documents from server
      if (!document.isTemporary && !document.fileContent) {
        // TODO: Implement actual download from server
        // const response = await contractsApi.downloadDocument(document.id);
        alert(`La descarga desde el servidor aún no está implementada para: ${document.name}`);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Error al descargar el documento: ' + error.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) return <File className="w-5 h-5 text-red-500" />;
    if (mimeType.includes('word')) return <File className="w-5 h-5 text-blue-500" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <File className="w-5 h-5 text-green-500" />;
    if (mimeType.includes('image')) return <File className="w-5 h-5 text-purple-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar Contrato' : contract ? 'Detalles del Contrato' : 'Nuevo Contrato'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Read-only view */}
          {contract && !isEditing ? (
            <div className="space-y-6">
              {/* Contract Header - Clean and Professional */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{contract.contract_number}</h3>
                  <p className="text-sm text-gray-600 mt-1">{contract.client_name}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                  ${contract.status === 'active' ? 'bg-green-50 text-green-800 border border-green-200' : 
                    contract.status === 'completed' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 
                    'bg-red-50 text-red-800 border border-red-200'}`}>
                  {contract.status === 'active' ? 'ACTIVO' : 
                   contract.status === 'completed' ? 'COMPLETADO' : 'CANCELADO'}
                </span>
              </div>

              {/* Key Metrics - Simplified */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Horas</p>
                  <p className="text-xl font-semibold text-gray-900">{contract.total_hours}h</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Utilizadas</p>
                  <p className="text-xl font-semibold text-gray-900">{contract.used_hours || 0}h</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tarifa/Hora</p>
                  <p className="text-sm font-semibold text-gray-900 break-all leading-tight">{formatCurrency(contract.hourly_rate)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Valor Total</p>
                  <p className="text-sm font-semibold text-gray-900 break-all leading-tight">{formatCurrency((contract.total_hours || 0) * (contract.hourly_rate || 0))}</p>
                </div>
              </div>

              {/* Progress Section - Clean */}
              {(contract.used_hours > 0 || contract.billed_amount > 0) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">Progreso</h4>
                  
                  {/* Hours Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Horas</span>
                      <span className="text-sm font-medium text-gray-900">
                        {contract.used_hours || 0} / {contract.total_hours}h ({Math.round(((contract.used_hours || 0) / contract.total_hours) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(((contract.used_hours || 0) / contract.total_hours) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Billing Progress */}
                  {contract.billed_amount > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Facturación</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(contract.billed_amount || 0)} / {formatCurrency((contract.total_hours || 0) * (contract.hourly_rate || 0))}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(((contract.billed_amount || 0) / ((contract.total_hours || 0) * (contract.hourly_rate || 0))) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description - Only if exists and not too long */}
              {contract.description && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-2">Descripción</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{contract.description}</p>
                </div>
              )}

              {/* Dates - Compact */}
              {(contract.start_date || contract.end_date) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">Fechas</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {contract.start_date && (
                      <div>
                        <span className="text-gray-500">Inicio:</span>
                        <p className="font-medium text-gray-900">
                          {new Date(contract.start_date).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    )}
                    {contract.end_date && (
                      <div>
                        <span className="text-gray-500">Fin:</span>
                        <p className="font-medium text-gray-900">
                          {new Date(contract.end_date).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wide">Documentos</h4>
                  <div className="flex space-x-2">
                    <label className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors cursor-pointer">
                      <Upload className="w-3 h-3 mr-1" />
                      SUBIR
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                        onChange={(e) => {
                          console.log('View file input changed:', e.target.files);
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileUpload(Array.from(e.target.files));
                            e.target.value = '';
                          }
                        }}
                        disabled={uploadingDocument}
                      />
                    </label>
                    {contract?.id && (
                      <button
                        onClick={() => {
                          const key = `contract_docs_${contract.id}`;
                          const stored = localStorage.getItem(key);
                          console.log('Debug localStorage:', key, stored);
                          alert(`Documentos en localStorage: ${stored ? JSON.parse(stored).length : 0}`);
                        }}
                        className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                      >
                        DEBUG
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload Zone - Now available for both new and existing contracts */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    Arrastra archivos aquí o haz clic en "SUBIR DOCUMENTO"
                  </p>
                  <p className="text-xs text-gray-500">
                    Formatos soportados: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)
                  </p>
                  {!contract?.id && (
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      Los documentos se subirán después de crear el contrato
                    </p>
                  )}
                </div>

                {/* Documents List */}
                <div className="mt-4 space-y-2">
                  {documents.length === 0 ? (
                    <div className="text-center py-6">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No hay documentos subidos</p>
                      {contract?.id && (
                        <p className="text-xs text-gray-400 mt-2">
                          Debug: Contrato ID {contract.id} - Documentos cargados: {documents.length}
                        </p>
                      )}
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(doc.type)}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(doc.size)} • 
                                Subido el {new Date(doc.uploaded_at).toLocaleDateString('es-CO')} • 
                                por {doc.uploaded_by}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDownloadDocument(doc)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Descargar"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {uploadingDocument && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Subiendo documento...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Edit/Create form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Cliente *
                  </label>
                  {loadingClients ? (
                    <div className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500">
                      Cargando clientes...
                    </div>
                  ) : (
                    <select
                      id="client_id"
                      name="client_id"
                      value={formData.client_id}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar cliente</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} - {client.company || client.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="contract_number" className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Número de Contrato
                  </label>
                  <input
                    type="text"
                    id="contract_number"
                    name="contract_number"
                    value={formData.contract_number}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Se generará automáticamente"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Describe el trabajo a realizar..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="total_hours" className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Total de Horas *
                  </label>
                  <input
                    type="number"
                    id="total_hours"
                    name="total_hours"
                    value={formData.total_hours}
                    onChange={handleInputChange}
                    required
                    step="0.5"
                    min="0"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ejemplo: 120"
                  />
                </div>

                <div>
                  <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Tarifa por Hora
                  </label>
                  <input
                    type="number"
                    id="hourly_rate"
                    name="hourly_rate"
                    value={formData.hourly_rate}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ejemplo: 75.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Total calculation */}
              {formData.total_hours && formData.hourly_rate && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Valor Total del Contrato:</span>
                    <span className="text-xl font-bold text-blue-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              )}

              {/* Documents Section for Form */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Documentos del Contrato
                  </h3>
                  <label className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors cursor-pointer">
                    <Upload className="w-3 h-3 mr-1" />
                    SUBIR DOCUMENTO
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                      onChange={(e) => {
                        console.log('Form file input changed:', e.target.files);
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileUpload(Array.from(e.target.files));
                          e.target.value = '';
                        }
                      }}
                      disabled={uploadingDocument}
                    />
                  </label>
                </div>

                {/* Upload Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    Arrastra archivos aquí o haz clic en "SUBIR DOCUMENTO"
                  </p>
                  <p className="text-xs text-gray-500">
                    Formatos soportados: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)
                  </p>
                  {!contract?.id && (
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      Los documentos se subirán después de crear el contrato
                    </p>
                  )}
                </div>

                {/* Documents List */}
                <div className="mt-4 space-y-2">
                  {documents.length === 0 ? (
                    <div className="text-center py-4">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No hay documentos agregados</p>
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(doc.type)}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>{formatFileSize(doc.size)}</span>
                                {doc.isTemporary && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    TEMPORAL
                                  </span>
                                )}
                                {!doc.isTemporary && doc.fileContent && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    ALMACENADO
                                  </span>
                                )}
                                {!doc.isTemporary && !doc.fileContent && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-800 border border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    SERVIDOR
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!doc.isTemporary && (
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {uploadingDocument && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Procesando documento...</span>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {loading ? 'GUARDANDO...' : 'GUARDAR CONTRATO'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractModal;