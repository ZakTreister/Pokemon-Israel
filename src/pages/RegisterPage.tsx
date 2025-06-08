import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { register as registerUser, clearError } from '../features/auth/authSlice';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

const registerSchema = z.object({
  username: z.string().min(3, 'שם המשתמש חייב להיות לפחות 3 תווים'),
  email: z.string().email('כתובת אימייל לא תקינה').optional().or(z.literal('')),
  phone: z.string()
    .min(9, 'מספר טלפון חייב להיות לפחות 9 ספרות')
    .max(15, 'מספר טלפון ארוך מדי')
    .regex(/^[0-9]+$/, 'מספר טלפון חייב להכיל ספרות בלבד'),
  password: z.string().min(6, 'הסיסמה חייבת להיות לפחות 6 תווים'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
    }
  });

  const onSubmit = async (data: RegisterFormData) => {
    dispatch(clearError());
    const { confirmPassword, ...userData } = data;
    const resultAction = await dispatch(registerUser(userData));
    
    if (registerUser.fulfilled.match(resultAction)) {
      navigate('/');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="container py-16 min-h-[calc(100vh-20rem)]">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">הרשמה</CardTitle>
            <CardDescription className="text-center">
              צור חשבון חדש כדי להשתתף בטורנירים
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  שם משתמש
                </label>
                <input
                  id="username"
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="הזן שם משתמש"
                  autoComplete="username"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-destructive text-sm">{errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium flex justify-between">
                  <span>אימייל</span>
                  <span className="text-muted-foreground">(אופציונלי)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="הזן אימייל"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-destructive text-sm">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  טלפון
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="הזן מספר טלפון"
                  autoComplete="tel"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-destructive text-sm">{errors.phone.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  סיסמה
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="הזן סיסמה"
                    autoComplete="new-password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-sm">{errors.password.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  אימות סיסמה
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="אמת את הסיסמה"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground"
                    onClick={toggleConfirmPasswordVisibility}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'מבצע רישום...' : 'הרשם'}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground text-center w-full">
              כבר יש לך חשבון?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                התחבר
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}