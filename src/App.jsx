import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/landing/Navbar';
import { Hero } from './components/landing/Hero';
import { AuthOverlay } from './components/landing/AuthOverlay';
import { StudentDashboard } from './components/dashboard/StudentDashboard';

function App() {
  const authRef = useRef(null);

  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#terminal' || hash === '#dashboard' || hash === '#charts') {
        return 'dashboard';
      }
    }
    return 'landing';
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('tm_student_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#terminal' || hash === '#dashboard' || hash === '#charts') {
        setCurrentView('dashboard');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } else if (hash === '#home' || hash === '' || hash === '#about' || hash === '#courses') {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleOpenAuth = (btn, mode = 'register') => {
    if (authRef.current) {
      authRef.current.openFrom(btn, mode);
    }
  };

  const handleLoginSuccess = (userData) => {
    const studentUser = userData || {
      name: 'Trader',
      email: 'student@trademax.com',
    };
    setUser(studentUser);
    try {
      localStorage.setItem('tm_student_session', JSON.stringify(studentUser));
    } catch {
      // ignore
    }
    setCurrentView('dashboard');
    window.location.hash = '#dashboard';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.setItem('tm_student_session', JSON.stringify(null));
    } catch {
      // ignore
    }
    setCurrentView('landing');
    window.location.hash = '#home';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (view === 'dashboard') {
      window.location.hash = '#dashboard';
    } else {
      window.location.hash = '#home';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  return (
    <div className="tm-app-root">
      {currentView === 'dashboard' ? (
        <StudentDashboard
          user={user}
          onExit={() => handleNavigate('landing')}
          onLogout={handleLogout}
        />
      ) : (
        <>
          <Navbar
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
            user={user}
            onLogout={handleLogout}
          />
            <Hero
              onOpenAuth={handleOpenAuth}
              onNavigate={handleNavigate}
            />
          <AuthOverlay
            ref={authRef}
            onLoginSuccess={handleLoginSuccess}
          />
        </>
      )}
    </div>
  );
}

export default App;
