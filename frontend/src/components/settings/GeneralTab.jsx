import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../pages/SettingsPage.module.css';
import { useLanguage } from '../../modules/language/LanguageContext';
import { useReasonCodes } from '../../hooks/useReasonCodes';
import { createReasonCode, deleteReasonCode, getUsers, createUser, updateUser } from '../../services/api';

// S7:使用者名冊的本機快取鍵。後端才是名冊的事實來源,快取只服務兩件事:
// ① 後端不可達時設定頁仍看得到清單;② 登入視窗(未登入,呼叫不了 ADMIN 端點)的觸控清單。
const ROSTER_CACHE_KEY = 'appUsers';

// 可指派的角色。與後端 AppRoles.All 一致,ERP_SERVICE 是機器身分故不在此列。
const ROLE_OPTIONS = ['OPERATOR', 'SUPERVISOR', 'ENGINEER', 'ADMIN'];
const ROLE_LABEL_KEY = {
    OPERATOR: 'settingsExt.general.roleOperator',
    SUPERVISOR: 'settingsExt.general.roleSupervisor',
    ENGINEER: 'settingsExt.general.roleEngineer',
    ADMIN: 'settingsExt.general.roleAdmin',
};

/**
 * 名冊快取白名單重建(S5 E14,S7 沿用)。
 * 輸入:localStorage 讀出的名冊陣列(舊資料可能含 password 欄位,或缺 username);
 * 輸出:只含 id / name / username / role / shift 的新陣列;
 * 邏輯:剝除 password 等非白名單欄位;username 缺值時以 id(代碼)遞補,
 *       絕不可用顯示名稱遞補 —— 顯示名稱不是帳號,拿去登入必然 401。
 *       遞補鏈與 LoginModal.sanitizeRoster 逐字一致(E24)。
 */
const sanitizeRoster = (list) => (Array.isArray(list) ? list : []).map(u => ({
    id: u?.id ?? '',
    name: u?.name ?? '',
    username: u?.username ?? u?.id ?? u?.name ?? '',
    role: u?.role ?? 'OPERATOR',
    shift: u?.shift ?? '',
}));

/**
 * 後端 UserSummary → 畫面列(S7)。
 * 輸入:GET /v1/auth/users 的單筆;
 * 輸出:{ userId, id, username, name, role, shift, isActive };
 * 邏輯:userId 是後端 Guid(更新時要用),id 沿用既有畫面語意 = 代碼 = 帳號。
 *       roles 是陣列,取第一個 —— 後端一個帳號只掛一個角色。
 */
const fromSummary = (s) => ({
    userId: s?.id ?? null,
    id: s?.username ?? '',
    username: s?.username ?? '',
    name: s?.displayName || s?.username || '',
    role: (Array.isArray(s?.roles) ? s.roles[0] : s?.role) || 'OPERATOR',
    shift: s?.shift ?? '',
    isActive: s?.isActive !== false,
});

/**
 * 畫面列 → 本機快取列(S7)。
 * 輸入:畫面列陣列;輸出:白名單五欄的陣列;
 * 邏輯:只快取**啟用中**的帳號 —— 已停用的帳號登不進去,留在登入視窗的觸控清單
 *       只會讓現場點了之後拿到「帳號或密碼錯誤」。
 */
const toRosterCache = (rows) => rows
    .filter(r => r.isActive)
    .map(r => ({ id: r.username, name: r.name, username: r.username, role: r.role, shift: r.shift }));

/**
 * 從 axios 錯誤取出可顯示的訊息(S7)。
 * 輸入:axios 錯誤物件、預設訊息;輸出:字串;
 * 邏輯:後端的 400 / 409 會回一句人看得懂的原因(密碼強度、帳號重複、最後一位管理者),
 *       直接顯示後端訊息比前端自己猜規則準確。
 */
