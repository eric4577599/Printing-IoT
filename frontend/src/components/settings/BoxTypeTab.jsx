import React, { useState, useEffect } from 'react';
import styles from '../../pages/SettingsPage.module.css';
import { getBoxTypes, updateBoxTypes } from '../../services/api';

/**
 * 建立一筆盒型(沿用 handleAddBoxType 的完整欄位結構)。
 * @param {string} id - 穩定 id
 * @param {string} name - 盒型顯示名稱(含代碼,例 "RSC(A1)")
 * @param {string} erpAlias - ERP 對應代碼(例 "A1")
 */
function makeBoxType(id, name, erpAlias) {
    return {
        id, name, erpAlias, image: null,
        useS1: false, labelS1: 'S1', useS2: false, labelS2: 'S2',
        useS3: false, labelS3: 'S3', useS4: false, labelS4: 'S4',
        useS5: false, labelS5: 'S5', lenCorrection: 0,
        useLeading: false, labelLeading: 'Leading', useBody: false, labelBody: 'Body',
        useTail: false, labelTail: 'Tail', widCorrection: 0,
        lengthEq: '', widthEq: '', heightEq: 'Body', quantityEq: '',
        fields: []
    };
}

// 預設盒型:RSC(A1) 常規開槽箱、HSC(A2) 半槽箱。首次無盒型時種入。
const DEFAULT_BOX_TYPES = [
    makeBoxType('box_rsc_a1', 'RSC(A1)', 'A1'),
    makeBoxType('box_hsc_a2', 'HSC(A2)', 'A2'),
];

