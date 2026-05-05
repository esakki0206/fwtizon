import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FiLayers, FiPlus, FiTrash2, FiX, FiSave, FiRefreshCw, FiMove, FiZoomIn, FiZoomOut,
  FiGrid, FiCopy, FiLock, FiUnlock, FiRotateCw, FiRotateCcw, FiEye, FiEyeOff,
} from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/button';

const FIELD_OPTIONS = [
  { value: 'studentName', label: 'Student Name' },
  { value: 'courseName', label: 'Course Name' },
  { value: 'date', label: 'Issue Date' },
  { value: 'certificateId', label: 'Certificate ID' },
  { value: 'serialNumber', label: 'Serial Number' },
  { value: 'instructorName', label: 'Instructor Name' },
  { value: 'customText', label: 'Custom Text' },
  { value: 'wipe', label: 'Wipe (Blank Box)' },
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

// Mock data for preview
const MOCK_DATA = {
  studentName: 'John Doe',
  courseName: 'Advanced Certificate in AI Engineering',
  date: '15 May 2026',
  certificateId: 'FWT-IZON-2026-0001',
  serialNumber: '0001',
  instructorName: 'Dr. Jane Smith',
};

/**
 * Advanced Certificate Template Editor with Canvas Preview
 * Supports drag, resize, zoom, precision controls, and live preview
 */
const AdvancedCertificateEditor = ({ template, onSaved, onClose }) => {
  // State management
  const [overlays, setOverlays] = useState((template.overlays || []).map(o => ({ ...o })));
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(template.metadata?.editorZoom || 100);
  const [showGrid, setShowGrid] = useState(template.metadata?.showGrid || false);
  const [gridSize, setGridSize] = useState(template.metadata?.gridSize || 10);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [locked, setLocked] = useState(new Set());

  // History for undo/redo
  const [history, setHistory] = useState([overlays]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // References
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const [templateImg, setTemplateImg] = useState(null);

  // Load template image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setTemplateImg(img);
    img.onerror = () => toast.error('Failed to load template image');
    img.src = template.fileUrl;
  }, [template.fileUrl]);

  // Canvas rendering logic
  useEffect(() => {
    if (!canvasRef.current || !templateImg) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const scale = zoom / 100;

    // Set canvas dimensions
    const renderW = template.width * scale;
    const renderH = template.height * scale;
    canvas.width = renderW;
    canvas.height = renderH;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, renderW, renderH);

    // Draw template background
    ctx.drawImage(templateImg, 0, 0, renderW, renderH);

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 1;
      const gridPixels = (gridSize / 100) * template.width * scale;
      for (let x = 0; x < renderW; x += gridPixels) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, renderH);
        ctx.stroke();
      }
      for (let y = 0; y < renderH; y += gridPixels) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(renderW, y);
        ctx.stroke();
      }
    }

    // Draw overlays with mock data
    overlays.forEach(overlay => {
      if (!overlay.visible) return;

      const x = (overlay.x / 100) * renderW;
      const y = (overlay.y / 100) * renderH;
      const fontSize = overlay.fontSize * (scale);
      const maxWidth = (overlay.maxWidth / 100) * renderW;
      const height = (overlay.height / 100) * renderH;

      // Draw overlay box (visual indicator / wipe area)
      let isSelected = selected?.id === overlay.id;
      
      if (overlay.field === 'wipe') {
        ctx.save();
        if (overlay.rotation) {
          ctx.translate(x, y);
          ctx.rotate((overlay.rotation * Math.PI) / 180);
          ctx.translate(-x, -y);
        }
        ctx.fillStyle = overlay.color || '#ffffff';
        ctx.globalAlpha = overlay.opacity ?? 1;
        ctx.fillRect(x - maxWidth / 2, y - height / 2, maxWidth, height);
        
        // Draw selection border for wipes
        if (isSelected) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x - maxWidth / 2, y - height / 2, maxWidth, height);
        }
        ctx.restore();
        return;
      }

      // Get mock text
      const textValue = MOCK_DATA[overlay.field] || overlay.customText || overlay.field;
      const text = overlay.uppercase ? String(textValue).toUpperCase() : String(textValue);

      // Draw overlay box (visual indicator)
      isSelected = selected?.id === overlay.id;
      ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(150, 150, 150, 0.5)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.setLineDash(isSelected ? [5, 5] : []);
      ctx.strokeRect(x - maxWidth / 2, y - fontSize / 2, maxWidth, fontSize * 2);
      ctx.setLineDash([]);

      // Draw text
      ctx.save();
      ctx.font = `${overlay.fontWeight === 'bold' ? 'bold' : 'normal'} ${fontSize}px ${overlay.fontFamily || 'Arial'}`;
      ctx.fillStyle = overlay.color || '#000000';
      ctx.globalAlpha = overlay.opacity ?? 1;
      ctx.textAlign = overlay.align || 'left';

      if (overlay.rotation) {
        ctx.translate(x, y);
        ctx.rotate((overlay.rotation * Math.PI) / 180);
        ctx.translate(-x, -y);
      }

      const lines = wrapTextCanvas(ctx, text, maxWidth);
      const lineHeight = fontSize * (overlay.lineHeight || 1.2);
      lines.forEach((line, idx) => {
        ctx.fillText(line, x, y + idx * lineHeight);
      });

      ctx.restore();
    });
  }, [templateImg, overlays, zoom, showGrid, gridSize, template, selected]);

  // Simple text wrapping for canvas
  const wrapTextCanvas = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Overlay management functions
  const updateOverlay = (id, updates) => {
    setOverlays(prev => {
      const updated = prev.map(o => o.id === id ? { ...o, ...updates } : o);
      saveToHistory(updated);
      return updated;
    });
    if (selected?.id === id) {
      setSelected(prev => ({ ...prev, ...updates }));
    }
  };

  const addOverlay = (forcedField = null) => {
    const fieldType = forcedField || 'studentName';
    const newOverlay = {
      id: `ov_${Date.now()}_${Math.random().toString(36).slice(9)}`,
      field: fieldType,
      x: 50,
      y: 50,
      fontSize: 24,
      fontWeight: 'normal',
      letterSpacing: 0,
      lineHeight: 1.2,
      fontFamily: 'Helvetica-Bold',
      color: fieldType === 'wipe' ? '#ffffff' : '#000000',
      align: 'center',
      maxWidth: fieldType === 'wipe' ? 20 : 60,
      uppercase: false,
      rotation: 0,
      opacity: 1,
      visible: true,
      customText: '',
      dateFormat: 'DD/MM/YYYY',
      height: 5,
    };
    const updated = [...overlays, newOverlay];
    setOverlays(updated);
    setSelected(newOverlay);
    saveToHistory(updated);
  };

  const deleteOverlay = (id) => {
    const updated = overlays.filter(o => o.id !== id);
    setOverlays(updated);
    if (selected?.id === id) setSelected(null);
    saveToHistory(updated);
  };

  const duplicateOverlay = (id) => {
    const orig = overlays.find(o => o.id === id);
    if (!orig) return;
    const copy = {
      ...orig,
      id: `ov_${Date.now()}_${Math.random().toString(36).slice(9)}`,
      x: Math.min(100, orig.x + 5),
      y: Math.min(100, orig.y + 5),
    };
    const updated = [...overlays, copy];
    setOverlays(updated);
    setSelected(copy);
    saveToHistory(updated);
  };

  const toggleLock = (id) => {
    setLocked(prev => {
      const newLocked = new Set(prev);
      if (newLocked.has(id)) newLocked.delete(id);
      else newLocked.add(id);
      return newLocked;
    });
  };

  // Undo/Redo
  const saveToHistory = (state) => {
    setHistory(h => [...h.slice(0, historyIndex + 1), state]);
    setHistoryIndex(i => i + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(i => i - 1);
      setOverlays(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(i => i + 1);
      setOverlays(history[historyIndex + 1]);
    }
  };

  // Canvas mouse handlers
  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / (rect.width)) * 100;
    const y = ((e.clientY - rect.top) / (rect.height)) * 100;

    // Find overlay at this position
    const hitOverlay = [...overlays].reverse().find(o => {
      if (!o.visible) return false;
      const scale = zoom / 100;
      const renderW = template.width * scale;
      const renderH = template.height * scale;
      const xPt = (o.x / 100) * renderW;
      const yPt = (o.y / 100) * renderH;
      const wPt = (o.maxWidth / 100) * renderW;
      const hPt = o.field === 'wipe' ? (o.height / 100) * renderH : (o.fontSize * scale);
      
      const mouseXPt = (x / 100) * renderW;
      const mouseYPt = (y / 100) * renderH;
      
      return Math.abs(xPt - mouseXPt) < wPt / 2 + 5 && 
             Math.abs(yPt - mouseYPt) < hPt / 2 + 5;
    });

    if (hitOverlay) {
      if (!locked.has(hitOverlay.id)) {
        setDragging(hitOverlay.id);
        setSelected(hitOverlay);
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!dragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    // Snap to grid if enabled
    let snapX = x, snapY = y;
    if (showGrid) {
      snapX = Math.round(x / gridSize) * gridSize;
      snapY = Math.round(y / gridSize) * gridSize;
    }

    updateOverlay(dragging, { x: parseFloat(snapX.toFixed(2)), y: parseFloat(snapY.toFixed(2)) });
  };

  const handleCanvasMouseUp = () => {
    setDragging(null);
  };

  // Save function
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/cert-templates/${template._id}/overlays`, {
        overlays,
      });

      // Also update metadata if changed
      if (template.metadata?.editorZoom !== zoom || template.metadata?.showGrid !== showGrid || template.metadata?.gridSize !== gridSize) {
        await axios.put(`/api/cert-templates/${template._id}`, {
          metadata: { editorZoom: zoom, showGrid, gridSize },
        });
      }

      toast.success('Template saved successfully!');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-7xl h-full md:max-h-[95vh] flex flex-col rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <FiLayers className="text-primary-600" size={20} />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Advanced Template Editor</h2>
              <p className="text-xs text-gray-500">{template.templateName} — Drag to position, use controls to customize</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={undo} disabled={historyIndex === 0} className="bg-gray-200 dark:bg-gray-700" title="Undo">
              <FiRotateCcw size={14} />
            </Button>
            <Button size="sm" onClick={redo} disabled={historyIndex === history.length - 1} className="bg-gray-200 dark:bg-gray-700" title="Redo">
              <FiRotateCw size={14} />
            </Button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
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

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-950 overflow-hidden">

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setZoom(z => Math.max(50, z - 10))} className="bg-gray-200 dark:bg-gray-700" title="Zoom out">
                  <FiZoomOut size={14} />
                </Button>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={zoom}
                  onChange={e => setZoom(+e.target.value)}
                  className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
                  title="Zoom"
                />
                <Button size="sm" onClick={() => setZoom(z => Math.min(200, z + 10))} className="bg-gray-200 dark:bg-gray-700" title="Zoom in">
                  <FiZoomIn size={14} />
                </Button>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-12 text-center">{zoom}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-2 rounded-lg transition-colors ${showGrid ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                  title="Toggle grid"
                >
                  <FiGrid size={14} />
                </button>
                <div className="flex items-center gap-1">
                  <Button size="sm" onClick={() => addOverlay('studentName')} className="bg-primary-600 text-white font-bold gap-1.5 rounded-r-none">
                    <FiPlus size={14} /> Add Field
                  </Button>
                  <Button size="sm" onClick={() => addOverlay('wipe')} className="bg-gray-800 text-white font-bold gap-1.5 rounded-l-none border-l border-gray-700" title="Add Wipe (Blank Box)">
                    <FiLayers size={14} /> Wipe
                  </Button>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-lg cursor-grab active:cursor-grabbing max-w-full max-h-full"
              />
            </div>
          </div>

          {/* Right Panel: Controls */}
          <div className="w-96 shrink-0 flex flex-col border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">

            {/* Overlay List */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Overlays ({overlays.length})</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {overlays.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No overlays. Click "Add Field" to start.</p>
                ) : (
                  overlays.map(o => (
                    <div
                      key={o.id}
                      onClick={() => setSelected(o)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${selected?.id === o.id
                        ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                          {FIELD_OPTIONS.find(f => f.value === o.field)?.label || o.field}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {o.x.toFixed(1)}%, {o.y.toFixed(1)}%
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); toggleLock(o.id); }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title={locked.has(o.id) ? 'Unlock' : 'Lock'}
                        >
                          {locked.has(o.id) ? <FiLock size={12} /> : <FiUnlock size={12} />}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); updateOverlay(o.id, { visible: !o.visible }); }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title={o.visible ? 'Hide' : 'Show'}
                        >
                          {o.visible ? <FiEye size={12} /> : <FiEyeOff size={12} />}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteOverlay(o.id); }}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Selected Properties */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!selected ? (
                <p className="text-xs text-gray-400 text-center py-8">Select an overlay to edit properties</p>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Field</label>
                    <select
                      value={selected.field}
                      onChange={e => updateOverlay(selected.id, { field: e.target.value })}
                      className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {FIELD_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>

                  {selected.field === 'customText' && (
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Text</label>
                      <textarea
                        value={selected.customText}
                        onChange={e => updateOverlay(selected.id, { customText: e.target.value })}
                        placeholder="Static text"
                        rows={2}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">X (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={selected.x}
                        onChange={e => updateOverlay(selected.id, { x: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Y (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={selected.y}
                        onChange={e => updateOverlay(selected.id, { y: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {selected.field !== 'wipe' && (
                      <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Font Size (pt)</label>
                        <input
                          type="number"
                          min="6"
                          max="120"
                          value={selected.fontSize}
                          onChange={e => updateOverlay(selected.id, { fontSize: parseInt(e.target.value) || 24 })}
                          className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2"
                        />
                      </div>
                    )}
                    <div className={selected.field === 'wipe' ? 'col-span-2' : ''}>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">{selected.field === 'wipe' ? 'Width (%)' : 'Max Width (%)'}</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={selected.maxWidth}
                        onChange={e => updateOverlay(selected.id, { maxWidth: parseInt(e.target.value) || 10 })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2"
                      />
                    </div>
                  </div>

                  {selected.field === 'wipe' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Height (%)</label>
                        <input
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          value={selected.height || 5}
                          onChange={e => updateOverlay(selected.id, { height: parseFloat(e.target.value) || 5 })}
                          className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2"
                        />
                      </div>
                    </div>
                  )}

                  {selected.field !== 'wipe' && (
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Font Family</label>
                      <select
                        value={selected.fontFamily}
                        onChange={e => updateOverlay(selected.id, { fontFamily: e.target.value })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  )}

                  {selected.field !== 'wipe' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Font Weight</label>
                        <select
                          value={selected.fontWeight}
                          onChange={e => updateOverlay(selected.id, { fontWeight: e.target.value })}
                          className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Align</label>
                        <select
                          value={selected.align}
                          onChange={e => updateOverlay(selected.id, { align: e.target.value })}
                          className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">{selected.field === 'wipe' ? 'Box Color' : 'Color'}</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selected.color}
                          onChange={e => updateOverlay(selected.id, { color: e.target.value })}
                          className="h-8 w-full rounded border border-gray-200 dark:border-gray-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Opacity ({(selected.opacity * 100).toFixed(0)}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selected.opacity}
                        onChange={e => updateOverlay(selected.id, { opacity: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {selected.field !== 'wipe' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Line Height ({selected.lineHeight}x)</label>
                        <input
                          type="range"
                          min="0.8"
                          max="2"
                          step="0.1"
                          value={selected.lineHeight}
                          onChange={e => updateOverlay(selected.id, { lineHeight: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">Rotation ({selected.rotation}°)</label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={selected.rotation}
                          onChange={e => updateOverlay(selected.id, { rotation: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {selected.field !== 'wipe' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.uppercase}
                        onChange={e => updateOverlay(selected.id, { uppercase: e.target.checked })}
                        className="w-4 h-4 rounded accent-primary-600"
                      />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">UPPERCASE text</span>
                    </label>
                  )}

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    <Button size="sm" onClick={() => duplicateOverlay(selected.id)} className="flex-1 bg-blue-600 text-white gap-1.5">
                      <FiCopy size={12} /> Duplicate
                    </Button>
                    <Button size="sm" onClick={() => deleteOverlay(selected.id)} className="flex-1 bg-red-600 text-white gap-1.5">
                      <FiTrash2 size={12} /> Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedCertificateEditor;
