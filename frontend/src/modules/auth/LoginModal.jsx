import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginModal.module.css';
import { useAuth } from './AuthContext';

const LoginModal = ({ isOpen, onClose }) => {
    const { login, loginDirect } = useAuth();
    const navigate = useNavigate();

    // -- State --
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem('appUsers');
        return saved ? JSON.parse(saved) : [
            { id: '001', name: 'OP1', username: 'OP1', password: '123', role: 'OPERATOR', shift: 'A' },
            { id: '002', name: 'OP2', username: 'OP2', password: '123', role: 'OPERATOR', shift: 'B' },
            { id: '003', name: 'OP3', username: 'OP3', password: '123', role: 'OPERATOR', shift: 'C' },
            { id: '004', name: 'OP4', username: 'OP4', password: '123', role: 'OPERATOR', shift: 'A' },
            { id: '005', name: 'OP5', username: 'OP5', password: '123', role: 'OPERATOR', shift: 'B' }
        ];
    });

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

    const handleUserRowClick = (u) => {
        setSelectedUserId(u.id);
        setNewUserCode(u.id);
        setNewUserName(u.name);
        setNewUserShift(u.shift || '');
    };

    const handleLogin = () => {
        if (!selectedUserId) {
            alert('請選擇操作員 (Please select an operator)');
            return;
        }
        const user = users.find(u => u.id === selectedUserId);

        if (user) {
            // Merge Session Shift
            const sessionUser = {
                ...user,
                sessionShift: currentSessionShift.name
            };
            const success = loginDirect(sessionUser);
            if (success) {
                onClose();
                navigate('/');
            }
        }
    };

    // ... basic CRUD handlers ...
    // (Preserve existing CRUD logic but update defaults if needed)
    // For brevity, assuming context around line 76-118 is kept but I need to be careful with replace.
    // I will replace only the top section and handleLogin.

    const handleAddUser = () => {
        if (!newUserCode || !newUserName) return alert("請輸入代碼與名稱");
        const newUser = { id: newUserCode, name: newUserName, username: newUserName, password: '123', role: 'OPERATOR', shift: newUserShift.toUpperCase() };

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
        if (!confirm('確定刪除?')) return;
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

    // Admin Login State
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');

    const handleAdminLogin = () => {
        if (login(adminUser, adminPass)) {
            // Inject Session Shift for Admin too if needed, or default
            // login() in AuthContext might need update to accept sessionShift?
            // Current login() just calls loginDirect inside.
            // I should update login() to return user obj or handle it manually.
            // Simplified: Admin just gets logged in.
            onClose();
            navigate('/');
        } else {
            alert('帳號或密碼錯誤 (Invalid Credentials)');
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.windowContainer} style={{ position: 'relative' }}>
                {/* Part 1: Top Buttons */}
                <div className={styles.topBar}>
                    <button className={styles.largeBtn} onClick={() => setShowAdminLogin(true)} style={{ marginRight: 'auto' }}>管理者 (Admin)</button>
                    <button className={styles.largeBtn} onClick={handleLogin}>選取 (Select)</button>
                    <button className={styles.largeBtn} onClick={onClose}>離開 (Exit)</button>
                </div>

                {/* ... (Existing InfoBar, Tables, Footer logic remains same) ... */}

                {/* Part 2: Info Bar */}
                <div className={styles.infoBar}>
                    {/* NEW: Shift Selection Dropdown */}
                    <div className={styles.infoField} style={{ flex: 1.5 }}>
                        <label style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>當前班別 (Current Shift)</label>
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

                    <div className={styles.infoField}>
                        <label>操作員</label>
                        <input value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                    </div>
                    {/*
                    <div className={styles.infoField}>
                        <label>工作時段</label>
                        <input disabled placeholder="自動" style={{ background: '#eee' }} />
                    </div>
                    */}
                    <div className={styles.infoField}>
                        <label>代碼</label>
                        <input value={newUserCode} onChange={e => setNewUserCode(e.target.value)} style={{ width: '80px' }} />
                    </div>
                    <div className={styles.infoField}>
                        <label>Default</label>
                        <input value={newUserShift} onChange={e => setNewUserShift(e.target.value)} placeholder="A/B" style={{ width: '50px' }} />
                    </div>
                </div>

                {/* Part 3: User Table */}
                <div className={styles.tableSection}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th className={styles.th}>代碼</th>
                                    <th className={styles.th}>班別</th>
                                    <th className={styles.th}>操作員</th>
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
                        <button className={styles.sideBtn} onClick={handleAddUser}>新增</button>
                        <button className={styles.sideBtn} onClick={handleDeleteUser}>刪除</button>
                    </div>
                </div>

                {/* Part 4: Shift Table */}
                <div className={styles.tableSection}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead className={styles.thead}>
                                <tr>
                                    <th className={styles.th}>開始時間</th>
                                    <th className={styles.th}>結束時間</th>
                                    <th className={styles.th}>人數</th>
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
                        <button className={styles.sideBtn} onClick={handleDeleteShift}>刪除</button>
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

                    <span style={{ marginLeft: '10px' }}>人數:</span>
                    <input type="number" min="1" value={shiftPeople} onChange={e => setShiftPeople(e.target.value)} style={{ width: '50px' }} />

                    <button className={styles.largeBtn} onClick={handleAddShift} style={{ marginLeft: 'auto', fontSize: '0.9rem', padding: '2px 10px' }}>新增時段</button>
                    <button className={styles.largeBtn} style={{ marginLeft: '5px', fontSize: '0.9rem', padding: '2px 10px' }}>自訂時段</button>
                </div>

                {/* Admin Modal Overlay */}
                {showAdminLogin && (
                    <div className={styles.adminOverlay}>
                        <div className={styles.adminModal}>
                            <h3>管理者登入 (Admin Login)</h3>
                            <input
                                type="text"
                                placeholder="帳號 (Username)"
                                className={styles.adminInput}
                                value={adminUser}
                                onChange={e => setAdminUser(e.target.value)}
                                autoFocus
                            />
                            <input
                                type="password"
                                placeholder="密碼 (Password)"
                                className={styles.adminInput}
                                value={adminPass}
                                onChange={e => setAdminPass(e.target.value)}
                            />
                            <div className={styles.adminButtons}>
                                <button className={`${styles.adminBtn} ${styles.adminBtnCancel}`} onClick={() => setShowAdminLogin(false)}>取消</button>
                                <button className={styles.adminBtn} onClick={handleAdminLogin}>登入</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginModal;
