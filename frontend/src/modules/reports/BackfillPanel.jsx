import React, { useState } from 'react';
import { useBackfill } from '../../hooks/useBackfill';
import { useLanguage } from '../language/LanguageContext';

/**
 * 本機舊實績回填面板(handoff Next Step 9)
 *
 * 設計上只有一條原則:**先看清楚,再動手。**
 * 掃描是唯讀的,把「會送幾筆、有幾筆是有損轉換、有幾筆送不上去」全部攤開,
 * 使用者確認之後才會出現回填按鈕。回填是寫入正式資料的動作,
 * 不該用一個按鈕就完成 —— 尤其是舊資料的轉換本來就有猜測成分。
 *
 * @param {Object} props
 * @param {number} props.localOnlyCount - 目前區間內僅存在本機的筆數(用來決定要不要顯示)
 * @param {Function} [props.onCompleted] - 回填結束後的回呼,讓父層重新載入報表
 */
const BackfillPanel = ({ localOnlyCount = 0, onCompleted }) => {
    const { t } = useLanguage();
    const { scan, run, cancel, state } = useBackfill();
    const [expanded, setExpanded] = useState(false);

    // 沒有本機殘留就完全不出現 —— 不要在乾淨的系統上擺一個看不懂的維護按鈕
    if (localOnlyCount === 0 && state.phase === 'idle') return null;

    const { phase, summary, progress, results, error } = state;

    const created = results.filter(r => r?.status === 'created').length;
    const already = results.filter(r => r?.status === 'alreadyExists').length;
    const conflicts = results.filter(r => r?.status === 'conflict');
    const failures = results.filter(r => r?.status === 'failed');

    return (
        <div style={box} data-testid="backfill-panel">
            <div style={header}>
                <strong style={{ fontSize: 14 }}>{t('backfill.title')}</strong>
                <button
                    type="button"
                    style={linkBtn}
                    onClick={() => setExpanded(v => !v)}
                    data-testid="backfill-toggle"
                >
                    {expanded ? t('backfill.collapse') : t('backfill.expand')}
                </button>
            </div>

            {!expanded && (
                <p style={muted}>{localOnlyCount} {t('backfill.hint')}</p>
            )}

            {expanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    <p style={muted}>{t('backfill.explain')}</p>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            style={btn}
                            onClick={scan}
                            disabled={phase === 'scanning' || phase === 'running'}
                            data-testid="backfill-scan"
                        >
                            {phase === 'scanning' ? t('backfill.scanning') : t('backfill.scan')}
                        </button>

                        {/* 掃描完且真的有東西要送,才出現寫入按鈕 */}
                        {phase === 'scanned' && summary?.pending > 0 && (
                            <button
                                type="button"
                                style={{ ...btn, ...primaryBtn }}
                                onClick={async () => { await run(); onCompleted?.(); }}
                                data-testid="backfill-run"
                            >
                                {t('backfill.run')}({summary.pending})
                            </button>
                        )}

                        {phase === 'running' && (
                            <button type="button" style={btn} onClick={cancel} data-testid="backfill-cancel">
                                {t('backfill.cancel')}
                            </button>
                        )}
                    </div>

                    {error && (
                        <p style={{ ...muted, color: '#b3402f' }} data-testid="backfill-error">
                            {t('backfill.scanFailed')}
                        </p>
                    )}

                    {summary && (
                        <div style={panel} data-testid="backfill-summary">
                            <Row label={t('backfill.summary.localTotal')} value={summary.localTotal} />
                            <Row label={t('backfill.summary.alreadySynced')} value={summary.alreadySynced} />
                            <Row label={t('backfill.summary.pending')} value={summary.pending} strong />
                            {summary.duplicateKeys > 0 && (
                                <Row label={t('backfill.summary.duplicateKeys')} value={summary.duplicateKeys} />
                            )}
                            {summary.blocked.length > 0 && (
                                <Row label={t('backfill.summary.blocked')} value={summary.blocked.length} warn />
                            )}

                            {/* 有損轉換必須攤在使用者面前,不能只寫在程式碼註解裡 */}
                            {Object.keys(summary.issues).length > 0 && (
                                <div style={{ marginTop: 8 }} data-testid="backfill-issues">
                                    <div style={{ ...muted, marginBottom: 4 }}>{t('backfill.issues.title')}</div>
                                    <ul style={list}>
                                        {Object.entries(summary.issues).map(([kind, count]) => (
                                            <li key={kind}>{t(`backfill.issues.${kind}`)}:{count}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {summary.blocked.length > 0 && (
                                <div style={{ marginTop: 8 }} data-testid="backfill-blocked">
                                    <div style={{ ...muted, marginBottom: 4 }}>{t('backfill.blockedTitle')}</div>
                                    <ul style={list}>
                                        {summary.blocked.slice(0, 10).map((b, i) => (
                                            <li key={i}>{b.key || '(無編號)'} — {b.reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {progress && (
                        <p style={muted} data-testid="backfill-progress">
                            {progress.done} / {progress.total}
                            {progress.waitingForRateLimit ? ` — ${t('backfill.waitingRateLimit')}` : ''}
                        </p>
                    )}

                    {phase === 'done' && (
                        <div style={panel} data-testid="backfill-result">
                            <Row label={t('backfill.result.created')} value={created} strong />
                            <Row label={t('backfill.result.alreadyExists')} value={already} />
                            {conflicts.length > 0 && (
                                <>
                                    <Row label={t('backfill.result.conflict')} value={conflicts.length} warn />
                                    <ul style={list}>
                                        {conflicts.slice(0, 10).map((c, i) => (
                                            <li key={i}>{c.key} — {c.detail}</li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            {failures.length > 0 && (
                                <>
                                    <Row label={t('backfill.result.failed')} value={failures.length} warn />
                                    <ul style={list}>
                                        {failures.slice(0, 10).map((f, i) => (
                                            <li key={i}>{f.key} — {f.detail}</li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            <p style={muted}>{t('backfill.result.rerunHint')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * 面板內的一列標籤/數值。
 * @param {Object} props - label 文字、value 數值、strong 是否強調、warn 是否示警
 */
const Row = ({ label, value, strong, warn }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
        <span style={{ color: '#5a6a72' }}>{label}</span>
        <span style={{
            fontWeight: strong || warn ? 700 : 400,
            color: warn ? '#8a6210' : 'inherit',
            fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
    </div>
);

// 走行內樣式:本面板是唯一使用者,不值得為它新增一份 CSS module
const box = {
    border: '1px solid #d2dadd', borderRadius: 4, padding: '12px 14px',
    margin: '8px 0', background: 'rgba(127,127,127,.04)',
};
const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 };
const muted = { fontSize: 12.5, color: '#5a6a72', margin: 0, lineHeight: 1.6 };
const panel = { display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 3, background: 'rgba(127,127,127,.06)' };
const list = { margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#5a6a72', lineHeight: 1.7 };
const btn = { padding: '6px 12px', fontSize: 13, borderRadius: 3, border: '1px solid #d2dadd', background: 'transparent', cursor: 'pointer' };
const primaryBtn = { borderColor: '#0a6e7c', color: '#0a6e7c', fontWeight: 700 };
const linkBtn = { ...btn, border: 'none', padding: '2px 6px', textDecoration: 'underline' };

export default BackfillPanel;
