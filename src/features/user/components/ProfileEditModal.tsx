import { useId } from 'react';
import { User } from 'lucide-react';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import PasswordField from '../../../components/ui/PasswordField';
import type { useProfileEditor } from '../hooks/useProfileEditor';

export default function ProfileEditModal({
  editor,
}: {
  editor: ReturnType<typeof useProfileEditor>;
}) {
  const id = useId();
  const {
    profileData,
    setProfileData,
    showPasswords,
    profileError,
    isUpdatingProfile,
    changePassword,
    setChangePassword,
    handleProfileUpdate,
    togglePasswordVisibility,
    resetProfileModal,
  } = editor;
  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <User size={20} />
          <span>עריכת פרופיל</span>
        </span>
      }
      panelClassName="max-w-md max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        <FormField label="שם מלא *" htmlFor={`${id}-name`}>
          <input
            type="text"
            className="w-full px-3 py-2 border border-input rounded-md"
            id={`${id}-name`}
            placeholder="הזן שם מלא"
            value={profileData.name}
            onChange={(e) =>
              setProfileData({ ...profileData, name: e.target.value })
            }
          />
        </FormField>

        <FormField label="שם משתמש *" htmlFor={`${id}-username`}>
          <input
            type="text"
            className="w-full px-3 py-2 border border-input rounded-md"
            id={`${id}-username`}
            placeholder="הזן שם משתמש (לפחות 3 תווים)"
            value={profileData.username}
            onChange={(e) =>
              setProfileData({ ...profileData, username: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            שם המשתמש משמש להתחברות למערכת
          </p>
        </FormField>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="changePassword"
              className="rounded border-input"
              checked={changePassword}
              onChange={(e) => setChangePassword(e.target.checked)}
            />
            <label htmlFor="changePassword" className="text-sm font-medium">
              שינוי סיסמה
            </label>
          </div>

          {changePassword && (
            <div className="space-y-3">
              <PasswordField
                label="סיסמה נוכחית *"
                placeholder="הזן סיסמה נוכחית"
                value={profileData.currentPassword}
                visible={showPasswords.current}
                onChange={(value) =>
                  setProfileData({ ...profileData, currentPassword: value })
                }
                onToggle={() => togglePasswordVisibility('current')}
              />

              <PasswordField
                label="סיסמה חדשה *"
                placeholder="הזן סיסמה חדשה (לפחות 6 תווים)"
                value={profileData.newPassword}
                visible={showPasswords.new}
                onChange={(value) =>
                  setProfileData({ ...profileData, newPassword: value })
                }
                onToggle={() => togglePasswordVisibility('new')}
              />

              <PasswordField
                label="אימות סיסמה חדשה *"
                placeholder="הזן שוב את הסיסמה החדשה"
                value={profileData.confirmPassword}
                visible={showPasswords.confirm}
                onChange={(value) =>
                  setProfileData({ ...profileData, confirmPassword: value })
                }
                onToggle={() => togglePasswordVisibility('confirm')}
              />
            </div>
          )}
        </div>

        {profileError && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {profileError}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={resetProfileModal}
            disabled={isUpdatingProfile}
          >
            ביטול
          </Button>
          <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile}>
            {isUpdatingProfile ? 'מעדכן פרופיל...' : 'שמור שינויים'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
