import React, { useState, useEffect } from 'react';
import useProductionStore from '../stores/productionStore';

/**
 * DocsPortal — 內建文件入口
 * 提供 /docs 路由供團隊在線檢查作業流程、設計文件、操作紀錄與測試報告
 *
 * Phase 1: 骨架 — Markdown 文件索引 + 內容渲染
 * Phase 2: 整合操作紀錄 (Debug Log Viewer)
 * Phase 5: 整合測試報告儀表板
 */

const DOC_INDEX = [
  { category: '📋 作業流程', files: [
    { name: '操作說明書', path: '操作說明書.md' },
    { name: 'Operator Manual', path: 'Operator Manual.md' },
    { name: 'Supervisor Manual', path: 'Supervisor_Manual.md' },
  ]},
  { category: '🏗️ 設計文件', files: [
    { name: 'SASD 說明書', path: 'SASD說明書.md' },
    { name: '開發說明書', path: '開發說明書.md' },
    { name: 'MQTT 訊息處理流程', path: 'MQTT訊息處理流程.md' },
    { name: '維護保養開發設計書', path: '維護保養開發設計書.md' },
  ]},
  { category: '🚀 部署與運維', files: [
    { name: 'Deployment Guide v1', path: 'DEPLOYMENT_GUIDE_v1.md' },
    { name: 'Flexo HQ Integration', path: 'FLEXO_HQ_INTEGRATION.md' },
    { name: '移交文件 (Handover)', path: 'HANDOVER.md' },
    { name: '專案狀態', path: 'PROJECT_STATUS.md' },
  ]},
  { category: '🔄 重構紀錄', files: [
    { name: '重構變更紀錄', path: 'REFACTORING_LOG.md' },
  ]},
  { category: '🧪 測試與品質', files: [
    { name: '測試案例', path: 'TEST_CASES.md' },
    { name: '壓力測試報告', path: 'STRESS_TEST_REPORT.md' },
    { name: '專案審查 2026/01/16', path: 'PROJECT_REVIEW_2026_01_16.md' },
  ]},
  { category: '📅 會議紀錄', files: [
    { name: '2026/01/22 維修管理系統分離', path: '20260122_維修管理系統分離_團隊會議議程.md' },
    { name: '2026/01/22 零件管理第一階段', path: '20260122_零件管理第一階段_會議議程.md' },
    { name: '2026/01/22 苗栗保養計劃', path: '20260122正隆苗栗保養計劃討論.md' },
  ]},
];

