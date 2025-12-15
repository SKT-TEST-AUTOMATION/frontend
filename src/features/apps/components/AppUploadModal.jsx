import React, { useState, useEffect, useMemo } from 'react';
import { createApp, updateApp } from '../../../services/appAPI.js';
import { useToast } from '../../../shared/hooks/useToast.js';
import { toErrorMessage } from '../../../services/axios.js';

const APP_PLATFORMS = ['MOBILE_APP', 'MOBILE_WEB', 'WEB'];
const DEVICE_OS_TYPES = ['ANDROID', 'IOS'];
const APP_ENVIRONMENTS = ['DEV', 'QA', 'STAGE', 'PROD'];

export default function AppUploadModal({ open, onClose, onSaved, initialData }) {
  const { showError, showSuccess } = useToast();
  const isEdit = !!initialData?.id;
  const [form, setForm] = useState({
    name: '',
    osType: 'ANDROID',
    platform: 'MOBILE_APP',
    appId: '',
    appActivity: '',
    environment: 'DEV',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEdit) {
        setForm({
          id: initialData.id,
          name: initialData.name || '',
          osType: initialData.osType || 'ANDROID',
          platform: initialData.platform || 'MOBILE_APP',
          appId: initialData.appId || '',
          appActivity: initialData.appActivity || '',
          environment: initialData.environment || 'QA',
          description: initialData.description || ''
        });
      } else {
        // Reset for new entry
        setForm({
          name: '',
          osType: 'ANDROID',
          platform: 'MOBILE_APP',
          appId: '',
          appActivity: '',
          environment: 'QA',
          description: ''
        });
      }
    }
  }, [open, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const saved = isEdit
      ? await updateApp(initialData.id, form)
        : await createApp(form);

      showSuccess("앱 정보가 등록되었습니다.");
      onSaved?.(saved, { isEdit });
      onClose?.();
    } catch (error) {
      showError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            {initialData ? '앱 정보 수정' : '앱 등록'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="app-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">앱 이름 *</label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                placeholder="예: MyBank QA App"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* OS Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OS *</label>
                <select
                  name="osType"
                  value={form.osType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {DEVICE_OS_TYPES.map(os => <option key={os} value={os}>{os}</option>)}
                </select>
              </div>
              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">플랫폼 *</label>
                <select
                  name="platform"
                  value={form.platform}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {APP_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Environment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">환경 *</label>
              <select
                name="environment"
                value={form.environment}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {APP_ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {/* App ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">App ID (Package/Bundle ID) *</label>
              <input
                type="text"
                name="appId"
                required
                value={form.appId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                placeholder="com.example.app"
              />
            </div>

            {/* App Activity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">App Activity / URL *</label>
              <input
                type="text"
                name="appActivity"
                required
                value={form.appActivity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                placeholder=".MainActivity or https://..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설명</label>
              <textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                placeholder="앱에 대한 추가 설명"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            취소
          </button>
          <button
            type="submit"
            form="app-form"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {initialData ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}