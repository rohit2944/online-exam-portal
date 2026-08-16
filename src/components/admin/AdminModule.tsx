import React, { useState } from 'react';
import { 
  Users, BookOpen, FileText, ShieldAlert, BarChart3, 
  UserPlus, Edit, Trash2, Check, X, Plus, Award, Download
} from 'lucide-react';
import { 
  loadDB, updateDB, type User, type Course, type Subject, type Exam 
} from '../../utils/mockDb';

interface AdminModuleProps {
  currentUser: User;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminModule: React.FC<AdminModuleProps> = ({ currentUser, addToast }) => {
  const [db, setDb] = useState(loadDB());
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'users' | 'courses' | 'exams' | 'reports'>('dashboard');

  // Reload local state from MockDB
  const reloadState = () => {
    setDb(loadDB());
  };

  // --- USER MANAGEMENT STATES ---
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'examiner' | 'student'>('student');
  const [formProfileName, setFormProfileName] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');

  // --- COURSE & SUBJECT STATES ---
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formCourseName, setFormCourseName] = useState('');
  const [formCourseDesc, setFormCourseDesc] = useState('');

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formSubjectName, setFormSubjectName] = useState('');
  const [formSubjectDesc, setFormSubjectDesc] = useState('');
  const [formSubjectCourseId, setFormSubjectCourseId] = useState('');
  const [formSubjectExaminers, setFormSubjectExaminers] = useState<string[]>([]);

  // --- EXAM SELECTION STATES ---
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formExamTitle, setFormExamTitle] = useState('');
  const [formExamDesc, setFormExamDesc] = useState('');
  const [formExamSubject, setFormExamSubject] = useState('');
  const [formExamDuration, setFormExamDuration] = useState(30);
  const [formExamPassing, setFormExamPassing] = useState(10);
  const [formExamTotal, setFormExamTotal] = useState(20);
  const [formExamRandomQ, setFormExamRandomQ] = useState(false);
  const [formExamRandomO, setFormExamRandomO] = useState(false);
  const [formExamNegActive, setFormExamNegActive] = useState(false);
  const [formExamNegRate, setFormExamNegRate] = useState(0.25);
  const [formExamOnePage, setFormExamOnePage] = useState(true);
  const [formExamSchedule, setFormExamSchedule] = useState('');

  // ==========================================
  // USER HANDLERS
  // ==========================================
  const handleOpenUserModal = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormUsername(user.username);
      setFormEmail(user.email);
      setFormPassword('');
      setFormRole(user.role as any);
      setFormProfileName(user.profileName);
      setFormTeacherId(user.teacherId || '');
    } else {
      setEditingUser(null);
      setFormUsername('');
      setFormEmail('');
      setFormPassword('');
      setFormRole('student');
      setFormProfileName('');
      setFormTeacherId('');
    }
    setUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername || !formEmail || !formProfileName || (!editingUser && !formPassword)) {
      addToast('Please fill required fields.', 'error');
      return;
    }

    updateDB((currentDb) => {
      if (editingUser) {
        const u = currentDb.users.find((x) => x.id === editingUser.id);
        if (u) {
          u.username = formUsername;
          u.email = formEmail;
          u.profileName = formProfileName;
          u.role = formRole;
          if (formPassword) u.passwordHash = formPassword;
          if (formRole === 'examiner') {
            u.teacherId = formTeacherId;
          } else {
            delete u.teacherId;
          }
        }
        addToast('User updated successfully!', 'success');
      } else {
        if (currentDb.users.some((x) => x.username === formUsername)) {
          addToast('Username already exists.', 'error');
          return;
        }
        const newUser: User = {
          id: `${formRole}-${Date.now()}`,
          username: formUsername,
          passwordHash: formPassword,
          email: formEmail,
          role: formRole,
          isActive: true,
          isEmailVerified: true,
          isTwoFactorEnabled: false,
          profileName: formProfileName,
          registrationDate: new Date().toISOString().split('T')[0],
          teacherId: formRole === 'examiner' ? formTeacherId : undefined
        };
        currentDb.users.push(newUser);
        addToast('User created successfully!', 'success');
      }
    });

    setUserModalOpen(false);
    reloadState();
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      addToast('Cannot delete yourself.', 'error');
      return;
    }
    if (window.confirm('Are you sure you want to delete this user?')) {
      updateDB((currentDb) => {
        currentDb.users = currentDb.users.filter((x) => x.id !== userId);
      });
      addToast('User deleted.', 'success');
      reloadState();
    }
  };

  const toggleUserStatus = (userId: string) => {
    updateDB((currentDb) => {
      const u = currentDb.users.find((x) => x.id === userId);
      if (u) u.isActive = !u.isActive;
    });
    addToast('User status updated.', 'success');
    reloadState();
  };

  // ==========================================
  // COURSE & SUBJECT HANDLERS
  // ==========================================
  const handleOpenCourseModal = (course: Course | null = null) => {
    if (course) {
      setEditingCourse(course);
      setFormCourseName(course.name);
      setFormCourseDesc(course.description);
    } else {
      setEditingCourse(null);
      setFormCourseName('');
      setFormCourseDesc('');
    }
    setCourseModalOpen(true);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourseName) {
      addToast('Course Name is required.', 'error');
      return;
    }
    updateDB((currentDb) => {
      if (editingCourse) {
        const c = currentDb.courses.find((x) => x.id === editingCourse.id);
        if (c) {
          c.name = formCourseName;
          c.description = formCourseDesc;
        }
        addToast('Course updated!', 'success');
      } else {
        const newCourse: Course = {
          id: `course-${Date.now()}`,
          name: formCourseName,
          description: formCourseDesc
        };
        currentDb.courses.push(newCourse);
        addToast('Course created!', 'success');
      }
    });
    setCourseModalOpen(false);
    reloadState();
  };

  const handleDeleteCourse = (courseId: string) => {
    if (window.confirm('Deleting a course will also restrict associated subjects. Continue?')) {
      updateDB((currentDb) => {
        currentDb.courses = currentDb.courses.filter((x) => x.id !== courseId);
        currentDb.subjects = currentDb.subjects.filter((x) => x.courseId !== courseId);
      });
      addToast('Course deleted.', 'success');
      reloadState();
    }
  };

  // SUBJECTS
  const handleOpenSubjectModal = (sub: Subject | null = null) => {
    const defaultCourseId = db.courses[0]?.id || '';
    if (sub) {
      setEditingSubject(sub);
      setFormSubjectName(sub.name);
      setFormSubjectDesc(sub.description);
      setFormSubjectCourseId(sub.courseId);
      setFormSubjectExaminers(sub.examinerIds);
    } else {
      setEditingSubject(null);
      setFormSubjectName('');
      setFormSubjectDesc('');
      setFormSubjectCourseId(defaultCourseId);
      setFormSubjectExaminers([]);
    }
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubjectName || !formSubjectCourseId) {
      addToast('Required fields missing.', 'error');
      return;
    }
    updateDB((currentDb) => {
      if (editingSubject) {
        const s = currentDb.subjects.find((x) => x.id === editingSubject.id);
        if (s) {
          s.name = formSubjectName;
          s.description = formSubjectDesc;
          s.courseId = formSubjectCourseId;
          s.examinerIds = formSubjectExaminers;
        }
        addToast('Subject updated!', 'success');
      } else {
        const newSub: Subject = {
          id: `subject-${Date.now()}`,
          name: formSubjectName,
          courseId: formSubjectCourseId,
          description: formSubjectDesc,
          examinerIds: formSubjectExaminers
        };
        currentDb.subjects.push(newSub);
        addToast('Subject created!', 'success');
      }
    });
    setSubjectModalOpen(false);
    reloadState();
  };

  const handleDeleteSubject = (subId: string) => {
    if (window.confirm('Delete this subject?')) {
      updateDB((currentDb) => {
        currentDb.subjects = currentDb.subjects.filter((x) => x.id !== subId);
      });
      addToast('Subject deleted.', 'success');
      reloadState();
    }
  };

  const handleToggleExaminerToSubject = (examId: string) => {
    setFormSubjectExaminers((prev) =>
      prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId]
    );
  };

  // ==========================================
  // EXAM HANDLERS
  // ==========================================
  const handleOpenExamModal = (exam: Exam | null = null) => {
    const defaultSubjectId = db.subjects[0]?.id || '';
    if (exam) {
      setEditingExam(exam);
      setFormExamTitle(exam.title);
      setFormExamDesc(exam.description);
      setFormExamSubject(exam.subjectId);
      setFormExamDuration(exam.durationMinutes);
      setFormExamPassing(exam.passingMarks);
      setFormExamTotal(exam.totalMarks);
      setFormExamRandomQ(exam.randomizeQuestions);
      setFormExamRandomO(exam.randomizeOptions);
      setFormExamNegActive(exam.negativeMarkingEnabled);
      setFormExamNegRate(exam.negativeMarkRate);
      setFormExamOnePage(exam.showOnePerPage);
      setFormExamSchedule(exam.dateScheduled ? exam.dateScheduled.substring(0, 16) : '');
    } else {
      setEditingExam(null);
      setFormExamTitle('');
      setFormExamDesc('');
      setFormExamSubject(defaultSubjectId);
      setFormExamDuration(45);
      setFormExamPassing(15);
      setFormExamTotal(20);
      setFormExamRandomQ(false);
      setFormExamRandomO(true);
      setFormExamNegActive(false);
      setFormExamNegRate(0.25);
      setFormExamOnePage(true);
      setFormExamSchedule('');
    }
    setExamModalOpen(true);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formExamTitle || !formExamSubject) {
      addToast('Required fields missing.', 'error');
      return;
    }

    updateDB((currentDb) => {
      if (editingExam) {
        const ex = currentDb.exams.find((x) => x.id === editingExam.id);
        if (ex) {
          ex.title = formExamTitle;
          ex.description = formExamDesc;
          ex.subjectId = formExamSubject;
          ex.durationMinutes = Number(formExamDuration);
          ex.passingMarks = Number(formExamPassing);
          ex.totalMarks = Number(formExamTotal);
          ex.randomizeQuestions = formExamRandomQ;
          ex.randomizeOptions = formExamRandomO;
          ex.negativeMarkingEnabled = formExamNegActive;
          ex.negativeMarkRate = Number(formExamNegRate);
          ex.showOnePerPage = formExamOnePage;
          ex.dateScheduled = formExamSchedule ? new Date(formExamSchedule).toISOString() : undefined;
        }
        addToast('Exam configuration updated!', 'success');
      } else {
        const newExam: Exam = {
          id: `exam-${Date.now()}`,
          subjectId: formExamSubject,
          title: formExamTitle,
          description: formExamDesc,
          durationMinutes: Number(formExamDuration),
          totalMarks: Number(formExamTotal),
          passingMarks: Number(formExamPassing),
          isEnabled: false, // disabled by default
          isPublished: false,
          questionIds: [], // examiner adds questions later
          randomizeQuestions: formExamRandomQ,
          randomizeOptions: formExamRandomO,
          negativeMarkingEnabled: formExamNegActive,
          negativeMarkRate: Number(formExamNegRate),
          showOnePerPage: formExamOnePage,
          dateScheduled: formExamSchedule ? new Date(formExamSchedule).toISOString() : undefined
        };
        currentDb.exams.push(newExam);
        addToast('Exam created successfully!', 'success');
      }
    });

    setExamModalOpen(false);
    reloadState();
  };

  const toggleExamEnabledStatus = (examId: string) => {
    updateDB((currentDb) => {
      const ex = currentDb.exams.find((x) => x.id === examId);
      if (ex) ex.isEnabled = !ex.isEnabled;
    });
    addToast('Exam state toggled.', 'success');
    reloadState();
  };

  const handleDeleteExam = (examId: string) => {
    if (window.confirm('Delete this exam completely?')) {
      updateDB((currentDb) => {
        currentDb.exams = currentDb.exams.filter((x) => x.id !== examId);
        currentDb.sessions = currentDb.sessions.filter((x) => x.examId !== examId);
      });
      addToast('Exam deleted.', 'success');
      reloadState();
    }
  };

  // ==========================================
  // REPORTS HANDLERS
  // ==========================================
  const exportLogs = () => {
    const allLogs: any[] = [];
    db.sessions.forEach((s) => {
      const student = db.users.find((u) => u.id === s.studentId);
      const exam = db.exams.find((e) => e.id === s.examId);
      s.activityLogs.forEach((log) => {
        allLogs.push({
          Student: student?.profileName || 'Unknown',
          Username: student?.username || 'Unknown',
          Exam: exam?.title || 'Unknown',
          Event: log.event,
          Details: log.details,
          Timestamp: log.timestamp,
          IPAddress: s.ipAddress,
          TabSwitches: s.tabSwitchCount,
          FullscreenExits: s.fullscreenExitCount
        });
      });
    });

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `system_proctor_reports_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Exported reports!', 'success');
  };

  // SVG Chart Computations
  // 1. Subjects Average Score
  const subjectScores = db.subjects.map((sub) => {
    const examsOfSub = db.exams.filter((e) => e.subjectId === sub.id).map((e) => e.id);
    const sessionsOfSub = db.sessions.filter((s) => examsOfSub.includes(s.examId) && s.isGraded);
    const avg = sessionsOfSub.length
      ? sessionsOfSub.reduce((acc, curr) => acc + curr.finalScore, 0) / sessionsOfSub.length
      : 0;
    return { name: sub.name, avg: Math.round(avg * 10) / 10 };
  });

  // Calculate generic statistics
  const totalStudents = db.users.filter((u) => u.role === 'student').length;
  const totalExaminers = db.users.filter((u) => u.role === 'examiner').length;
  const totalExams = db.exams.length;
  const totalSubmits = db.sessions.filter((s) => s.isSubmitted).length;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <Award size={24} style={{ color: 'var(--accent-secondary)' }} />
          <span>Admin Panel</span>
        </div>

        <ul className="sidebar-menu">
          <li 
            className={`sidebar-item ${activeSubTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('dashboard')}
          >
            <BarChart3 size={18} />
            Dashboard
          </li>
          <li 
            className={`sidebar-item ${activeSubTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('users')}
          >
            <Users size={18} />
            User Management
          </li>
          <li 
            className={`sidebar-item ${activeSubTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('courses')}
          >
            <BookOpen size={18} />
            Courses & Subjects
          </li>
          <li 
            className={`sidebar-item ${activeSubTab === 'exams' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('exams')}
          >
            <FileText size={18} />
            Exams Configuration
          </li>
          <li 
            className={`sidebar-item ${activeSubTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('reports')}
          >
            <ShieldAlert size={18} />
            Security & Reports
          </li>
        </ul>

        <div className="user-profile-section">
          <div className="avatar-circle">
            {currentUser.profileName[0]}
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>{currentUser.profileName}</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>System Admin</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* DASHBOARD TAB */}
        {activeSubTab === 'dashboard' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px' }}>Overview Dashboard</h1>
            
            <div className="dashboard-grid">
              <div className="glass-panel dashboard-card">
                <p className="card-title">Total Candidates</p>
                <h3 className="card-value">{totalStudents}</h3>
                <span className="badge badge-success">Active Students</span>
              </div>
              <div className="glass-panel dashboard-card">
                <p className="card-title">Active Examiners</p>
                <h3 className="card-value">{totalExaminers}</h3>
                <span className="badge badge-info">Faculties</span>
              </div>
              <div className="glass-panel dashboard-card">
                <p className="card-title">Total Exams</p>
                <h3 className="card-value">{totalExams}</h3>
                <span className="badge badge-warning">Compiled Tests</span>
              </div>
              <div className="glass-panel dashboard-card">
                <p className="card-title">Exams Submitted</p>
                <h3 className="card-value">{totalSubmits}</h3>
                <span className="badge badge-success">Attempted</span>
              </div>
            </div>

            {/* Visual SVG Analytics Chart */}
            <div className="glass-panel" style={{ padding: '24px', minHeight: '360px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Subject-wise Average Scores</h3>
              <div style={{ width: '100%', height: '240px', position: 'relative' }}>
                <svg className="chart-svg" viewBox="0 0 500 240">
                  <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="50" y1="40" x2="470" y2="40" className="chart-grid-line" />
                  <line x1="50" y1="90" x2="470" y2="90" className="chart-grid-line" />
                  <line x1="50" y1="140" x2="470" y2="140" className="chart-grid-line" />
                  <line x1="50" y1="190" x2="470" y2="190" className="chart-grid-line" />

                  {/* Horizontal Axes */}
                  <line x1="50" y1="190" x2="470" y2="190" className="chart-axis-line" strokeWidth="2" />
                  <line x1="50" y1="40" x2="50" y2="190" className="chart-axis-line" strokeWidth="2" />

                  {/* Y Axis text */}
                  <text x="25" y="45" className="chart-axis-text">100%</text>
                  <text x="25" y="95" className="chart-axis-text">60%</text>
                  <text x="25" y="145" className="chart-axis-text">30%</text>
                  <text x="25" y="195" className="chart-axis-text">0%</text>

                  {/* Bars representing each subject's performance */}
                  {subjectScores.map((sub, index) => {
                    const barWidth = 45;
                    const spacing = 75;
                    const xPos = 90 + index * (barWidth + spacing);
                    // Max score representation is 150 pixels (between Y=40 and Y=190)
                    // Let's assume average score percent mock (avg score out of max marks, or score / 10 base)
                    const percent = Math.min((sub.avg / 10) * 100, 100);
                    const barHeight = (percent / 100) * 150;
                    const yPos = 190 - barHeight;

                    return (
                      <g key={index}>
                        <rect
                          x={xPos}
                          y={yPos}
                          width={barWidth}
                          height={barHeight}
                          rx="4"
                          className="chart-bar"
                          style={{ fill: 'url(#chart-gradient)' }}
                        />
                        <text
                          x={xPos + barWidth / 2}
                          y="215"
                          textAnchor="middle"
                          className="chart-axis-text"
                          style={{ fontSize: '9px' }}
                        >
                          {sub.name}
                        </text>
                        <text
                          x={xPos + barWidth / 2}
                          y={yPos - 8}
                          textAnchor="middle"
                          className="chart-axis-text"
                          style={{ fill: '#fff', fontWeight: 'bold' }}
                        >
                          {sub.avg} pts
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeSubTab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>User Management</h1>
              <button className="btn btn-primary" onClick={() => handleOpenUserModal()}>
                <UserPlus size={16} /> Add New User
              </button>
            </div>

            <div className="table-container glass-panel">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Display Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.users.map((user) => (
                    <tr key={user.id}>
                      <td><strong style={{ color: '#fff' }}>{user.profileName}</strong></td>
                      <td>@{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge ${user.role === 'admin' ? 'badge-danger' : user.role === 'examiner' ? 'badge-info' : 'badge-success'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{user.registrationDate}</td>
                      <td>
                        <button 
                          onClick={() => toggleUserStatus(user.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {user.isActive ? (
                            <span className="badge badge-success" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}><Check size={12} /> Active</span>
                          ) : (
                            <span className="badge badge-danger" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}><X size={12} /> Inactive</span>
                          )}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => handleOpenUserModal(user)}>
                            <Edit size={16} />
                          </button>
                          <button style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }} onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COURSES & SUBJECTS TAB */}
        {activeSubTab === 'courses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Course & Subject Structures</h1>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => handleOpenCourseModal()}>
                  <Plus size={16} /> New Course
                </button>
                <button className="btn btn-primary" onClick={() => handleOpenSubjectModal()}>
                  <Plus size={16} /> New Subject
                </button>
              </div>
            </div>

            {/* Courses section */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-secondary)' }}>Courses</h2>
              <div className="table-container glass-panel">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Course Name</th>
                      <th>Description</th>
                      <th>Subjects</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.courses.map((course) => {
                      const subs = db.subjects.filter((s) => s.courseId === course.id);
                      return (
                        <tr key={course.id}>
                          <td><strong>{course.name}</strong></td>
                          <td>{course.description}</td>
                          <td>{subs.map((s) => s.name).join(', ') || 'None'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => handleOpenCourseModal(course)}>
                                <Edit size={16} />
                              </button>
                              <button style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }} onClick={() => handleDeleteCourse(course.id)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subjects Section */}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-primary)' }}>Subjects</h2>
              <div className="table-container glass-panel">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Subject Name</th>
                      <th>Parent Course</th>
                      <th>Description</th>
                      <th>Assigned Examiners</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.subjects.map((sub) => {
                      const c = db.courses.find((x) => x.id === sub.courseId);
                      const examiners = db.users.filter((u) => sub.examinerIds.includes(u.id));
                      return (
                        <tr key={sub.id}>
                          <td><strong>{sub.name}</strong></td>
                          <td>{c?.name || 'Unknown'}</td>
                          <td>{sub.description}</td>
                          <td>{examiners.map((e) => e.profileName).join(', ') || 'No Examiner Assigned'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => handleOpenSubjectModal(sub)}>
                                <Edit size={16} />
                              </button>
                              <button style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }} onClick={() => handleDeleteSubject(sub.id)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EXAMS TAB */}
        {activeSubTab === 'exams' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Exams Parameters & Schedule</h1>
              <button className="btn btn-primary" onClick={() => handleOpenExamModal()}>
                <Plus size={16} /> Create Exam Setup
              </button>
            </div>

            <div className="table-container glass-panel">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Exam Title</th>
                    <th>Subject</th>
                    <th>Schedule</th>
                    <th>Duration</th>
                    <th>Pass Marks</th>
                    <th>Total Marks</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.exams.map((ex) => {
                    const sub = db.subjects.find((s) => s.id === ex.subjectId);
                    return (
                      <tr key={ex.id}>
                        <td><strong>{ex.title}</strong></td>
                        <td>{sub?.name || 'Unknown'}</td>
                        <td>{ex.dateScheduled ? new Date(ex.dateScheduled).toLocaleString() : 'Not Scheduled'}</td>
                        <td>{ex.durationMinutes} mins</td>
                        <td>{ex.passingMarks} pts</td>
                        <td>{ex.totalMarks} pts</td>
                        <td>
                          <button 
                            onClick={() => toggleExamEnabledStatus(ex.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            {ex.isEnabled ? (
                              <span className="badge badge-success">Enabled</span>
                            ) : (
                              <span className="badge badge-warning">Disabled</span>
                            )}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => handleOpenExamModal(ex)}>
                              <Edit size={16} />
                            </button>
                            <button style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }} onClick={() => handleDeleteExam(ex.id)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeSubTab === 'reports' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Proctoring Activity Logs & Reports</h1>
              <button className="btn btn-secondary" onClick={exportLogs}>
                <Download size={16} /> Export Proctoring JSON
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {db.sessions.filter((s) => s.isSubmitted).map((session) => {
                const sUser = db.users.find((u) => u.id === session.studentId);
                const ex = db.exams.find((e) => e.id === session.examId);
                return (
                  <div className="glass-panel" key={session.id} style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{sUser?.profileName} ({sUser?.username})</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Exam: <strong>{ex?.title}</strong> | IP: {session.ipAddress}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{session.finalScore} / {ex?.totalMarks} pts</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status: {session.isGraded ? 'Graded' : 'Pending'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.85rem', marginBottom: '12px' }}>
                      <div style={{ padding: '12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)' }}>
                        <p style={{ color: 'var(--color-danger)', fontWeight: 700 }}>Security Infractions</p>
                        <p style={{ marginTop: '4px' }}>Tab Switches: <strong>{session.tabSwitchCount}</strong></p>
                        <p>Fullscreen Exits: <strong>{session.fullscreenExitCount}</strong></p>
                      </div>
                      <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Time Session</p>
                        <p style={{ marginTop: '4px' }}>Started: {new Date(session.startTime).toLocaleString()}</p>
                        <p>Submitted: {session.submitTime ? new Date(session.submitTime).toLocaleString() : 'N/A'}</p>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Detailed Activity Logs:</p>
                    <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      {session.activityLogs.map((log, idx) => (
                        <div key={idx} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ color: log.event.includes('warning') || log.event.includes('exit') || log.event.includes('switch') ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                            [{log.event.toUpperCase()}] {log.details}
                          </span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* USER MODAL */}
      {userModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px' }}>
              {editingUser ? 'Edit User Details' : 'Add New Member'}
            </h3>
            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Full Profile Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formProfileName}
                  onChange={(e) => setFormProfileName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="johndoe12"
                />
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="johndoe@university.com"
                />
              </div>
              <div>
                <label className="form-label">Password {editingUser && '(Leave blank to keep same)'}</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select 
                  className="form-input"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                >
                  <option value="student">Student</option>
                  <option value="examiner">Examiner</option>
                </select>
              </div>
              {formRole === 'examiner' && (
                <div>
                  <label className="form-label">Teacher ID</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                    placeholder="e.g. T-101"
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setUserModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COURSE MODAL */}
      {courseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px' }}>
              {editingCourse ? 'Modify Course' : 'Create Course'}
            </h3>
            <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Course Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formCourseName}
                  onChange={(e) => setFormCourseName(e.target.value)}
                  placeholder="e.g. Master of Computer Applications"
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={formCourseDesc}
                  onChange={(e) => setFormCourseDesc(e.target.value)}
                  placeholder="Briefly describe target audience or prerequisites"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCourseModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBJECT MODAL */}
      {subjectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px' }}>
              {editingSubject ? 'Edit Subject Config' : 'Add Subject'}
            </h3>
            <form onSubmit={handleSaveSubject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Subject Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formSubjectName}
                  onChange={(e) => setFormSubjectName(e.target.value)}
                  placeholder="e.g. Neural Networks"
                />
              </div>
              <div>
                <label className="form-label">Parent Course</label>
                <select 
                  className="form-input"
                  value={formSubjectCourseId}
                  onChange={(e) => setFormSubjectCourseId(e.target.value)}
                >
                  {db.courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={formSubjectDesc}
                  onChange={(e) => setFormSubjectDesc(e.target.value)}
                  placeholder="Scope of work and assignments"
                />
              </div>

              <div>
                <label className="form-label">Assign Examiner(s)</label>
                <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px', background: 'var(--bg-tertiary)' }}>
                  {db.users.filter((u) => u.role === 'examiner').map((ex) => (
                    <label key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formSubjectExaminers.includes(ex.id)}
                        onChange={() => handleToggleExaminerToSubject(ex.id)}
                      />
                      {ex.profileName} (@{ex.username})
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSubjectModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXAM CONFIG MODAL */}
      {examModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '650px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px' }}>
              {editingExam ? 'Edit Exam Framework' : 'Create Exam Framework'}
            </h3>
            <form onSubmit={handleSaveExam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Exam Title</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formExamTitle}
                    onChange={(e) => setFormExamTitle(e.target.value)}
                    placeholder="e.g. Algorithms Term-1"
                  />
                </div>
                <div>
                  <label className="form-label">Subject</label>
                  <select 
                    className="form-input"
                    value={formExamSubject}
                    onChange={(e) => setFormExamSubject(e.target.value)}
                  >
                    {db.subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Description / Student Instructions</label>
                <textarea 
                  className="form-input" 
                  value={formExamDesc}
                  onChange={(e) => setFormExamDesc(e.target.value)}
                  placeholder="Explain general parameters, browser restrictions, negative marks, etc."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Duration (Mins)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formExamDuration}
                    onChange={(e) => setFormExamDuration(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="form-label">Total Marks</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formExamTotal}
                    onChange={(e) => setFormExamTotal(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="form-label">Passing Marks</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formExamPassing}
                    onChange={(e) => setFormExamPassing(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Schedule Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={formExamSchedule}
                    onChange={(e) => setFormExamSchedule(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Negative Marking Rate (%)</label>
                  <select 
                    className="form-input"
                    value={formExamNegRate}
                    onChange={(e) => setFormExamNegRate(Number(e.target.value))}
                    disabled={!formExamNegActive}
                  >
                    <option value={0.25}>0.25 (Deduct 25% of marks)</option>
                    <option value={0.33}>0.33 (Deduct 33% of marks)</option>
                    <option value={0.50}>0.50 (Deduct 50% of marks)</option>
                    <option value={1.00}>1.00 (Deduct full marks)</option>
                  </select>
                </div>
              </div>

              <div className="settings-section" style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: '8px' }}>Security & Navigation Rules</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formExamRandomQ}
                      onChange={(e) => setFormExamRandomQ(e.target.checked)}
                    />
                    Randomize Questions
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formExamRandomO}
                      onChange={(e) => setFormExamRandomO(e.target.checked)}
                    />
                    Randomize Options
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formExamNegActive}
                      onChange={(e) => setFormExamNegActive(e.target.checked)}
                    />
                    Enable Negative Marking
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formExamOnePage}
                      onChange={(e) => setFormExamOnePage(e.target.checked)}
                    />
                    Display One Question per Page
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setExamModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Exam Framework</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
