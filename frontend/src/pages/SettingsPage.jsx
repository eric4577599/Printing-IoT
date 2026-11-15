import React, { useState } from 'react';
import { useLanguage } from '../modules/language/LanguageContext';
import { useAuth } from '../modules/auth/AuthContext';
import FormulaTab from '../components/settings/FormulaTab';
import BoxTypeTab from '../components/settings/BoxTypeTab';
import ReportTab from '../components/settings/ReportTab';
import GeneralTab from '../components/settings/GeneralTab';
import UnitTab from '../components/settings/UnitTab';
import MachineTab from '../components/settings/MachineTab';
import CommunicationTab from '../components/settings/CommunicationTab';
import styles from './SettingsPage.module.css';

const SettingsPage = () => {
    const { t } = useLanguage();
    const { hasRole } = useAuth();
    const [activeTab, setActiveTab] = useState('formula');

    // RBAC:通訊設定只對 ADMIN / ENGINEER 顯示,與後端 SystemConfig 政策一致(B22)。
    // 原本一律 true,作業員也能開啟並改動畫面上的值(後端擋 403,但畫面已先樂觀更新)。
    const canSeeCommunication = hasRole('ADMIN', 'ENGINEER');
    const canSeeFormula = true; // user?.role === 'ADMIN';
    const canSeeBoxType = true; // Open to all or admin?

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>{t('nav.settings')}</div>
                <div className={`${styles.menuItem} ${activeTab === 'general' ? styles.active : ''}`} onClick={() => setActiveTab('general')}>{t('settings.tabs.general')}</div>
                <div className={`${styles.menuItem} ${activeTab === 'unit' ? styles.active : ''}`} onClick={() => setActiveTab('unit')}>{t('settings.tabs.unit')}</div>
                <div className={`${styles.menuItem} ${activeTab === 'machine' ? styles.active : ''}`} onClick={() => setActiveTab('machine')}>{t('settings.tabs.machine')}</div>

                {canSeeCommunication && (
                    <div className={`${styles.menuItem} ${activeTab === 'communication' ? styles.active : ''}`} onClick={() => setActiveTab('communication')}>{t('settings.tabs.communication')}</div>
                )}

                {canSeeFormula && (
                    <div className={`${styles.menuItem} ${activeTab === 'formula' ? styles.active : ''}`} onClick={() => setActiveTab('formula')}>{t('settings.tabs.formula')}</div>
                )}

                {canSeeBoxType && (
                    <div className={`${styles.menuItem} ${activeTab === 'boxType' ? styles.active : ''}`} onClick={() => setActiveTab('boxType')}>{t('settings.tabs.boxType')}</div>
                )}

                <div className={`${styles.menuItem} ${activeTab === 'report' ? styles.active : ''}`} onClick={() => setActiveTab('report')}>{t('settings.tabs.report')}</div>
            </div>
            <div className={styles.content}>
                {activeTab === 'general' && <GeneralTab />}
                {activeTab === 'unit' && <UnitTab />}
                {activeTab === 'machine' && <MachineTab />}
                {activeTab === 'formula' && (canSeeFormula ? <FormulaTab /> : <div className={styles.tabContent}>Access Denied</div>)}
                {activeTab === 'communication' && (canSeeCommunication ? <CommunicationTab /> : <div className={styles.tabContent}>Access Denied</div>)}
                {activeTab === 'boxType' && (canSeeBoxType ? <BoxTypeTab /> : <div className={styles.tabContent}>Access Denied</div>)}
                {activeTab === 'report' && <ReportTab />}
            </div>
        </div>
    );
};

export default SettingsPage;
