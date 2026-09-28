import { useState, useEffect } from 'react';
import {
  Plus,
  Box,
  Edit2,
  UploadCloud,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
  Sparkles,
  Check,
  Info
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast, ToastNotification } from '../utils/toast';
import ModelMeshPreview from '../components/configurator/ModelMeshPreview';
import { SEGMENTATION_PRESETS, parseStructureConfig } from '../utils/meshSegmentation';

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
        <div className="relative w-full h-24 rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#F9F9FB] flex items-center justify-between px-4">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-center shrink-0">
              <Box size={22} className="text-[#C5A059]" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium text-[#232B32] truncate">
                {typeof file === 'string' ? file.split('/').pop().split('?')[0] : file.name}
              </span>
              <span className="text-xs text-[#6B7280]">
                {typeof file === 'string' ? 'Loaded from Cloud' : `${(file.size / (1024 * 1024)).toFixed(2)} MB`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 bg-[#FFFFFF] rounded-full border border-[#E2E8F0] text-[#232B32] hover:text-red-600 transition-colors shrink-0"
            title="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[#E2E8F0] rounded-xl bg-[#FFFFFF] hover:border-[#C5A059] transition-colors cursor-pointer group"
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
          <UploadCloud className="text-[#9CA3AF] group-hover:text-[#C5A059] mb-1.5" size={24} />
          <p className="text-sm text-[#9CA3AF] px-4 text-center">
            Drag & drop or click to upload
          </p>
          <p className="text-xs text-[#9CA3AF] mt-0.5 text-center">
            Max size: 5MB (.glb files from Meshy AI or Blender)
          </p>
        </div>
      )}
    </div>
  );
};

