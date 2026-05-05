import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUpload, FiPlus, FiTrash2, FiEdit2, FiCheckCircle,
  FiStar, FiEye, FiEyeOff, FiX, FiSave, FiRefreshCw,
  FiImage, FiLayers, FiAlertCircle, FiMove, FiRotateCw
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import AdvancedCertificateEditor from '../../components/admin/AdvancedCertificateEditor';

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const FIELD_OPTIONS = [
  { value: 'studentName', label: 'Student Name' },
  { value: 'courseName', label: 'Course Name' },
  { value: 'date', label: 'Issue Date' },
  { value: 'certificateId', label: 'Certificate ID' },
  { value: 'serialNumber', label: 'Serial Number' },
  { value: 'instructorName', label: 'Instructor Name' },
  { value: 'customText', label: 'Custom Text' },
];

const FONT_OPTIONS = [
  'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
  'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
  'Courier', 'Courier-Bold',
  'GreatVibes', 'PlayfairDisplay', 'PlayfairDisplay-Italic',
  'Roboto', 'Roboto-Italic', 'Inter', 'UncialAntiqua',
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
  { value: 'MMMM DD, YYYY', label: 'MMMM DD, YYYY' },
];

const newOverlay = () => ({
  _tempId: Date.now() + Math.random(),
  field: 'studentName',
  label: '',
  customText: '',
  x: 50,
  y: 50,
  fontSize: 24,
  fontFamily: 'Helvetica-Bold',
  color: '#000000',
  align: 'center',
  maxWidth: 60,
  uppercase: false,
  dateFormat: 'DD/MM/YYYY',
});

