import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, User, Phone, Baby, Globe, MessageSquare, CheckCircle } from 'lucide-react';
import { Card, Button, Input, Slider } from '../components/ui';
import { mchatAPI } from '../services/mchat-api';
import { LanguageType } from '../types/api.types';

const ContactPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [formData, setFormData] = useState({
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    childName: '',
    childAgeMonths: 24,
    preferredLanguage: (i18n.language as LanguageType) || 'en',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.parentName.trim()) {
      newErrors.parentName = t('contact.validation.nameRequired');
    }

    if (!formData.parentEmail.trim()) {
      newErrors.parentEmail = t('contact.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      newErrors.parentEmail = t('contact.validation.emailInvalid');
    }

    if (!formData.childName.trim()) {
      newErrors.childName = t('contact.validation.childNameRequired');
    }

    if (formData.childAgeMonths < 16 || formData.childAgeMonths > 30) {
      newErrors.childAgeMonths = t('contact.validation.ageRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await mchatAPI.submitContactRequest({
        parent_name: formData.parentName,
        parent_email: formData.parentEmail,
        parent_phone: formData.parentPhone || null,
        child_name: formData.childName,
        child_age_months: formData.childAgeMonths,
        preferred_language: formData.preferredLanguage,
        message: formData.message || null,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(err.detail || t('contact.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div
          className="max-w-md w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card padding="lg" className="text-center">
            <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-success-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {t('contact.successTitle')}
            </h2>
            <p className="text-gray-600 mb-8">{t('contact.successMessage')}</p>
            <Button variant="primary" onClick={() => window.location.href = '/'}>
              {t('common.back')} to Home
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

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
            {t('contact.title')}
          </h1>
          <p className="text-gray-600">{t('contact.subtitle')}</p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card padding="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Parent Name */}
              <Input
                label={t('contact.form.parentName')}
                placeholder={t('contact.form.parentNamePlaceholder')}
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                error={errors.parentName}
                icon={<User size={20} />}
                fullWidth
              />

              {/* Parent Email */}
              <Input
                type="email"
                label={t('contact.form.parentEmail')}
                placeholder={t('contact.form.parentEmailPlaceholder')}
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                error={errors.parentEmail}
                icon={<Mail size={20} />}
                fullWidth
              />

              {/* Parent Phone (Optional) */}
              <Input
                type="tel"
                label={t('contact.form.parentPhone')}
                placeholder={t('contact.form.parentPhonePlaceholder')}
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                icon={<Phone size={20} />}
                fullWidth
              />

              {/* Child Name */}
              <Input
                label={t('contact.form.childName')}
                placeholder={t('contact.form.childNamePlaceholder')}
                value={formData.childName}
                onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                error={errors.childName}
                icon={<Baby size={20} />}
                fullWidth
              />

              {/* Child Age */}
              <div>
                <Slider
                  min={16}
                  max={30}
                  value={formData.childAgeMonths}
                  onChange={(value) => setFormData({ ...formData, childAgeMonths: value })}
                  label={t('contact.form.childAge')}
                  formatLabel={(value) => `${value} months`}
                  step={1}
                />
                {errors.childAgeMonths && (
                  <p className="mt-2 text-sm text-danger-600">{errors.childAgeMonths}</p>
                )}
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('contact.form.preferredLanguage')}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, preferredLanguage: LanguageType.EN })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.preferredLanguage === LanguageType.EN
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Globe size={20} />
                      <span className="font-medium">English</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, preferredLanguage: LanguageType.AR })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.preferredLanguage === LanguageType.AR
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Globe size={20} />
                      <span className="font-medium">العربية</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Message (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('contact.form.message')}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400">
                    <MessageSquare size={20} />
                  </div>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t('contact.form.messagePlaceholder')}
                    rows={4}
                    className="block w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl">
                  <p className="text-sm text-danger-700">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
              >
                {t('contact.submitButton')}
              </Button>
            </form>
          </Card>
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

export default ContactPage;