const ModelCard = ({ model, onEdit, onDelete }) => {
  const config = parseStructureConfig(model);
  const presetLabel = SEGMENTATION_PRESETS[config.preset]?.name || 'Standard Countertop';

  return (
    <div className="flex flex-col bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="relative h-40 bg-[#F9F9FB] flex items-center justify-center border-b border-[#E2E8F0]">
        <Box size={48} className="text-[#C5A059] opacity-70" />
        <div className="absolute top-3 right-3">
          <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E2E8F0] text-[#232B32] shadow-xs">
            {presetLabel}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-lg font-semibold text-[#232B32] line-clamp-1 mb-2">{model.name}</h3>

        <div className="flex flex-col gap-1 mt-auto">
          <p className="text-sm text-[#6B7280]">
            Base Length: <span className="font-medium text-[#232B32]">{model.base_length}m</span>
          </p>
          <p className="text-sm text-[#6B7280]">
            Base Width: <span className="font-medium text-[#232B32]">{model.base_width}m</span>
          </p>
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

  // Form State with segmentation controls
  const [formData, setFormData] = useState({
    name: '',
    base_length: '',
    base_width: '',
    model_file: null,
    preset: 'countertop',
    cutoff: 0.82,
  });

  const [autoRecommendation, setAutoRecommendation] = useState(null);
  const [analysisDetails, setAnalysisDetails] = useState(null);

  const fetchModels = async () => {
    Promise.resolve().then(() => setLoading(true));
    const { data, error } = await supabase
      .from('structures')
      .select('*')
      .order('name');

    if (error) {
      showToast('Failed to load models', 'error');
    } else {
      setModels(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingModel(null);
    setAutoRecommendation(null);
    setAnalysisDetails(null);
    setFormData({
      name: '',
      base_length: '',
      base_width: '',
      model_file: null,
      preset: 'countertop',
      cutoff: 0.82,
    });
  };

  const handleEdit = (model) => {
    setEditingModel(model);
    const parsed = parseStructureConfig(model);
    setAutoRecommendation(null);
    setAnalysisDetails(null);
    setFormData({
      name: model.name,
      base_length: model.base_length.toString(),
      base_width: model.base_width.toString(),
      model_file: model.model_url,
      preset: parsed.preset || 'countertop',
      cutoff: parsed.cutoff !== undefined ? parsed.cutoff : 0.82,
    });
    setIsModalOpen(true);
  };

  // Called when 3D geometry engine automatically analyzes the uploaded GLB
  const handleAnalysisComplete = (analysis) => {
    if (!analysis) return;
    setAutoRecommendation(analysis.recommendedPreset);
    setAnalysisDetails(analysis);

    // Auto-configure preset, cutoff, and real-world dimensions directly from 3D geometry bounds
    setFormData((prev) => {
      const next = { ...prev };
      next.preset = analysis.recommendedPreset;
      next.cutoff = analysis.recommendedCutoff || (SEGMENTATION_PRESETS[analysis.recommendedPreset]?.defaultCutoff ?? 0.82);
      if (analysis.bounds?.width) {
        next.base_length = Math.max(0.6, analysis.bounds.width).toFixed(2);
      }
      if (analysis.bounds?.depth) {
        next.base_width = Math.max(0.4, analysis.bounds.depth).toFixed(2);
      }
      return next;
    });
  };

  const purgeCacheForUrl = async (url) => {
    if (!url) return;
    try {
      const cache = await caches.open('sixsigma-assets-v3');
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
      setModels(models.filter((m) => m.id !== deleteTarget.id));
    } catch (error) {
      showToast(error.message || 'Failed to delete model', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const uploadFile = async (file) => {
    if (typeof file === 'string') return file;

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File exceeds 5MB limit');
    }

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

      // Map preset to valid DB structure_type constraint: 'countertop' | 'island' | 'floor' | 'wall'
      let dbStructureType = 'countertop';
      if (formData.preset === 'waterfall') {
        dbStructureType = 'island';
      } else if (formData.preset === 'monolith') {
        const lowerName = formData.name.toLowerCase();
        dbStructureType = lowerName.includes('wall') ? 'wall' : 'floor';
      } else {
        dbStructureType = 'countertop';
      }

      // Attach preset & cutoff as URL query params to preserve exact configuration
      const baseModelUrl = model_url.split('?')[0];
      const finalModelUrl = `${baseModelUrl}?preset=${formData.preset}&cutoff=${formData.cutoff}`;

      const baseLen = parseFloat(formData.base_length) || (analysisDetails?.bounds?.width ? Math.max(0.6, analysisDetails.bounds.width) : 1.8);
      const baseWid = parseFloat(formData.base_width) || (analysisDetails?.bounds?.depth ? Math.max(0.4, analysisDetails.bounds.depth) : 0.8);

      const payload = {
        name: formData.name.trim(),
        base_length: Number(baseLen.toFixed(2)),
        base_width: Number(baseWid.toFixed(2)),
        model_url: finalModelUrl,
        structure_type: dbStructureType,
      };

      if (editingModel) {
        const { error } = await supabase
          .from('structures')
          .update(payload)
          .eq('id', editingModel.id);

        if (error) throw error;
        await purgeCacheForUrl(editingModel.model_url);
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
            <p className="text-[#6B7280] mt-1">
              Manage 3D structures (.glb files from Meshy AI or CAD) with automated stone segmentation
            </p>
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
          <div className="bg-[#FFFFFF] w-full max-w-3xl rounded-2xl shadow-xl flex flex-col my-auto border border-[#E2E8F0] max-h-[92vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0] shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[#232B32]">
                  {editingModel ? 'Edit 3D Model' : 'Add New 3D Model'}
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Smart 3D engine automatically detects model geometry, UVs, and material zones
                </p>
              </div>
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
                {/* 1. Basic Details */}
                {/* 1. Model Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#232B32]">
                    Model Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Modern Kitchen Suite"
                    disabled={submitting}
                    className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all disabled:bg-[#F9F9FB] disabled:opacity-70"
                  />
                </div>

                {/* 2. File Upload Zone */}
                <FileUploadZone
                  label="3D Model File (.glb)"
                  required={true}
                  accept=".glb"
                  file={formData.model_file}
                  onChange={(file) => {
                    const suggestedName = file.name
                      ? file.name
                          .replace(/\.[^/.]+$/, '')
                          .replace(/[_-]/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())
                      : '';
                    setFormData((prev) => ({
                      ...prev,
                      model_file: file,
                      name: prev.name?.trim() ? prev.name : suggestedName,
                    }));
                  }}
                  onRemove={() => {
                    setFormData({ ...formData, model_file: null });
                    setAutoRecommendation(null);
                    setAnalysisDetails(null);
                  }}
                />

                {/* 3. 3D Live Preview & Automatic Configuration */}
                {formData.model_file && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[#E2E8F0]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-bold text-[#232B32]">
                          Live 3D Model Preview
                        </label>
                        {autoRecommendation && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#C5A059] bg-[#C5A059]/10 px-2.5 py-0.5 rounded-full border border-[#C5A059]/30">
                            <Sparkles size={12} /> Auto-Calibrated
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Embedded 3D Canvas */}
                    <ModelMeshPreview
                      file={formData.model_file}
                      preset={formData.preset}
                      cutoff={formData.cutoff}
                      onAnalysisComplete={handleAnalysisComplete}
                    />

                    {/* Automated Status Card */}
                    <div className="flex items-center gap-3.5 p-4 bg-[#F9F9FB] rounded-xl border border-[#E2E8F0] mt-1">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="text-emerald-600" size={20} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#232B32]">
                            Auto-Configured & Ready
                          </span>
                          <span className="text-[11px] font-semibold text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded-full border border-[#C5A059]/20">
                            {analysisDetails?.hasMultipleMeshes
                              ? 'Blender Separated Meshes'
                              : (SEGMENTATION_PRESETS[formData.preset]?.name || 'Standard Countertop')}
                          </span>
                          {formData.base_length && formData.base_width && (
                            <span className="text-[11px] font-medium text-[#232B32] bg-[#FFFFFF] px-2 py-0.5 rounded-full border border-[#E2E8F0]">
                              {formData.base_length}m length × {formData.base_width}m width
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {analysisDetails?.hasMultipleMeshes
                            ? 'Native Blender objects detected — author UV unwraps and materials preserved.'
                            : (SEGMENTATION_PRESETS[formData.preset]?.description || 'Surfaces automatically calibrated from 3D geometry.')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
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
