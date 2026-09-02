import { useState, useEffect } from 'react';
import { Plus, Box, Edit2, UploadCloud, X, Loader2, Trash2, AlertTriangle, Wand2, ImageIcon } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast, ToastNotification } from '../utils/toast';

const extractDominantColor = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        const step = 4 * 10;
        
        for (let i = 0; i < imageData.length; i += step) {
          if (imageData[i + 3] > 127) {
            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
            count++;
          }
        }
        
        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          
          const hex = '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          }).join('');
          
          resolve(hex);
        } else {
          resolve('#ffffff');
        }
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = objectUrl;
  });
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
        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#F9F9FB] flex flex-col items-center justify-center">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1.5 bg-[#FFFFFF] rounded-full shadow-sm text-[#232B32] hover:text-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#E2E8F0] rounded-xl bg-[#FFFFFF] hover:border-[#C5A059] transition-colors cursor-pointer group"
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
            Max size: 5MB (.jpg, .png, .webp)
          </p>
        </div>
      )}
    </div>
  );
};

const ColorCard = ({ item, onEdit, onDelete }) => {
  return (
    <div className="flex flex-col bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden transition-all">
      <div className="relative h-40 bg-[#F9F9FB]">
        {item.color_url ? (
          <img src={item.color_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#9CA3AF]">
            <ImageIcon size={48} opacity={0.5} />
          </div>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-[#232B32] line-clamp-1">{item.name}</h3>
          <div className="flex items-center gap-1 shrink-0 bg-[#F9F9FB] border border-[#E2E8F0] rounded-full px-2 py-1">
            <div className="w-3 h-3 rounded-full border border-[#E2E8F0]" style={{ backgroundColor: item.hex_code || '#ffffff' }} />
            <span className="text-xs font-mono text-[#6B7280]">{item.hex_code}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E2E8F0]">
          <button
            onClick={() => onEdit(item)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F9F9FB] hover:bg-[#E2E8F0] text-[#232B32] rounded-xl text-sm font-medium transition-colors"
          >
            <Edit2 size={16} /> Edit
          </button>
          
          <button
            onClick={() => onDelete(item)}
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

const DeleteConfirmModal = ({ item, onConfirm, onCancel, isDeleting }) => (
  <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="bg-[#FFFFFF] w-full max-w-sm rounded-2xl shadow-2xl border border-[#E2E8F0] p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-[#232B32] font-bold text-base">Delete Cabinet Color</h3>
          <p className="text-[#6B7280] text-sm mt-0.5">This action cannot be undone.</p>
        </div>
      </div>

      <p className="text-[#232B32] text-sm">
        Are you sure you want to permanently delete{' '}
        <span className="font-semibold">{item.name}</span>? The record and its
        texture file will be removed from storage.
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

export default function AdminCabinetColors() {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, dismissToast } = useToast();
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    hex_code: '#ffffff',
    color_file: null
  });

  const fetchColors = async () => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.resolve().then(() => setLoading(true));
    const { data, error } = await supabase
      .from('cabinet_materials')
      .select('*')
      .order('name');
    
    if (error) {
      showToast('Failed to load cabinet colors', 'error');
    } else {
      setColors(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchColors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      hex_code: '#ffffff',
      color_file: null
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      hex_code: item.hex_code || '#ffffff',
      color_file: item.color_url
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
        .from('cabinet_materials')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      if (deleteTarget.color_url) {
        const filePath = deleteTarget.color_url.split('/showroom-assets/')[1];
        if (filePath) {
          const { error: storageError } = await supabase.storage.from('showroom-assets').remove([filePath]);
          if (storageError) console.warn('Storage delete warning:', storageError.message);
        }
        await purgeCacheForUrl(deleteTarget.color_url);
      }

      showToast('Cabinet color deleted successfully', 'success');
      setColors(colors.filter(c => c.id !== deleteTarget.id));
    } catch (error) {
      showToast(error.message || 'Failed to delete color', 'error');
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
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Only JPG, PNG, or WEBP images are allowed');
    }

    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = 	extures/cabinets__;

    const { error: uploadError } = await supabase.storage
      .from('showroom-assets')
      .upload(fileName, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('showroom-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleAutoColor = async () => {
    if (!formData.color_file) {
      showToast('Please upload an image first', 'error');
      return;
    }
    if (typeof formData.color_file === 'string') {
      showToast('Auto-color only works with newly selected files before saving', 'info');
      return;
    }
    try {
      const hex = await extractDominantColor(formData.color_file);
      setFormData(prev => ({ ...prev, hex_code: hex }));
    } catch (err) {
      showToast('Failed to extract color from image', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.color_file) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setSubmitting(true);
    
    try {
      let color_url = typeof formData.color_file === 'string' 
        ? formData.color_file 
        : null;

      if (!color_url) {
        color_url = await uploadFile(formData.color_file);
      }

      const payload = {
        name: formData.name.trim(),
        hex_code: formData.hex_code,
        color_url
      };

      if (editingItem) {
        const { error } = await supabase
          .from('cabinet_materials')
          .update(payload)
          .eq('id', editingItem.id);
          
        if (error) throw error;
        showToast('Cabinet color updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('cabinet_materials')
          .insert([payload]);
          
        if (error) throw error;
        showToast('Cabinet color added successfully', 'success');
      }

      await fetchColors();
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
            <h1 className="text-2xl md:text-3xl font-bold text-[#232B32]">Cabinet Colors</h1>
            <p className="text-[#6B7280] mt-1">Manage textures and colors for cabinet configurations</p>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#232B32] hover:bg-[#1a2025] text-[#F9F9FB] px-5 py-3 rounded-xl font-medium transition-all shadow-sm"
          >
            <Plus size={20} />
            Add New Color
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-100">
            <Loader2 className="animate-spin text-[#C5A059]" size={32} />
          </div>
        ) : colors.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-100 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-8 text-center">
            <div className="w-16 h-16 bg-[#F9F9FB] rounded-full flex items-center justify-center mb-4">
              <Box size={32} className="text-[#9CA3AF]" />
            </div>
            <h3 className="text-xl font-semibold text-[#232B32] mb-2">No cabinet colors found</h3>
            <p className="text-[#6B7280] max-w-md">
              Upload your first texture image to get started. Images must be under 5MB.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {colors.map((color) => (
              <ColorCard 
                key={color.id} 
                item={color} 
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
                {editingItem ? 'Edit Cabinet Color' : 'Add New Cabinet Color'}
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
                    Color / Texture Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Natural Oak"
                    disabled={submitting}
                    className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all disabled:bg-[#F9F9FB] disabled:opacity-70"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#232B32]">
                    Color Hex Code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg border border-[#E2E8F0] overflow-hidden shrink-0">
                      <input
                        type="color"
                        value={formData.hex_code}
                        onChange={(e) => setFormData({...formData, hex_code: e.target.value})}
                        disabled={submitting}
                        className="w-16 h-16 -m-2 cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                      value={formData.hex_code}
                      onChange={(e) => setFormData({...formData, hex_code: e.target.value})}
                      placeholder="#FFFFFF"
                      disabled={submitting}
                      className="flex-1 border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] font-mono focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all uppercase disabled:bg-[#F9F9FB] disabled:opacity-70"
                    />
                    <div className="relative group flex items-center justify-center">
                      <button
                        type="button"
                        onClick={handleAutoColor}
                        disabled={submitting || !formData.color_file}
                        className="p-3 border border-[#E2E8F0] rounded-xl text-[#6B7280] hover:text-[#C5A059] hover:border-[#C5A059] hover:bg-orange-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
                      >
                        <Wand2 size={20} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#232B32] text-[#F9F9FB] text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-sm z-10">
                        Auto-detect from image
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#232B32]"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-[#E2E8F0] my-2"></div>

                <div className="grid grid-cols-1 gap-6">
                  <FileUploadZone
                    label="Color / Diffuse Map Image"
                    required={true}
                    accept="image/webp,image/png,image/jpeg"
                    file={formData.color_file}
                    onChange={(file) => {
                      setFormData({...formData, color_file: file});
                      if (file && typeof file !== 'string') {
                        extractDominantColor(file).then(hex => {
                          setFormData(prev => ({ ...prev, hex_code: hex }));
                        }).catch(() => {});
                      }
                    }}
                    onRemove={() => setFormData({...formData, color_file: null})}
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
                      {editingItem ? 'Updating...' : 'Uploading...'}
                    </>
                  ) : (
                    <>{editingItem ? 'Save Changes' : 'Add Color'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          item={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
