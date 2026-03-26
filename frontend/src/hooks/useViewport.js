import { useState, useEffect } from 'react';

/**
 * useViewport Hook
 * 偵測並追蹤螢幕尺寸變化,提供響應式設計所需的 viewport 資訊
 * 
 * @returns {Object} viewport 資訊
 * @returns {number} width - 當前視窗寬度 (px)
 * @returns {number} height - 當前視窗高度 (px)
 * @returns {number} scaleFactor - 相對於基準解析度的縮放係數
 * @returns {boolean} isMobile - 是否為行動裝置尺寸 (< 768px)
 * @returns {boolean} isTablet - 是否為平板尺寸 (768px ~ 1024px)
 * @returns {boolean} isDesktop - 是否為桌面尺寸 (>= 1024px)
 */
const useViewport = () => {
    // 基準解析度 (Full HD)
    const BASE_WIDTH = 1920;
    const BASE_HEIGHT = 1080;

    const [viewport, setViewport] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
        scaleFactor: 1,
        isMobile: false,
        isTablet: false,
        isDesktop: true
    });

    useEffect(() => {
        /**
         * 計算縮放係數與裝置類型
         * 使用寬度作為主要縮放依據,確保水平方向的一致性
         */
        const calculateViewport = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            // 計算相對於基準解析度的縮放係數
            // 使用寬度比例,確保 UI 元件在不同螢幕上保持相同的視覺比例
            const scaleFactor = width / BASE_WIDTH;

            // 判斷裝置類型
            const isMobile = width < 768;
            const isTablet = width >= 768 && width < 1024;
            const isDesktop = width >= 1024;

            setViewport({
                width,
                height,
                scaleFactor,
                isMobile,
                isTablet,
                isDesktop
            });

            // 更新 CSS 變數,供全域樣式使用
            document.documentElement.style.setProperty('--viewport-width', `${width}px`);
            document.documentElement.style.setProperty('--viewport-height', `${height}px`);
            document.documentElement.style.setProperty('--scale-factor', scaleFactor.toString());
        };

        // 初始計算
        calculateViewport();

        // 監聽視窗大小變化
        // 使用 debounce 避免過度頻繁的重新計算
        let timeoutId;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(calculateViewport, 100);
        };

        window.addEventListener('resize', handleResize);

        // 清理函式
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    return viewport;
};

export default useViewport;
