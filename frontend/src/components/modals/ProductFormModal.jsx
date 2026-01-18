import React, { useState, useEffect } from 'react';
import styles from './ModalStyles.module.css';

const ProductFormModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        boxNo: '',
        customer: '',
        productName: '',
        boxType: 'A Type',
        flute: 'AB',
        thickness: 7.6,
        bundleCount: 5, // 預設為 5 的倍數
        remarks: '',
        // Machine Params
        px1: 0, px2: 0, px3: 0, px4: 0, px5: 0,
        gapFeedFront: 0, gapFeedProg: 0, gapFeedRubber: 0,
        gapFormFront: 0, dieCutPhase: 0, dieCutFeedGap: 0,
        slotGuide: 0, slotFront: 0, slotAux: 0, midKnife: 0,
        // Dimensions
        dimL1: '', dimL2: '', dimL3: '', dimL4: '', dimL5: '', dimL6: '',
        dimW1: '', dimW2: '', dimW3: '', dimW4: '',
        totalL: 0,
        // Print Units
        printUnits: [
            { id: 1, ink: 0, pos: 0, gap: 0, press: 0 },
            { id: 2, ink: 0, pos: 0, gap: 0, press: 0 },
            { id: 3, ink: 0, pos: 0, gap: 0, press: 0 },
            { id: 4, ink: 0, pos: 0, gap: 0, press: 0 },
        ]
    });

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        } else if (isOpen && !initialData) {
            // Reset for Add Mode
            setFormData({
                boxNo: '', customer: '', productName: '',
                boxType: 'A Type', flute: 'AB', thickness: 7.6, bundleCount: 5, remarks: '', // 捆個數預設為 5
                px1: 0, px2: 0, px3: 0, px4: 0, px5: 0,
                gapFeedFront: 0, gapFeedProg: 0, gapFeedRubber: 0,
                gapFormFront: 0, dieCutPhase: 0, dieCutFeedGap: 0,
                slotGuide: 0, slotFront: 0, slotAux: 0, midKnife: 0,
                dimL1: '', dimL2: '', dimL3: '', dimL4: '', dimL5: '', dimL6: '',
                dimW1: '', dimW2: '', dimW3: '', dimW4: '',
                totalL: 0,
                printUnits: [
                    { id: 1, ink: 0, pos: 0, gap: 0, press: 0 },
                    { id: 2, ink: 0, pos: 0, gap: 0, press: 0 },
                    { id: 3, ink: 0, pos: 0, gap: 0, press: 0 },
                    { id: 4, ink: 0, pos: 0, gap: 0, press: 0 },
                ]
            });
        }
    }, [isOpen, initialData]);

    const [boxTypes, setBoxTypes] = useState([]);
    const [selectedBoxConfig, setSelectedBoxConfig] = useState(null);

    // 楞別設定從 Settings 頁面讀取
    const [fluteSettings, setFluteSettings] = useState(() => {
        const saved = localStorage.getItem('unitSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            return settings.flutes || [{ name: 'AB', value: 7.6 }, { name: 'A', value: 4.0 }, { name: 'B', value: 3.6 }];
        }
        return [{ name: 'AB', value: 7.6 }, { name: 'A', value: 4.0 }, { name: 'B', value: 3.6 }];
    });

    // Load Box Types
    useEffect(() => {
        const saved = localStorage.getItem('boxTypes');
        if (saved) {
            setBoxTypes(JSON.parse(saved));
        }
    }, []);

    // Update Config on Box Type Change
    useEffect(() => {
        if (boxTypes.length > 0) {
            const config = boxTypes.find(b => b.name === formData.boxType) || boxTypes[0];
            setSelectedBoxConfig(config);
            // If formData has no boxType yet, set it
            if (!formData.boxType) {
                setFormData(prev => ({ ...prev, boxType: config.name }));
            }
        }
    }, [boxTypes, formData.boxType]);

    // Calculation Logic
    const [calcDisplayL, setCalcDisplayL] = useState('');
    const [calcDisplayW, setCalcDisplayW] = useState('');
    const [boxDims, setBoxDims] = useState({ l: 0, w: 0, h: 0 });

    useEffect(() => {
        if (!selectedBoxConfig) return;

        const getValue = (mapping) => {
            if (!mapping) return 0;
            const map = String(mapping);
            if (map === 'S1') return Number(formData.dimL1 || 0);
            if (map === 'S2') return Number(formData.dimL2 || 0);
            if (map === 'S3') return Number(formData.dimL3 || 0);
            if (map === 'S4') return Number(formData.dimL4 || 0);
            if (map === 'S5') return Number(formData.dimL5 || 0);

            if (map === 'Leading') return Number(formData.dimW1 || 0);
            if (map === 'Body') return Number(formData.dimW2 || 0);
            if (map === 'Tail') return Number(formData.dimW3 || 0);
            return 0;
        };

        const l = getValue(selectedBoxConfig.lengthEq);
        const w = getValue(selectedBoxConfig.widthEq);
        const h = getValue(selectedBoxConfig.heightEq);

        setBoxDims({ l, w, h });
    }, [formData, selectedBoxConfig]);

    useEffect(() => {
        if (!selectedBoxConfig) return;

        // Length
        let lSum = 0;
        let lParts = [];
        if (selectedBoxConfig.useS1) { lSum += Number(formData.dimL1 || 0); lParts.push(formData.dimL1 || 0); }
        if (selectedBoxConfig.useS2) { lSum += Number(formData.dimL2 || 0); lParts.push(formData.dimL2 || 0); }
        if (selectedBoxConfig.useS3) { lSum += Number(formData.dimL3 || 0); lParts.push(formData.dimL3 || 0); }
        if (selectedBoxConfig.useS4) { lSum += Number(formData.dimL4 || 0); lParts.push(formData.dimL4 || 0); }
        if (selectedBoxConfig.useS5) { lSum += Number(formData.dimL5 || 0); lParts.push(formData.dimL5 || 0); }

        let lCorrection = Number(selectedBoxConfig.lenCorrection || 0);
        let finalL = lSum + lCorrection;

        let lFormula = lParts.join(' + ');
        if (lCorrection !== 0) lFormula += ` + (${lCorrection})`;
        setCalcDisplayL(finalL > 0 ? `${finalL} = ${lFormula}` : '');

        // Width (Assuming dimW1=Leading, dimW2=Body, dimW3=Tail for simplified mapping based on likely Diagram)
        // User request: "Leading, Body, Tail".
        // Let's map: Leading -> dimW1, Body -> dimW2, Tail -> dimW3
        let wSum = 0;
        let wParts = [];
        if (selectedBoxConfig.useLeading) { wSum += Number(formData.dimW1 || 0); wParts.push(formData.dimW1 || 0); }
        if (selectedBoxConfig.useBody) { wSum += Number(formData.dimW2 || 0); wParts.push(formData.dimW2 || 0); }
        if (selectedBoxConfig.useTail) { wSum += Number(formData.dimW3 || 0); wParts.push(formData.dimW3 || 0); }

        let wCorrection = Number(selectedBoxConfig.widCorrection || 0);
        let finalW = wSum + wCorrection;

        let wFormula = wParts.join(' + ');
        if (wCorrection !== 0) wFormula += ` + (${wCorrection})`;
        setCalcDisplayW(finalW > 0 ? `${finalW} = ${wFormula}` : '');

        // Update Total Fields
        if (finalL !== formData.totalL) {
            setFormData(prev => ({ ...prev, totalL: finalL }));
        }

    }, [formData.dimL1, formData.dimL2, formData.dimL3, formData.dimL4, formData.dimL5, formData.dimW1, formData.dimW2, formData.dimW3, selectedBoxConfig]);

    const [touched, setTouched] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Mark field as touched
        setTouched(prev => ({ ...prev, [name]: true }));

        setFormData(prev => {
            const newState = { ...prev, [name]: value };

            // Sync Logic for A Type
            if (prev.boxType === 'A Type') {
                if (name === 'dimL2') newState.dimL4 = value; // S2 -> S4
                if (name === 'dimL3') newState.dimL5 = value; // S3 -> S5
            }

            // Sync Logic for Type A2: Leading defaults to match Tail unless manually input
            // Tail = dimW3, Leading = dimW1
            // If changing Tail (dimW3) AND Leading (dimW1) hasn't been touched manually
            if (prev.boxType === 'Type A2' || prev.boxType === 'A2 Type') { // Handling potential naming variations
                if (name === 'dimW3' && !touched.dimW1) {
                    newState.dimW1 = value;
                }
            }

            return newState;
        });
    };

    const handlePrintChange = (index, field, value) => {
        const newUnits = [...formData.printUnits];
        newUnits[index] = { ...newUnits[index], [field]: value };
        setFormData(prev => ({ ...prev, printUnits: newUnits }));
    };

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ width: '1000px', maxWidth: '95vw', height: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className={styles.header}>
                    <h2>產品資料 (Product Specs)</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>
                <div className={styles.body} style={{ overflowY: 'auto', padding: '10px' }}>

                    {/* Top: Info & Params */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                        {/* Info Left */}
                        <div style={{ flex: 2, display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
                            <label>紙箱編號</label>
                            <input name="boxNo" value={formData.boxNo} onChange={handleChange} />
                            <label>客戶名稱</label>
                            <input name="customer" value={formData.customer} onChange={handleChange} />

                            <label>品名</label>
                            <input name="productName" value={formData.productName} onChange={handleChange} style={{ gridColumn: '2 / 5' }} />

                            <label>盒型</label>
                            <div style={{ display: 'flex', gap: '5px', gridColumn: '2/3' }}>
                                <select
                                    name="boxType"
                                    value={formData.boxType}
                                    onChange={handleChange}
                                    style={{ flex: 1, padding: '4px' }}
                                >
                                    {boxTypes.map(b => (
                                        <option key={b.id} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* ERP Alias, Description, & Dimensions */}
                            <div style={{ gridColumn: '3/5', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
                                <div style={{ color: '#666', fontSize: '0.8rem' }}>
                                    ERP Alias: {selectedBoxConfig?.erpAlias || '-'}
                                </div>
                                {/* Description (Green Box) */}
                                <div style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    {selectedBoxConfig?.description || ''}
                                </div>
                                {/* Dimensions (Red Box) */}
                                {(boxDims.l > 0 || boxDims.w > 0 || boxDims.h > 0) && (
                                    <div style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                        {boxDims.l} x {boxDims.w} x {boxDims.h}
                                    </div>
                                )}
                            </div>

                            <div style={{ gridColumn: '1 / 5', display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                                <label>楞</label>
                                <select
                                    name="flute"
                                    value={formData.flute}
                                    onChange={(e) => {
                                        const selectedFlute = fluteSettings.find(f => f.name === e.target.value);
                                        setFormData(prev => ({
                                            ...prev,
                                            flute: e.target.value,
                                            thickness: selectedFlute ? selectedFlute.value : prev.thickness
                                        }));
                                    }}
                                >
                                    {fluteSettings.map(f => (
                                        <option key={f.name} value={f.name}>{f.name} ({f.value}mm)</option>
                                    ))}
                                </select>
                                <label>厚度</label>
                                <input
                                    name="thickness"
                                    value={formData.thickness}
                                    onChange={handleChange}
                                    style={{ width: '60px' }}
                                    readOnly
                                    title="厚度依據楞別自動設定"
                                />
                                <label>捆個數</label>
                                <input
                                    name="bundleCount"
                                    type="number"
                                    value={formData.bundleCount}
                                    onChange={(e) => {
                                        // 強制為 5 的倍數
                                        const val = Number(e.target.value) || 0;
                                        const rounded = Math.round(val / 5) * 5;
                                        setFormData(prev => ({ ...prev, bundleCount: rounded || 5 }));
                                    }}
                                    step="5"
                                    min="5"
                                    style={{ width: '60px' }}
                                />
                            </div>

                            <label>備註</label>
                            <textarea name="remarks" value={formData.remarks} onChange={handleChange} style={{ gridColumn: '2 / 5', height: '40px' }} />
                        </div>

                        {/* Params Right */}
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 60px', gap: '4px', fontSize: '0.9rem', borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
                            <label>PX1</label><input name="px1" value={formData.px1} onChange={handleChange} />
                            <label>PX2</label><input name="px2" value={formData.px2} onChange={handleChange} />
                            <label>PX3</label><input name="px3" value={formData.px3} onChange={handleChange} />
                            <label>PX4</label><input name="px4" value={formData.px4} onChange={handleChange} />
                            <label>PX5</label><input name="px5" value={formData.px5} onChange={handleChange} />

                            <label>送紙前擋間隙</label><input name="gapFeedFront" value={formData.gapFeedFront} onChange={handleChange} />
                            <label>中刀位置</label><input name="midKnife" value={formData.midKnife} onChange={handleChange} />
                        </div>
                    </div>

                    {/* Middle: Diagram & Print Units */}
                    <div style={{ display: 'flex', gap: '20px', height: '400px' }}>
                        {/* Diagram Area */}
                        <div style={{ flex: 3, border: '1px solid #999', background: '#e3f2fd', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>

                            {/* Image Overlay Diagram */}
                            {selectedBoxConfig?.image ? (
                                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <img src={selectedBoxConfig.image} alt="Box Diagram" style={{ maxHeight: '380px', maxWidth: '100%', display: 'block' }} />

                                        {/* Overlay Inputs */}
                                        {selectedBoxConfig.fieldPositions && Object.entries(selectedBoxConfig.fieldPositions).map(([key, pos]) => {
                                            let value = '';
                                            let name = '';
                                            let placeholder = '';

                                            // Map keys to formData fields
                                            if (key === 'S1') { value = formData.dimL1; name = 'dimL1'; placeholder = selectedBoxConfig.labelS1; }
                                            else if (key === 'S2') { value = formData.dimL2; name = 'dimL2'; placeholder = selectedBoxConfig.labelS2; }
                                            else if (key === 'S3') { value = formData.dimL3; name = 'dimL3'; placeholder = selectedBoxConfig.labelS3; }
                                            else if (key === 'S4') { value = formData.dimL4; name = 'dimL4'; placeholder = selectedBoxConfig.labelS4; }
                                            else if (key === 'S5') { value = formData.dimL5; name = 'dimL5'; placeholder = selectedBoxConfig.labelS5; }
                                            else if (key === 'Leading') { value = formData.dimW1; name = 'dimW1'; placeholder = selectedBoxConfig.labelLeading; }
                                            else if (key === 'Body') { value = formData.dimW2; name = 'dimW2'; placeholder = selectedBoxConfig.labelBody; }
                                            else if (key === 'Tail') { value = formData.dimW3; name = 'dimW3'; placeholder = selectedBoxConfig.labelTail; }
                                            else if (key === 'L') { value = calcDisplayL.split('=')[0].trim(); /* Read-only or Override? Keeping read-only for display logic */ }
                                            else if (key === 'W') { value = calcDisplayW.split('=')[0].trim(); }

                                            if (!name && key !== 'L' && key !== 'W') return null; // Skip unknown
                                            if (key === 'L' && !calcDisplayL) return null; // Hide if empty
                                            if (key === 'W' && !calcDisplayW) return null; // Hide if empty

                                            // Render Input or Display
                                            return (
                                                <div
                                                    key={key}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${pos.x}%`,
                                                        top: `${pos.y}%`,
                                                        transform: 'translate(-50%, -50%)',
                                                    }}
                                                >
                                                    {key === 'L' || key === 'W' ? (
                                                        <div style={{
                                                            background: key === 'L' ? '#ffebee' : '#e3f2fd',
                                                            border: `1px solid ${key === 'L' ? '#d32f2f' : '#1976d2'}`,
                                                            padding: '2px 5px',
                                                            color: key === 'L' ? '#d32f2f' : '#1976d2',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.9rem',
                                                            whiteSpace: 'nowrap',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                        }}>
                                                            {key === 'L' ? calcDisplayL : calcDisplayW}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            name={name}
                                                            value={value}
                                                            onChange={handleChange}
                                                            placeholder={placeholder || key}
                                                            style={{
                                                                width: '60px',
                                                                padding: '2px',
                                                                fontSize: '0.8rem',
                                                                textAlign: 'center',
                                                                border: '1px solid #1976d2',
                                                                background: 'rgba(255, 255, 255, 0.9)',
                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* Fallback Text */
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}>
                                    請在設定頁面上傳盒型圖片並設定欄位位置 (Please upload box image and configure fields in Settings)
                                </div>
                            )}
                        </div>

                        {/* Print Units Table */}
                        <div style={{ flex: 1, border: '1px solid #ccc', padding: '5px' }}>
                            <h4>印刷部</h4>
                            <table style={{ width: '100%' }}>
                                <thead>
                                    <tr><th></th><th>印墨</th><th>位置</th><th>皮帶</th><th>壓線</th></tr>
                                </thead>
                                <tbody>
                                    {formData.printUnits.map((u, i) => (
                                        <tr key={u.id}>
                                            <td>{['一', '二', '三', '四'][i]}</td>
                                            <td><input value={u.ink} onChange={(e) => handlePrintChange(i, 'ink', e.target.value)} style={{ width: '40px' }} /></td>
                                            <td><input value={u.pos} onChange={(e) => handlePrintChange(i, 'pos', e.target.value)} style={{ width: '40px' }} /></td>
                                            <td><input value={u.gap} onChange={(e) => handlePrintChange(i, 'gap', e.target.value)} style={{ width: '40px' }} /></td>
                                            <td><input value={u.press} onChange={(e) => handlePrintChange(i, 'press', e.target.value)} style={{ width: '40px' }} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
                <div className={styles.footer} style={{ justifyContent: 'flex-end', gap: '10px' }}>
                    <button className={styles.primaryBtn} onClick={handleSave}>確定 (Save)</button>
                    <button className={styles.secondaryBtn} onClick={onClose}>取消 (Cancel)</button>
                </div>
            </div>
        </div>
    );
};

export default ProductFormModal;
