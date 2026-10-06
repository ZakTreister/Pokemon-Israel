import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { login, clearError } from '../features/auth/authSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Eye, EyeOff, Zap } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(3, 'שם המשתמש חייב להיות לפחות 3 תווים'),
  password: z.string().min(6, 'הסיסמה חייבת להיות לפחות 6 תווים'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    dispatch(clearError());
    const resultAction = await dispatch(login(data));

    if (login.fulfilled.match(resultAction)) {
      const from = location.state?.from || '/';
      navigate(from);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="container py-16 min-h-[calc(100vh-20rem)]">
      <div className="max-w-md mx-auto">
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold text-navy-700 mb-4 shadow-cta">
            <Zap size={28} fill="currentColor" />
          </div>
        </div>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-extrabold text-center">התחברות</CardTitle>
            <CardDescription className="text-center">
              הזן את פרטי ההתחברות שלך כדי להיכנס לחשבונך
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-bold">
                  שם משתמש
                </label>
                <input
                  id="username"
                  type="text"
                  className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-background text-foreground"
                  placeholder="הזן שם משתמש"
                  autoComplete="username"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-destructive text-sm">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-bold">
                  סיסמה
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-background text-foreground"
                    placeholder="הזן סיסמה"
                    autoComplete="current-password"
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

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="cta"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'מתחבר...' : 'התחבר'}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-blue-500 transition-colors">
                חזרה לדף הבית
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
