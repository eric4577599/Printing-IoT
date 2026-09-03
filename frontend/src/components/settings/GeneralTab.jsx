import React, { useState } from 'react';
import styles from '../../pages/SettingsPage.module.css';
import { useLanguage } from '../../modules/language/LanguageContext';
import { useReasonCodes } from '../../hooks/useReasonCodes';
import { createReasonCode, deleteReasonCode } from '../../services/api';

// S3 / F8:原因主檔改由後端維護;以下兩份只是 API 與 localStorage 快取都不可用時的最後降級
const DEFAULT_STOP_REASONS = [
    { code: '001', name: '送紙歪斜 (Feed Skew)', category: 'Feed' },
    { code: '002', name: '印刷不清 (Print Blurry)', category: 'Print' },
];

const DEFAULT_DEFECT_REASONS = [
    { code: 'D01', name: '髒污 (Dirty)', category: 'Quality' },
];

const GeneralTab = () => {
    // i18n:取得翻譯函式,提供本頁所有畫面文字
    const { t } = useLanguage();

    // --- 公司抬頭設定 State ---
    const [companySettings, setCompanySettings] = useState(() => {
        const saved = localStorage.getItem('companySettings');
        return saved ? JSON.parse(saved) : {
            companyName: '',
            companyNameEn: '',
            address: '',
            phone: '',
            fax: '',
            logo: null
        };
    });

    const handleCompanyChange = (key, value) => {
        setCompanySettings(prev => {
            const newSettings = { ...prev, [key]: value };
            localStorage.setItem('companySettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            handleCompanyChange('logo', reader.result);
        };
        reader.readAsDataURL(file);
    };

    // --- User Settings State ---
    const [userSource, setUserSource] = useState('custom'); // 'inherit' | 'custom'
    const [userRemoteIP, setUserRemoteIP] = useState('');
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem('appUsers');
        return saved ? JSON.parse(saved) : [
            { id: '001', name: 'OP1', username: 'OP1', password: '123', role: 'OPERATOR', shift: 'A' },
            { id: '002', name: 'OP2', username: 'OP2', password: '123', role: 'OPERATOR', shift: 'B' },
            { id: '003', name: 'OP3', username: 'OP3', password: '123', role: 'OPERATOR', shift: 'C' }
        ];
    });

    const [newUserCode, setNewUserCode] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserShift, setNewUserShift] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);

    // --- Shift Settings State ---
    const [shiftSource, setShiftSource] = useState('custom'); // 'inherit' | 'custom'
    const [shiftRemoteIP, setShiftRemoteIP] = useState('');
    const [shifts, setShifts] = useState(() => {
        const saved = localStorage.getItem('appShifts');
        return saved ? JSON.parse(saved) : [
            { name: '日', start: '08:00', end: '18:00' },
            { name: '夜', start: '20:00', end: '04:00' }
        ];
    });

    const [newShiftName, setNewShiftName] = useState('');
    const [newShiftStart, setNewShiftStart] = useState('08:00');
    const [newShiftEnd, setNewShiftEnd] = useState('18:00');
    const [selectedShiftIdx, setSelectedShiftIdx] = useState(null);


    // --- User Handlers ---
    const handleAddUser = () => {
        if (!newUserCode || !newUserName || !newUserPassword) {
            alert(t('settingsExt.general.alertFillUser'));
            return;
        }
        const newUser = {
            id: newUserCode,
            name: newUserName,
            username: newUserName,
            password: newUserPassword,
            role: 'OPERATOR', // Default
            shift: newUserShift
        };

        // 修正:編輯模式以原始 id(selectedUserId)定位,變更代碼時原地更新,避免新增重複使用者;
        // 新增模式仍以代碼定位。
        const editingId = selectedUserId;
        // 編輯時若把代碼改成與「其他」既有使用者相同 → 阻止,避免覆蓋別人或製造重複
        if (editingId != null && newUserCode !== editingId && users.some(u => u.id === newUserCode)) {
            alert(t('settingsExt.general.alertDuplicateUser').replace('{code}', newUserCode));
            return;
        }
        const existingIdx = editingId != null
            ? users.findIndex(u => u.id === editingId)
            : users.findIndex(u => u.id === newUserCode);
        let newUsers;
        if (existingIdx >= 0) {
            newUsers = [...users];
            newUsers[existingIdx] = newUser;
        } else {
            newUsers = [...users, newUser];
        }
        setUsers(newUsers);
        localStorage.setItem('appUsers', JSON.stringify(newUsers));
        alert(t('settingsExt.general.alertUserSaved'));

        // Reset inputs
        setNewUserCode('');
        setNewUserName('');
        setNewUserPassword('');
        setNewUserShift('');
        setSelectedUserId(null);
    };

    const handleDeleteUser = (id) => {
        if (confirm(t('settingsExt.general.confirmDeleteUser'))) {
            const newUsers = users.filter(u => u.id !== id);
            setUsers(newUsers);
            localStorage.setItem('appUsers', JSON.stringify(newUsers));
            if (selectedUserId === id) setSelectedUserId(null);
        }
    };

    const handleUserClick = (u) => {
        if (userSource === 'inherit') return;
        setSelectedUserId(u.id);
        setNewUserCode(u.id);
        setNewUserName(u.name);
        setNewUserPassword(u.password || '');
        setNewUserShift(u.shift || '');
        // We need to unlock ID editing restriction or handle it?
        // For simplicity, we allow overwriting by ID.
    };

    // --- Shift Handlers ---
    const handleAddShift = () => {
        if (!newShiftName || !newShiftStart || !newShiftEnd) {
            alert(t('settingsExt.general.alertFillShift'));
            return;
        }
        const newShift = {
            name: newShiftName,
            start: newShiftStart,
            end: newShiftEnd
        };

        let newShifts;
        if (selectedShiftIdx !== null) {
            newShifts = [...shifts];
            newShifts[selectedShiftIdx] = newShift;
        } else {
            newShifts = [...shifts, newShift];
        }

        setShifts(newShifts);
        localStorage.setItem('appShifts', JSON.stringify(newShifts));
        alert(t('settingsExt.general.alertShiftSaved'));

        // Reset
        setNewShiftName('');
        setNewShiftStart('08:00');
        setNewShiftEnd('18:00');
        setSelectedShiftIdx(null);
    };

    const handleDeleteShift = (idx) => {
        if (confirm(t('settingsExt.general.confirmDeleteShift'))) {
            const newShifts = shifts.filter((_, i) => i !== idx);
            setShifts(newShifts);
            localStorage.setItem('appShifts', JSON.stringify(newShifts));
            if (selectedShiftIdx === idx) setSelectedShiftIdx(null);
        }
    };

    const handleShiftClick = (s, idx) => {
        if (shiftSource === 'inherit') return;
        setSelectedShiftIdx(idx);
        setNewShiftName(s.name || '');
        setNewShiftStart(s.start);
        setNewShiftEnd(s.end);
    };

    // --- Render Sections ---

    const renderUserSection = () => (
        <div className={styles.settingGroup}>
            <h4>{t('settingsExt.general.userSettings')}</h4>

            <div className={styles.radioGroup}>
                <label>
                    <input
                        type="radio"
                        name="userSource"
                        value="inherit"
                        checked={userSource === 'inherit'}
                        onChange={e => setUserSource(e.target.value)}
                    />
                    {t('settingsExt.general.inheritRemoteIp')}
                </label>
                <label>
                    <input
                        type="radio"
                        name="userSource"
                        value="custom"
                        checked={userSource === 'custom'}
                        onChange={e => setUserSource(e.target.value)}
                    />
                    {t('settingsExt.general.custom')}
                </label>
            </div>

            {userSource === 'inherit' && (
                <div className={styles.inputRow}>
                    <label>{t('settingsExt.general.remoteIp')}</label>
                    <input
                        value={userRemoteIP}
                        onChange={e => setUserRemoteIP(e.target.value)}
                        placeholder={t('settingsExt.general.remoteIpPlaceholder')}
                    />
                </div>
            )}

            <div className={`${styles.subSection} ${userSource === 'inherit' ? styles.disabledArea : ''}`}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>{t('settingsExt.general.colUser')}</th>
                            <th className={styles.th}>{t('settingsExt.general.colPassword')}</th>
                            <th className={styles.th}>{t('settingsExt.general.colId')}</th>
                            <th className={styles.th}>{t('settingsExt.general.colActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr
                                key={u.id}
                                onClick={() => handleUserClick(u)}
                                className={selectedUserId === u.id ? styles.selectedRow : ''}
                                style={{ cursor: userSource === 'custom' ? 'pointer' : 'default' }}
                            >
                                <td className={styles.td}>{u.name}</td>
                                <td className={styles.td}>{u.password}</td>
                                <td className={styles.td}>{u.id}</td>
                                <td className={styles.td}>
                                    <button
                                        className={styles.miniBtn}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}
                                        disabled={userSource === 'inherit'}
                                    >{t('settingsExt.common.delete')}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className={styles.editRow}>
                    <input placeholder={t('settingsExt.general.userNamePlaceholder')} value={newUserName} onChange={e => setNewUserName(e.target.value)} disabled={userSource === 'inherit'} />
                    <input placeholder={t('settingsExt.general.passwordPlaceholder')} value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} disabled={userSource === 'inherit'} />
                    <input placeholder={t('settingsExt.general.idPlaceholder')} value={newUserCode} onChange={e => setNewUserCode(e.target.value)} disabled={userSource === 'inherit'} style={{ width: '80px' }} />
                    <button className={styles.actionButton} onClick={handleAddUser} disabled={userSource === 'inherit'}>
                        {selectedUserId ? t('settingsExt.common.update') : t('settingsExt.common.add')}
                    </button>
                    {selectedUserId && (
                        <button className={styles.actionButton} onClick={() => {
                            setSelectedUserId(null); setNewUserName(''); setNewUserCode(''); setNewUserPassword('');
                        }}>{t('settingsExt.common.cancel')}</button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderShiftSection = () => (
        <div className={styles.settingGroup}>
            <h4>{t('settingsExt.general.shiftSettings')}</h4>

            <div className={styles.radioGroup}>
                <label>
                    <input
                        type="radio"
                        name="shiftSource"
                        value="inherit"
                        checked={shiftSource === 'inherit'}
                        onChange={e => setShiftSource(e.target.value)}
                    />
                    {t('settingsExt.general.inheritRemoteIp')}
                </label>
                <label>
                    <input
                        type="radio"
                        name="shiftSource"
                        value="custom"
                        checked={shiftSource === 'custom'}
                        onChange={e => setShiftSource(e.target.value)}
                    />
                    {t('settingsExt.general.custom')}
                </label>
            </div>

            {shiftSource === 'inherit' && (
                <div className={styles.inputRow}>
                    <label>{t('settingsExt.general.remoteIp')}</label>
                    <input
                        value={shiftRemoteIP}
                        onChange={e => setShiftRemoteIP(e.target.value)}
                        placeholder={t('settingsExt.general.remoteIpPlaceholder')}
                    />
                </div>
            )}

            <div className={`${styles.subSection} ${shiftSource === 'inherit' ? styles.disabledArea : ''}`}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>{t('settingsExt.general.colShift')}</th>
                            <th className={styles.th}>{t('settingsExt.general.colStart')}</th>
                            <th className={styles.th}>{t('settingsExt.general.colEnd')}</th>
                            <th className={styles.th}>{t('settingsExt.general.colActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shifts.map((s, idx) => (
                            <tr
                                key={idx}
                                onClick={() => handleShiftClick(s, idx)}
                                className={selectedShiftIdx === idx ? styles.selectedRow : ''}
                                style={{ cursor: shiftSource === 'custom' ? 'pointer' : 'default' }}
                            >
                                <td className={styles.td}>{s.name}</td>
                                <td className={styles.td}>{s.start}</td>
                                <td className={styles.td}>{s.end}</td>
                                <td className={styles.td}>
                                    <button
                                        className={styles.miniBtn}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteShift(idx); }}
                                        disabled={shiftSource === 'inherit'}
                                    >{t('settingsExt.common.delete')}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className={styles.editRow}>
                    <input placeholder={t('settingsExt.general.shiftNamePlaceholder')} value={newShiftName} onChange={e => setNewShiftName(e.target.value)} disabled={shiftSource === 'inherit'} style={{ width: '80px' }} />
                    <input type="time" value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} disabled={shiftSource === 'inherit'} />
                    <span>~</span>
                    <input type="time" value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} disabled={shiftSource === 'inherit'} />
                    <button className={styles.actionButton} onClick={handleAddShift} disabled={shiftSource === 'inherit'}>
                        {selectedShiftIdx !== null ? t('settingsExt.common.update') : t('settingsExt.common.add')}
                    </button>
                    {selectedShiftIdx !== null && (
                        <button className={styles.actionButton} onClick={() => {
                            setSelectedShiftIdx(null); setNewShiftName(''); setNewShiftStart('08:00'); setNewShiftEnd('18:00');
                        }}>{t('settingsExt.common.cancel')}</button>
                    )}
                </div>
            </div>
        </div>
    );


    // --- Reason State(S3 / F8:改讀後端原因主檔,與現場彈窗共用同一份資料)---

    const {
        reasons: stopReasonsList,
        error: stopReasonsError,
        reload: reloadStopReasons,
    } = useReasonCodes('stop', DEFAULT_STOP_REASONS);

    const {
        reasons: defectReasonsList,
        error: defectReasonsError,
        reload: reloadDefectReasons,
    } = useReasonCodes('defect', DEFAULT_DEFECT_REASONS);

    // Inputs for New Reason
    const [newStopId, setNewStopId] = useState('');
    const [newStopReason, setNewStopReason] = useState('');
    const [newStopCategory, setNewStopCategory] = useState('');

    const [newDefectId, setNewDefectId] = useState('');
    const [newDefectReason, setNewDefectReason] = useState('');
    const [newDefectCategory, setNewDefectCategory] = useState('');


    // --- Reason Handlers(S3 / F8)---

    /**
     * 離線降級:把清單寫回 localStorage 快取並提示使用者
     * @param {string} type - 'stop' | 'defect'
     * @param {Array} list - 要保存的清單({ id, code, name, category })
     * @returns {void}
     * @description API 不可用時維持既有的 localStorage 行為,讓設定頁在斷網現場仍可用,
     *              但必須明白告知變更沒有同步到後端。
     */
    const saveReasonsOffline = (type, list) => {
        const key = type === 'stop' ? 'stopReasonsList' : 'defectReasonsList';
        try {
            localStorage.setItem(key, JSON.stringify(list));
        } catch (err) {
            console.warn(`寫入 ${key} 失敗`, err);
        }
        alert(t('settingsExt.general.offlineModeNotice'));
    };

    /**
     * 新增一筆原因(停機或不良)
     * @param {string} type - 'stop' | 'defect'
     * @returns {Promise<void>}
     * @description 呼叫 POST /api/reasons,成功後 reload();失敗時退回 localStorage 並提示離線模式。
     */
    const addReason = async (type) => {
        const code = type === 'stop' ? newStopId : newDefectId;
        const name = type === 'stop' ? newStopReason : newDefectReason;
        const category = (type === 'stop' ? newStopCategory : newDefectCategory) || 'General';
        const list = type === 'stop' ? stopReasonsList : defectReasonsList;

        if (!code || !name) {
            alert(t('settingsExt.general.alertEnterIdReason'));
            return;
        }

        try {
            await createReasonCode(type, { code, name, category, displayOrder: list.length + 1 });
            await (type === 'stop' ? reloadStopReasons() : reloadDefectReasons());
        } catch (err) {
            console.warn('新增原因失敗,改以離線模式保存', err);
            saveReasonsOffline(type, [...list, { id: code, code, name, category }]);
        }

        if (type === 'stop') {
            setNewStopId('');
            setNewStopReason('');
            setNewStopCategory('');
        } else {
            setNewDefectId('');
            setNewDefectReason('');
            setNewDefectCategory('');
        }
    };

    /**
     * 刪除一筆原因(後端為軟刪除)
     * @param {string} type - 'stop' | 'defect'
     * @param {string} id - 原因 Id
     * @returns {Promise<void>}
     * @description 呼叫 DELETE /api/reasons/{id},成功後 reload();失敗時退回 localStorage 並提示離線模式。
     */
    const removeReason = async (type, id) => {
        if (!confirm(t('settingsExt.general.confirmDeleteReason'))) return;

        const list = type === 'stop' ? stopReasonsList : defectReasonsList;

        try {
            await deleteReasonCode(id);
            await (type === 'stop' ? reloadStopReasons() : reloadDefectReasons());
        } catch (err) {
            console.warn('刪除原因失敗,改以離線模式保存', err);
            saveReasonsOffline(type, list.filter(r => r.id !== id));
        }
    };

    /**
     * 匯入示範原因(行為維持不變,但改走同一組 API)
     * @param {string} type - 'stop' | 'defect'
     * @returns {Promise<void>}
     */
    const importReasons = async (type) => {
        const samples = type === 'stop'
            ? [
                { code: '003', name: '機械故障 (Imported)', category: 'Machine' },
                { code: '004', name: '缺墨 (Imported)', category: 'Material' },
            ]
            : [
                { code: 'D02', name: '顏色偏差 (Imported)', category: 'Color' },
            ];

        const list = type === 'stop' ? stopReasonsList : defectReasonsList;

        try {
            for (let i = 0; i < samples.length; i++) {
                await createReasonCode(type, { ...samples[i], displayOrder: list.length + i + 1 });
            }
            await (type === 'stop' ? reloadStopReasons() : reloadDefectReasons());
            alert(t('settingsExt.general.alertImportSuccess'));
        } catch (err) {
            console.warn('匯入原因失敗,改以離線模式保存', err);
            saveReasonsOffline(type, [...list, ...samples.map(x => ({ id: x.code, ...x }))]);
        }
    };

    const handleAddStopReason = () => addReason('stop');
    const handleDeleteStopReason = (id) => removeReason('stop', id);
    const handleImportStopReasons = () => importReasons('stop');

    const handleAddDefectReason = () => addReason('defect');
    const handleDeleteDefectReason = (id) => removeReason('defect', id);
    const handleImportDefectReasons = () => importReasons('defect');



    // --- Render Logic ---
    return (
        <div className={styles.tabContent} style={{ height: '100%', overflowY: 'auto' }}>
            <h3>{t('settingsExt.general.title')}</h3>

            {/* 公司抬頭設定 */}
            <div className={styles.settingGroup}>
                <h4>{t('settingsExt.general.companyHeader')}</h4>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                    {t('settingsExt.general.companyHeaderHint')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <div className={styles.inputRow}>
                            <label>{t('settingsExt.general.companyNameZh')}</label>
                            <input
                                value={companySettings.companyName}
                                onChange={e => handleCompanyChange('companyName', e.target.value)}
                                placeholder={t('settingsExt.general.companyNameZhPlaceholder')}
                                style={{ flex: 1 }}
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label>{t('settingsExt.general.companyNameEn')}</label>
                            <input
                                value={companySettings.companyNameEn}
                                onChange={e => handleCompanyChange('companyNameEn', e.target.value)}
                                placeholder={t('settingsExt.general.companyNameEnPlaceholder')}
                                style={{ flex: 1 }}
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label>{t('settingsExt.general.companyAddress')}</label>
                            <input
                                value={companySettings.address}
                                onChange={e => handleCompanyChange('address', e.target.value)}
                                placeholder={t('settingsExt.general.companyAddressPlaceholder')}
                                style={{ flex: 1 }}
                            />
                        </div>
                        <div className={styles.inputRow}>
                            <label>{t('settingsExt.general.phone')}</label>
                            <input
                                value={companySettings.phone}
                                onChange={e => handleCompanyChange('phone', e.target.value)}
                                placeholder={t('settingsExt.general.phonePlaceholder')}
                                style={{ width: '150px' }}
                            />
                            <label style={{ marginLeft: '20px' }}>{t('settingsExt.general.fax')}</label>
                            <input
                                value={companySettings.fax}
                                onChange={e => handleCompanyChange('fax', e.target.value)}
                                placeholder={t('settingsExt.general.faxPlaceholder')}
                                style={{ width: '150px' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <label style={{ marginBottom: '10px', fontWeight: 'bold' }}>{t('settingsExt.general.companyLogo')}</label>
                        {companySettings.logo ? (
                            <div style={{ position: 'relative' }}>
                                <img
                                    src={companySettings.logo}
                                    alt="Company Logo"
                                    style={{ maxWidth: '200px', maxHeight: '100px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                                <button
                                    onClick={() => handleCompanyChange('logo', null)}
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        background: '#dc3545',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        cursor: 'pointer'
                                    }}
                                >×</button>
                            </div>
                        ) : (
                            <div style={{
                                width: '200px',
                                height: '100px',
                                border: '2px dashed #ccc',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999'
                            }}>
                                <span>{t('settingsExt.general.noUpload')}</span>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            style={{ marginTop: '10px' }}
                        />
                    </div>
                </div>
            </div>

            {renderUserSection()}
            {renderShiftSection()}

            <div className={styles.settingGroup}>
                <h4>{t('settingsExt.general.stopReasonSettings')}</h4>
                {stopReasonsError && (
                    <p style={{ fontSize: '0.85rem', color: '#b45309', margin: '0 0 8px' }}>
                        {t('settingsExt.general.offlineModeNotice')}
                    </p>
                )}
                <div className={styles.buttonGroup}>
                    {/* <button className={styles.actionButton} onClick={handleAddStopReason}>新增原因 (Add Reason)</button> */}
                    <button className={styles.actionButton} onClick={handleImportStopReasons}>{t('settingsExt.common.import')}</button>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>ID</th>
                                <th className={styles.th}>{t('settingsExt.general.colReason')}</th>
                                <th className={styles.th}>{t('settingsExt.general.colCategory')}</th>
                                <th className={styles.th}>{t('settingsExt.general.colActions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stopReasonsList.map(reason => (
                                <tr key={reason.id}>
                                    <td className={styles.td}>{reason.code}</td>
                                    <td className={styles.td}>{reason.name}</td>
                                    <td className={styles.td}>{reason.category}</td>
                                    <td className={styles.td}>
                                        <button className={styles.miniBtn} onClick={() => handleDeleteStopReason(reason.id)}>{t('settingsExt.common.delete')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className={styles.editRow}>
                        <input placeholder="ID" value={newStopId} onChange={e => setNewStopId(e.target.value)} style={{ width: '60px' }} />
                        <input placeholder={t('settingsExt.general.reasonPlaceholder')} value={newStopReason} onChange={e => setNewStopReason(e.target.value)} />
                        <input placeholder={t('settingsExt.general.categoryPlaceholder')} value={newStopCategory} onChange={e => setNewStopCategory(e.target.value)} />
                        <button className={styles.actionButton} onClick={handleAddStopReason}>{t('settingsExt.common.add')}</button>
                    </div>
                </div>
            </div>

            <div className={styles.settingGroup}>
                <h4>{t('settingsExt.general.defectReasonSettings')}</h4>
                {defectReasonsError && (
                    <p style={{ fontSize: '0.85rem', color: '#b45309', margin: '0 0 8px' }}>
                        {t('settingsExt.general.offlineModeNotice')}
                    </p>
                )}
                <div className={styles.buttonGroup}>
                    {/* <button className={styles.actionButton} onClick={handleAddDefectReason}>新增原因 (Add Reason)</button> */}
                    <button className={styles.actionButton} onClick={handleImportDefectReasons}>{t('settingsExt.common.import')}</button>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>ID</th>
                                <th className={styles.th}>{t('settingsExt.general.colReason')}</th>
                                <th className={styles.th}>{t('settingsExt.general.colCategory')}</th>
                                <th className={styles.th}>{t('settingsExt.general.colActions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {defectReasonsList.map(reason => (
                                <tr key={reason.id}>
                                    <td className={styles.td}>{reason.code}</td>
                                    <td className={styles.td}>{reason.name}</td>
                                    <td className={styles.td}>{reason.category}</td>
                                    <td className={styles.td}>
                                        <button className={styles.miniBtn} onClick={() => handleDeleteDefectReason(reason.id)}>{t('settingsExt.common.delete')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className={styles.editRow}>
                        <input placeholder="ID" value={newDefectId} onChange={e => setNewDefectId(e.target.value)} style={{ width: '60px' }} />
                        <input placeholder={t('settingsExt.general.reasonPlaceholder')} value={newDefectReason} onChange={e => setNewDefectReason(e.target.value)} />
                        <input placeholder={t('settingsExt.general.categoryPlaceholder')} value={newDefectCategory} onChange={e => setNewDefectCategory(e.target.value)} />
                        <button className={styles.actionButton} onClick={handleAddDefectReason}>{t('settingsExt.common.add')}</button>
                    </div>
                </div>
            </div>
        </div>
    );



};

export default GeneralTab;
