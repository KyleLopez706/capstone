import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Plus,
  Box,
  Edit2,
  UploadCloud,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Scissors,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast, ToastNotification } from '../utils/toast';

const STRUCTURE_TYPE_LABELS = {
  countertop: 'Kitchen / Vanity Countertop',
  island:     'Island / Bar / Lobby Counter',
  floor:      'Floor Slab',
  wall:       'Wall Cladding / Slab',
};

/**
 * Automatically inspects a GLB file's 3D bounding box to extract
 * its natural length and width in meters.
 */
const analyzeGlbFile = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loader = new GLTFLoader();
        loader.parse(
          e.target.result,
          '',
          (gltf) => {
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = box.getSize(new THREE.Vector3());
            const length = Math.max(size.x, size.z);
            const width = Math.min(size.x, size.z);
            resolve({
              length: Math.max(Number(length.toFixed(2)), 0.1),
              width: Math.max(Number(width.toFixed(2)), 0.1),
            });
          },
          (err) => {
            console.warn('[AdminModels] GLTFLoader parse warning:', err);
            resolve({ length: 2.4, width: 0.6 });
          }
        );
      } catch (err) {
        console.warn('[AdminModels] Error reading GLB:', err);
        resolve({ length: 2.4, width: 0.6 });
      }
    };
    reader.onerror = () => resolve({ length: 2.4, width: 0.6 });
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Automatically categorizes structure type based on model name keywords.
 * Bar counters, lobby reception desks, and freestanding kitchen islands
 * automatically classify as 'island', while walls, floors, and countertops
 * classify appropriately without requiring manual admin input.
 */
const inferStructureType = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('wall') || lower.includes('cladding') || lower.includes('backsplash')) return 'wall';
  if (lower.includes('floor') || lower.includes('tile') || lower.includes('ground')) return 'floor';
  if (
    lower.includes('island') ||
    lower.includes('bar') ||
    lower.includes('lobby') ||
    lower.includes('reception') ||
    lower.includes('desk')
  ) {
    return 'island';
  }
  return 'countertop';
};

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
            Max size: 5MB (.glb files authored in Blender)
          </p>
        </div>
      )}
    </div>
  );
};

