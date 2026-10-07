import { useState } from 'react';
import type { RequestError } from '../../../types/api';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { useToast } from '../../../components/ui/ToastProvider';
import { checkAuth } from '../../auth/authSlice';
import userService from '../userService';
import {
  validateProfile,
  profileUpdate,
  type ProfileFormData,
} from '../utils/profile';

export function useProfileEditor() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { showToast } = useToast();
  // Profile editing state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

  const handleProfileEdit = () => {
    setProfileData({
      name: user?.name || '',
      username: user?.username || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setChangePassword(false);
    setShowProfileModal(true);
  };

  const handleProfileUpdate = async () => {
    setProfileError('');

    const validationError = validateProfile(profileData, changePassword);
    if (validationError) {
      setProfileError(validationError);
      return;
    }

    try {
      setIsUpdatingProfile(true);

      if (changePassword) {
        await userService.verifyCurrentPassword(
          user?.username,
          profileData.currentPassword,
        );
      }
      await userService.updateProfile(
        profileUpdate(profileData, changePassword),
      );

      showToast('הפרופיל עודכן בהצלחה!', 'success');

      // Reset form and close modal
      resetProfileModal();

      // Reconcile through existing Redux actions without replacing the document.
      await dispatch(checkAuth());
      // The existing protected-route auth reconciliation remounts the dashboard,
      // whose entry effect reloads stats and tournaments as before.
    } catch (caughtError) {
      const error = caughtError as RequestError;
      console.error('Error updating profile:', error);

      if (error.response?.status === 401) {
        setProfileError('הסיסמה הנוכחית שגויה');
      } else if (
        error.response?.status === 400 &&
        error.response?.data?.message?.includes('username')
      ) {
        setProfileError('שם המשתמש כבר קיים במערכת');
      } else {
        setProfileError(
          error.response?.data?.message || 'שגיאה בעדכון הפרופיל',
        );
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const resetProfileModal = () => {
    setProfileData({
      name: '',
      username: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setProfileError('');
    setShowPasswords({
      current: false,
      new: false,
      confirm: false,
    });
    setChangePassword(false);
    setShowProfileModal(false);
  };

  return {
    showProfileModal,
    profileData,
    setProfileData,
    showPasswords,
    profileError,
    isUpdatingProfile,
    changePassword,
    setChangePassword,
    handleProfileEdit,
    handleProfileUpdate,
    togglePasswordVisibility,
    resetProfileModal,
  };
}
