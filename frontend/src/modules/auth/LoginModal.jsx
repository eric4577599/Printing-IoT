import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginModal.module.css';
import { useAuth } from './AuthContext';
import { useLanguage } from '../language/LanguageContext';

/**
 * 名冊白名單重建(S5,S6 修正 username 遞補來源)。
 * 輸入:localStorage 讀出的名冊陣列(舊資料可能含 password 欄位,或缺 username);
 * 輸出:只含 id / name / username / shift / role 的新陣列;
 * 邏輯:剝除 password 等任何非白名單欄位,避免舊資料把密碼留在使用者機器上(E14);
 *       username 必須是**後端帳號(代碼)**,舊列缺 username 時以 id 遞補而非顯示名稱 ——
 *       顯示名稱(例如「王小明」)不是帳號,拿去登入必然 401。
 */
const sanitizeRoster = (list) => (Array.isArray(list) ? list : []).map(u => ({
    id: u?.id ?? '',
    name: u?.name ?? '',
    username: u?.username ?? u?.id ?? u?.name ?? '',
    shift: u?.shift ?? '',
    role: u?.role ?? 'OPERATOR',
}));

const LoginModal = ({ isOpen, onClose }) => {
    const { login, setSessionShift } = useAuth();
    const { t } = useLanguage(); // 取得翻譯函式,依當前語系回傳對應字串
    const navigate = useNavigate();

    // -- State --
    // 名冊只是「觸控便利清單」:點一列僅填入帳號,仍必須輸入密碼才能登入。
    // 名冊為空時照常顯示,操作員手動輸入帳號即可,不得因此無法登入。
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem('appUsers');
        if (!saved) return [];
        try {
            const cleaned = sanitizeRoster(JSON.parse(saved));
            localStorage.setItem('appUsers', JSON.stringify(cleaned)); // 回寫瘦身後的名冊
            return cleaned;
        } catch {
            return [];
        }
    });

    // 登入表單(主流程與管理者子視窗共用同一組欄位語意)
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // S13:記住「帳號欄目前這個值是名冊填的」,用來分辨使用者自己打的值(那種不可覆寫)
    const rosterFilledUsernameRef = React.useRef(null);
    const [usernameKept, setUsernameKept] = useState(false);

    /**
     * 使用者自行改動帳號欄。
     * 輸入:新值;輸出:無;
     * 邏輯:改過之後這個值就屬於使用者,名冊列不得再覆寫它;同時收掉保留提示。
     */
    const handleUsernameChange = (value) => {
        rosterFilledUsernameRef.current = null;
        setUsernameKept(false);
        setLoginUsername(value);
    };

    // -- Shift Defaults (Updated per req) --
    // Day: 08:00~18:00, Night: 20:00~04:00
    const [shifts, setShifts] = useState(() => {
        const saved = localStorage.getItem('appShifts');
        return saved ? JSON.parse(saved) : [
            { id: 'DAY', name: '日班 (Day)', start: '08:00', end: '18:00', people: 1 },
            { id: 'NIGHT', name: '夜班 (Night)', start: '20:00', end: '04:00', people: 1 }
        ];
    });

    // Session Shift Selection
    const [currentSessionShift, setCurrentSessionShift] = useState(shifts[0]);

    // Auto-detect Shift on Mount
    React.useEffect(() => {
        const now = new Date();
        const currentHour = now.getHours();

        // Simple logic: Day if 8 <= hour < 20, else Night
        // Matches user's "08:00~18:00" approx context, usually means "Day shift starts at 8".
        // Night starts at 20.
        // Gap 18-20? Overtime? Let's assume:
        // Day: 08:00 - 20:00
        // Night: 20:00 - 08:00
        // User specific request: 08-18, 20-04.

        let detected = shifts.find(s => s.id === 'DAY'); // Default

        if (currentHour >= 20 || currentHour < 8) {
            detected = shifts.find(s => s.id === 'NIGHT') || detected;
        } else {
            // Between 08 and 20
            detected = shifts.find(s => s.id === 'DAY') || detected;
        }

        setCurrentSessionShift(detected);
    }, [shifts]);

    // Inputs
    const [newUserCode, setNewUserCode] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserShift, setNewUserShift] = useState('');

    // Time Inputs
    const [startHour, setStartHour] = useState('08');
    const [startMin, setStartMin] = useState('00');
    const [endHour, setEndHour] = useState('17');
    const [endMin, setEndMin] = useState('00');
    const [shiftPeople, setShiftPeople] = useState(1);

    // Selection
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedShiftIdx, setSelectedShiftIdx] = useState(null);

    // -- Handlers --

    /**
     * 點選名冊一列。
     * 輸入:名冊列;輸出:無;
     * 邏輯:填入名冊編輯欄;帳號欄則**只在安全時才覆寫** —— 不代表已登入,密碼仍必須手動輸入。
     *
     * S13:原本無條件覆寫帳號欄,實際踩到過 —— 帳號打好了、手滑點到名冊某列,
     * 帳號就被換成該列的代碼且畫面毫無提示,送出後只說「帳號或密碼錯誤」,
     * 現場沒有人猜得到自己登的根本不是原本那個帳號。
     *
     * 判準是「這個值是誰打的」而不是「有沒有值」:
     *  - 空白 → 填入
     *  - 目前的值就是上一次由名冊填進去的 → 填入(名冊列之間可以正常切換)
     *  - 使用者自己打的 → **不覆寫**,並顯示一行提示,不靜默略過
     */
    const handleUserRowClick = (u) => {
        setSelectedUserId(u.id);
        setNewUserCode(u.id);
        setNewUserName(u.name);
        setNewUserShift(u.shift || '');

        const next = u.username || u.name || '';
        const current = loginUsername.trim();
        const typedByUser = current !== '' && current !== rosterFilledUsernameRef.current;

        if (typedByUser) {
            setUsernameKept(true);
            return;
        }

        rosterFilledUsernameRef.current = next;
        setLoginUsername(next);
        setUsernameKept(false);
    };

    /**
     * 決定要寫入輪廓的班別代碼。
     * 輸入:無(取名冊選取狀態與班別下拉);
     * 輸出:班別代碼字串(可能為空字串);
     * 邏輯:名冊列自帶班別(A / B / C)時以該值為準 —— 這是改版前狀態列顯示的值;
     *       手動輸入帳號(名冊未選)時退回目前班別的 id(DAY / NIGHT / CUSTOM)。
     */
    const resolveShiftCode = () => {
        const rosterRow = users.find(u => u.id === selectedUserId);
        const rosterShift = (rosterRow?.shift || '').trim();
        if (rosterShift) return rosterShift;
        return (currentSessionShift?.id || currentSessionShift?.name || '').trim();
    };

    /**
     * 送出登入(主流程與管理者子視窗共用的唯一登入路徑)。
     * 輸入:無(取表單 state);輸出:無;
     * 邏輯:帳號與密碼皆有值才呼叫後端 login();成功後寫入班別、關閉視窗並導回首頁,
     *       失敗一律只提示「帳號或密碼錯誤」,不區分帳號不存在與密碼錯誤。
     */
    const handleLogin = async () => {
        if (!loginUsername || !loginPassword) {
            alert(t('login.alert.invalidCredentials'));
            return;
        }
        const result = await login(loginUsername, loginPassword);
        if (result?.ok) {
            const shiftCode = resolveShiftCode();
            if (shiftCode) setSessionShift(shiftCode);
            setLoginPassword('');
            onClose();
            navigate('/');
        } else {
            alert(t('login.alert.invalidCredentials'));
        }
    };

    // ... basic CRUD handlers ...
    // (Preserve existing CRUD logic but update defaults if needed)
    // For brevity, assuming context around line 76-118 is kept but I need to be careful with replace.
    // I will replace only the top section and handleLogin.

    const handleAddUser = () => {
        if (!newUserCode || !newUserName) return alert(t('login.alert.enterCodeName'));
        // S5:名冊物件不得含 password 欄位(帳號密碼由後端建立,見 spec §5.4)
        // S6:username 是後端帳號(代碼,例如 OP1),不是顯示名稱 —— 兩者混用會讓點名冊登入必然失敗
        const newUser = { id: newUserCode, name: newUserName, username: newUserCode, role: 'OPERATOR', shift: newUserShift.toUpperCase() };

        // Upsert
        const idx = users.findIndex(u => u.id === newUserCode);
        const newUsers = [...users];
        if (idx >= 0) newUsers[idx] = newUser;
        else newUsers.push(newUser);

        setUsers(newUsers);
        localStorage.setItem('appUsers', JSON.stringify(newUsers));
        setSelectedUserId(newUser.id);
    };

    const handleDeleteUser = () => {
        if (!selectedUserId) return;
        if (!confirm(t('login.confirm.delete'))) return;
        const newUsers = users.filter(u => u.id !== selectedUserId);
        setUsers(newUsers);
        localStorage.setItem('appUsers', JSON.stringify(newUsers));
        setSelectedUserId(null);
        setNewUserCode('');
        setNewUserName('');
        setNewUserShift('');
    };

    const handleAddShift = () => {
        const start = `${startHour}:${startMin}`;
        const end = `${endHour}:${endMin}`;
        // Generate ID / Name ? Simple for now
        const newShifts = [...shifts, { id: 'CUSTOM', name: `Custom ${start}`, start, end, people: parseInt(shiftPeople) || 1 }];
        newShifts.sort((a, b) => a.start.localeCompare(b.start));
        setShifts(newShifts);
        localStorage.setItem('appShifts', JSON.stringify(newShifts));
    };

    const handleDeleteShift = () => {
        if (selectedShiftIdx === null) return;
        const newShifts = shifts.filter((_, i) => i !== selectedShiftIdx);
        setShifts(newShifts);
        localStorage.setItem('appShifts', JSON.stringify(newShifts));
        setSelectedShiftIdx(null);
    };

    // Admin Login State —— 只是同一條登入路徑的另一個入口,不再有第二套驗證邏輯
    const [showAdminLogin, setShowAdminLogin] = useState(false);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.windowContainer} style={{ position: 'relative' }}>
                {/* Part 1: Top Buttons */}
                <div className={styles.topBar}>
                    <button className={styles.largeBtn} onClick={() => setShowAdminLogin(true)} style={{ marginRight: 'auto' }}>{t('login.btn.admin')}</button>
                    <button className={styles.largeBtn} onClick={handleLogin}>{t('login.btn.select')}</button>
                    <button className={styles.largeBtn} onClick={onClose}>{t('login.btn.exit')}</button>
                </div>

                {/* ... (Existing InfoBar, Tables, Footer logic remains same) ... */}

                {/* Part 2: Info Bar */}
                <div className={styles.infoBar}>
                    {/* NEW: Shift Selection Dropdown */}
                    <div className={styles.infoField} style={{ flex: 1.5 }}>
                        <label style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>{t('login.label.currentShift')}</label>
                        <select
                            value={currentSessionShift?.name}
                            onChange={(e) => {
                                const s = shifts.find(sh => sh.name === e.target.value);
                                if (s) setCurrentSessionShift(s);
                            }}
                            style={{ fontWeight: 'bold', color: 'var(--primary-blue)' }}
                        >
                            {shifts.map((s, i) => (
                                <option key={i} value={s.name}>{s.name} ({s.start}~{s.end})</option>
                            ))}
                        </select>
                    </div>

                    {/* S5:真登入欄位 —— 點名冊只會填入帳號,密碼一律要手動輸入 */}
                    <div className={styles.infoField}>
                        <label>{t('login.placeholder.username')}</label>
                        <input
                            aria-label={t('login.placeholder.username')}
                            value={loginUsername}
                            onChange={e => handleUsernameChange(e.target.value)}
                        />
                        {/* S13:沒有覆寫這件事要說出來,否則使用者不知道剛才那一點沒生效 */}
                        {usernameKept && (
                            <span className={styles.fieldNote}>{t('login.hint.usernameKept')}</span>
                        )}
                    </div>
                    <div className={styles.infoField}>
                        <label>{t('login.placeholder.password')}</label>
                        <input
                            type="password"
                            aria-label={t('login.placeholder.password')}
                            value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
                        />
                    </div>

                </div>

                {/* Part 3: User Table */}
                {/*
                  S12:代碼 / 班別 / 操作員 是**下面這張名冊表的編輯欄**,不是登入憑證,
                  原本卻和帳號 / 密碼混在同一條 infoBar 裡。除了語意不清,六個欄位也塞不進
                  640px 的卡片 —— infoBar 沒有 flex-wrap,最後兩欄直接溢位到卡片外面,
                  使用者點不到,連帶讓「新增」永遠缺代碼而無法使用。
                  改為獨立一列、依表頭順序(代碼 / 班別 / 操作員)擺在表格正上方。
                */}
                <div className={styles.rosterEditor}>
                    <div className={styles.infoField}>
                        <label>{t('login.label.code')}</label>
                        <input
                            aria-label={t('login.label.code')}
                            value={newUserCode}
                            onChange={e => setNewUserCode(e.target.value)}
                        />
                    </div>
                    <div className={styles.infoField}>
                        <label>{t('login.col.shift')}</label>
                        <input
                            aria-label={t('login.col.shift')}
                            value={newUserShift}
                            onChange={e => setNewUserShift(e.target.value)}
                            placeholder="A/B"
                        />
                    </div>
                    <div className={styles.infoField}>
                        <label>{t('login.label.operator')}</label>
                        <input
                            aria-label={t('login.label.operator')}
                            value={newUserName}
                            onChange={e => setNewUserName(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.tableSection}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th className={styles.th}>{t('login.col.code')}</th>
                                    <th className={styles.th}>{t('login.col.shift')}</th>
                                    <th className={styles.th}>{t('login.col.operator')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr
                                        key={u.id}
                                        onClick={() => handleUserRowClick(u)}
                                        className={selectedUserId === u.id ? styles.selectedRow : ''}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className={styles.td} style={{ borderRight: '1px solid #ccc' }}>{u.id}</td>
                                        <td className={styles.td} style={{ borderRight: '1px solid #ccc' }}>{u.shift}</td>
                                        <td className={styles.td}>{u.name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className={styles.sideButtons}>
                        {/* S12:停用狀態讓「為什麼按了沒反應」變成看得見的 —— 原本只有按下去才跳 alert */}
                        <button
                            className={styles.sideBtn}
                            onClick={handleAddUser}
                            disabled={!newUserCode.trim() || !newUserName.trim()}
                        >{t('login.btn.add')}</button>
                        <button
                            className={styles.sideBtn}
                            onClick={handleDeleteUser}
                            disabled={!selectedUserId}
                        >{t('login.btn.delete')}</button>
                    </div>
                </div>

                {/* S12:名冊只是這台機器的觸控快捷清單,新增不等於建立帳號 —— 現場最容易誤會的一點 */}
                <p className={styles.rosterHint}>{t('login.hint.rosterLocal')}</p>

                {/* Part 4: Shift Table */}
                <div className={styles.tableSection}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th className={styles.th}>{t('login.col.startTime')}</th>
                                    <th className={styles.th}>{t('login.col.endTime')}</th>
                                    <th className={styles.th}>{t('login.col.people')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.map((s, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => setSelectedShiftIdx(idx)}
                                        className={selectedShiftIdx === idx ? styles.selectedRow : ''}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className={styles.td} style={{ borderRight: '1px solid #ccc' }}>{s.start}</td>
                                        <td className={styles.td} style={{ borderRight: '1px solid #ccc' }}>{s.end}</td>
                                        <td className={styles.td}>{s.people}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className={styles.sideButtons}>
                        <button className={styles.sideBtn} onClick={handleDeleteShift}>{t('login.btn.delete')}</button>
                    </div>
                </div>

                {/* Footer Time Controls */}
                <div className={styles.footerBar}>
                    <select value={startHour} onChange={e => setStartHour(e.target.value)}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}</select>
                    <span>:</span>
                    <select value={startMin} onChange={e => setStartMin(e.target.value)}>{Array.from({ length: 60 }, (_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}</select>
                    <span> ~ </span>
                    <select value={endHour} onChange={e => setEndHour(e.target.value)}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}</select>
                    <span>:</span>
                    <select value={endMin} onChange={e => setEndMin(e.target.value)}>{Array.from({ length: 60 }, (_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}</select>

                    <span style={{ marginLeft: '10px' }}>{t('login.label.people')}</span>
                    <input type="number" min="1" value={shiftPeople} onChange={e => setShiftPeople(e.target.value)} style={{ width: '50px' }} />

                    <button className={styles.largeBtn} onClick={handleAddShift} style={{ marginLeft: 'auto', fontSize: '0.9rem', padding: '2px 10px' }}>{t('login.btn.addPeriod')}</button>
                    <button className={styles.largeBtn} style={{ marginLeft: '5px', fontSize: '0.9rem', padding: '2px 10px' }}>{t('login.btn.customPeriod')}</button>
                </div>

                {/* Admin Modal Overlay */}
                {showAdminLogin && (
                    <div className={styles.adminOverlay}>
                        <div className={styles.adminModal}>
                            <h3>{t('login.admin.title')}</h3>
                            <input
                                type="text"
                                placeholder={t('login.placeholder.username')}
                                className={styles.adminInput}
                                value={loginUsername}
                                onChange={e => handleUsernameChange(e.target.value)}
                                autoFocus
                            />
                            <input
                                type="password"
                                placeholder={t('login.placeholder.password')}
                                className={styles.adminInput}
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                            />
                            <div className={styles.adminButtons}>
                                <button className={`${styles.adminBtn} ${styles.adminBtnCancel}`} onClick={() => setShowAdminLogin(false)}>{t('login.btn.cancel')}</button>
                                <button className={styles.adminBtn} onClick={handleLogin}>{t('login.btn.login')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginModal;
