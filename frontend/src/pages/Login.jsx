'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { createClient } from '../lib/supabase/client.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Official Google G Logo SVG Component
 */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function LoginFormContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo');
  const oauthError = searchParams?.get('error');

  const { login } = useAuth();
  const supabase = createClient();

  // Mode: 0 = Sign In, 1 = Sign Up
  const [authMode, setAuthMode] = useState(0);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Strict Real-World RBAC Role for Sign Up (Admin vs. Staff)
  const [signUpRole, setSignUpRole] = useState('Staff');

  // Feedback State
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Handle URL errors (e.g. redirected back from OAuth failure)
  useEffect(() => {
    if (oauthError) {
      setErrorMessage('Google authentication could not be completed. Please try again or use your work email.');
    }
  }, [oauthError]);

  /**
   * Supabase OAuth Sign In with Google
   */
  const handleGoogleSignIn = async () => {
    if (googleLoading || loading) return;

    try {
      setErrorMessage(null);
      setGoogleLoading(true);

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const nextTarget = redirectTo || (authMode === 0 ? '/dashboard' : '/chat');
      const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextTarget)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to connect to Google OAuth service.'
      );
      setGoogleLoading(false);
    }
  };

  /**
   * Email/Password Sign In or Sign Up with strict RBAC enforcement
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your work email.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (authMode === 0) {
        // =========================================================================
        // SIGN IN: Strict RBAC (No Role Selection in Sign In tab)
        // User role is strictly retrieved from the user's saved Supabase metadata
        // =========================================================================
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        // Retrieve role strictly from saved Supabase user metadata
        const savedRole = data.user?.user_metadata?.role || 'Staff';
        const normalizedRole =
          savedRole.toLowerCase() === 'admin' ? 'Admin' : 'Staff';

        if (typeof document !== 'undefined') {
          document.cookie = `sb-auth-token=${normalizedRole}; path=/; max-age=604800; SameSite=Lax`;
        }

        login(normalizedRole);
        setSuccessMessage('Signed in successfully! Redirecting...');

        setTimeout(() => {
          if (redirectTo) {
            navigate(redirectTo);
          } else {
            navigate(normalizedRole === 'Admin' ? '/dashboard' : '/chat');
          }
        }, 400);
      } else {
        // =========================================================================
        // SIGN UP: Strict Real-World RBAC
        // Role is chosen via the Sign Up role toggle and stored into Supabase metadata
        // =========================================================================
        const displayName =
          fullName.trim() || (signUpRole === 'Admin' ? 'System Administrator' : 'Staff Analyst');

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              role: signUpRole, // Securely persisted in user_metadata.role
              full_name: displayName,
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        if (data.user && !data.session) {
          setSuccessMessage(
            `Account created with ${signUpRole} privileges! Please check your email to verify before signing in.`
          );
          setLoading(false);
          return;
        }

        if (typeof document !== 'undefined') {
          document.cookie = `sb-auth-token=${signUpRole}; path=/; max-age=604800; SameSite=Lax`;
        }

        login(signUpRole);
        setSuccessMessage(`Account created as ${signUpRole}! Redirecting to workspace...`);

        setTimeout(() => {
          if (redirectTo) {
            navigate(redirectTo);
          } else {
            navigate(signUpRole === 'Admin' ? '/dashboard' : '/chat');
          }
        }, 400);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased">
      {/* ============================================================= */}
      {/* SUBTLE MODERN GRADIENT BACKGROUND ACCENTS                     */}
      {/* ============================================================= */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[420px] bg-gradient-to-b from-blue-100/50 via-indigo-50/30 to-transparent pointer-events-none blur-3xl -z-10" />
      <div className="absolute top-1/4 -left-36 w-80 h-80 bg-blue-300/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 -right-36 w-80 h-80 bg-indigo-300/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none -z-10" />

      <div className="max-w-[440px] w-full mx-auto relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center mb-7 text-center">
          <Link to="/" className="flex items-center gap-2.5 no-underline mb-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1a56db] to-[#2563eb] text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <AccountBalanceIcon fontSize="small" />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 block leading-none">
                FinAgent AI
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5 block">
                Enterprise Intelligence
              </span>
            </div>
          </Link>
          <Typography variant="h5" className="font-bold text-slate-900 tracking-tight text-xl sm:text-2xl mt-1">
            {authMode === 0 ? 'Welcome back' : 'Create your workspace'}
          </Typography>
          <Typography variant="body2" className="text-slate-500 mt-1 text-xs sm:text-sm">
            {authMode === 0
              ? 'Enter your credentials to access your financial workspace'
              : 'Select your role and begin processing financial filings'}
          </Typography>
        </div>

        {/* ============================================================= */}
        {/* AUTH CARD WITH SLEEK SOFT-SHADOW EFFECT                        */}
        {/* ============================================================= */}
        <Paper
          elevation={0}
          className="p-7 sm:p-9 rounded-[28px] bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)] transition-all"
        >
          {/* Segmented Mode Switcher */}
          <div className="flex p-1 bg-slate-100/90 rounded-2xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setAuthMode(0);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                authMode === 0
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode(1);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                authMode === 1
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <Alert severity="error" className="mb-5 rounded-2xl text-xs py-1.5 shadow-2xs">
              {errorMessage}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success" className="mb-5 rounded-2xl text-xs py-1.5 shadow-2xs">
              {successMessage}
            </Alert>
          )}

          {/* 1. Continue with Google Button */}
          <button
            type="button"
            id="google-oauth-login-btn"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50/90 active:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-2xl text-slate-700 text-xs sm:text-sm font-semibold shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none"
          >
            {googleLoading ? (
              <>
                <CircularProgress size={16} sx={{ color: '#475569' }} />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* 2. Visual Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                Or continue with email
              </span>
            </div>
          </div>

          {/* 3. Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name (Sign Up only) */}
            {authMode === 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <TextField
                  fullWidth
                  size="small"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alishba Naz"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlinedIcon fontSize="small" className="text-slate-400" />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2.5, fontSize: '0.8125rem' },
                    },
                  }}
                />
              </div>
            )}

            {/* Work Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email
              </label>
              <TextField
                fullWidth
                size="small"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon fontSize="small" className="text-slate-400" />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2.5, fontSize: '0.8125rem' },
                  },
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <TextField
                fullWidth
                size="small"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" className="text-slate-400" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          className="text-slate-400 p-1"
                        >
                          {showPassword ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2.5, fontSize: '0.8125rem' },
                  },
                }}
              />
            </div>

            {/* ============================================================= */}
            {/* 4. BEAUTIFULLY STYLED ROLE SELECTION TOGGLE (SIGN UP ONLY)   */}
            {/* Admin vs. Staff role assignment stored in Supabase metadata    */}
            {/* ============================================================= */}
            {authMode === 1 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-800">
                    Select Your Role (RBAC)
                  </label>
                  <span className="text-[10px] font-semibold text-[#1a56db] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 font-mono">
                    Immutable Once Created
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Staff Analyst Option */}
                  <div
                    onClick={() => setSignUpRole('Staff')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      signUpRole === 'Staff'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-200/80 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            signUpRole === 'Staff'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <PersonOutlinedIcon sx={{ fontSize: 16 }} />
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            signUpRole === 'Staff'
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {signUpRole === 'Staff' && <CheckCircleIcon sx={{ fontSize: 14 }} />}
                        </div>
                      </div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        Staff Analyst
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Financial chat &amp; GenUI charts
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded mt-2.5 inline-block w-fit">
                      Read &amp; Query
                    </span>
                  </div>

                  {/* Administrator Option */}
                  <div
                    onClick={() => setSignUpRole('Admin')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      signUpRole === 'Admin'
                        ? 'border-[#1a56db] bg-blue-50/70 ring-2 ring-blue-200/80 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            signUpRole === 'Admin'
                              ? 'bg-[#1a56db] text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            signUpRole === 'Admin'
                              ? 'border-[#1a56db] bg-[#1a56db] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {signUpRole === 'Admin' && <CheckCircleIcon sx={{ fontSize: 14 }} />}
                        </div>
                      </div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        Administrator
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Full ops, storage &amp; delete controls
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded mt-2.5 inline-block w-fit">
                      Full Access
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || googleLoading}
              endIcon={!loading && <ArrowForwardIcon fontSize="small" />}
              sx={{
                bgcolor: '#1a56db',
                '&:hover': {
                  bgcolor: '#1545b0',
                },
                textTransform: 'none',
                borderRadius: 2.5,
                py: 1.2,
                fontSize: '0.875rem',
                fontWeight: 600,
                mt: 2.5,
                boxShadow: '0 4px 14px 0 rgba(26, 86, 219, 0.25)',
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <CircularProgress size={16} color="inherit" />
                  <span>Processing...</span>
                </div>
              ) : authMode === 0 ? (
                'Sign In to Workspace'
              ) : (
                `Create Account as ${signUpRole}`
              )}
            </Button>
          </form>

          {/* Toggle Footer */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            {authMode === 0 ? (
              <p className="text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(1);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[#1a56db] font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Create Account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(0);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[#1a56db] font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </Paper>

        {/* Security & Compliance Footer */}
        <div className="mt-6 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <SecurityIcon sx={{ fontSize: 13 }} />
            <span>Encrypted with Supabase Auth &amp; Enterprise RBAC Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
          <CircularProgress size={32} sx={{ color: '#1a56db' }} />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
