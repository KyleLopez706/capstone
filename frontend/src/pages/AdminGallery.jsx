import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  UploadCloud,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useToast, ToastNotification } from "../utils/toast";

// Import bundled assets for one-click initial seeding
import lobbyCounterImg from "../assets/lobby counter.jpg";
import lobbyWallCladdingImg from "../assets/lobby wall cladding.jpg";
import lobbyWallImg from "../assets/lobby wall.jpg";
import towerStoneImg from "../assets/tower stone cladding.jpg";
import barCountertopImg from "../assets/bar countertop.jpg";
import kitchenIslandImg from "../assets/kitchen-island-blue-pearl.jpg";
import wallCladdingProjectImg from "../assets/wall cladding project.jpg";
import whiteCountertopImg from "../assets/white countertop.jpg";
import brCountertopImg from "../assets/B & R countertop.jpg";
import countertopsImg from "../assets/countertops.jpg";

export const DEFAULT_GALLERY_PROJECTS = [
  {
    id: "lobby-counter",
    name: "Yellow Onyx Lobby Counter",
    image: lobbyCounterImg,
    description:
      "Yellow onyx reception counter featuring rare translucent properties and glowing golden veins for a warm focal point.",
  },
  {
    id: "lobby-wall-cladding",
    name: "Premium Lobby Cladding",
    image: lobbyWallCladdingImg,
    description:
      "Expansive travertine gray stone slabs with linear veining, visually widening the hall while enduring high traffic.",
  },
  {
    id: "lobby-wall",
    name: "Beige Travertine Wall",
    image: lobbyWallImg,
    description:
      "Beige travertine brings earthy warmth and softens acoustics, offering a calming, neutral backdrop.",
  },
  {
    id: "tower-cladding",
    name: "Travertine Tower Cladding",
    image: towerStoneImg,
    description:
      "Gray travertine exterior cladding known for weather resistance and natural banding that adds organic texture.",
  },
  {
    id: "bar-countertop",
    name: "Golden Yellow Granite Bar",
    image: barCountertopImg,
    description:
      "Golden yellow granite bar surface offering high durability and vibrant mineral speckles.",
  },
  {
    id: "kitchen-island",
    name: "Blue Pearl Granite Kitchen Island",
    image: kitchenIslandImg,
    description:
      "Blue Pearl granite kitchen island featuring silver-blue metallic flakes for a striking contrast and lasting resilience.",
  },
  {
    id: "wall-cladding-project",
    name: "Decorative Wall Cladding",
    image: wallCladdingProjectImg,
    description:
      "Intricate mosaic wall cladding showcasing a stunning blend of textures and colors, elevating the room's aesthetic.",
  },
  {
    id: "white-countertop",
    name: "Pristine White Countertop",
    image: whiteCountertopImg,
    description:
      "Sleek white countertop paired with warm wood cabinetry, offering a modern and minimalist design.",
  },
  {
    id: "br-countertop",
    name: "Modern Bathroom Vanity",
    image: brCountertopImg,
    description:
      "Elegant bathroom vanity featuring a dark polished surface and contrasting vessel sink.",
  },
  {
    id: "countertops",
    name: "Expansive Kitchen Surfaces",
    image: countertopsImg,
    description:
      "Extensive kitchen countertops in speckled granite, providing a durable and stylish workspace.",
  },
];

