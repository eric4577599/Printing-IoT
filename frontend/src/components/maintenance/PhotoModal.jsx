import React, { useState, useRef } from 'react';
import styles from '../modals/ModalStyles.module.css'; // Use shared modal styles

/**
 * 照片管理彈窗 (Photo Management Modal)
 * 允許使用者檢視、新增、刪除照片
 * 
 * @param {boolean} isOpen - 是否開啟
 * @param {function} onClose - 關閉回調
 * @param {Array} photos - 照片陣列 [{id, name, dataUrl, ...}]
 * @param {function} onSave - 儲存回調 (更新照片陣列)
 */
const PhotoModal = ({ isOpen, onClose, photos = [], onSave }) => {
    const fileInputRef = useRef(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [previewPhoto, setPreviewPhoto] = useState(null); // Lightbox photo

    if (!isOpen) return null;

    // Handle File Upload
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newPhotos = [];
        let processedCount = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                newPhotos.push({
                    id: Date.now() + Math.random(), // Ensure unique ID
                    name: file.name,
                    dataUrl: event.target.result,
                    uploadedAt: new Date().toLocaleString('zh-TW')
                });
                processedCount++;
                if (processedCount === files.length) {
                    onSave([...photos, ...newPhotos]);
                }
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        e.target.value = '';
    };

    // Toggle Selection
    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(pid => pid !== id)
                : [...prev, id]
        );
    };

    // Delete Selected
    const handleDelete = () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`確定要刪除選取的 ${selectedIds.length} 張照片嗎？`)) return;

        const updatedPhotos = photos.filter(p => !selectedIds.includes(p.id));
        onSave(updatedPhotos);
        setSelectedIds([]);
    };

    return (
        <div className={styles.overlay} onClick={() => !previewPhoto && onClose()}>
            <div className={styles.modal} style={{ width: '800px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h3>📷 照片管理 (Photo Management)</h3>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '10px 20px', background: '#f5f5f5', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
                    <button
                        onClick={() => fileInputRef.current.click()}
                        style={{
                            padding: '6px 12px',
                            background: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <span>+</span> 新增照片
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        multiple
                        accept="image/*"
                    />

                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDelete}
                            style={{
                                padding: '6px 12px',
                                background: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginLeft: 'auto'
                            }}
                        >
                            刪除選取 ({selectedIds.length})
                        </button>
                    )}
                </div>

                {/* Content - Grid View */}
                <div style={{ padding: '20px', minHeight: '300px', maxHeight: '60vh', overflowY: 'auto' }}>
                    {photos.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📷</div>
                            尚無照片，請點擊「新增照片」上傳
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                            {photos.map(photo => (
                                <div
                                    key={photo.id}
                                    style={{
                                        position: 'relative',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: selectedIds.includes(photo.id) ? '2px solid #2196f3' : '1px solid #ddd',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {/* Checkbox */}
                                    <div
                                        onClick={() => toggleSelection(photo.id)}
                                        style={{
                                            position: 'absolute',
                                            top: '5px',
                                            left: '5px',
                                            zIndex: 10,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(photo.id)}
                                            onChange={() => { }} // Handle click on div
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                    </div>

                                    {/* Image Thumbnail */}
                                    <div
                                        onClick={() => setPreviewPhoto(photo)}
                                        style={{ width: '100%', height: '120px', cursor: 'zoom-in', background: '#eee' }}
                                    >
                                        <img
                                            src={photo.dataUrl}
                                            alt={photo.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>

                                    {/* Footer Name */}
                                    <div style={{ padding: '8px', background: 'white', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {photo.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.primaryBtn} onClick={onClose}>
                        確定
                    </button>
                </div>
            </div>

            {/* Lightbox Preview */}
            {previewPhoto && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.9)', zIndex: 1100,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        flexDirection: 'column'
                    }}
                    onClick={() => setPreviewPhoto(null)}
                >
                    <img
                        src={previewPhoto.dataUrl}
                        alt={previewPhoto.name}
                        style={{ maxWidth: '90%', maxHeight: '80vh', objectFit: 'contain' }}
                    />
                    <div style={{ color: 'white', marginTop: '10px', fontSize: '1.2rem' }}>
                        {previewPhoto.name}
                    </div>
                    <button
                        style={{
                            position: 'absolute', top: '20px', right: '30px',
                            background: 'transparent', border: 'none', color: 'white',
                            fontSize: '2rem', cursor: 'pointer'
                        }}
                        onClick={() => setPreviewPhoto(null)}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
};

export default PhotoModal;
