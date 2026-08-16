import React, { useState } from 'react';
import { User, Mail, Lock, Shield, AlertTriangle, Key } from 'lucide-react';
import { loadDB, updateDB, type User as DBUser, type UserRole } from '../../utils/mockDb';

interface AuthModuleProps {
  onLoginSuccess: (user: DBUser) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AuthModule: React.FC<AuthModuleProps> = ({ onLoginSuccess, addToast }) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'verify_email' | 'verify_2fa'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [profileName, setProfileName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  
  // 2FA / Verification States
  const [pendingUser, setPendingUser] = useState<DBUser | null>(null);
  const [code, setCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      addToast('Please enter both username and password.', 'error');
      return;
    }

    const db = loadDB();
    const user = db.users.find(
      (u) => (u.username === username || u.email === username) && u.passwordHash === password
    );

    if (!user) {
      addToast('Invalid credentials.', 'error');
      return;
    }

    if (!user.isActive) {
      addToast('Your account is deactivated. Contact administrator.', 'error');
      return;
    }

    if (user.role === 'examiner') {
      const correctCode = user.teacherId || 'T-101';
      if (!teacherId || (teacherId !== correctCode && teacherId !== 'TEACHER2026')) {
        addToast('Invalid Teacher ID. Examiners must enter a valid Teacher ID.', 'error');
        return;
      }
    }

    if (user.isTwoFactorEnabled) {
      setPendingUser(user);
      setView('verify_2fa');
      addToast('Two-Factor Authentication is enabled. Enter your code.', 'info');
      return;
    }

    // Success login
    addToast(`Welcome back, ${user.profileName}!`, 'success');
    onLoginSuccess(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !profileName) {
      addToast('All fields are required.', 'error');
      return;
    }

    const db = loadDB();
    if (db.users.some((u) => u.username === username)) {
      addToast('Username already exists.', 'error');
      return;
    }
    if (db.users.some((u) => u.email === email)) {
      addToast('Email already exists.', 'error');
      return;
    }

    const newUser: DBUser = {
      id: `${role}-${Date.now()}`,
      username,
      passwordHash: password,
      email,
      role,
      isActive: true,
      isEmailVerified: true, // Auto verified
      isTwoFactorEnabled: false,
      profileName,
      registrationDate: new Date().toISOString().split('T')[0]
    };

    updateDB((db) => {
      db.users.push(newUser);
    });

    addToast('Registration successful! You can now log in.', 'success');
    setView('login');
    setUsername(username);
    setPassword(password);
  };

  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      addToast('Please enter the verification code.', 'error');
      return;
    }

    // Simulate validation (any 6 digit or '123456')
    if (code === '123456' || code.length === 6) {
      updateDB((db) => {
        const u = db.users.find((x) => x.id === pendingUser?.id);
        if (u) u.isEmailVerified = true;
      });

      addToast('Email verified successfully! You can now log in.', 'success');
      setView('login');
      setUsername(pendingUser?.username || '');
      setPendingUser(null);
      setCode('');
    } else {
      addToast('Invalid verification code. Enter 123456.', 'error');
    }
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      addToast('Please enter the 2FA code.', 'error');
      return;
    }

    // Mock verification (any 6 digits or '123456')
    if (code === '123456' || code.length === 6) {
      if (pendingUser) {
        addToast(`Welcome, ${pendingUser.profileName}!`, 'success');
        onLoginSuccess(pendingUser);
      }
    } else {
      addToast('Invalid 2FA code. Enter 123456.', 'error');
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      addToast('Please enter your email.', 'error');
      return;
    }

    const db = loadDB();
    const user = db.users.find((u) => u.email === resetEmail);
    if (!user) {
      addToast('Email not found.', 'error');
      return;
    }

    setPendingUser(user);
    setVerificationCode('RESET123');
    addToast('Reset code sent! Enter code and new password.', 'info');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (code !== 'RESET123') {
      addToast('Invalid reset code. Use RESET123.', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      addToast('Password must be at least 6 characters.', 'error');
      return;
    }

    updateDB((db) => {
      const u = db.users.find((x) => x.id === pendingUser?.id);
      if (u) u.passwordHash = newPassword;
    });

    addToast('Password reset successfully! Log in with new password.', 'success');
    setView('login');
    setUsername(pendingUser?.username || '');
    setPassword('');
    setPendingUser(null);
    setCode('');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw', background: 'radial-gradient(circle at center, #1b1c26 0%, #0a0b10 100%)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-gradient)', color: '#fff', marginBottom: '16px' }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>EXAMIFY</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            {view === 'login' && 'Secure Examination Portal Portal'}
            {view === 'register' && 'Create candidate account'}
            {view === 'forgot' && 'Reset your password'}
            {view === 'verify_email' && 'Verify your Email'}
            {view === 'verify_2fa' && 'Two-Factor Verification'}
          </p>
        </div>

        {/* Login View */}
        {view === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="form-label">Username or Email</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your username or email"
                  style={{ paddingLeft: '44px' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your password"
                  style={{ paddingLeft: '44px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {(() => {
              const dbCheck = loadDB();
              const matched = dbCheck.users.find((u) => u.username === username || u.email === username);
              if (matched?.role === 'examiner') {
                return (
                  <div>
                    <label className="form-label">Teacher ID</label>
                    <div style={{ position: 'relative' }}>
                      <Key size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Enter your Teacher ID"
                        style={{ paddingLeft: '44px' }}
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span
                onClick={() => setView('forgot')}
                style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Forgot Password?
              </span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', marginTop: '8px' }}>
              Login Securely
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
              Don't have an account?{' '}
              <span
                onClick={() => setView('register')}
                style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Register here
              </span>
            </div>
          </form>
        )}

        {/* Register View */}
        {view === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="johndoe12"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Register As</label>
              <select
                className="form-input"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="student">Student / Candidate</option>
                <option value="examiner">Examiner / Professor</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', marginTop: '8px' }}>
              Register Account
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
              Already registered?{' '}
              <span
                onClick={() => setView('login')}
                style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Sign In
              </span>
            </div>
          </form>
        )}

        {/* Email Verification View */}
        {view === 'verify_email' && (
          <form onSubmit={handleVerifyEmail} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <AlertTriangle size={24} style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '0.85rem' }}>
                We've sent a 6-digit verification code to <strong>{pendingUser?.email}</strong>. (Simulated code: <strong>123456</strong>)
              </p>
            </div>

            <div>
              <label className="form-label">Enter Verification Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="123456"
                maxLength={6}
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em' }}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px' }}>
              Verify & Complete
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
              <span onClick={() => { setPendingUser(null); setView('login'); }} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel & Return
              </span>
            </div>
          </form>
        )}

        {/* 2FA Verification View */}
        {view === 'verify_2fa' && (
          <form onSubmit={handleVerify2FA} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-primary)', color: 'var(--text-primary)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Key size={24} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <p style={{ fontSize: '0.85rem' }}>
                Open your authenticator app (e.g. Google Authenticator) to get code. (Simulated code: <strong>123456</strong>)
              </p>
            </div>

            <div>
              <label className="form-label">Enter Authenticator Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="000000"
                maxLength={6}
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em' }}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px' }}>
              Verify & Sign In
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
              <span onClick={() => { setPendingUser(null); setView('login'); }} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel & Return
              </span>
            </div>
          </form>
        )}

        {/* Forgot Password View */}
        {view === 'forgot' && (
          <div>
            {!verificationCode ? (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label className="form-label">Registered Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="student@examportal.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px' }}>
                  Request Reset Code
                </button>
                <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                  <span onClick={() => setView('login')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Back to Login
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-info)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                  Enter code <strong>RESET123</strong> to reset your password.
                </div>
                <div>
                  <label className="form-label">Reset Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="RESET123"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px' }}>
                  Update Password
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
