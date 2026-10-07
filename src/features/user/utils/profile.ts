export interface ProfileFormData {
  name: string;
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileUpdate {
  name: string;
  username: string;
  password?: string;
}

export function validateProfile(
  profile: ProfileFormData,
  changePassword: boolean,
): string {
  // Basic validation
  if (!profile.name.trim() || !profile.username.trim()) {
    return 'שם ושם משתמש הם שדות חובה';
  }

  if (profile.username.length < 3) {
    return 'שם המשתמש חייב להיות לפחות 3 תווים';
  }

  // Password validation if changing password
  if (changePassword) {
    if (!profile.currentPassword) {
      return 'יש להזין את הסיסמה הנוכחית';
    }

    if (!profile.newPassword) {
      return 'יש להזין סיסמה חדשה';
    }

    if (profile.newPassword.length < 6) {
      return 'הסיסמה החדשה חייבת להיות לפחות 6 תווים';
    }

    if (profile.newPassword !== profile.confirmPassword) {
      return 'הסיסמאות החדשות אינן תואמות';
    }
  }

  return '';
}

export function profileUpdate(
  profile: ProfileFormData,
  changePassword: boolean,
): ProfileUpdate {
  const payload: ProfileUpdate = {
    name: profile.name.trim(),
    username: profile.username.trim(),
  };
  if (changePassword) payload.password = profile.newPassword;
  return payload;
}