const DocsPortal = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('docs'); // 'docs' | 'logs'
  const logs = useProductionStore((s) => s.logs);

  const fetchDocument = async (filePath) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/docs/${encodeURIComponent(filePath)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      setContent(text);
    } catch (err) {
      setError(`無法載入文件: ${err.message}`);
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (file) => {
    setSelectedFile(file);
    setActiveTab('docs');
    fetchDocument(file.path);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      background: 'var(--bg-main, #f5f7fa)',
      color: 'var(--text-primary, #1a1a2e)',
    }}>
      {/* Sidebar — Document Index */}
      <aside style={{
        width: '280px',
        minWidth: '280px',
        background: 'var(--bg-panel, #fff)',
        borderRight: '1px solid var(--border-color, #e0e0e0)',
        overflowY: 'auto',
        padding: '16px 0',
      }}>
        <h2 style={{
          margin: '0 16px 16px',
          fontSize: '1.1rem',
          fontWeight: '700',
          color: 'var(--primary-blue, #1976d2)',
        }}>
          📖 文件入口
        </h2>

        {/* Operation Logs Button */}
        <button
          onClick={() => setActiveTab('logs')}
          style={{
            display: 'block',
            width: 'calc(100% - 32px)',
            margin: '0 16px 12px',
            padding: '10px 12px',
            background: activeTab === 'logs'
              ? 'linear-gradient(135deg, #ff9800, #f57c00)'
              : 'linear-gradient(135deg, #fff3e0, #ffe0b2)',
            color: activeTab === 'logs' ? '#fff' : '#e65100',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.9rem',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          🔴 即時操作紀錄 ({logs.length})
        </button>

        {DOC_INDEX.map((cat) => (
          <div key={cat.category} style={{ marginBottom: '12px' }}>
            <div style={{
              padding: '6px 16px',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: 'var(--text-secondary, #666)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {cat.category}
            </div>
            {cat.files.map((file) => (
              <button
                key={file.path}
                onClick={() => handleSelect(file)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 16px 8px 24px',
                  border: 'none',
                  background: selectedFile?.path === file.path && activeTab === 'docs'
                    ? 'var(--primary-blue, #1976d2)'
                    : 'transparent',
                  color: selectedFile?.path === file.path && activeTab === 'docs'
                    ? '#fff'
                    : 'var(--text-primary, #333)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  borderRadius: '0',
                  transition: 'background 0.15s',
                }}
                onMouseOver={(e) => {
                  if (selectedFile?.path !== file.path || activeTab !== 'docs') {
                    e.target.style.background = 'var(--bg-hover, #f0f0f0)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedFile?.path !== file.path || activeTab !== 'docs') {
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                {file.name}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: '24px 32px',
        overflowY: 'auto',
      }}>
        {/* === Live Operation Logs Tab === */}
        {activeTab === 'logs' && (
          <div>
            <h2 style={{ marginTop: 0, color: 'var(--primary-blue, #1976d2)', borderBottom: '2px solid #ff9800', paddingBottom: '8px' }}>
              🔴 即時操作紀錄 (Live Operation Logs)
            </h2>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '16px' }}>
              顯示來自 Dashboard 的即時操作記錄，包含 F-Key 操作、訂單異動、系統事件等。
            </p>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                尚無操作紀錄 — 開始使用 Dashboard 後紀錄會自動產生
              </div>
            ) : (
              <div style={{
                background: '#1e1e2e',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '0.85rem',
                maxHeight: '600px',
                overflowY: 'auto',
              }}>
                {logs.map((log, i) => (
                  <div key={i} style={{
                    padding: '4px 8px',
                    borderBottom: '1px solid #333',
                    color: log.message.includes('Failed') || log.message.includes('⚠️')
                      ? '#ff6b6b'
                      : log.message.includes('✅') || log.message.includes('Success')
                      ? '#69db7c'
                      : '#c9d1d9',
                  }}>
                    <span style={{ color: '#7c8db5', marginRight: '12px' }}>{log.time}</span>
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === Document View Tab === */}
        {activeTab === 'docs' && !selectedFile && (
          <div style={{
            textAlign: 'center',
            marginTop: '80px',
            color: 'var(--text-secondary, #888)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📖</div>
            <h2 style={{ fontWeight: '600', marginBottom: '8px' }}>
              Printing IoT 文件系統
            </h2>
            <p>從左側選擇文件開始瀏覽</p>
            <p style={{ fontSize: '0.85rem', marginTop: '16px' }}>
              包含作業流程、設計文件、操作紀錄、重構日誌與測試報告
            </p>
          </div>
        )}

        {activeTab === 'docs' && loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            載入中...
          </div>
        )}

        {activeTab === 'docs' && error && (
          <div style={{
            padding: '16px',
            background: '#fff3f3',
            border: '1px solid #ffcccc',
            borderRadius: '8px',
            color: '#d32f2f',
          }}>
            <strong>⚠️ 錯誤：</strong> {error}
            <p style={{ fontSize: '0.85rem', marginTop: '8px', color: '#666' }}>
              提示：需要後端 API 端點 <code>/api/docs/:filename</code> 來提供文件內容。
              此功能將在 Phase 3 後端整合時完成。
            </p>
          </div>
        )}

        {activeTab === 'docs' && content && !loading && (
          <div style={{
            background: 'var(--bg-panel, #fff)',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1))',
            lineHeight: '1.7',
          }}>
            <h2 style={{ marginTop: '0', borderBottom: '2px solid var(--primary-blue, #1976d2)', paddingBottom: '8px' }}>
              {selectedFile?.name}
            </h2>
            <pre style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
            }}>
              {content}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
};

export default DocsPortal;
