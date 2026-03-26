import React from 'react';
import styles from './BoxDiagram.module.css';

/**
 * BoxDiagram - 紙箱展開圖元件
 * 
 * @param {Object} data - 訂單資料物件，包含以下欄位：
 *   - boxLen: 紙箱長度 (對應 L2)
 *   - boxWid: 紙箱寬度 (對應 W1/W2)
 *   - boxHgt: 紙箱高度 (對應 H2)
 *   - l1, l3: 舌片長度 (可選)
 *   - h1, h3: 上下蓋高度 (可選)
 *   - special: 左側特殊尺寸 (可選)
 *   - totalW: 總寬度 (可選，預設計算)
 * 
 * @returns {JSX.Element} 紙箱展開圖 SVG
 */
const BoxDiagram = ({ data = {} }) => {
    // 判斷是否有有效資料
    // 改為檢測 order 是否存在（有 id 或 boxNo），而非依賴尺寸欄位
    // 因為使用者可能未填入尺寸，但仍希望顯示展開圖框架
    const hasData = data && (data.id || data.boxNo);

    // ======= 欄位語義映射說明 =======
    // ProductFormModal 欄位定義：
    //   dimL1-L6: 長度方向的 S1-S6 區段 (水平展開)
    //   dimW1: Leading (前導寬度)
    //   dimW2: Body (箱體寬度)
    //   dimW3: Tail (尾部寬度)
    //   totalL: 總長度 (由 dimL 欄位計算)
    //
    // BoxDiagram 顯示位置：
    //   上排 (水平)：L1, W1, L2, W2, L3 → 對應 dimL1, dimL2, dimL3, dimL4, dimL5
    //   右側 (垂直)：H1, H2, H3 → 對應 dimW1 (Leading), dimW2 (Body), dimW3 (Tail)
    //   左側 special：總高度
    //   下方 totalW：總寬度

    // 水平方向 (長度區段) - 映射 dimL1-L5 到展開圖的 L1, W1, L2, W2, L3
    const l1 = data.dimL1 ?? data.l1 ?? '';      // S1 區段
    const w1 = data.dimL2 ?? data.w1 ?? '';      // S2 區段 (對應 W1 位置)
    const l2 = data.dimL3 ?? data.boxLen ?? data.l2 ?? '';  // S3 區段
    const w2 = data.dimL4 ?? data.boxWid ?? data.w2 ?? '';  // S4 區段 (對應 W2 位置)
    const l3 = data.dimL5 ?? data.l3 ?? '';      // S5 區段

    // 垂直方向 (寬度區段) - 映射到右側 H1, H2, H3
    const h1 = data.dimW1 ?? data.h1 ?? '';      // Leading (前導)
    const h2 = data.dimW2 ?? data.boxHgt ?? data.h2 ?? '';  // Body (箱體)
    const h3 = data.dimW3 ?? data.h3 ?? '';      // Tail (尾部)

    // 計算總值
    const special = data.special ?? (Number(h1 || 0) + Number(h2 || 0) + Number(h3 || 0));
    const totalW = data.totalL ?? data.totalW ?? (Number(l1 || 0) + Number(w1 || 0) + Number(l2 || 0) + Number(w2 || 0) + Number(l3 || 0));

    // 無資料時顯示空狀態
    if (!hasData) {
        return (
            <div className={styles.diagramWrapper} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#e3f2fd',
                border: '2px dashed #90caf9'
            }}>
                <div style={{
                    textAlign: 'center',
                    color: '#1976d2',
                    fontSize: '1rem'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                    <div>請選取左側排程以顯示紙箱展開圖</div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                        Select an order from the left to display box diagram
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.diagramWrapper}>
            {/* Top Inputs (L1-L3) - 使用 value 而非 defaultValue 以確保資料更新 */}
            <div className={styles.absInput} style={{ top: '15%', left: '8%' }}><input value={l1} readOnly /></div>
            <div className={styles.absInput} style={{ top: '15%', left: '26%' }}><input value={w1} readOnly /></div>
            <div className={styles.absInput} style={{ top: '15%', left: '46%' }}><input value={l2} readOnly /></div>
            <div className={styles.absInput} style={{ top: '15%', left: '66%' }}><input value={w2} readOnly /></div>
            <div className={styles.absInput} style={{ top: '15%', left: '86%' }}><input value={l3} readOnly /></div>

            {/* Right Side Heights (H1-H3) */}
            <div className={styles.absInput} style={{ top: '28%', right: '2%' }}><input value={h1} readOnly /></div>
            <div className={styles.absInput} style={{ top: '50%', right: '2%' }}><input value={h2} readOnly /></div>
            <div className={styles.absInput} style={{ top: '72%', right: '2%' }}><input value={h3} readOnly /></div>

            {/* Left Side Special Input */}
            <div className={styles.absInput} style={{ top: '50%', left: '2%' }}><input value={special} readOnly /></div>

            {/* Bottom Total Width */}
            <div className={styles.absInput} style={{ bottom: '5%', left: '50%', transform: 'translateX(-50%)' }}>
                <input value={totalW} style={{ width: '60px' }} readOnly />
            </div>
            <div className={styles.unitText}>尺寸單位: mm</div>

            {/* SVG Drawing */}
            <svg width="100%" height="100%" viewBox="0 0 600 350" style={{ pointerEvents: 'none' }}>
                {/* Main Box Grid */}
                <rect x="60" y="80" width="500" height="190" fill="#f3e5ab" stroke="black" strokeWidth="2" />

                {/* Vertical Lines */}
                <line x1="160" y1="80" x2="160" y2="270" stroke="black" strokeWidth="2" />
                <line x1="260" y1="80" x2="260" y2="270" stroke="black" strokeWidth="2" />
                <line x1="360" y1="80" x2="360" y2="270" stroke="black" strokeWidth="2" />
                <line x1="460" y1="80" x2="460" y2="270" stroke="black" strokeWidth="2" />

                {/* Horizontal Lines */}
                <line x1="60" y1="140" x2="560" y2="140" stroke="black" strokeWidth="2" />
                <line x1="60" y1="210" x2="560" y2="210" stroke="black" strokeWidth="2" />

                {/* Flap on Left */}
                <path d="M60 140 L40 140 Q35 140 35 145 L35 205 Q35 210 40 210 L60 210" fill="#f3e5ab" stroke="black" strokeWidth="2" />

                {/* Red Arrow Lines */}
                <defs>
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L6,3 z" fill="red" />
                    </marker>
                </defs>

                {/* Left Height Line */}
                <line x1="25" y1="80" x2="25" y2="270" stroke="red" strokeWidth="1" />
                <line x1="20" y1="80" x2="30" y2="80" stroke="red" strokeWidth="1" />
                <line x1="20" y1="270" x2="30" y2="270" stroke="red" strokeWidth="1" />

                {/* Bottom Width Line */}
                <line x1="60" y1="300" x2="560" y2="300" stroke="red" strokeWidth="1" />
                <line x1="60" y1="295" x2="60" y2="305" stroke="red" strokeWidth="1" />
                <line x1="560" y1="295" x2="560" y2="305" stroke="red" strokeWidth="1" />
            </svg>
        </div>
    );
};

export default BoxDiagram;
