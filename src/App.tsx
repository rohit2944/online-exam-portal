import { useState, useEffect } from 'react';
import { Sun, Moon, LogOut, ShieldCheck, AlertCircle } from 'lucide-react';
import { AuthModule } from './components/auth/AuthModule';
import { AdminModule } from './components/admin/AdminModule';
import { ExaminerModule } from './components/examiner/ExaminerModule';
import { StudentModule } from './components/student/StudentModule';
import { loadDB, type User } from './utils/mockDb';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isGateUnlocked, setIsGateUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('gate_unlocked') === 'true';
  });
  const [gateInput, setGateInput] = useState('');

  // Load session from localStorage on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('active_session_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser) as User;
        // Verify user still exists and is active in DB
        const db = loadDB();
        const freshUser = db.users.find((x) => x.id === u.id);
        if (freshUser && freshUser.isActive) {
          setCurrentUser(freshUser);
        } else {
          localStorage.removeItem('active_session_user');
        }
      } catch (e) {
        localStorage.removeItem('active_session_user');
      }
    }

    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme === 'light') {
      setTheme('light');
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      document.body.classList.add('light-theme');
      localStorage.setItem('app_theme', 'light');
    } else {
      setTheme('dark');
      document.body.classList.remove('light-theme');
      localStorage.setItem('app_theme', 'dark');
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('active_session_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('active_session_user');
    addToast('Logged out securely.', 'info');
  };

  // Toast Notification System
  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleUnlockGate = (e: React.FormEvent) => {
    e.preventDefault();
    const correctCode = 'EXAM2026';
    if (gateInput === correctCode) {
      setIsGateUnlocked(true);
      localStorage.setItem('gate_unlocked', 'true');
      addToast('Access Granted! Welcome to Examify.', 'success');
    } else {
      addToast('Invalid Access Code. Please check and try again.', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Notification Mount */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' && <ShieldCheck size={18} />}
            {t.type === 'error' && <AlertCircle size={18} />}
            {t.type === 'warning' && <AlertCircle size={18} />}
            {t.type === 'info' && <ShieldCheck size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Main UI State router */}
      {!isGateUnlocked ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', width: '100vw', flexGrow: 1, background: 'radial-gradient(circle at center, #1b1c26 0%, #0a0b10 100%)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-gradient)', color: '#fff', marginBottom: '16px' }}>
              <ShieldCheck size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Security Access Gateway</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: '1.5' }}>
              This portal is password protected. Enter the access code to unlock the login screen.
            </p>
            
            <form onSubmit={handleUnlockGate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Portal Access Code"
                  style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '0.1em', fontWeight: 700 }}
                  value={gateInput}
                  onChange={(e) => setGateInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '44px' }}>
                Verify Access Code
              </button>
            </form>
          </div>
        </div>
      ) : !currentUser ? (
        <AuthModule onLoginSuccess={handleLoginSuccess} addToast={addToast} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {/* Header */}
          <header 
            style={{ 
              height: '64px', 
              background: 'var(--bg-secondary)', 
              borderBottom: '1px solid var(--border-color)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0 24px',
              zIndex: 11
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-success)', animation: 'blink 1.5s infinite alternate' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Secure Gateway Connected</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={toggleTheme} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color var(--transition-fast)'
                }}
                className="btn-secondary"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div style={{ height: '20px', width: '1px', background: 'var(--border-color)' }} />

              <button 
                className="btn btn-secondary" 
                onClick={handleLogout}
                style={{ padding: '8px 14px', fontSize: '0.85rem', height: '36px' }}
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          </header>

          {/* Module Router */}
          <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {currentUser.role === 'admin' && (
              <AdminModule currentUser={currentUser} addToast={addToast} />
            )}
            {currentUser.role === 'examiner' && (
              <ExaminerModule currentUser={currentUser} addToast={addToast} />
            )}
            {currentUser.role === 'student' && (
              <StudentModule currentUser={currentUser} addToast={addToast} />
            )}
          </main>
        </div>
      )}

    </div>
  );
}

export default App;
