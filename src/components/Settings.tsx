import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  DollarSign,
  Calendar,
  Bell,
  Key,
  User,
  Shield,
  FileText,
  Layout,
  Zap,
  Users as UsersIcon,
  PieChart
} from 'lucide-react';
import CompanyProfile from './settings/CompanyProfile';
import SalaryComponents from './settings/SalaryComponents';
import PayrollPeriod from './settings/PayrollPeriod';
import NotificationSettings from './settings/NotificationSettings';
import APISettings from './settings/APISettings';
import UserProfile from './settings/UserProfile';
import SecuritySettings from './settings/SecuritySettings';
import DashboardPreferences from './settings/DashboardPreferences';
import BulkOperations from './settings/BulkOperations';
import EmployeePolicy from './settings/EmployeePolicy';
import BudgetPlanning from './settings/BudgetPlanning';

type SettingsTab =
  | 'company'
  | 'salary'
  | 'payroll'
  | 'notifications'
  | 'api'
  | 'profile'
  | 'security'
  | 'dashboard'
  | 'bulk'
  | 'employee_policy'
  | 'budget';

export default function Settings() {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs = [
    { id: 'profile' as SettingsTab, name: 'Profil Saya', icon: User, adminOnly: false },
    { id: 'company' as SettingsTab, name: 'Profil Perusahaan', icon: Building2, adminOnly: true },
    { id: 'dashboard' as SettingsTab, name: 'Preferensi Dashboard', icon: Layout, adminOnly: true },
    { id: 'bulk' as SettingsTab, name: 'Operasi Massal', icon: Zap, adminOnly: true },
    { id: 'salary' as SettingsTab, name: 'Komponen Gaji', icon: DollarSign, adminOnly: true },
    { id: 'payroll' as SettingsTab, name: 'Periode Gaji', icon: Calendar, adminOnly: true },
    { id: 'employee_policy' as SettingsTab, name: 'Kebijakan Karyawan', icon: UsersIcon, adminOnly: true },
    { id: 'budget' as SettingsTab, name: 'Anggaran & Forecast', icon: PieChart, adminOnly: true },
    { id: 'notifications' as SettingsTab, name: 'Notifikasi', icon: Bell, adminOnly: false },
    { id: 'api' as SettingsTab, name: 'API & AI', icon: Key, adminOnly: true },
    { id: 'security' as SettingsTab, name: 'Keamanan', icon: Shield, adminOnly: false },
  ];

  const visibleTabs = tabs.filter(tab => {
    if (!tab.adminOnly) return true;
    return isSuperAdmin;
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'company':
        return <CompanyProfile />;
      case 'dashboard':
        return <DashboardPreferences />;
      case 'bulk':
        return <BulkOperations />;
      case 'salary':
        return <SalaryComponents />;
      case 'payroll':
        return <PayrollPeriod />;
      case 'employee_policy':
        return <EmployeePolicy />;
      case 'budget':
        return <BudgetPlanning />;
      case 'notifications':
        return <NotificationSettings />;
      case 'api':
        return <APISettings />;
      case 'profile':
        return <UserProfile />;
      case 'security':
        return <SecuritySettings />;
      default:
        return <UserProfile />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-gray-600">Kelola pengaturan aplikasi dan preferensi Anda</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-0">
            <div className="col-span-12 md:col-span-3 border-r border-gray-200 bg-gray-50">
              <nav className="p-4 space-y-1">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="col-span-12 md:col-span-9 p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
