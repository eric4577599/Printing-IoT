import React, { useState, useEffect } from 'react';
import useProductionStore from '../stores/productionStore';
import { useLanguage } from '../modules/language/LanguageContext';

/**
 * DocsPortal — 內建文件入口
 * 提供 /docs 路由供團隊在線檢查作業流程、設計文件、操作紀錄與測試報告
 *
 * Phase 1: 骨架 — Markdown 文件索引 + 內容渲染
 * Phase 2: 整合操作紀錄 (Debug Log Viewer)
 * Phase 5: 整合測試報告儀表板
 */

const DocsPortal = () => {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('docs'); // 'docs' | 'logs'
  const logs = useProductionStore((s) => s.logs);

  /**
   * 文件索引 — 分類與清單顯示名稱走 i18n,path 為資料不翻譯
   * 輸入:t(語系翻譯函式);輸出:分類/檔案陣列供側欄渲染
   */
  const DOC_INDEX = [
    { category: `📋 ${t('docs.category.workflow')}`, files: [
      { name: t('docs.file.manual'), path: '操作說明書.md' },
      { name: 'Operator Manual', path: 'Operator Manual.md' },
      { name: 'Supervisor Manual', path: 'Supervisor_Manual.md' },
    ]},
    { category: `🏗️ ${t('docs.category.design')}`, files: [
      { name: t('docs.file.sasd'), path: 'SASD說明書.md' },
      { name: t('docs.file.dev'), path: '開發說明書.md' },
      { name: t('docs.file.mqtt'), path: 'MQTT訊息處理流程.md' },
      { name: t('docs.file.maintenance'), path: '維護保養開發設計書.md' },
    ]},
    { category: `🚀 ${t('docs.category.deploy')}`, files: [
      { name: 'Deployment Guide v1', path: 'DEPLOYMENT_GUIDE_v1.md' },
      { name: 'Flexo HQ Integration', path: 'FLEXO_HQ_INTEGRATION.md' },
      { name: t('docs.file.handover'), path: 'HANDOVER.md' },
      { name: t('docs.file.projectStatus'), path: 'PROJECT_STATUS.md' },
    ]},
    { category: `🔄 ${t('docs.category.refactor')}`, files: [
      { name: t('docs.file.refactorLog'), path: 'REFACTORING_LOG.md' },
    ]},
    { category: `🧪 ${t('docs.category.testing')}`, files: [
      { name: t('docs.file.testCases'), path: 'TEST_CASES.md' },
      { name: t('docs.file.stressTest'), path: 'STRESS_TEST_REPORT.md' },
      { name: `${t('docs.file.review')} 2026/01/16`, path: 'PROJECT_REVIEW_2026_01_16.md' },
    ]},
    { category: `📅 ${t('docs.category.meeting')}`, files: [
      { name: `2026/01/22 ${t('docs.file.meeting1')}`, path: '20260122_維修管理系統分離_團隊會議議程.md' },
      // 2026/01/22 Smart Parts 第一階段會議議程:模組已隨 C′ 遷移移入 MM,索引項移除;原始檔仍保留於 doc/
      { name: `2026/01/22 ${t('docs.file.meeting2')}`, path: '20260122正隆苗栗保養計劃討論.md' },
    ]},
  ];

  const fetchDocument = async (filePath) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/docs/${encodeURIComponent(filePath)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      setContent(text);
    } catch (err) {
      setError(`${t('docs.error.loadFail')}: ${err.message}`);
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
          📖 {t('docs.header.title')}
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
          🔴 {t('docs.tab.liveLog')} ({logs.length})
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
              🔴 {t('docs.liveLog.title')}
            </h2>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '16px' }}>
              {t('docs.liveLog.desc')}
            </p>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                {t('docs.liveLog.empty')}
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
              {t('docs.welcome.title')}
            </h2>
            <p>{t('docs.welcome.subtitle')}</p>
            <p style={{ fontSize: '0.85rem', marginTop: '16px' }}>
              {t('docs.welcome.desc')}
            </p>
          </div>
        )}

        {activeTab === 'docs' && loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            {t('docs.loading')}
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
            <strong>⚠️ {t('docs.error.label')}</strong> {error}
            <p style={{ fontSize: '0.85rem', marginTop: '8px', color: '#666' }}>
              {t('docs.error.hint')} <code>/api/docs/:filename</code>
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
