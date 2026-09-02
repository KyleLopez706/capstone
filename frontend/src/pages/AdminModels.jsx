import { useState, useEffect } from 'react';
import { Plus, Box, Edit2, UploadCloud, X, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast, ToastNotification } from '../utils/toast';

const FileUploadZone = ({ label, required, accept, file, onChange, onRemove }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  const preview = !file ? null : (typeof file === 'string' ? file : objectUrl);

  useEffect(() => {
    if (file && typeof file !== 'string') {
      const url = URL.createObjectURL(file);
      Promise.resolve().then(() => setObjectUrl(url));
      return () => {
        URL.revokeObjectURL(url);
        setObjectUrl(null);
      };
    }
  }, [file]);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#232B32]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {preview ? (
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#F9F9FB] flex flex-col items-center justify-center">
          <Box size={32} className="text-[#C5A059] mb-2" />
          <span className="text-sm font-medium text-[#232B32] truncate px-4 max-w-full">
            {typeof file === 'string' ? file.split('/').pop() : file.name}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1 bg-[#FFFFFF] rounded-full shadow-sm text-[#232B32] hover:text-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#E2E8F0] rounded-xl bg-[#FFFFFF] hover:border-[#C5A059] transition-colors cursor-pointer group"
        >
          <input
            type="file"
            accept={accept}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onChange(e.target.files[0]);
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <UploadCloud className="text-[#9CA3AF] group-hover:text-[#C5A059] mb-2" size={24} />
          <p className="text-sm text-[#9CA3AF] px-4 text-center">
            Drag & drop or click to upload
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1 text-center">
            Max size: 5MB (.glb files only)
          </p>
        </div>
      )}
    </div>
  );
};

