import React, { useState } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/SettingsPage.module.css';

const UnitTab = () => {
    const { t } = useLanguage();
    // --- Unit Settings State ---
    const [unitSettings, setUnitSettings] = useState(() => {
        const saved = localStorage.getItem('unitSettings');
        return saved ? JSON.parse(saved) : {
            unit: 'mm', // 'mm' or 'inch'
            maxSpeed: 350,
            flutes: [
                { name: 'AB', value: 7.6 },
                { name: 'A', value: 4.0 },
                { name: 'B', value: 3.6 }
            ]
        };
    });

    const handleUnitChange = (key, value) => {
        setUnitSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            localStorage.setItem('unitSettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    const handleAddFlute = () => {
        const name = prompt('請輸入楞別名稱 (Enter Flute Name):', 'E');
        if (!name) return;
        const valStr = prompt(`請輸入 ${name} 楞厚度 (Enter Thickness):`, '2.0');
        if (!valStr) return;

        const newFlutes = [...unitSettings.flutes, { name, value: parseFloat(valStr) || 0 }];
        handleUnitChange('flutes', newFlutes);
    };

    const handleUpdateFlute = (index, key, value) => {
        const newFlutes = [...unitSettings.flutes];
        newFlutes[index] = { ...newFlutes[index], [key]: value };
        handleUnitChange('flutes', newFlutes);
    };

    const handleDeleteFlute = (index) => {
        if (confirm('確定刪除此楞別? (Delete Flute?)')) {
            const newFlutes = unitSettings.flutes.filter((_, i) => i !== index);
            handleUnitChange('flutes', newFlutes);
        }
    };


    return (
        <div className={styles.tabContent} style={{ height: '100%', overflowY: 'auto' }}>
            <h3>{t('settings.unit.title')}</h3>

            {/* Unit Selection */}
            <div className={styles.settingGroup}>
                <h4>{t('settings.unit.select')}</h4>
                <div className={styles.radioGroup}>
                    <label>
                        <input
                            type="radio"
                            name="unit"
                            value="mm"
                            checked={unitSettings.unit === 'mm'}
                            onChange={e => handleUnitChange('unit', e.target.value)}
                        />
                        {t('settings.unit.mm')}
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="unit"
                            value="inch"
                            checked={unitSettings.unit === 'inch'}
                            onChange={e => handleUnitChange('unit', e.target.value)}
                        />
                        {t('settings.unit.inch')}
                    </label>
                </div>
            </div>

            {/* Flute Settings */}
            <div className={styles.settingGroup}>
                <h4>{t('settings.unit.fluteSettings')}</h4>
                <div className={styles.buttonGroup}>
                    <button className={styles.actionButton} onClick={handleAddFlute}>{t('settings.unit.addFlute')}</button>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>{t('settings.unit.flute')}</th>
                                <th className={styles.th}>{t('settings.unit.thickness')}</th>
                                <th className={styles.th}>{t('settings.machine.delete')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {unitSettings.flutes.map((flute, idx) => (
                                <tr key={idx}>
                                    <td className={styles.td}>
                                        <input
                                            value={flute.name}
                                            onChange={e => handleUpdateFlute(idx, 'name', e.target.value)}
                                            style={{ width: '60px', textAlign: 'center' }}
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <input
                                            type="number"
                                            value={flute.value}
                                            onChange={e => handleUpdateFlute(idx, 'value', Number(e.target.value))}
                                            style={{ width: '80px', textAlign: 'center' }}
                                        />
                                        <span> {unitSettings.unit}</span>
                                    </td>
                                    <td className={styles.td}>
                                        <button className={styles.miniBtn} onClick={() => handleDeleteFlute(idx)}>刪除 (Delete)</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
;
};

export default UnitTab;
