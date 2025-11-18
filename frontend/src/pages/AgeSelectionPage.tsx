import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Baby, FileText, Globe } from 'lucide-react';
import { Card, Button, Input, Slider } from '../components/ui';
import { useSession } from '../hooks/useSession';
import { LanguageType } from '../types/api.types';

interface LocationState {
  mrn?: string;
  childName?: string;
  parentName?: string;
  childAgeMonths?: number;
  language?: string;
  child?: {
    name: string;
    mrn: string;
  };
}

const AgeSelectionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { createQChatSession, isCreating, createError } = useSession();

  const locationState = location.state as LocationState | null;

  const [formData, setFormData] = useState({
    mrn: locationState?.mrn || locationState?.child?.mrn || '',
    parentName: locationState?.parentName || '',
    childName: locationState?.childName || locationState?.child?.name || '',
    childAgeMonths: locationState?.childAgeMonths || 24,
    language: (locationState?.language as LanguageType) || (i18n.language as LanguageType) || 'en',
  });

  // Sync i18n language with form language
  useEffect(() => {
    if (formData.language && formData.language !== i18n.language) {
      i18n.changeLanguage(formData.language);
    }
  }, [formData.language, i18n]);

  // Update form data if location state changes
  useEffect(() => {
    if (locationState) {
      setFormData(prev => ({
        ...prev,
        mrn: locationState.mrn || locationState.child?.mrn || prev.mrn,
        parentName: locationState.parentName || prev.parentName,
        childName: locationState.childName || locationState.child?.name || prev.childName,
        childAgeMonths: locationState.childAgeMonths || prev.childAgeMonths,
        language: (locationState.language as LanguageType) || prev.language,
      }));
    }
  }, [locationState]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.mrn.trim()) {
      newErrors.mrn = t('ageSelection.validation.mrnRequired');
    }

    if (!formData.parentName.trim()) {
      newErrors.parentName = t('ageSelection.validation.parentNameRequired');
    }

    if (!formData.childName.trim()) {
      newErrors.childName = t('ageSelection.validation.childNameRequired');
    }

    if (formData.childAgeMonths < 18 || formData.childAgeMonths > 24) {
      newErrors.childAgeMonths = t('ageSelection.validation.ageRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const token = await createQChatSession({
      mrn: formData.mrn,
      child_name: formData.childName,
      child_age_months: formData.childAgeMonths,
      parent_name: formData.parentName,
      language: formData.language,
    });

    if (token) {
      navigate(`/qchat/${token}`);
    }
  };

  // Check if child information is already provided
  const hasChildInfo = formData.childName && formData.mrn && formData.parentName;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-3">
            {t('ageSelection.title')}
          </h1>
          <p className="text-gray-600">
            {t('ageSelection.subtitle')}
          </p>
        </motion.div>

        {/* Child Information Display */}
        {hasChildInfo && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card padding="md" className="bg-primary-50 border-2 border-primary-200">
              <div className="flex items-center gap-3 mb-4">
                <Baby size={24} className="text-primary-700" />
                <h2 className="text-lg font-bold text-gray-900">
                  {t('ageSelection.childInfo.title')}
                </h2>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 min-w-[120px]">
                    {t('ageSelection.childInfo.childName')}:
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formData.childName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 min-w-[120px]">
                    {t('ageSelection.childInfo.mrn')}:
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formData.mrn}
                  </span>
                </div>
                {formData.parentName && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 min-w-[120px]">
                      {t('ageSelection.childInfo.parentName')}:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formData.parentName}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card padding="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* MRN */}
              <Input
                label={t('ageSelection.form.mrn')}
                placeholder={t('ageSelection.form.mrnPlaceholder')}
                value={formData.mrn}
                onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                error={errors.mrn}
                icon={<FileText size={20} />}
                fullWidth
              />

              {/* Parent Name */}
              <Input
                label={t('ageSelection.form.parentName')}
                placeholder={t('ageSelection.form.parentNamePlaceholder')}
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                error={errors.parentName}
                icon={<User size={20} />}
                fullWidth
              />

              {/* Child Name */}
              <Input
                label={t('ageSelection.form.childName')}
                placeholder={t('ageSelection.form.childNamePlaceholder')}
                value={formData.childName}
                onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                error={errors.childName}
                icon={<Baby size={20} />}
                fullWidth
              />

              {/* Age Slider */}
              <div>
                <Slider
                  min={18}
                  max={24}
                  value={formData.childAgeMonths}
                  onChange={(value) => setFormData({ ...formData, childAgeMonths: value })}
                  label={t('ageSelection.form.childAge')}
                  formatLabel={(value) => t('ageSelection.form.ageLabel', { age: value })}
                  step={1}
                />
                {errors.childAgeMonths && (
                  <p className="mt-2 text-sm text-danger-600">{errors.childAgeMonths}</p>
                )}
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('ageSelection.form.language')}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: 'en' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.language === 'en'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Globe size={20} />
                      <span className="font-medium">{t('ageSelection.form.languageEn')}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: 'ar' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.language === 'ar'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Globe size={20} />
                      <span className="font-medium">{t('ageSelection.form.languageAr')}</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {createError && (
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl">
                  <p className="text-sm text-danger-700">{createError}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isCreating}
              >
                {hasChildInfo ? t('ageSelection.startSession') : t('ageSelection.startChat')}
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* Info Note */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm text-gray-500 text-center">
            Your information is confidential and will be used only for this screening assessment.
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-4 bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            {t('home.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AgeSelectionPage;
