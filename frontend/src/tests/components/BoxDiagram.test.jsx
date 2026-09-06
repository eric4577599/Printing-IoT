import { describe, it, expect } from 'vitest';
import { render as rtlRender } from '@testing-library/react';
import BoxDiagram from '../../components/common/BoxDiagram';
import { LanguageProvider } from '../../modules/language/LanguageContext';

// BoxDiagram 現用 useLanguage(),測試需包在 LanguageProvider 內才能取得 t()
const render = (ui) => rtlRender(<LanguageProvider>{ui}</LanguageProvider>);

/**
 * BoxDiagram 面數與尺寸欄對齊回歸測試(spec-v1 §A3-2)
 *
 * 驗證重點:
 * 1. RSC/HSC 箱型:預設 4 面(長寬長寬)+ 舌片,不得多畫一面
 * 2. S5(dimL5)有值時才呈現 5 面
 * 3. 上方尺寸欄格數/位置與各面分隔線對齊(共用 segCount 均分邏輯)
 */

/**
 * 取得上方尺寸欄 input 清單
 * 輸入:render 後的 container
 * 輸出:top 為 15%(上排)之尺寸欄 wrapper div 陣列
 * 邏輯:BoxDiagram 以 inline style top:15% 標記上排尺寸欄,依此過濾
 */
const getTopInputs = (container) =>
    [...container.querySelectorAll('div')].filter(
        (d) => d.style && d.style.top === '15%' && d.querySelector('input')
    );

/**
 * 取得箱身垂直分隔線清單
 * 輸入:render 後的 container
 * 輸出:SVG 中 x1===x2(垂直)、y2=270(貫穿箱身)且位於箱身內(60<x<560)的黑色 line 陣列
 * 邏輯:面與面之間以垂直黑實線分隔,面數 N 對應 N-1 條分隔線;
 *       需排除左側紅色高度標線(x=25,同為垂直且 y2=270)
 */
const getVerticalDividers = (container) =>
    [...container.querySelectorAll('line')].filter((l) => {
        const x = parseFloat(l.getAttribute('x1'));
        return (
            l.getAttribute('x1') === l.getAttribute('x2') &&
            l.getAttribute('y2') === '270' &&
            l.getAttribute('stroke') === 'black' &&
            x > 60 && x < 560
        );
    });

// 共用測試資料:RSC 四段尺寸(長寬長寬),S5 留空
const rscOrder = {
    id: 1,
    boxType: 'RSC',
    dimL1: 300,
    dimL2: 200,
    dimL3: 300,
    dimL4: 200,
    dimL5: '',
    dimW1: 50,
    dimW2: 400,
    dimW3: 50,
};

describe('BoxDiagram 面數邏輯(A3-2)', () => {
    it('RSC 箱型 S5 無值:4 面 + 舌片,3 條垂直分隔線', () => {
        const { container } = render(<BoxDiagram data={rscOrder} />);

        // 上方尺寸欄恰 4 格
        const tops = getTopInputs(container);
        expect(tops).toHaveLength(4);
        expect(tops.map((d) => d.querySelector('input').value)).toEqual([
            '300', '200', '300', '200',
        ]);

        // 垂直分隔線恰 3 條(4 面之間)
        expect(getVerticalDividers(container)).toHaveLength(3);

        // 左側黏合舌片存在
        expect(container.querySelector('path')).not.toBeNull();
    });

    it('HSC 箱型 S5 無值:同為 4 面,且無上蓋 H1 尺寸欄', () => {
        const { container } = render(
            <BoxDiagram data={{ ...rscOrder, boxType: 'HSC' }} />
        );

        expect(getTopInputs(container)).toHaveLength(4);
        expect(getVerticalDividers(container)).toHaveLength(3);

        // HSC 無上蓋:右側僅 H2/H3 兩格(top 28% 的 H1 不渲染)
        const rightInputs = [...container.querySelectorAll('div')].filter(
            (d) => d.style && d.style.right === '2%' && d.querySelector('input')
        );
        expect(rightInputs).toHaveLength(2);
    });

    it('S5(dimL5)有值:5 面,4 條垂直分隔線', () => {
        const { container } = render(
            <BoxDiagram data={{ ...rscOrder, dimL5: 60 }} />
        );

        const tops = getTopInputs(container);
        expect(tops).toHaveLength(5);
        expect(tops.map((d) => d.querySelector('input').value)).toEqual([
            '300', '200', '300', '200', '60',
        ]);

        expect(getVerticalDividers(container)).toHaveLength(4);
    });

    it('尺寸欄位置與分隔線對齊:各欄置中於對應面、分隔線均分箱身', () => {
        const { container } = render(
            <BoxDiagram data={{ ...rscOrder, dimL5: 60 }} />
        );

        const segCount = 5;
        const colW = 500 / segCount; // 箱身 x 60~560 均分

        // 上方尺寸欄:第 i 欄置中於第 i 面中點
        const tops = getTopInputs(container);
        tops.forEach((d, i) => {
            const expectedLeft = ((60 + (i + 0.5) * colW) / 600) * 100;
            expect(parseFloat(d.style.left)).toBeCloseTo(expectedLeft, 5);
        });

        // 垂直分隔線:恰落在各面交界 x = 60 + k*colW
        const xs = getVerticalDividers(container)
            .map((l) => parseFloat(l.getAttribute('x1')))
            .sort((a, b) => a - b);
        xs.forEach((x, k) => {
            expect(x).toBeCloseTo(60 + (k + 1) * colW, 5);
        });
    });
});