/* ── File Upload Zone ── */
const FileUploadZone = ({ label, required, accept, file, onChange, onRemove }) => {
  const [objectUrl, setObjectUrl] = useState(null);
  const preview = !file ? null : typeof file === "string" ? file : objectUrl;

  useEffect(() => {
    if (file && typeof file !== "string") {
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
        <div className="relative w-full h-48 rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#F9F9FB] flex flex-col items-center justify-center">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-3 right-3 p-1.5 bg-[#FFFFFF] rounded-full shadow-md text-[#232B32] hover:text-red-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#E2E8F0] rounded-xl bg-[#FFFFFF] hover:border-[#C5A059] transition-colors cursor-pointer group p-4 text-center"
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
          <UploadCloud className="text-[#9CA3AF] group-hover:text-[#C5A059] mb-2 transition-colors" size={28} />
          <p className="text-sm text-[#232B32] font-medium">Drag &amp; drop or click to upload</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Allowed formats: PNG, JPEG, WEBP (under 5MB)</p>
        </div>
      )}
    </div>
  );
};

/* ── Project Card ── */
const GalleryCard = ({ item, onEdit, onDelete }) => {
  return (
    <div className="flex flex-col bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="relative h-52 bg-[#F9F9FB] overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#9CA3AF]">
            <ImageIcon size={48} opacity={0.5} />
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-[#232B32] line-clamp-1 mb-2">
          {item.name}
        </h3>
        <p className="text-sm text-[#6B7280] line-clamp-3 leading-relaxed flex-1">
          {item.description}
        </p>

        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[#E2E8F0]">
          <button
            onClick={() => onEdit(item)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F9F9FB] hover:bg-[#E2E8F0] text-[#232B32] rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            <Edit2 size={16} /> Edit
          </button>

          <button
            onClick={() => onDelete(item)}
            className="flex items-center justify-center p-2.5 bg-[#F9F9FB] hover:bg-red-50 text-[#6B7280] hover:text-red-600 rounded-xl transition-colors cursor-pointer"
            title="Delete Project"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Delete Confirmation Modal ── */
const DeleteConfirmModal = ({ item, onConfirm, onCancel, isDeleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="bg-[#FFFFFF] w-full max-w-sm rounded-2xl shadow-2xl border border-[#E2E8F0] p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-[#232B32] font-bold text-base">Delete Gallery Project</h3>
          <p className="text-[#6B7280] text-sm mt-0.5">This action cannot be undone.</p>
        </div>
      </div>

      <p className="text-[#232B32] text-sm">
        Are you sure you want to permanently delete{" "}
        <span className="font-semibold">{item.name}</span>? The project and its image will be removed from storage.
      </p>

      <div className="flex items-center gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="px-5 py-2.5 text-sm font-medium text-[#232B32] hover:bg-[#F9F9FB] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_file: null,
  });

  const fetchGalleryItems = async () => {
    Promise.resolve().then(() => setLoading(true));
    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch gallery items:", error.message);
        setItems([]);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      console.error("Error fetching gallery items:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGalleryItems();
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      name: "",
      description: "",
      image_file: null,
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      image_file: item.image_url,
    });
    setIsModalOpen(true);
  };

  const uploadFile = async (file) => {
    if (typeof file === "string") return file;

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File exceeds the 5MB size limit.");
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Only PNG, JPEG, or WEBP images are allowed.");
    }

    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `gallery/gallery_${timestamp}_${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from("showroom-assets")
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("showroom-assets").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("gallery_items")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      // Also remove from Supabase Storage if it was uploaded there
      if (deleteTarget.image_url && deleteTarget.image_url.includes("/showroom-assets/")) {
        const filePath = deleteTarget.image_url.split("/showroom-assets/")[1];
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from("showroom-assets")
            .remove([filePath]);
          if (storageError) console.warn("Storage delete warning:", storageError.message);
        }
      }

      showToast("Gallery project deleted successfully", "success");
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    } catch (error) {
      showToast(error.message || "Failed to delete gallery item", "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Please provide a project title", "error");
      return;
    }
    if (!formData.description.trim()) {
      showToast("Please provide a project description", "error");
      return;
    }
    if (!formData.image_file) {
      showToast("Please upload an image for the project", "error");
      return;
    }

    setSubmitting(true);

    try {
      let image_url =
        typeof formData.image_file === "string" ? formData.image_file : null;

      if (!image_url) {
        image_url = await uploadFile(formData.image_file);
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        image_url,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("gallery_items")
          .update(payload)
          .eq("id", editingItem.id);

        if (error) throw error;
        showToast("Gallery project updated successfully", "success");
      } else {
        const { error } = await supabase.from("gallery_items").insert([payload]);
        if (error) throw error;
        showToast("Gallery project added successfully", "success");
      }

      await fetchGalleryItems();
      closeModal();
    } catch (error) {
      console.error("Error saving gallery item:", error);
      showToast(error.message || "An error occurred while saving.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Seed default 10 hardcoded gallery projects into Supabase
  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      let successCount = 0;

      for (let i = 0; i < DEFAULT_GALLERY_PROJECTS.length; i++) {
        const proj = DEFAULT_GALLERY_PROJECTS[i];

        try {
          const response = await fetch(proj.image);
          const blob = await response.blob();
          const cleanName = `${proj.id}.jpg`;
          const filePath = `gallery/seeded_${Date.now()}_${cleanName}`;

          const { error: uploadError } = await supabase.storage
            .from("showroom-assets")
            .upload(filePath, blob, { contentType: "image/jpeg", upsert: true });

          let publicUrl = proj.image;
          if (!uploadError) {
            const { data } = supabase.storage
              .from("showroom-assets")
              .getPublicUrl(filePath);
            if (data?.publicUrl) publicUrl = data.publicUrl;
          }

          const { error: insertError } = await supabase.from("gallery_items").insert([
            {
              name: proj.name,
              description: proj.description,
              image_url: publicUrl,
            },
          ]);

          if (!insertError) {
            successCount++;
          }
        } catch (itemErr) {
          console.warn(`Failed to seed project ${proj.name}:`, itemErr);
        }
      }

      showToast(`Imported ${successCount} gallery projects into database!`, "success");
      await fetchGalleryItems();
    } catch (err) {
      console.error("Seeding error:", err);
      showToast("Failed to seed default gallery items. Make sure table exists.", "error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] p-4 md:p-8">
      {toast && <ToastNotification toast={toast} onDismiss={dismissToast} />}

      <div className="max-w-7xl mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#232B32]">Gallery Management</h1>
            <p className="text-[#6B7280] mt-1">
              Add, update, or remove completed architectural projects displayed on the public Gallery page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {items.length === 0 && !loading && (
              <button
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="flex items-center justify-center gap-2 bg-[#FFFFFF] border border-[#C5A059] text-[#C5A059] hover:bg-[#FDF8F0] px-4 py-3 rounded-xl font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {seeding ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Importing Defaults...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Import 10 Default Projects
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-[#232B32] hover:bg-[#1a2025] text-[#F9F9FB] px-5 py-3 rounded-xl font-medium transition-all shadow-sm cursor-pointer"
            >
              <Plus size={20} />
              Add New Project
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-[#C5A059]" size={36} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-8 text-center">
            <div className="w-16 h-16 bg-[#F9F9FB] rounded-full flex items-center justify-center mb-4">
              <ImageIcon size={32} className="text-[#9CA3AF]" />
            </div>
            <h3 className="text-xl font-semibold text-[#232B32] mb-2">No gallery projects found in database</h3>
            <p className="text-[#6B7280] max-w-md mb-6">
              The public gallery page is currently using the 10 built-in projects as a fallback. You can import all 10 projects to the database with 1 click to manage them directly.
            </p>
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="inline-flex items-center gap-2 bg-[#C5A059] text-white px-6 py-3 rounded-xl font-medium hover:brightness-110 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {seeding ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Importing Projects...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Import 10 Default Projects to Database
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <GalleryCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-2xl shadow-xl flex flex-col my-auto border border-[#E2E8F0] max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0] shrink-0">
              <h2 className="text-xl font-bold text-[#232B32]">
                {editingItem ? "Edit Gallery Project" : "Add New Gallery Project"}
              </h2>
              <button
                onClick={closeModal}
                disabled={submitting}
                className="text-[#9CA3AF] hover:text-[#232B32] transition-colors p-2 rounded-lg hover:bg-[#F9F9FB] disabled:opacity-50 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex flex-col gap-6">
                {/* Title */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#232B32]">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Yellow Onyx Lobby Counter"
                    disabled={submitting}
                    className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all disabled:bg-[#F9F9FB] disabled:opacity-70"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#232B32]">
                    Project Description / Paragraph <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the architectural installation, stone type, and features..."
                    disabled={submitting}
                    className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#232B32] focus:outline-none focus:border-[#C5A059] focus:ring focus:ring-[#C5A059]/20 transition-all disabled:bg-[#F9F9FB] disabled:opacity-70 resize-y"
                  />
                </div>

                {/* Image Upload */}
                <div className="grid grid-cols-1 gap-6">
                  <FileUploadZone
                    label="Project Image"
                    required={true}
                    accept="image/png,image/jpeg,image/webp"
                    file={formData.image_file}
                    onChange={(file) => setFormData({ ...formData, image_file: file })}
                    onRemove={() => setFormData({ ...formData, image_file: null })}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 shrink-0 bg-[#F9F9FB]">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-6 py-2.5 text-[#232B32] font-medium hover:bg-[#E2E8F0] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-[#C5A059] hover:brightness-110 text-[#FFFFFF] px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm disabled:opacity-70 disabled:hover:brightness-100 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      {editingItem ? "Saving Changes..." : "Uploading Project..."}
                    </>
                  ) : (
                    <>{editingItem ? "Save Changes" : "Add Project"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
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