// ─── Overlay Editor ───────────────────────────────────────────────────────────
const OverlayEditor = ({ template, onSaved, onClose }) => {
  const [overlays, setOverlays] = useState(
    (template.overlays || []).map(o => ({ ...o, _tempId: o._id || Date.now() + Math.random() }))
  );
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(null);
  const previewRef = useRef(null);

  const imgUrl = template.fileUrl;

  const updateOverlay = (tempId, updates) => {
    setOverlays(prev => prev.map(o => o._tempId === tempId ? { ...o, ...updates } : o));
    if (selected?._tempId === tempId) setSelected(prev => ({ ...prev, ...updates }));
  };

  const addOverlay = () => {
    const o = newOverlay();
    setOverlays(prev => [...prev, o]);
    setSelected(o);
  };

  const removeOverlay = (tempId) => {
    setOverlays(prev => prev.filter(o => o._tempId !== tempId));
    if (selected?._tempId === tempId) setSelected(null);
  };

  // Drag-to-position on the preview image
  const onMouseDown = (e, tempId) => {
    e.preventDefault();
    setDragging(tempId);
    setSelected(overlays.find(o => o._tempId === tempId));
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    updateOverlay(dragging, { x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) });
  }, [dragging]);

  const onMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const clean = overlays.map(({ _tempId, ...rest }) => rest);
      await axios.patch(`/api/cert-templates/${template._id}/overlays`, { overlays: clean });
      toast.success('Overlay positions saved!');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save overlays');
    } finally {
      setSaving(false);
    }
  };

  const sel = selected ? overlays.find(o => o._tempId === selected._tempId) : null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-6xl h-full md:max-h-[95vh] flex flex-col rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <FiLayers className="text-primary-600" size={20} />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Overlay Editor</h2>
              <p className="text-xs text-gray-500">{template.templateName} — drag dots to reposition</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={addOverlay} className="bg-primary-600 text-white font-bold gap-1.5">
              <FiPlus size={14} /> Add Field
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 text-white font-bold gap-1.5">
              {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
              Save
            </Button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Preview canvas */}
          <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 p-4 flex items-start justify-center">
            <div
              ref={previewRef}
              className="relative select-none"
              style={{ maxWidth: '100%' }}
            >
              <img
                src={imgUrl}
                alt="Template preview"
                draggable={false}
                className="block rounded-lg shadow-lg"
                style={{ maxHeight: '75vh', maxWidth: '100%' }}
              />
              {overlays.map(o => (
                <div
                  key={o._tempId}
                  onMouseDown={(e) => onMouseDown(e, o._tempId)}
                  onClick={() => setSelected(o)}
                  style={{
                    position: 'absolute',
                    left: `${o.x}%`,
                    top: `${o.y}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: dragging === o._tempId ? 'grabbing' : 'grab',
                    zIndex: selected?._tempId === o._tempId ? 10 : 5,
                  }}
                >
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg border-2 whitespace-nowrap transition-all ${selected?._tempId === o._tempId
                      ? 'bg-primary-600 text-white border-white scale-110'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-primary-400'
                    }`}>
                    <FiMove size={10} />
                    {FIELD_OPTIONS.find(f => f.value === o.field)?.label || o.field}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: overlay list + selected editor */}
          <div className="w-80 shrink-0 flex flex-col border-l border-gray-100 dark:border-gray-800 overflow-hidden">

            {/* Overlay list */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fields ({overlays.length})</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {overlays.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No fields yet. Click "Add Field".</p>
                )}
                {overlays.map(o => (
                  <div
                    key={o._tempId}
                    onClick={() => setSelected(o)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${selected?._tempId === o._tempId
                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                      }`}
                  >
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      {FIELD_OPTIONS.find(f => f.value === o.field)?.label || o.field}
                      {o.field === 'customText' && o.customText && `: "${o.customText.slice(0, 20)}"`}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeOverlay(o._tempId); }}
                      className="text-red-400 hover:text-red-600 p-0.5 shrink-0"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected overlay property editor */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {!sel ? (
                <div className="text-center py-10 text-xs text-gray-400">
                  Select a field on the canvas or from the list above to edit its properties.
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Field properties</p>

                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Field type
                    <select
                      value={sel.field}
                      onChange={e => updateOverlay(sel._tempId, { field: e.target.value })}
                      className="mt-1 w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {FIELD_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </label>

                  {sel.field === 'customText' && (
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Custom text
                      <input
                        type="text"
                        value={sel.customText}
                        onChange={e => updateOverlay(sel._tempId, { customText: e.target.value })}
                        placeholder="Static text to print"
                        className="mt-1 w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </label>
                  )}

                  {sel.field === 'date' && (
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Date format
                      <select
                        value={sel.dateFormat}
                        onChange={e => updateOverlay(sel._tempId, { dateFormat: e.target.value })}
                        className="mt-1 w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {DATE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </label>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      X position (%)
                      <input
                        type="number" min="0" max="100" step="0.1"
                        value={sel.x}
                        onChange={e => updateOverlay(sel._tempId, { x: parseFloat(e.target.value) || 0 })}
                        className="mt-1 w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Y position (%)
                      <input
                        type="number" min="0" max="100" step="0.1"
                        value={sel.y}
                        onChange={e => updateOverlay(sel._tempId, { y: parseFloat(e.target.value) || 0 })}
                        className="mt-1 w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Font size (pt)
                      <input
                        type="number" min="6" max="120"
                        value={sel.fontSize}
                        onChange={e => updateOverlay(sel._tempId, { fontSize: parseInt(e.target.value) || 24 })}
                        className="mt-1 w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Max width (%)
                      <input
                        type="number" min="5" max="100"
                        value={sel.maxWidth}
                        onChange={e => updateOverlay(sel._tempId, { maxWidth: parseInt(e.target.value) || 60 })}
                        className="mt-1 w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </label>
                  </div>

                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Font family
                    <select
                      value={sel.fontFamily}
                      onChange={e => updateOverlay(sel._tempId, { fontFamily: e.target.value })}
                      className="mt-1 w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Color
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          value={sel.color}
                          onChange={e => updateOverlay(sel._tempId, { color: e.target.value })}
                          className="h-8 w-10 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={sel.color}
                          onChange={e => updateOverlay(sel._tempId, { color: e.target.value })}
                          className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                        />
                      </div>
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Alignment
                      <select
                        value={sel.align}
                        onChange={e => updateOverlay(sel._tempId, { align: e.target.value })}
                        className="mt-1 w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sel.uppercase}
                      onChange={e => updateOverlay(sel._tempId, { uppercase: e.target.checked })}
                      className="w-4 h-4 rounded accent-primary-600"
                    />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">UPPERCASE text</span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Upload / Create Template Modal ──────────────────────────────────────────
const UploadModal = ({ onCreated, onClose }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    templateName: '',
    description: '',
    orientation: 'portrait',
    isDefault: false,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return toast.error('Please select a template file');
    if (!form.templateName.trim()) return toast.error('Template name is required');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('templateFile', file);
      fd.append('templateName', form.templateName.trim());
      fd.append('description', form.description.trim());
      fd.append('orientation', form.orientation);
      fd.append('isDefault', String(form.isDefault));

      const res = await axios.post('/api/cert-templates', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Template uploaded successfully!');
      onCreated(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <FiUpload className="text-primary-600" />
            <h2 className="font-bold text-gray-900 dark:text-white">Upload New Template</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg mb-2 object-contain" />
            ) : (
              <FiImage size={36} className="mx-auto mb-3 text-gray-300" />
            )}
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {file ? file.name : 'Drop your template image or PDF here'}
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP or PDF — max 20MB</p>
          </div>

          {/* Form fields */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Template Name *</label>
            <input
              type="text"
              value={form.templateName}
              onChange={e => setForm(p => ({ ...p, templateName: e.target.value }))}
              placeholder="e.g. Completion Certificate 2025"
              className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional description..."
              rows={2}
              className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Orientation</label>
              <select
                value={form.orientation}
                onChange={e => setForm(p => ({ ...p, orientation: e.target.value }))}
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))}
                className="w-4 h-4 rounded accent-primary-600"
              />
              <label htmlFor="isDefault" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Set as default
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !file || !form.templateName.trim()}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold gap-2"
          >
            {uploading ? <><FiRefreshCw size={14} className="animate-spin" /> Uploading…</> : <><FiUpload size={14} /> Upload Template</>}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Template Card ────────────────────────────────────────────────────────────
const TemplateCard = ({ template, onSetDefault, onToggleActive, onDelete, onEditOverlays }) => {
  const [actioning, setActioning] = useState(false);

  const action = async (fn) => {
    setActioning(true);
    try { await fn(); }
    finally { setActioning(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden shadow-sm transition-all ${template.isDefault
          ? 'border-amber-300 dark:border-amber-600 ring-2 ring-amber-200 dark:ring-amber-900'
          : 'border-gray-100 dark:border-gray-800 hover:shadow-md'
        } ${!template.isActive ? 'opacity-60' : ''}`}
    >
      {/* Preview */}
      <div className="relative aspect-[3/4] bg-gray-50 dark:bg-gray-800 overflow-hidden">
        <img
          src={template.fileUrl}
          alt={template.templateName}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = ''; e.target.style.display = 'none'; }}
        />
        {template.isDefault && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow">
            <FiStar size={10} /> Default
          </div>
        )}
        {!template.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40">
            <span className="text-white text-xs font-bold bg-gray-900/70 px-3 py-1 rounded-lg">Inactive</span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 text-[9px] font-mono bg-black/50 text-white px-2 py-0.5 rounded">
          {template.orientation}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">{template.templateName}</h3>
        {template.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>
        )}
        <p className="text-[10px] text-gray-400 mt-1 font-medium">
          {template.overlays?.length || 0} overlay{template.overlays?.length !== 1 ? 's' : ''} configured
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-xs font-bold gap-1"
          onClick={() => onEditOverlays(template)}
        >
          <FiEdit2 size={12} /> Edit Overlays
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`text-xs font-bold gap-1 ${template.isDefault ? 'text-amber-600 border-amber-300' : ''}`}
          disabled={template.isDefault || actioning}
          onClick={() => action(() => onSetDefault(template._id))}
        >
          <FiStar size={12} /> {template.isDefault ? 'Default' : 'Set Default'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs font-bold gap-1"
          disabled={actioning}
          onClick={() => action(() => onToggleActive(template._id, !template.isActive))}
        >
          {template.isActive ? <FiEyeOff size={12} /> : <FiEye size={12} />}
          {template.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs font-bold text-red-500 hover:text-red-700 gap-1"
          disabled={actioning}
          onClick={() => action(() => onDelete(template._id))}
        >
          <FiTrash2 size={12} /> Delete
        </Button>
      </div>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CertificateTemplate = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/cert-templates');
      setTemplates(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreated = (newTemplate) => {
    setTemplates(prev => [newTemplate, ...prev]);
    setShowUpload(false);
    toast.success('Template ready! Now add overlays by clicking "Edit Overlays".');
  };

  const handleSetDefault = async (id) => {
    try {
      await axios.patch(`/api/cert-templates/${id}/set-default`);
      setTemplates(prev => prev.map(t => ({ ...t, isDefault: t._id === id })));
      toast.success('Default template updated');
    } catch (err) {
      toast.error('Failed to set default');
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await axios.put(`/api/cert-templates/${id}`, { isActive });
      setTemplates(prev => prev.map(t => t._id === id ? { ...t, isActive } : t));
      toast.success(`Template ${isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error('Failed to update template');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/cert-templates/${id}`);
      setTemplates(prev => prev.filter(t => t._id !== id));
      toast.success('Template deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleOverlaySaved = () => {
    fetchTemplates();
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiLayers className="text-primary-600" /> Certificate Templates
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload backgrounds and configure overlay field positions</p>
        </div>
        <Button
          onClick={() => setShowUpload(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold gap-2 shrink-0"
        >
          <FiPlus size={16} /> Upload Template
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
        <FiAlertCircle className="text-blue-500 shrink-0 mt-0.5" size={16} />
        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
          <strong>How it works:</strong> Upload your certificate design as a PNG/JPG image. Then click <em>Edit Overlays</em> to drag-and-drop text field positions onto the preview. The PDF generator will stamp the actual student name, course, date etc. at those positions. Set one template as <em>Default</em> to use it for all new certificates.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
            <FiImage className="text-primary-400" size={28} />
          </div>
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">No templates yet</h3>
          <p className="text-sm text-gray-400 mb-6 text-center max-w-xs">
            Upload your first certificate design to get started. PNG or JPG recommended.
          </p>
          <Button onClick={() => setShowUpload(true)} className="bg-primary-600 text-white font-bold gap-2">
            <FiUpload size={14} /> Upload First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {templates.map(t => (
            <TemplateCard
              key={t._id}
              template={t}
              onSetDefault={handleSetDefault}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onEditOverlays={setEditingTemplate}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onCreated={handleCreated}
            onClose={() => setShowUpload(false)}
          />
        )}
      </AnimatePresence>

      {editingTemplate && (
        <AdvancedCertificateEditor
          template={editingTemplate}
          onSaved={handleOverlaySaved}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
};

export default CertificateTemplate;
