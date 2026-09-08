import React, { useState, useMemo } from 'react';
import useProductionStore from '../stores/productionStore';
import { useLanguage } from '../modules/language/LanguageContext';
import { useAuth } from '../modules/auth/AuthContext';
import { listDocs, loadDoc } from '../modules/docs/docRegistry';

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

  const { hasRole } = useAuth();

  /**
   * 文件索引 —— 由 docRegistry 依「建置時實際收到的檔案」+「當前角色」產生。
   * 輸入:hasRole / t;輸出:分類與檔案陣列供側欄渲染;
   * 邏輯:不再手寫清單 —— 手寫的會列出不存在的檔(原本的 開發說明書.md、
   *       維護保養開發設計書.md 就是),點下去必然 404。
   */
  const docIndex = useMemo(() => listDocs({ hasRole, t }), [hasRole, t]);

  /**
   * 讀取一份文件並填入內容區。
   * 輸入:檔名;輸出:無(改寫 content / error / loading 狀態);
   * 邏輯:S14 起**不發任何網路請求** —— 內容在建置時就收進前端,
   *       點選時載入對應的 chunk。因此不會再有 401 / 404 / 斷線問題。
   *       仍保留錯誤處理:角色無權(FORBIDDEN)或檔案不存在(NOT_FOUND)要說清楚是哪一種。
   */
  const openDocument = async (filePath) => {
    setLoading(true);
    setError(null);
    try {
      const text = await loadDoc(filePath, hasRole);
      setContent(text);
    } catch (err) {
      const reason = err?.code === 'FORBIDDEN'
        ? t('docs.error.forbidden')
        : err?.code === 'NOT_FOUND'
          ? t('docs.error.notFound')
          : err.message;
      setError(`${t('docs.error.loadFail')}: ${reason}`);
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (file) => {
    setSelectedFile(file);
    setActiveTab('docs');
    openDocument(file.path);
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

        {docIndex.map((cat) => (
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