const BoxTypeTab = () => {

    // --- Box Type State ---
    const [boxTypes, setBoxTypes] = useState([]);
    const [selectedBoxTypeId, setSelectedBoxTypeId] = useState(null);
    const [selectedPositionField, setSelectedPositionField] = useState(null);

    // Fetch on Mount
    useEffect(() => {
        getBoxTypes().then(types => {
            if (types && types.length > 0) {
                setBoxTypes(types);
                // Select first default
                setSelectedBoxTypeId(types[0].id);
            } else if (!localStorage.getItem('boxTypesSeeded')) {
                // 首次無盒型時種入預設 RSC(A1)/HSC(A2);以旗標確保只種一次,
                // 避免使用者日後全部刪除又被重新塞回。
                setBoxTypes(DEFAULT_BOX_TYPES);
                setSelectedBoxTypeId(DEFAULT_BOX_TYPES[0].id);
                updateBoxTypes(DEFAULT_BOX_TYPES).catch(console.error);
                localStorage.setItem('boxTypesSeeded', '1');
            } else {
                setBoxTypes([]);
            }
        }).catch(console.error);
    }, []);

    // --- Box Type Handlers ---
    const handleAddBoxType = () => {
        const name = prompt('請輸入盒型名稱 (Enter Box Type Name):');
        if (!name) return;

        const newBox = {
            id: Date.now().toString(),
            name,
            erpAlias: '',
            image: null,
            // Length
            useS1: false, labelS1: 'S1',
            useS2: false, labelS2: 'S2',
            useS3: false, labelS3: 'S3',
            useS4: false, labelS4: 'S4',
            useS5: false, labelS5: 'S5',
            lenCorrection: 0,
            // Width
            useLeading: false, labelLeading: 'Leading',
            useBody: false, labelBody: 'Body',
            useTail: false, labelTail: 'Tail',
            widCorrection: 0,

            lengthEq: '', widthEq: '', heightEq: 'Body', quantityEq: '',

            fields: []
        };
        const newTypes = [...boxTypes, newBox];
        setBoxTypes(newTypes);
        updateBoxTypes(newTypes).catch(console.error);
        setSelectedBoxTypeId(newBox.id);
    };

    const handleEditBoxType = () => {
        if (!selectedBoxTypeId) return;
        const box = boxTypes.find(b => b.id === selectedBoxTypeId);
        const newName = prompt('修改盒型名稱 (Rename Box Type):', box.name);
        if (newName && newName !== box.name) {
            handleUpdateBoxType(box.id, 'name', newName); // This calls update
        }
    };

    const handleDeleteBoxType = () => {
        if (!selectedBoxTypeId) return;
        if (confirm('確定刪除此盒型? (Delete this Box Type?)')) {
            const newTypes = boxTypes.filter(b => b.id !== selectedBoxTypeId);
            setBoxTypes(newTypes);
            updateBoxTypes(newTypes).catch(console.error);
            setSelectedBoxTypeId(null);
        }
    };

    const handleUpdateBoxType = (id, key, value) => {
        const newTypes = boxTypes.map(b =>
            b.id === id ? { ...b, [key]: value } : b
        );
        setBoxTypes(newTypes);
        updateBoxTypes(newTypes).catch(console.error);
    };

    const handleImageUpload = (id, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            handleUpdateBoxType(id, 'image', reader.result);
        };
        reader.readAsDataURL(file);
    };

    // Helper to display formula
    const getLengthFormula = (box) => {
        const parts = [];
        if (box.useS1) parts.push(box.labelS1 || 'S1');
        if (box.useS2) parts.push(box.labelS2 || 'S2');
        if (box.useS3) parts.push(box.labelS3 || 'S3');
        if (box.useS4) parts.push(box.labelS4 || 'S4');
        if (box.useS5) parts.push(box.labelS5 || 'S5');

        let formula = parts.length > 0 ? parts.join(' + ') : '(None)';
        if (box.lenCorrection !== 0 && box.lenCorrection !== '0') {
            formula += ` + (${box.lenCorrection})`;
        }
        return formula;
    };

    const getWidthFormula = (box) => {
        const parts = [];
        if (box.useLeading) parts.push(box.labelLeading || 'Leading');
        if (box.useBody) parts.push(box.labelBody || 'Body');
        if (box.useTail) parts.push(box.labelTail || 'Tail');

        let formula = parts.length > 0 ? parts.join(' + ') : '(None)';
        if (box.widCorrection !== 0 && box.widCorrection !== '0') {
            formula += ` + (${box.widCorrection})`;
        }
        return formula;
    };


    // --- Render Logic ---
    // Render\n
        const selectedBox = boxTypes.find(b => b.id === selectedBoxTypeId);

        return (
            <div className={styles.tabContent} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3>盒型設定 (Box Type Settings)</h3>
                <div className={styles.twoColumnLayout}>
                    {/* Left: List with Toolbar */}
                    <div className={styles.leftPanel}>
                        <div className={styles.buttonGroup} style={{ marginBottom: '10px' }}>
                            <button className={styles.actionButton} onClick={handleAddBoxType}>新增 (Add)</button>
                            <button className={styles.actionButton} onClick={handleEditBoxType} disabled={!selectedBoxTypeId}>修改 (Edit)</button>
                            <button className={styles.actionButton} onClick={handleDeleteBoxType} disabled={!selectedBoxTypeId} style={{ color: 'red', borderColor: 'red' }}>刪除 (Del)</button>
                        </div>
                        <div className={styles.listBox}>
                            {boxTypes.map(box => (
                                <div
                                    key={box.id}
                                    className={`${styles.listItem} ${selectedBoxTypeId === box.id ? styles.active : ''}`}
                                    onClick={() => setSelectedBoxTypeId(box.id)}
                                >
                                    <span>{box.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Detail */}
                    <div className={styles.rightPanel}>
                        {selectedBox ? (
                            <div>
                                <div className={styles.settingGroup}>
                                    <h4>基本資訊 (Basic Info)</h4>
                                    <div className={styles.inputRow}>
                                        <label>盒型名稱 (Name):</label>
                                        <input
                                            value={selectedBox.name}
                                            onChange={(e) => handleUpdateBoxType(selectedBox.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>ERP 別名 (ERP Alias):</label>
                                        <input
                                            value={selectedBox.erpAlias || ''}
                                            onChange={(e) => handleUpdateBoxType(selectedBox.id, 'erpAlias', e.target.value)}
                                            placeholder="e.g. Dk3"
                                            style={{ width: '100px' }}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>對應文字敘述 (Desc):</label>
                                        <input
                                            value={selectedBox.description || ''}
                                            onChange={(e) => handleUpdateBoxType(selectedBox.id, 'description', e.target.value)}
                                            placeholder="e.g. 長*寬*高 = S2*S3*H"
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>對應公式 (Formulas):</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ width: '40px' }}>L =</span>
                                                <input
                                                    value={selectedBox.lengthEq || ''}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'lengthEq', e.target.value)}
                                                    placeholder="e.g. S1 + S3"
                                                    style={{ flex: 1 }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ width: '40px' }}>W =</span>
                                                <input
                                                    value={selectedBox.widthEq || ''}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'widthEq', e.target.value)}
                                                    placeholder="e.g. S2 + S4"
                                                    style={{ flex: 1 }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ width: '40px' }}>H =</span>
                                                <input
                                                    value={selectedBox.heightEq || ''}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'heightEq', e.target.value)}
                                                    placeholder="e.g. Body"
                                                    style={{ flex: 1 }}
                                                />
                                            </div>
                                            {/* Production Qty Formula */}
                                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                                                <span style={{ width: '40px', color: 'green', fontWeight: 'bold' }}>Qty=</span>
                                                <input
                                                    value={selectedBox.quantityEq || ''}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'quantityEq', e.target.value)}
                                                    placeholder="e.g. (TotalMeters * 1000) / (L + 30)"
                                                    style={{ flex: 1, borderColor: 'green' }}
                                                />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: '#666' }}>支援 +, -, *, /, ( ) 與欄位變數 (S1, L, W...)</span>
                                        </div>
                                    </div>

                                    {/* Length Config */}
                                    <div className={styles.subSection} style={{ marginTop: '10px' }}>
                                        <h4>長度定義 (Length Definition)</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {['S1', 'S2', 'S3', 'S4', 'S5'].map(s => (
                                                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <label style={{ width: 'auto' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBox[`use${s}`]}
                                                            onChange={(e) => handleUpdateBoxType(selectedBox.id, `use${s}`, e.target.checked)}
                                                        />
                                                        {s}
                                                    </label>
                                                    <input
                                                        placeholder="標籤 (Label e.g. 長/寬)"
                                                        value={selectedBox[`label${s}`] || ''}
                                                        onChange={(e) => handleUpdateBoxType(selectedBox.id, `label${s}`, e.target.value)}
                                                        style={{ padding: '4px', width: '100px', fontSize: '0.9rem' }}
                                                    />
                                                </div>
                                            ))}
                                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
                                                <label style={{ width: 'auto', color: '#d32f2f' }}>修正值 (Correction):</label>
                                                <input
                                                    type="number"
                                                    value={selectedBox.lenCorrection || 0}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'lenCorrection', e.target.value)}
                                                    style={{ width: '80px' }}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: '#666' }}>mm (加減值)</span>
                                            </div>
                                        </div>
                                        <p style={{ color: '#1890ff', fontWeight: 'bold', marginTop: '10px' }}>
                                            公式: {getLengthFormula(selectedBox)}
                                        </p>
                                    </div>

                                    {/* Width Config */}
                                    <div className={styles.subSection} style={{ marginTop: '10px' }}>
                                        <h4>寬度定義 (Width Definition)</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {[
                                                { key: 'useLeading', labelKey: 'labelLeading', defaultName: 'Leading' },
                                                { key: 'useBody', labelKey: 'labelBody', defaultName: 'Body' },
                                                { key: 'useTail', labelKey: 'labelTail', defaultName: 'Tail' }
                                            ].map(item => (
                                                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <label style={{ width: 'auto' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBox[item.key]}
                                                            onChange={(e) => handleUpdateBoxType(selectedBox.id, item.key, e.target.checked)}
                                                        />
                                                        {item.defaultName}
                                                    </label>
                                                    <input
                                                        placeholder="標籤 (Label)"
                                                        value={selectedBox[item.labelKey] || ''}
                                                        onChange={(e) => handleUpdateBoxType(selectedBox.id, item.labelKey, e.target.value)}
                                                        style={{ padding: '4px', width: '120px', fontSize: '0.9rem' }}
                                                    />
                                                </div>
                                            ))}
                                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
                                                <label style={{ width: 'auto', color: '#d32f2f' }}>修正值 (Correction):</label>
                                                <input
                                                    type="number"
                                                    value={selectedBox.widCorrection || 0}
                                                    onChange={(e) => handleUpdateBoxType(selectedBox.id, 'widCorrection', e.target.value)}
                                                    style={{ width: '80px' }}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: '#666' }}>mm (加減值)</span>
                                            </div>
                                        </div>
                                        <p style={{ color: '#1890ff', fontWeight: 'bold', marginTop: '10px' }}>
                                            公式: {getWidthFormula(selectedBox)}
                                        </p>
                                    </div>


                                    {/* Diagram Position Settings */}
                                    <div className={styles.subSection} style={{ marginTop: '10px', borderTop: '2px solid #eee', paddingTop: '10px' }}>
                                        <h4>圖面欄位位置設定 (Diagram Position Settings)</h4>
                                        <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#666' }}>
                                            選取下方欄位，點擊圖面以設定顯示位置 (Select field below, then click image to set position)
                                        </div>

                                        {/* Field Selector */}
                                        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                            {['S1', 'S2', 'S3', 'S4', 'S5', 'Leading', 'Body', 'Tail', 'L', 'W'].map(field => (
                                                <button
                                                    key={field}
                                                    onClick={() => setSelectedPositionField(field)}
                                                    style={{
                                                        padding: '5px 10px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        background: selectedPositionField === field ? '#1976d2' : '#f5f5f5',
                                                        color: selectedPositionField === field ? '#fff' : '#000',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    {field}
                                                </button>
                                            ))}
                                        </div>

                                        <div className={styles.inputRow}>
                                            <label>盒型圖示 (Image):</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(selectedBox.id, e)} />
                                        </div>

                                        <div className={styles.imagePreviewArea} style={{ position: 'relative', display: 'inline-block' }}>
                                            {selectedBox.image ? (
                                                <div
                                                    style={{ position: 'relative', display: 'inline-block', cursor: 'crosshair' }}
                                                    onClick={(e) => {
                                                        if (!selectedPositionField) {
                                                            alert('請先選擇要設定位置的欄位 (Please select a field first)');
                                                            return;
                                                        }
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                        const y = ((e.clientY - rect.top) / rect.height) * 100;

                                                        const currentPositions = selectedBox.fieldPositions || {};
                                                        handleUpdateBoxType(selectedBox.id, 'fieldPositions', {
                                                            ...currentPositions,
                                                            [selectedPositionField]: { x, y }
                                                        });
                                                    }}
                                                >
                                                    <img src={selectedBox.image} alt="Box Preview" className={styles.previewImage} style={{ maxWidth: '100%', display: 'block' }} />

                                                    {/* Render Markers */}
                                                    {selectedBox.fieldPositions && Object.entries(selectedBox.fieldPositions).map(([key, pos]) => (
                                                        <div
                                                            key={key}
                                                            style={{
                                                                position: 'absolute',
                                                                left: `${pos.x}%`,
                                                                top: `${pos.y}%`,
                                                                transform: 'translate(-50%, -50%)',
                                                                background: key === selectedPositionField ? 'rgba(25, 118, 210, 0.9)' : 'rgba(0, 0, 0, 0.6)',
                                                                color: '#fff',
                                                                padding: '2px 5px',
                                                                borderRadius: '3px',
                                                                fontSize: '0.7rem',
                                                                pointerEvents: 'none',
                                                                border: '1px solid #fff',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {key}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#999' }}>請上傳圖片 (Please upload image)</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999' }}>
                                請選擇或新增盒型 (Select or Add Box Type)
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
};

export default BoxTypeTab;