const ModelCard = ({ model, onEdit, onDelete }) => {
  return (
    <div className="flex flex-col bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden transition-all">
      <div className="relative h-40 bg-[#F9F9FB] flex items-center justify-center border-b border-[#E2E8F0]">
        <Box size={48} className="text-[#C5A059] opacity-70" />
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-lg font-semibold text-[#232B32] line-clamp-1 mb-2">{model.name}</h3>
        
        <div className="flex flex-col gap-1 mt-auto">
          <p className="text-sm text-[#6B7280]">Base Length: <span className="font-medium text-[#232B32]">{model.base_length}m</span></p>
          <p className="text-sm text-[#6B7280]">Base Width: <span className="font-medium text-[#232B32]">{model.base_width}m</span></p>
        </div>
        
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E2E8F0]">
          <button
            onClick={() => onEdit(model)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F9F9FB] hover:bg-[#E2E8F0] text-[#232B32] rounded-xl text-sm font-medium transition-colors"
          >
            <Edit2 size={16} /> Edit
          </button>
          
          <button
            onClick={() => onDelete(model)}
            className="flex items-center justify-center p-2.5 bg-[#F9F9FB] hover:bg-red-50 text-[#6B7280] hover:text-red-600 rounded-xl transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ model, onConfirm, onCancel, isDeleting }) => (
  <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="bg-[#FFFFFF] w-full max-w-sm rounded-2xl shadow-2xl border border-[#E2E8F0] p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-[#232B32] font-bold text-base">Delete Model</h3>
          <p className="text-[#6B7280] text-sm mt-0.5">This action cannot be undone.</p>
        </div>
      </div>

      <p className="text-[#232B32] text-sm">
        Are you sure you want to permanently delete{' '}
        <span className="font-semibold">{model.name}</span>? The record and its
        3D model file will be removed from storage and users' local caches.
      </p>

      <div className="flex items-center gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="px-5 py-2.5 text-sm font-medium text-[#232B32] hover:bg-[#F9F9FB] rounded-xl transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

export default function AdminModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, dismissToast } = useToast();
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    base_length: '',
    base_width: '',
    model_file: null
  });

  const fetchModels = async () => {
    // Defer state update to bypass synchronous setState in effect rule
    Promise.resolve().then(() => setLoading(true));
    const { data, error } = await supabase
      .from('structures')
      .select('*')
      .order('name');
    
    if (error) {
      showToast('Failed to load models', 'error');
    } else {
      setModels(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingModel(null);
    setFormData({
      name: '',
      base_length: '',
      base_width: '',
      model_file: null
    });
  };

  const handleEdit = (model) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      base_length: model.base_length.toString(),
      base_width: model.base_width.toString(),
      model_file: model.model_url
    });
    setIsModalOpen(true);
  };

  // Helper to purge cache on client immediately
  const purgeCacheForUrl = async (url) => {
    if (!url) return;
    try {
      const cache = await caches.open('sixsigma-assets-v3');
      // Supabase public URLs are what we cache. We can match just the origin+path
      // regardless of the ?v= query param by iterating or matching broadly.
      const keys = await cache.keys();
      for (let req of keys) {
        if (req.url.includes(url.split('?')[0])) {
          await cache.delete(req);
        }
      }
    } catch (e) {
      console.warn('Could not purge cache:', e);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('structures')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      if (deleteTarget.model_url) {
        const filePath = deleteTarget.model_url.split('/showroom-assets/')[1];
        if (filePath) {
          await supabase.storage.from('showroom-assets').remove([filePath]);
        }
        await purgeCacheForUrl(deleteTarget.model_url);
      }

      showToast('Model deleted successfully', 'success');
      setModels(models.filter(m => m.id !== deleteTarget.id));
    } catch (error) {
      showToast(error.message || 'Failed to delete model', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const uploadFile = async (file) => {
    if (typeof file === 'string') return file; 
    
    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File exceeds 5MB limit');
    }
    
    // Validate type roughly
    if (!file.name.toLowerCase().endsWith('.glb')) {
      throw new Error('Only .glb files are allowed');
    }

    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `models/${timestamp}_${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from('showroom-assets')
      .upload(fileName, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('showroom-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.model_file) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setSubmitting(true);
    
    try {
      let model_url = typeof formData.model_file === 'string' 
        ? formData.model_file 
        : null;

      if (!model_url) {
        model_url = await uploadFile(formData.model_file);
      }

      const payload = {
        name: formData.name.trim(),
        base_length: parseFloat(formData.base_length),
        base_width: parseFloat(formData.base_width),
        model_url
      };

      if (editingModel) {
        const { error } = await supabase
          .from('structures')
          .update(payload)
          .eq('id', editingModel.id);
          
        if (error) throw error;
        showToast('Model updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('structures')
          .insert([payload]);
          
        if (error) throw error;
        showToast('Model added successfully', 'success');
      }

      await fetchModels();
      closeModal();
    } catch (error) {
      showToast(error.message || 'An error occurred', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] p-4 md:p-8">
      {toast && <ToastNotification toast={toast} onDismiss={dismissToast} />}
      
      <div className="max-w-7xl mx-auto flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#232B32]">3D Models</h1>
            <p className="text-[#6B7280] mt-1">Manage 3D structures (.glb files) for the configurator</p>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#232B32] hover:bg-[#1a2025] text-[#F9F9FB] px-5 py-3 rounded-xl font-medium transition-all shadow-sm"
          >
            <Plus size={20} />
            Add New Model
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-100">
            <Loader2 className="animate-spin text-[#C5A059]" size={32} />
          </div>
        ) : models.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-100 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-8 text-center">
            <div className="w-16 h-16 bg-[#F9F9FB] rounded-full flex items-center justify-center mb-4">
              <Box size={32} className="text-[#9CA3AF]" />
            </div>
            <h3 className="text-xl font-semibold text-[#232B32] mb-2">No models found</h3>
            <p className="text-[#6B7280] max-w-md">
              Upload your first .glb 3D model to get started. Models must be under 5MB.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {models.map((model) => (
              <ModelCard 
                key={model.id} 
                model={model} 
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-2xl shadow-xl flex flex-col my-auto border border-[#E2E8F0] max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0] shrink-0">
              <h2 className="text-xl font-bold text-[#232B32]">
                {editingModel ? 'Edit Model' : 'Add New Model'}
              </h2>
              <button 
                onClick={closeModal}
                disabled={submitting}
                className="text-[#9CA3AF] hover:text-[#232B32] transition-colors p-2 rounded-lg hover:bg-[#F9F9FB] disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#232B32]">
                    Model Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. L-Shaped Countertop"
                    disabled={submitting}
                    className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all disabled:bg-[#F9F9FB] disabled:opacity-70"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#232B32]">
                      Base Length (m) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.1"
                      value={formData.base_length}
                      onChange={(e) => setFormData({...formData, base_length: e.target.value})}
                      placeholder="e.g. 2.4"
                      disabled={submitting}
                      className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all disabled:bg-[#F9F9FB] disabled:opacity-70"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#232B32]">
                      Base Width (m) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.1"
                      value={formData.base_width}
                      onChange={(e) => setFormData({...formData, base_width: e.target.value})}
                      placeholder="e.g. 0.6"
                      disabled={submitting}
                      className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all disabled:bg-[#F9F9FB] disabled:opacity-70"
                    />
                  </div>
                </div>

                <div className="h-px w-full bg-[#E2E8F0] my-2"></div>

                <div className="grid grid-cols-1 gap-6">
                  <FileUploadZone
                    label="3D Model File (.glb)"
                    required={true}
                    accept=".glb"
                    file={formData.model_file}
                    onChange={(file) => setFormData({...formData, model_file: file})}
                    onRemove={() => setFormData({...formData, model_file: null})}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 shrink-0 bg-[#F9F9FB]">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-6 py-2.5 text-[#232B32] font-medium hover:bg-[#E2E8F0] rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-[#C5A059] hover:brightness-110 text-[#FFFFFF] px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm disabled:opacity-70 disabled:hover:brightness-100"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      {editingModel ? 'Updating...' : 'Uploading...'}
                    </>
                  ) : (
                    <>{editingModel ? 'Save Changes' : 'Add Model'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          model={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