const errorMessage = (error, fallback) => {
    const data = error?.response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data?.error) return String(data.error);
    if (data?.title) return String(data.title);
    return fallback;
};

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
    // S5:名冊不再含預設帳號、也不再存密碼;舊資料讀入時以白名單重建並回寫(E14)。
    // S7:這份初值只是**開機畫面**,掛載後隨即被後端名冊覆蓋;後端不可達時才會一直沿用。
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem(ROSTER_CACHE_KEY);
        if (!saved) return [];
        try {
            const cleaned = sanitizeRoster(JSON.parse(saved));
            // 立即回寫:剝除舊資料可能殘留的 password 是安全行為,不能等後端回應才做
            localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(cleaned));
            // 快取沒有 userId / isActive,補上預設值讓畫面列形狀一致
            return cleaned.map(u => ({ ...u, userId: null, isActive: true }));
        } catch {
            return [];
        }
    });

    const [newUserCode, setNewUserCode] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserShift, setNewUserShift] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);

    // S7:名冊改接後端後新增的三個表單欄位與三個狀態旗標
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('OPERATOR');
    const [usersLoading, setUsersLoading] = useState(false);
    // 'offline' = 後端不可達(顯示快取);'forbidden' = 非 ADMIN(唯讀);null = 正常
    const [usersDegraded, setUsersDegraded] = useState(null);

    /**
     * 從後端載入使用者名冊(S7)。
     * 輸入:無;輸出:無(更新 state 與本機快取);
     * 邏輯:GET /v1/auth/users 成功 → 取代畫面清單並改寫快取(後端是事實來源);
     *       403(非 ADMIN)→ 轉唯讀並沿用快取;其他錯誤 → 標為離線並沿用快取。
     *       **失敗時絕不清空畫面** —— 斷網的現場需要看得到清單。
     */
    const loadUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const list = await getUsers();
            const rows = (Array.isArray(list) ? list : []).map(fromSummary);
            setUsers(rows);
            setUsersDegraded(null);
            localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(toRosterCache(rows)));
        } catch (error) {
            setUsersDegraded(error?.response?.status === 403 ? 'forbidden' : 'offline');
        } finally {
            setUsersLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    // S7:名冊編輯的封鎖條件 —— 既有的「繼承遠端 IP」唯讀,加上非 ADMIN 的 403 唯讀。
    // 離線(offline)刻意**不**封鎖:那時 API 呼叫會失敗並跳出錯誤訊息,
    // 比畫面直接變灰更能讓現場知道發生什麼事。
    const userLocked = userSource === 'inherit' || usersDegraded === 'forbidden';

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
    /**
     * 新增 / 更新名冊列。
     * 輸入:無(取表單 state);輸出:無;
     * 邏輯:S5 起名冊只是顯示用清單,**不再寫入任何密碼欄位** ——
     *       帳號密碼由系統管理者透過後端 /api/v1/auth/users 建立(S6 接線)。
     *       S6:username 必須是**代碼**(newUserCode),即送進 /api/v1/auth/login 的帳號字串;
     *       顯示名稱只放在 name。寫成顯示名稱會讓作業員點名冊登入必然 401,
     *       而畫面只顯示「帳號或密碼錯誤」,現場無從除錯。
     */
    const handleAddUser = async () => {
        if (!newUserCode || !newUserName) {
            alert(t('settingsExt.general.alertFillUser'));
            return;
        }

        const editing = selectedUserId != null ? users.find(u => u.id === selectedUserId) : null;

        // 新增時密碼必填 —— 後端的 POST /v1/auth/users 沒有密碼建不了帳號,
        // 沿用舊的「只填代碼與名稱」會靜默失敗成一列有名字卻登不進去的幽靈。
        if (!editing && !newUserPassword) {
            alert(t('settingsExt.general.alertPasswordRequired'));
            return;
        }

        // 新增時代碼不可與既有帳號重複(後端也有不分大小寫唯一索引,這裡只是早一步給訊息)
        if (!editing && users.some(u => u.username.toUpperCase() === newUserCode.toUpperCase())) {
            alert(t('settingsExt.general.alertDuplicateUser').replace('{code}', newUserCode));
            return;
        }

        // 只存在於本機快取的列沒有後端 Guid,改不了。這種列只會在後端不可達時出現,
        // 讓它靜默走進 PUT undefined 會得到 404 這種看不懂的錯。
        if (editing && !editing.userId) {
            alert(t('settingsExt.general.alertUserOffline'));
            return;
        }

        try {
            if (editing) {
                // 帳號本身不可改(後端沒有改帳號的端點);只送有值的欄位,
                // 密碼留空代表不變更 —— 送空字串會被後端當成「改成空密碼」而回 400。
                const payload = {
                    displayName: newUserName,
                    shift: newUserShift,
                    role: newUserRole,
                };
                if (newUserPassword) payload.password = newUserPassword;
                await updateUser(editing.userId, payload);
            } else {
                await createUser({
                    username: newUserCode,
                    password: newUserPassword,
                    role: newUserRole,
                    displayName: newUserName,
                    shift: newUserShift,
                });
            }
        } catch (error) {
            alert(errorMessage(error, t('settingsExt.general.alertUserSaveFailed')));
            return;
        }

        await loadUsers();
        alert(t('settingsExt.general.alertUserSaved'));

        // Reset inputs
        setNewUserCode('');
        setNewUserName('');
        setNewUserShift('');
        setNewUserPassword('');
        setNewUserRole('OPERATOR');
        setSelectedUserId(null);
    };

    /**
     * 停用 / 啟用使用者(S7)。
     * 輸入:畫面列;輸出:無;
     * 邏輯:後端**沒有刪除端點**,帳號要留下稽核軌跡,因此「刪除」語意改為停用
     *       (PUT isActive)。停用最後一位啟用中的 ADMIN 會被後端擋下回 409,顯示其訊息。
     */
    const handleToggleUserActive = async (u) => {
        if (u.isActive && !confirm(t('settingsExt.general.confirmDisableUser'))) return;

        try {
            await updateUser(u.userId, { isActive: !u.isActive });
        } catch (error) {
            alert(errorMessage(error, t('settingsExt.general.alertUserSaveFailed')));
            return;
        }

        await loadUsers();
        if (selectedUserId === u.id) setSelectedUserId(null);
    };

    const handleUserClick = (u) => {
        if (userSource === 'inherit') return;
        setSelectedUserId(u.id);
        setNewUserCode(u.id);
        setNewUserName(u.name);
        setNewUserShift(u.shift || '');
        setNewUserRole(u.role || 'OPERATOR');
        setNewUserPassword(''); // 編輯時密碼一律從空白開始:留空 = 不變更
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

            {/* S7:名冊狀態列 —— 載入中、唯讀(非 ADMIN)、離線三種情況都必須說出來,
                否則現場會以為「存了」但其實只動到本機快取 */}
            {usersLoading && (
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 8px' }}>
                    {t('settingsExt.general.userLoading')}
                </p>
            )}
            {usersDegraded === 'forbidden' && (
                <p style={{ fontSize: '0.85rem', color: '#b45309', margin: '0 0 8px' }}>
                    {t('settingsExt.general.userReadOnly')}
                </p>
            )}
            {usersDegraded === 'offline' && (
                <p style={{ fontSize: '0.85rem', color: '#b45309', margin: '0 0 8px' }}>
                    {t('settingsExt.general.userLoadFailed')}
                </p>
            )}

            <div className={`${styles.subSection} ${userLocked ? styles.disabledArea : ''}`}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>{t('settingsExt.general.colUser')}</th>
                            <th className={styles.th}>{t('settingsExt.general.colId')}</th>
                            <th className={styles.th}>{t('settingsExt.general.colRole')}</th>
                            <th className={styles.th}>{t('settingsExt.general.colStatus')}</th>
                            <th className={styles.th}>{t('settingsExt.general.colActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr
                                key={u.username || u.id}
                                onClick={() => handleUserClick(u)}
                                className={selectedUserId === u.id ? styles.selectedRow : ''}
                                style={{
                                    cursor: userLocked ? 'default' : 'pointer',
                                    opacity: u.isActive ? 1 : 0.5,
                                }}
                            >
                                <td className={styles.td}>{u.name}</td>
                                <td className={styles.td}>{u.id}</td>
                                <td className={styles.td}>{t(ROLE_LABEL_KEY[u.role] ?? ROLE_LABEL_KEY.OPERATOR)}</td>
                                <td className={styles.td}>
                                    {u.isActive
                                        ? t('settingsExt.general.statusActive')
                                        : t('settingsExt.general.statusInactive')}
                                </td>
                                <td className={styles.td}>
                                    <button
                                        className={styles.miniBtn}
                                        onClick={(e) => { e.stopPropagation(); handleToggleUserActive(u); }}
                                        disabled={userLocked || !u.userId}
                                    >
                                        {u.isActive
                                            ? t('settingsExt.general.btnDisableUser')
                                            : t('settingsExt.general.btnEnableUser')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className={styles.editRow}>
                    <input placeholder={t('settingsExt.general.userNamePlaceholder')} value={newUserName} onChange={e => setNewUserName(e.target.value)} disabled={userLocked} />
                    <input placeholder={t('settingsExt.general.idPlaceholder')} value={newUserCode} onChange={e => setNewUserCode(e.target.value)} disabled={userLocked || selectedUserId != null} style={{ width: '80px' }} title={selectedUserId != null ? t('settingsExt.general.usernameImmutableHint') : undefined} />
                    <input
                        type="password"
                        autoComplete="new-password"
                        placeholder={selectedUserId != null
                            ? t('settingsExt.general.passwordKeepHint')
                            : t('settingsExt.general.passwordPlaceholder')}
                        value={newUserPassword}
                        onChange={e => setNewUserPassword(e.target.value)}
                        disabled={userLocked}
                    />
                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} disabled={userLocked}>
                        {ROLE_OPTIONS.map(r => (
                            <option key={r} value={r}>{t(ROLE_LABEL_KEY[r])}</option>
                        ))}
                    </select>
                    <button className={styles.actionButton} onClick={handleAddUser} disabled={userLocked}>
                        {selectedUserId ? t('settingsExt.common.update') : t('settingsExt.common.add')}
                    </button>
                    {selectedUserId && (
                        <button className={styles.actionButton} onClick={() => {
                            setSelectedUserId(null); setNewUserName(''); setNewUserCode('');
                            setNewUserPassword(''); setNewUserRole('OPERATOR');
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