const ModelCard = ({ model, onEdit, onDelete }) => {
  const typeLabel = STRUCTURE_TYPE_LABELS[model.structure_type] || 'Countertop';

  return (
    <div className="flex flex-col bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="relative h-40 bg-[#F9F9FB] flex items-center justify-center border-b border-[#E2E8F0]">
        <Box size={48} className="text-[#C5A059] opacity-70" />
        <div className="absolute top-3 right-3">
          <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E2E8F0] text-[#232B32] shadow-xs">
            {typeLabel}
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
        3D model file will be removed from storage.
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

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    base_length: 2.4,
    base_width: 0.6,
    model_file: null,
  });
  const [showGuide, setShowGuide] = useState(true);

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
    setFormData({
      name: '',
      base_length: 2.4,
      base_width: 0.6,
      model_file: null,
    });
  };

  const handleEdit = (model) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      base_length: model.base_length ?? 2.4,
      base_width: model.base_width ?? 0.6,
      model_file: model.model_url,
    });
    setIsModalOpen(true);
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
      showToast('Please provide a model name and select a .glb file', 'error');
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

      const baseLen = parseFloat(formData.base_length) || (editingModel?.base_length ?? 2.4);
      const baseWid = parseFloat(formData.base_width) || (editingModel?.base_width ?? 0.6);
      const structureType = editingModel?.structure_type || inferStructureType(formData.name);

      const payload = {
        name: formData.name.trim(),
        base_length: Number(baseLen.toFixed(2)),
        base_width: Number(baseWid.toFixed(2)),
        structure_type: structureType,
        model_url: model_url.split('?')[0],
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
              Manage 3D structures (.glb files) for the showroom and 3D configurator
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
          <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-2xl shadow-xl flex flex-col my-auto border border-[#E2E8F0] max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0] shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[#232B32]">
                  {editingModel ? 'Edit 3D Model' : 'Add New 3D Model'}
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Upload .glb models prepared with Blender (separated meshes with custom UVs)
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
                    placeholder="e.g. Modern Kitchen Countertop"
                    disabled={submitting}
                    className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all disabled:bg-[#F9F9FB] disabled:opacity-70"
                  />
                </div>

                {/* 2. 3D Model File (.glb) */}
                <FileUploadZone
                  label="3D Model File (.glb)"
                  required={true}
                  accept=".glb"
                  file={formData.model_file}
                  onChange={async (file) => {
                    const suggestedName = file.name
                      ? file.name
                          .replace(/\.[^/.]+$/, '')
                          .replace(/[_-]/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())
                      : '';
                    // Automatically inspect GLB geometry for real-world length & width
                    const dims = await analyzeGlbFile(file);
                    setFormData((prev) => ({
                      ...prev,
                      model_file: file,
                      name: prev.name?.trim() ? prev.name : suggestedName,
                      base_length: dims.length,
                      base_width: dims.width,
                    }));
                  }}
                  onRemove={() => setFormData({ ...formData, model_file: null })}
                />

                {/* 3. Automatic Geometry Detection Summary (Transparent Feedback) */}
                {formData.model_file && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#F9F9FB] rounded-xl border border-[#E2E8F0]">
                    <div className="flex items-center gap-2 text-xs text-[#232B32]">
                      <CheckCircle2 size={16} className="text-[#C5A059] shrink-0" />
                      <span className="font-medium">Auto-measured Dimensions:</span>
                      <span className="font-semibold text-[#232B32]">
                        {formData.base_length}m (L) × {formData.base_width}m (W)
                      </span>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E2E8F0] text-[#6B7280]">
                      Auto-inferred Type: <strong className="text-[#232B32]">{STRUCTURE_TYPE_LABELS[inferStructureType(formData.name)] || 'Countertop'}</strong>
                    </span>
                  </div>
                )}

                {/* 4. Blender 3D Preparation & UV Unwrapping Guide (Collapsible) */}
                <div className="border border-[#E2E8F0] rounded-2xl bg-[#FFFFFF] overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center justify-between p-4 bg-[#F9F9FB] hover:bg-[#F2F2F6] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-center text-[#C5A059] shrink-0">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#232B32]">
                          Blender Preparation Guide for New Models
                        </h4>
                        <p className="text-xs text-[#6B7280]">
                          Bar Countertops, Lobby Desks, Islands & Kitchen Units
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#C5A059] shrink-0">
                      <span>{showGuide ? 'Hide Instructions' : 'View Instructions'}</span>
                      {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {showGuide && (
                    <div className="p-4 sm:p-5 flex flex-col gap-4 text-xs text-[#6B7280] leading-relaxed border-t border-[#E2E8F0] bg-[#FFFFFF]">
                      <p className="text-[#232B32]">
                        The 3D Configurator and Showroom automatically detect separated meshes to apply the client&apos;s chosen <strong>Granite / Stone texture</strong> to countertops and <strong>Wood finishes</strong> to base cabinets. Follow these steps in Blender before exporting:
                      </p>

                      {/* 3 Steps */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F9F9FB] flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 font-semibold text-[#232B32]">
                            <Scissors size={14} className="text-[#C5A059]" />
                            <span>1. Separate Meshes</span>
                          </div>
                          <p className="text-[11px] text-[#6B7280]">
                            In Blender <strong>Edit Mode</strong>, select the top slab faces &rarr; press <kbd className="px-1 py-0.5 bg-white border border-[#E2E8F0] rounded text-[10px] font-mono text-[#232B32]">P</kbd> &rarr; <em>Selection</em>. Keep the stone top separated from the base carcass.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F9F9FB] flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 font-semibold text-[#232B32]">
                            <Layers size={14} className="text-[#C5A059]" />
                            <span>2. UV Unwrap Top</span>
                          </div>
                          <p className="text-[11px] text-[#6B7280]">
                            Select the countertop mesh &rarr; press <kbd className="px-1 py-0.5 bg-white border border-[#E2E8F0] rounded text-[10px] font-mono text-[#232B32]">U</kbd> &rarr; <em>Smart UV Project</em> (Island Margin 0.01). This allows seamless marble and granite veins to map naturally without stretching.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F9F9FB] flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 font-semibold text-[#232B32]">
                            <CheckCircle2 size={14} className="text-[#C5A059]" />
                            <span>3. Name Meshes</span>
                          </div>
                          <p className="text-[11px] text-[#6B7280]">
                            Name objects in the Blender Outliner for instant mapping across the showroom and 3D configurator.
                          </p>
                        </div>
                      </div>

                      {/* Auto-Detection Naming Table */}
                      <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                        <div className="bg-[#F9F9FB] px-3.5 py-2 font-semibold text-[#232B32] text-[11px] border-b border-[#E2E8F0]">
                          Mesh Naming Rules & Model Keywords:
                        </div>
                        <div className="p-3.5 flex flex-col gap-2.5 bg-[#FFFFFF]">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E2E8F0]">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059] shrink-0" />
                              <strong className="text-[#232B32]">Countertop / Top Surface:</strong>
                              <span className="text-[#6B7280]">(Granite / Marble / Quartz texture)</span>
                            </div>
                            <code className="text-[#C5A059] font-mono font-semibold bg-[#F9F9FB] px-2 py-0.5 rounded text-[11px]">
                              stone, countertop, bartop, lobby_top, top
                            </code>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E2E8F0]">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#7F5112] shrink-0" />
                              <strong className="text-[#232B32]">Base / Cabinet / Desk:</strong>
                              <span className="text-[#6B7280]">(Cabinet Wood colors)</span>
                            </div>
                            <code className="text-[#232B32] font-mono font-semibold bg-[#F9F9FB] px-2 py-0.5 rounded text-[11px]">
                              cabinet, base, wood, front, stand, shelf
                            </code>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8] shrink-0" />
                              <strong className="text-[#232B32]">Fixtures & Hardware:</strong>
                              <span className="text-[#6B7280]">(Polished Chrome Steel)</span>
                            </div>
                            <code className="text-[#232B32] font-mono font-semibold bg-[#F9F9FB] px-2 py-0.5 rounded text-[11px]">
                              metal, rail, footrest, bracket, sink, faucet
                            </code>
                          </div>
                        </div>
                      </div>

                      {/* Smart Fail-Safe Notice */}
                      <div className="p-3 bg-[#F9F9FB] rounded-xl border border-[#E2E8F0] flex items-start gap-2.5 text-[11px]">
                        <Info size={15} className="text-[#C5A059] shrink-0 mt-0.5" />
                        <span className="text-[#6B7280]">
                          <strong className="text-[#232B32]">Smart Fail-Safe:</strong> Even if you keep default Blender mesh names (<code className="font-mono text-[#232B32]">Cube</code>, <code className="font-mono text-[#232B32]">Cube.001</code>), the configurator engine automatically measures 3D geometry heights and assigns the highest mesh as the stone countertop and lower meshes as the cabinet base!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
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
