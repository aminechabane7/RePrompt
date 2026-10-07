import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

interface ResetPasswordViewProps {
  onComplete: () => void;
  onRequestNewLink?: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  onComplete,
  onRequestNewLink,
}) => {
  const { user, recoveryError, clearPasswordRecovery, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(recoveryError || null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Supabase is not configured. Please check environment variables.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('session') ||
          error.message.toLowerCase().includes('token') ||
          error.message.toLowerCase().includes('expired') ||
          error.message.toLowerCase().includes('invalid')
        ) {
          throw new Error('Your password reset link is invalid or has expired. Please request a new one.');
        }
        if (error.message.toLowerCase().includes('same as')) {
          throw new Error('New password must be different from your old password.');
        }
        throw new Error(error.message || 'Unable to update password. Please try again.');
      }

      if (data?.user) {
        setIsSuccess(true);
        // Automatically complete recovery after brief confirmation
        setTimeout(() => {
          clearPasswordRecovery();
          onComplete();
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while updating your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    clearPasswordRecovery();
    await signOut();
    onComplete();
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-2xl border border-neutral-200 shadow-xl text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 tracking-tight mb-2">
          Password updated successfully!
        </h2>
        <p className="text-sm text-neutral-600 mb-6">
          Your password has been changed. You are now securely authenticated into RePrompt.
        </p>
        <button
          type="button"
          onClick={() => {
            clearPasswordRecovery();
            onComplete();
          }}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
        >
          <span>Continue to RePrompt</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-2xl border border-neutral-200 shadow-xl animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
          <KeyRound className="w-5 h-5 text-neutral-200" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Set New Password
          </h2>
          <p className="text-xs text-neutral-500">
            {user?.email ? `Resetting password for ${user.email}` : 'Enter your new account password'}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{errorMsg}</p>
            {errorMsg.includes('expired') || errorMsg.includes('invalid') ? (
              <button
                type="button"
                onClick={() => {
                  if (onRequestNewLink) {
                    clearPasswordRecovery();
                    onRequestNewLink();
                  } else {
                    handleCancel();
                  }
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
              >
                Request a new password reset email
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Reset Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label
            htmlFor="new-password"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5"
          >
            New password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="new-password"
              name="new-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full pl-10 pr-10 py-2.5 bg-neutral-50/50 border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide new password' : 'Show new password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer transition"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Must be at least 6 characters.
          </p>
        </div>

        {/* Confirm New Password */}
        <div>
          <label
            htmlFor="confirm-password"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5"
          >
            Confirm new password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirm-password"
              name="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full pl-10 pr-10 py-2.5 bg-neutral-50/50 border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer transition"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-[11px] text-rose-600 font-medium">
              Passwords do not match.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || password.length < 6 || password !== confirmPassword}
            className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center transition-colors shadow-sm cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Updating password...</span>
              </>
            ) : (
              <span>Update password</span>
            )}
          </button>
        </div>
      </form>

      {/* Security note & cancel action */}
      <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secured with Supabase Authentication</span>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="text-xs text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
        >
          Cancel and return to sign in
        </button>
      </div>
    </div>
  );
};
