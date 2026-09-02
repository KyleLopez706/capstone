import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Image as ImageIcon,
  Trash2,
  Edit2,
  UploadCloud,
  X,
  Loader2,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useToast, ToastNotification } from "../utils/toast";
import { getColor } from "colorthief";

const FileUploadZone = ({
  label,
  required,
  accept,
  file,
  onChange,
  onRemove,
}) => {
  const [objectUrl, setObjectUrl] = useState(null);

  const preview = !file ? null : typeof file === "string" ? file : objectUrl;

  useEffect(() => {
    if (file && typeof file !== "string") {
      const url = URL.createObjectURL(file);
      // Defer state update to bypass synchronous setState in effect rule
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
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#E2E8F0]">
          <img
            src={preview}
            alt={label}
            className="w-full h-full object-cover"
          />
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
          <UploadCloud
            className="text-[#9CA3AF] group-hover:text-[#C5A059] mb-2"
            size={24}
          />
          <p className="text-sm text-[#9CA3AF] px-4 text-center">
            Drag & drop or click to upload
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1 text-center">
            Max size: 5MB
          </p>
        </div>
      )}
    </div>
  );
};

const MaterialCard = ({ material, onEdit, onDelete }) => {
  return (
    <div className="flex flex-col bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden transition-all">
      <div className="relative h-48 bg-[#F9F9FB]">
        {material.color_url ? (
          <img
            src={material.color_url}
            alt={material.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#9CA3AF]">
            <ImageIcon size={48} opacity={0.5} />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-[#232B32] line-clamp-1">
            {material.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0 bg-[#F9F9FB] border border-[#E2E8F0] rounded-full px-2 py-1">
            <div
              className="w-3 h-3 rounded-full border border-[#E2E8F0]"
              style={{ backgroundColor: material.hex_code || "#ffffff" }}
            />
            <span className="text-xs font-mono text-[#6B7280]">
              {material.hex_code}
            </span>
          </div>
        </div>

        <p className="text-[#232B32] font-medium mt-auto">
          ₱
          {Number(material.price_per_sqm).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          / m²
        </p>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E2E8F0]">
          <button
            onClick={() => onEdit(material)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F9F9FB] hover:bg-[#E2E8F0] text-[#232B32] rounded-xl text-sm font-medium transition-colors"
          >
            <Edit2 size={16} /> Edit
          </button>

          <button
            onClick={() => onDelete(material)}
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

/* ── Delete Confirmation Modal ── */
const DeleteConfirmModal = ({ material, onConfirm, onCancel, isDeleting }) => (
  <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="bg-[#FFFFFF] w-full max-w-sm rounded-2xl shadow-2xl border border-[#E2E8F0] p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-[#232B32] font-bold text-base">
            Delete Material
          </h3>
          <p className="text-[#6B7280] text-sm mt-0.5">
            This action cannot be undone.
          </p>
        </div>
      </div>

      <p className="text-[#232B32] text-sm">
        Are you sure you want to permanently delete{" "}
        <span className="font-semibold">{material.name}</span>? The material
        record and its image file will be removed from storage.
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
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
        >
          {isDeleting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 size={15} />
              Delete
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

export default function AdminMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, dismissToast } = useToast();

  const extractDominantColor = (file) => {
    if (typeof file === "string" || !file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const color = await getColor(img);
          if (color) {
            setFormData((prev) => ({
              ...prev,
              hex_code: color.hex().toUpperCase(),
            }));
            showToast("success", "AI auto-detected the dominant color!");
          }
        } catch (error) {
          console.error("Color extraction failed:", error);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // material pending deletion
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    price_per_sqm: "",
    hex_code: "#ffffff",
    color_file: null,
  });

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      console.error("Error fetching materials:", err);
      showToast("error", "Failed to fetch materials");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    Promise.resolve().then(() => fetchMaterials());
  }, [fetchMaterials]);

  /* ── Extract Supabase Storage path from a public URL ── */
  const extractStoragePath = (publicUrl) => {
    if (!publicUrl) return null;
    try {
      // Public URLs follow the pattern: .../storage/v1/object/public/<bucket>/<path>
      const marker = "/object/public/showroom-assets/";
      const idx = publicUrl.indexOf(marker);
      if (idx !== -1) {
        return publicUrl.substring(idx + marker.length);
      }
    } catch {
      // If parsing fails, skip storage deletion (non-critical)
    }
    return null;
  };

  /* ── Delete: remove file from Storage then DB record ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // 1. Attempt to delete file from Supabase Storage (best effort)
      const filePath = extractStoragePath(deleteTarget.color_url);
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("showroom-assets")
          .remove([filePath]);
        if (storageError) {
          // Log but don't block — DB record still needs deletion
          console.warn("Storage delete warning:", storageError.message);
        }
      }

      // 2. Delete the database record
      const { error: dbError } = await supabase
        .from("materials")
        .delete()
        .eq("id", deleteTarget.id);

      if (dbError) throw dbError;

      showToast("success", `"${deleteTarget.name}" deleted successfully`);
      setDeleteTarget(null);
      fetchMaterials();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("error", err.message || "Failed to delete material");
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddModal = () => {
    setEditingMaterial(null);
    setFormData({
      name: "",
      price_per_sqm: "",
      hex_code: "#ffffff",
      color_file: null,
    });
    setModalOpen(true);
  };

  const openEditModal = (material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      price_per_sqm: material.price_per_sqm,
      hex_code: material.hex_code || "#ffffff",
      color_file: material.color_url,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!submitting) {
      setModalOpen(false);
    }
  };

  const validateFile = (file) => {
    if (typeof file === "string") return true; // It's an existing URL
    if (!file) return true; // Optional file

    const validTypes = ["image/webp", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      showToast(
        "error",
        `Invalid file type: ${file.name}. Only WEBP, PNG, and JPEG are allowed.`,
      );
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("error", `File too large: ${file.name}. Maximum size is 5MB.`);
      return false;
    }

    return true;
  };

  const uploadFile = async (file, type) => {
    if (!file) return null;
    if (typeof file === "string") return file; // Return existing URL

    const ext = file.name.split(".").pop();
    const sanitizedName = formData.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    const timestamp = Date.now();
    const filePath = `textures/${sanitizedName}_${timestamp}_${type}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("showroom-assets")
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("showroom-assets").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.price_per_sqm || !formData.hex_code) {
      showToast("error", "Please fill in all required fields.");
      return;
    }

    if (!formData.color_file) {
      showToast("error", "Color / Diffuse Map is required.");
      return;
    }

    if (!validateFile(formData.color_file)) {
      return; // Errors shown in validateFile
    }

    setSubmitting(true);

    try {
      const color_url = await uploadFile(formData.color_file, "color");

      const payload = {
        name: formData.name,
        price_per_sqm: Number(formData.price_per_sqm),
        hex_code: formData.hex_code,
        color_url,
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from("materials")
          .update(payload)
          .eq("id", editingMaterial.id);

        if (error) throw error;
        showToast("success", "Design updated successfully");
      } else {
        const { error } = await supabase.from("materials").insert([payload]);

        if (error) throw error;
        showToast("success", "Design added successfully");
      }

      setModalOpen(false);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "An error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full w-full bg-[#F9F9FB] p-6 lg:p-8">
      {toast && <ToastNotification {...toast} onDismiss={dismissToast} />}

      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#232B32]">Materials</h1>
            <p className="text-[#6B7280] text-sm mt-1">
              Manage granite designs, textures, and pricing
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-[#C5A059] hover:brightness-110 text-[#FFFFFF] py-2.5 px-4 rounded-xl font-medium transition-all shadow-sm"
            >
              <Plus size={18} /> Add Design
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#C5A059] mb-4" size={32} />
            <p className="text-[#6B7280]">Loading materials...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-12 text-center shadow-sm">
            <ImageIcon size={48} className="text-[#9CA3AF] mb-4" />
            <h3 className="text-lg font-semibold text-[#232B32] mb-2">
              No materials found
            </h3>
            <p className="text-[#6B7280] max-w-sm mb-6">
              Get started by adding your first granite design with its textures
              and pricing information.
            </p>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-[#F9F9FB] border border-[#E2E8F0] hover:bg-[#E2E8F0] text-[#232B32] py-2.5 px-6 rounded-xl font-medium transition-colors"
            >
              <Plus size={18} /> Add Design
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {materials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onEdit={openEditModal}
                onDelete={(m) => setDeleteTarget(m)}
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-2xl shadow-xl flex flex-col my-auto border border-[#E2E8F0] max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0] shrink-0">
              <h2 className="text-xl font-bold text-[#232B32]">
                {editingMaterial ? "Edit Design" : "Add New Design"}
              </h2>
              <button
                onClick={closeModal}
                disabled={submitting}
                className="text-[#9CA3AF] hover:text-[#232B32] transition-colors p-2 rounded-lg hover:bg-[#F9F9FB] disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#232B32]">
                      Design Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g. Baltic Brown"
                      disabled={submitting}
                      className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all disabled:bg-[#F9F9FB] disabled:opacity-70"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#232B32]">
                      Price per m² (₱) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price_per_sqm}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_per_sqm: e.target.value,
                        })
                      }
                      placeholder="0.00"
                      disabled={submitting}
                      className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all disabled:bg-[#F9F9FB] disabled:opacity-70"
                    />
                  </div>
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
                        onChange={(e) =>
                          setFormData({ ...formData, hex_code: e.target.value })
                        }
                        disabled={submitting}
                        className="w-16 h-16 -m-2 cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                      value={formData.hex_code}
                      onChange={(e) =>
                        setFormData({ ...formData, hex_code: e.target.value })
                      }
                      placeholder="#FFFFFF"
                      disabled={submitting}
                      className="flex-1 border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] font-mono focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all uppercase disabled:bg-[#F9F9FB] disabled:opacity-70"
                    />
                    <div className="relative group flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.color_file) {
                            showToast("error", "Please upload an image first.");
                          } else {
                            extractDominantColor(formData.color_file);
                          }
                        }}
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
                  <p className="text-xs text-[#6B7280]">
                    Used by the AI Quality Engine for color matching.
                  </p>
                </div>

                <div className="h-px w-full bg-[#E2E8F0] my-2"></div>

                <div className="grid grid-cols-1 gap-6">
                  <FileUploadZone
                    label="Color / Diffuse Map"
                    required={true}
                    accept="image/webp,image/png,image/jpeg"
                    file={formData.color_file}
                    onChange={(file) => {
                      setFormData({ ...formData, color_file: file });
                      extractDominantColor(file);
                    }}
                    onRemove={() =>
                      setFormData({ ...formData, color_file: null })
                    }
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
                      {editingMaterial ? "Updating..." : "Uploading..."}
                    </>
                  ) : (
                    <>{editingMaterial ? "Save Changes" : "Add Design"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          material={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
