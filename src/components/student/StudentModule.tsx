import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BookOpen, Play, CheckCircle2, AlertCircle, Clock, Shield, Camera, 
  ChevronLeft, ChevronRight, Bookmark, Award, Download, UserCheck, Edit
} from 'lucide-react';
import { 
  loadDB, updateDB, type User, type Exam, type Question, type ExamSession, type AnswerResponse
} from '../../utils/mockDb';

interface StudentModuleProps {
  currentUser: User;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const StudentModule: React.FC<StudentModuleProps> = ({ currentUser, addToast }) => {
  const [db, setDb] = useState(loadDB());
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'exams' | 'results'>('dashboard');

  // Active Exam State
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [bookmarkedQs, setBookmarkedQs] = useState<Record<string, boolean>>({});

  // Instructions State
  const [viewingInstructions, setViewingInstructions] = useState<Exam | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Proctoring States
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [proctorStatus, setProctorStatus] = useState<'normal' | 'no_face' | 'multi_face'>('normal');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      videoRef.current = node;
      if (camStream) {
        node.srcObject = camStream;
      }
    }
  }, [camStream]);

  // Security Toggles for manual simulation of cheating
  const [simNoFace, setSimNoFace] = useState(false);
  const [simMultiFace, setSimMultiFace] = useState(false);

  // Fullscreen requirement state
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);

  // Active results display state
  const [viewingResultSession, setViewingResultSession] = useState<ExamSession | null>(null);

  // Timer reference
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const timerRef = useRef<any>(null);
  const [isReviewingResponses, setIsReviewingResponses] = useState(false);
  const submitRef = useRef<any>(null);

  const reloadState = () => {
    setDb(loadDB());
  };

  // --- WEBCAM MONITORING ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn('Webcam access failed/denied');
      return null;
    }
  };

  const stopCamera = () => {
    if (camStream) {
      camStream.getTracks().forEach((track) => track.stop());
      setCamStream(null);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (activeExam && camStream && videoRef.current) {
      videoRef.current.srcObject = camStream;
    }
  }, [activeExam, camStream]);

  // --- REAL SECURITY: DETECT TAB SWITCHING & COPY PASTE BLOCK ---
  useEffect(() => {
    if (!activeExam || !examSession) return;

    // Detect Tab switching (Visibility API)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent('tab_switch_violation', 'Disqualified: candidate left the exam tab.');
        
        // Update session counts
        updateDB((currentDb) => {
          const sess = currentDb.sessions.find((s) => s.id === examSession.id);
          if (sess) {
            sess.tabSwitchCount += 1;
            sess.activityLogs.push({
              timestamp: new Date().toISOString(),
              event: 'disqualified',
              details: 'Tab switched. Auto-submitting exam.'
            });
          }
        });
        
        addToast('Anti-Cheat Auto-Submission: Exam submitted automatically because you switched tabs.', 'error');
        if (submitRef.current) {
          submitRef.current();
        }
      }
    };

    // Block Copy-Paste-Cut
    const handleBlockCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logSecurityEvent('copy_paste_attempt', 'Attempted copy, paste, or cut activity.');
      addToast('Security Block: Copy-Paste is disabled during this exam.', 'warning');
    };

    // Block Right Click Context Menu
    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      logSecurityEvent('right_click_attempt', 'Attempted right-click event.');
      addToast('Security Block: Right-click options are disabled.', 'warning');
    };

    // Monitor Fullscreen Exit
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreenActive(isFs);
      if (!isFs) {
        logSecurityEvent('fullscreen_exit', 'Exam window exited fullscreen mode.');
        addToast('Warning: You exited Fullscreen Mode. Enter Fullscreen immediately to resume.', 'error');
        updateDB((currentDb) => {
          const sess = currentDb.sessions.find((s) => s.id === examSession.id);
          if (sess) {
            sess.fullscreenExitCount += 1;
          }
        });
        reloadState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('copy', handleBlockCopyPaste);
    window.addEventListener('paste', handleBlockCopyPaste);
    window.addEventListener('cut', handleBlockCopyPaste);
    window.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('copy', handleBlockCopyPaste);
      window.removeEventListener('paste', handleBlockCopyPaste);
      window.removeEventListener('cut', handleBlockCopyPaste);
      window.removeEventListener('contextmenu', handleRightClick);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [activeExam, examSession]);

  // Request Fullscreen
  const enterFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().then(() => {
        setIsFullscreenActive(true);
      }).catch(() => {
        addToast('Could not enter fullscreen. Please check browser permissions.', 'error');
      });
    }
  };

  const logSecurityEvent = (event: string, details: string) => {
    if (!examSession) return;
    updateDB((currentDb) => {
      const sess = currentDb.sessions.find((s) => s.id === examSession.id);
      if (sess) {
        sess.activityLogs.push({
          timestamp: new Date().toISOString(),
          event,
          details
        });
      }
    });
    reloadState();
  };

  // --- PROCTORING CHEATING SIMULATION TRIGGERS ---
  useEffect(() => {
    if (!activeExam) return;

    if (simNoFace) {
      setProctorStatus('no_face');
      logSecurityEvent('face_not_detected', 'No face detected in video stream.');
      addToast('Proctor Alert: Camera cannot detect your face.', 'warning');
    } else if (simMultiFace) {
      setProctorStatus('multi_face');
      logSecurityEvent('multiple_faces_detected', 'Multiple faces detected in webcam frame.');
      addToast('Proctor Alert: Multiple people detected in camera feed.', 'error');
    } else {
      setProctorStatus('normal');
    }
  }, [simNoFace, simMultiFace]);

  // --- TIMER CONTROLLER ---
  useEffect(() => {
    if (!activeExam) return;

    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, activeExam]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // EXAM ACTIONS
  // ==========================================
  const handleOpenInstructions = (exam: Exam) => {
    setViewingInstructions(exam);
    setAgreedToTerms(false);
  };

  const handleStartExam = async () => {
    if (!viewingInstructions) return;
    const exam = viewingInstructions;

    // Enforce Camera Proctoring Check
    let currentStream = camStream;
    const isSecureContext = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    if (!isSecureContext) {
      addToast('HTTP context detected: Using simulated proctoring feed.', 'info');
    } else {
      if (!currentStream) {
        currentStream = await startCamera();
        if (!currentStream) {
          addToast('Anti-Cheat Check: A working camera is required to take this exam. Please enable camera access and try again.', 'error');
          return;
        }
      }
    }
    setTimeout(() => {
      if (videoRef.current && currentStream) {
        videoRef.current.srcObject = currentStream;
      }
    }, 100);

    // Load and optionally randomize questions
    const qList = db.questions.filter((q) => exam.questionIds.includes(q.id));
    let processedQs = [...qList];
    if (exam.randomizeQuestions) {
      processedQs.sort(() => Math.random() - 0.5);
    }

    // Initialize responses structure
    const initialResponses: AnswerResponse[] = processedQs.map((q) => {
      let defaultValue: any = '';
      if (q.type === 'matching') defaultValue = {};
      return {
        questionId: q.id,
        answer: defaultValue
      };
    });

    const newSession: ExamSession = {
      id: `sess-${Date.now()}`,
      examId: exam.id,
      studentId: currentUser.id,
      startTime: new Date().toISOString(),
      responses: initialResponses,
      isSubmitted: false,
      isGraded: false,
      finalScore: 0,
      tabSwitchCount: 0,
      fullscreenExitCount: 0,
      ipAddress: '192.168.1.55', // Simulated client IP
      activityLogs: [
        { timestamp: new Date().toISOString(), event: 'login', details: 'Exam started securely.' }
      ]
    };

    updateDB((currentDb) => {
      currentDb.sessions.push(newSession);
    });

    setViewingInstructions(null);
    setActiveExam(exam);
    setExamSession(newSession);
    setExamQuestions(processedQs);
    setCurrentQIndex(0);
    setTimeLeft(exam.durationMinutes * 60);
    setBookmarkedQs({});
    setIsReviewingResponses(false);
    reloadState();

    // Trigger fullscreen
    enterFullscreen();
  };

  const handleSaveResponse = (val: any) => {
    if (!examSession || !examQuestions[currentQIndex]) return;
    const currentQ = examQuestions[currentQIndex];

    updateDB((currentDb) => {
      const sess = currentDb.sessions.find((s) => s.id === examSession.id);
      if (sess) {
        const resp = sess.responses.find((r) => r.questionId === currentQ.id);
        if (resp) {
          resp.answer = val;
        }
      }
    });

    // Sync local state
    setDb(loadDB());
    setExamSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        responses: prev.responses.map((r) =>
          r.questionId === currentQ.id ? { ...r, answer: val } : r
        )
      };
    });
  };

  const handleAutoSubmit = () => {
    addToast('Time limit reached! Submitting answers automatically...', 'warning');
    submitExamAnswers();
  };

  const submitExamAnswers = () => {
    if (!examSession || !activeExam) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    // Auto grading logic for MCQ, TF, Fill in the Blanks, and Numerical
    updateDB((currentDb) => {
      const sess = currentDb.sessions.find((s) => s.id === examSession.id);
      if (sess) {
        sess.isSubmitted = true;
        sess.submitTime = new Date().toISOString();
        
        let allGradedImmediately = true;
        let cumulativeScore = 0;

        sess.responses.forEach((res) => {
          const q = currentDb.questions.find((x) => x.id === res.questionId);
          if (!q) return;

          if (q.type === 'mcq' || q.type === 'tf') {
            const isCorrect = String(res.answer).toLowerCase() === String(q.correctAnswers[0]).toLowerCase();
            res.isCorrect = isCorrect;
            res.marksObtained = isCorrect 
              ? q.maxMarks 
              : activeExam.negativeMarkingEnabled 
                ? -q.maxMarks * activeExam.negativeMarkRate 
                : 0;
            cumulativeScore += res.marksObtained;
          } else if (q.type === 'fill_in_the_blank' || q.type === 'numerical') {
            const isCorrect = String(res.answer).trim().toLowerCase() === String(q.correctAnswers[0]).trim().toLowerCase();
            res.isCorrect = isCorrect;
            res.marksObtained = isCorrect ? q.maxMarks : 0;
            cumulativeScore += res.marksObtained;
          } else if (q.type === 'matching') {
            // Match responses
            let isCorrect = true;
            if (q.matchingPairs) {
              const answersDict = (res.answer || {}) as Record<string, string>;
              q.matchingPairs.forEach((pair) => {
                if (answersDict[pair.left] !== pair.right) {
                  isCorrect = false;
                }
              });
            } else {
              isCorrect = false;
            }
            res.isCorrect = isCorrect;
            res.marksObtained = isCorrect ? q.maxMarks : 0;
            cumulativeScore += res.marksObtained;
          } else {
            // Essay / Short Answer require manual examiner grading
            allGradedImmediately = false;
            res.marksObtained = 0; // provisional
          }
        });

        sess.finalScore = Math.max(0, cumulativeScore);
        sess.isGraded = allGradedImmediately;

        // If completely graded, create notification
        if (allGradedImmediately) {
          currentDb.notifications.push({
            id: `notif-${Date.now()}`,
            userId: currentUser.id,
            title: 'Exam Graded',
            message: `Your results for "${activeExam.title}" are published. Score: ${sess.finalScore}/${activeExam.totalMarks}`,
            date: new Date().toISOString(),
            isRead: false,
            type: 'result'
          });
        }
      }
    });

    addToast('Exam submitted successfully!', 'success');
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const submittedId = examSession.id;

    setActiveExam(null);
    setExamSession(null);
    setExamQuestions([]);
    setIsReviewingResponses(false);
    stopCamera();
    reloadState();

    const dbData = loadDB();
    const completedSession = dbData.sessions.find((s) => s.id === submittedId);
    if (completedSession) {
      setViewingResultSession(completedSession);
    }

    setActiveSubTab('results');
  };

  submitRef.current = submitExamAnswers;

  const printScorecard = () => {
    window.print();
  };

  // Filter exams
  const takenExamIds = db.sessions.filter((s) => s.studentId === currentUser.id && s.isSubmitted).map((s) => s.examId);
  
  const availableExams = db.exams.filter((e) => e.isEnabled && e.isPublished && !takenExamIds.includes(e.id));
  const myCompletedSessions = db.sessions.filter((s) => s.studentId === currentUser.id && s.isSubmitted);

  const activeResponse = examSession && examQuestions[currentQIndex]
    ? examSession.responses.find((r) => r.questionId === examQuestions[currentQIndex].id)?.answer
    : '';

  return (
    <div className="app-container">
      {/* Sidebar (Hide if taking exam) */}
      {!activeExam && (
        <div className="sidebar">
          <div className="sidebar-brand">
            <UserCheck size={24} style={{ color: 'var(--accent-secondary)' }} />
            <span>Student Hub</span>
          </div>

          <ul className="sidebar-menu">
            <li 
              className={`sidebar-item ${activeSubTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('dashboard')}
            >
              <BookOpen size={18} />
              My Dashboard
            </li>
            <li 
              className={`sidebar-item ${activeSubTab === 'exams' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('exams')}
            >
              <Play size={18} />
              Take Exam
            </li>
            <li 
              className={`sidebar-item ${activeSubTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('results')}
            >
              <Award size={18} />
              My Results
            </li>
          </ul>

          <div className="user-profile-section">
            <div className="avatar-circle">
              {currentUser.profileName[0]}
            </div>
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>{currentUser.profileName}</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Student Candidate</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="main-content" style={{ padding: activeExam ? 0 : '32px' }}>
        
        {/* ACTIVE EXAM INTERFACE */}
        {activeExam && examSession && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100vh', background: 'var(--bg-primary)' }}>
            
            {/* Exam Sidebar */}
            <div style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '20px' }}>
              
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeExam.title}
                </h3>
                <span className="badge badge-info" style={{ marginTop: '6px' }}>Proctoring Enabled</span>
              </div>

              {/* Live Proctoring Webcam Box */}
              <div className="proctor-cam-container" style={{ position: 'relative', overflow: 'hidden' }}>
                {camStream ? (
                  <video ref={setVideoRef} className="proctor-video" autoPlay playsInline muted />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1c1c24', color: 'var(--text-secondary)', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-success)', animation: 'blink 1.5s infinite alternate' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Mock AI Proctor Active</span>
                  </div>
                )}
                <div className="proctor-overlay">
                  {/* Bounding box simulation overlays */}
                  <div className={`face-box ${proctorStatus !== 'normal' ? 'warning' : ''}`} style={{ top: '35px', left: '60px', width: '90px', height: '100px' }} />
                </div>
                <div className={`proctor-indicator ${proctorStatus !== 'normal' ? 'warning' : ''}`}>
                  <Camera size={12} />
                  <span>
                    {proctorStatus === 'normal' && 'Proctor: OK'}
                    {proctorStatus === 'no_face' && 'No Face Detected'}
                    {proctorStatus === 'multi_face' && 'Multi-Face detected'}
                  </span>
                </div>
              </div>

              {/* Proctor Simulator Actions for user testing */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>Proctor Tester (Mock Detections)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={simNoFace} onChange={(e) => { setSimNoFace(e.target.checked); setSimMultiFace(false); }} />
                    Simulate: No Face
                  </label>
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={simMultiFace} onChange={(e) => { setSimMultiFace(e.target.checked); setSimNoFace(false); }} />
                    Simulate: Multiple Faces
                  </label>
                </div>
              </div>

              {/* Timer Panel */}
              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', marginBottom: '20px', borderLeft: timeLeft < 300 ? '4px solid var(--color-danger)' : '4px solid var(--color-success)' }}>
                <Clock size={20} style={{ color: timeLeft < 300 ? 'var(--color-danger)' : 'var(--color-success)' }} />
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TIME REMAINING</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{formatTimer(timeLeft)}</p>
                </div>
              </div>

              {/* Navigation Grid */}
              <div style={{ flexGrow: 1 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Question Navigator</p>
                <div className="question-nav-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {examQuestions.map((q, idx) => {
                    const resp = examSession.responses.find((r) => r.questionId === q.id);
                    // Match object responses are checkable via keys length
                    const isAnswered = q.type === 'matching' 
                      ? Object.keys(resp?.answer || {}).length > 0
                      : !!String(resp?.answer || '').trim();
                    const isBookmarked = bookmarkedQs[q.id];

                    return (
                      <button
                        key={q.id}
                        className={`question-nav-btn ${idx === currentQIndex && !isReviewingResponses ? 'active' : ''} ${isAnswered ? 'answered' : ''} ${isBookmarked ? 'bookmarked' : ''}`}
                        onClick={() => {
                          setIsReviewingResponses(false);
                          setCurrentQIndex(idx);
                        }}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button className="btn btn-danger" onClick={() => { if(window.confirm('Submit Exam?')) submitExamAnswers(); }} style={{ width: '100%', marginTop: '20px', height: '44px' }}>
                End & Submit Exam
              </button>
            </div>

            {/* Questions panel */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', padding: '40px' }}>
              
              {/* Fullscreen warning overlay if they exit */}
              {!isFullscreenActive && (
                <div className="fullscreen-blocker">
                  <div className="warning-pulse">
                    <Shield size={40} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-danger)', marginBottom: '8px' }}>Security Access Blocked</h2>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', marginBottom: '24px', fontSize: '0.9rem' }}>
                    Exam parameters require full screen security. Tab activities and copy-paste limits are monitored. Enter fullscreen to restore session access.
                  </p>
                  <button className="btn btn-primary" onClick={enterFullscreen}>
                    Activate Fullscreen Session
                  </button>
                </div>
              )}

              {/* Review responses screen or active question */}
              {isReviewingResponses ? (
                <div style={{ flexGrow: 1, maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Exam Response Summary</h2>
                    <span className="badge badge-warning">{examQuestions.length} Questions Total</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                    Please review your selections below. You can click "Edit Answer" next to any question to go back and modify it. Click "Finalize & Submit Exam" when ready.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                    {examQuestions.map((q, idx) => {
                      const resp = examSession.responses.find((r) => r.questionId === q.id);
                      let answerDisplay = '';
                      let isAnswered = false;

                      if (q.type === 'matching') {
                        const dict = (resp?.answer || {}) as Record<string, string>;
                        isAnswered = Object.keys(dict).length > 0;
                        answerDisplay = isAnswered 
                          ? Object.entries(dict).map(([l, r]) => `${l} ➔ ${r}`).join(' | ') 
                          : 'Unanswered';
                      } else {
                        isAnswered = !!String(resp?.answer ?? '').trim();
                        answerDisplay = isAnswered ? String(resp?.answer) : 'Unanswered';
                      }

                      return (
                        <div key={q.id} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: !isAnswered ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)' }}>
                          <div style={{ flexGrow: 1, paddingRight: '20px' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>QUESTION {idx + 1} ({q.type.toUpperCase()})</p>
                            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: '4px 0 8px 0' }}>{q.text}</p>
                            <p style={{ fontSize: '0.9rem', color: isAnswered ? 'var(--color-success)' : 'var(--color-danger)' }}>
                              Your Selection: <strong>{answerDisplay}</strong>
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}
                            onClick={() => {
                              setIsReviewingResponses(false);
                              setCurrentQIndex(idx);
                            }}
                          >
                            <Edit size={14} /> Edit Answer
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsReviewingResponses(false)}
                    >
                      Back to Questions
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '12px 32px' }}
                      onClick={() => { if (window.confirm('Ready to submit? This will finalize your scores.')) submitExamAnswers(); }}
                    >
                      Finalize & Submit Exam
                    </button>
                  </div>
                </div>
              ) : (
                examQuestions[currentQIndex] && (
                  <div style={{ flexGrow: 1, maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <span className="badge badge-info">Question {currentQIndex + 1} of {examQuestions.length}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Marks: <strong>{examQuestions[currentQIndex].maxMarks} pts</strong></span>
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '24px', lineHeight: '1.6' }}>
                      {examQuestions[currentQIndex].text}
                    </h2>

                    {/* Render Question options / answers */}
                    
                    {/* MCQ OPTION RENDER */}
                    {examQuestions[currentQIndex].type === 'mcq' && examQuestions[currentQIndex].options && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {examQuestions[currentQIndex].options.map((opt, idx) => (
                          <div
                            key={idx}
                            className={`option-card ${activeResponse === opt ? 'selected' : ''}`}
                            onClick={() => handleSaveResponse(opt)}
                          >
                            <div className="option-letter">{String.fromCharCode(65 + idx)}</div>
                            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* TRUE FALSE OPTION RENDER */}
                    {examQuestions[currentQIndex].type === 'tf' && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {['True', 'False'].map((opt, idx) => (
                          <div
                            key={idx}
                            className={`option-card ${activeResponse?.toLowerCase() === opt.toLowerCase() ? 'selected' : ''}`}
                            onClick={() => handleSaveResponse(opt.toLowerCase())}
                          >
                            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* FILL IN THE BLANK / NUMERICAL */}
                    {['fill_in_the_blank', 'numerical'].includes(examQuestions[currentQIndex].type) && (
                      <div>
                        <label className="form-label">Type your answer below:</label>
                        <input
                          type={examQuestions[currentQIndex].type === 'numerical' ? 'number' : 'text'}
                          className="form-input"
                          placeholder="Write answer response..."
                          value={activeResponse || ''}
                          onChange={(e) => handleSaveResponse(e.target.value)}
                        />
                      </div>
                    )}

                    {/* SHORT ANSWER & ESSAY */}
                    {['short_answer', 'essay'].includes(examQuestions[currentQIndex].type) && (
                      <div>
                        <label className="form-label">Provide your detailed response below:</label>
                        <textarea
                          className="form-input"
                          style={{ minHeight: examQuestions[currentQIndex].type === 'essay' ? '240px' : '100px', resize: 'vertical' }}
                          placeholder="Start typing answer statement..."
                          value={activeResponse || ''}
                          onChange={(e) => handleSaveResponse(e.target.value)}
                        />
                      </div>
                    )}

                    {/* MATCHING PAIRS */}
                    {examQuestions[currentQIndex].type === 'matching' && examQuestions[currentQIndex].matchingPairs && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Select correct matches:</p>
                        {examQuestions[currentQIndex].matchingPairs.map((pair, idx) => {
                          const savedMap = (activeResponse || {}) as Record<string, string>;
                          // Retrieve match pool
                          const rightSidePool = examQuestions[currentQIndex].matchingPairs?.map(p => p.right) || [];
                          return (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
                              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                                {pair.left}
                              </div>
                              <select
                                className="form-input"
                                value={savedMap[pair.left] || ''}
                                onChange={(e) => {
                                  const nextMap = { ...savedMap, [pair.left]: e.target.value };
                                  handleSaveResponse(nextMap);
                                }}
                              >
                                <option value="">-- Choose Match --</option>
                                {rightSidePool.map((rightOpt, oIdx) => (
                                  <option key={oIdx} value={rightOpt}>{rightOpt}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Bottom Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQIndex === 0}
                      >
                        <ChevronLeft size={16} /> Previous Question
                      </button>

                      <button
                        className="btn btn-secondary"
                        onClick={() => setBookmarkedQs(prev => ({ ...prev, [examQuestions[currentQIndex].id]: !prev[examQuestions[currentQIndex].id] }))}
                        style={{ color: bookmarkedQs[examQuestions[currentQIndex].id] ? 'var(--color-warning)' : 'inherit' }}
                      >
                        <Bookmark size={16} /> {bookmarkedQs[examQuestions[currentQIndex].id] ? 'Bookmarked' : 'Bookmark for Review'}
                      </button>

                      {currentQIndex === examQuestions.length - 1 ? (
                        <button
                          className="btn btn-primary"
                          onClick={() => setIsReviewingResponses(true)}
                          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                        >
                          Review Responses <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button
                          className="btn btn-secondary"
                          onClick={() => setCurrentQIndex(prev => Math.min(examQuestions.length - 1, prev + 1))}
                          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                        >
                          Next Question <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}

            </div>

          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeSubTab === 'dashboard' && !activeExam && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px' }}>Welcome back, {currentUser.profileName}!</h1>

            {/* Notifications Alert Board */}
            {db.notifications.filter((n) => n.userId === currentUser.id && !n.isRead).map((notif) => (
              <div key={notif.id} className="glass-panel" style={{ display: 'flex', gap: '16px', padding: '16px', marginBottom: '24px', background: 'rgba(99,102,241,0.08)', borderLeft: '4px solid var(--accent-primary)' }}>
                <AlertCircle size={24} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{notif.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{notif.message}</p>
                </div>
              </div>
            ))}

            <div className="dashboard-grid">
              <div className="glass-panel dashboard-card">
                <p className="card-title">Completed Exams</p>
                <h3 className="card-value">{myCompletedSessions.length}</h3>
                <span className="badge badge-success">Attempted</span>
              </div>
              <div className="glass-panel dashboard-card">
                <p className="card-title">Available Exams</p>
                <h3 className="card-value">{availableExams.length}</h3>
                <span className="badge badge-warning">Action Required</span>
              </div>
              <div className="glass-panel dashboard-card">
                <p className="card-title">Avg Score</p>
                <h3 className="card-value">
                  {myCompletedSessions.length
                    ? Math.round(myCompletedSessions.reduce((acc, c) => acc + c.finalScore, 0) / myCompletedSessions.length)
                    : 0}
                </h3>
                <span className="badge badge-info">Points Average</span>
              </div>
            </div>

            {/* Performance charts section */}
            <div className="glass-panel" style={{ padding: '24px', minHeight: '300px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>My Test Attempts History</h3>
              {myCompletedSessions.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No historical score analytics to render.</p>
              ) : (
                <div style={{ width: '100%', height: '200px' }}>
                  <svg className="chart-svg" viewBox="0 0 500 200">
                    <line x1="50" y1="20" x2="450" y2="20" className="chart-grid-line" />
                    <line x1="50" y1="80" x2="450" y2="80" className="chart-grid-line" />
                    <line x1="50" y1="140" x2="450" y2="140" className="chart-grid-line" />
                    
                    <line x1="50" y1="140" x2="450" y2="140" className="chart-axis-line" strokeWidth="2" />
                    <line x1="50" y1="20" x2="50" y2="140" className="chart-axis-line" strokeWidth="2" />
                    
                    {/* Render score path */}
                    {(() => {
                      const points = myCompletedSessions.map((sess, idx) => {
                        const x = 70 + idx * 80;
                        const y = 140 - (sess.finalScore / 30) * 110;
                        return { x, y, score: sess.finalScore };
                      });
                      
                      const pathD = points.reduce((acc, curr, idx) => 
                        idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`, ''
                      );

                      return (
                        <g>
                          {points.length > 1 && (
                            <path d={pathD} className="chart-line" />
                          )}
                          {points.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="5" className="chart-point" />
                          ))}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAKE EXAMS TAB */}
        {activeSubTab === 'exams' && !activeExam && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px' }}>Eligible Test Modules</h1>

            {availableExams.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                <CheckCircle2 size={48} style={{ color: 'var(--color-success)', marginBottom: '16px' }} />
                <h3>No available exams!</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>You have completed all published exams assigned to you.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {availableExams.map((ex) => {
                  const sub = db.subjects.find((s) => s.id === ex.subjectId);
                  return (
                    <div className="glass-panel" key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px' }}>
                      <div>
                        <span className="badge badge-info" style={{ marginBottom: '8px' }}>{sub?.name}</span>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>{ex.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', maxWidth: '500px' }}>{ex.description}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <p>Duration: <strong>{ex.durationMinutes} mins</strong></p>
                          <p>Total Weightage: <strong>{ex.totalMarks} pts</strong></p>
                        </div>
                        <button className="btn btn-primary" onClick={() => handleOpenInstructions(ex)}>
                          Start Exam Session
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* INSTRUCTIONS SCREEN MODAL */}
        {viewingInstructions && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: '600px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--color-warning)' }}>
                <Shield size={28} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Pre-Exam Security Guidelines</h3>
              </div>

              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <p>You are about to launch a proctored examination. Please read the following security constraints carefully:</p>
                
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li><strong>Fullscreen Lockdown</strong>: The exam forces fullscreen mode. Navigating away or exiting fullscreen triggers warnings.</li>
                  <li><strong>Browser Logs</strong>: Tab switching, page blur, right-clicks, and text copying will be blocked and recorded in reports.</li>
                  <li><strong>Webcam Proctoring</strong>: A live camera proctor feed is displayed. Face presence, head positions, and multiple faces are tracked.</li>
                  <li><strong>Timing Constraints</strong>: Once launched, the timer cannot be paused. The test will auto-submit when the duration ends.</li>
                </ul>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '24px' }}>
                <input 
                  type="checkbox" 
                  checked={agreedToTerms} 
                  onChange={(e) => setAgreedToTerms(e.target.checked)} 
                  style={{ marginTop: '3px' }}
                />
                <span>I understand and agree to the exam security parameters. I authorize camera monitoring for the duration of this exam.</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setViewingInstructions(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={!agreedToTerms} onClick={handleStartExam}>
                  Launch Lockbox Exam
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS SUBTAB */}
        {activeSubTab === 'results' && !activeExam && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px' }}>My Score Reports</h1>

            {myCompletedSessions.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                <AlertCircle size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                <h3>No score reports found</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>You have not completed any exams yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myCompletedSessions.map((session) => {
                  const ex = db.exams.find((e) => e.id === session.examId);
                  const passPercent = ex ? (session.finalScore / ex.totalMarks) * 100 : 0;
                  const isPass = ex ? session.finalScore >= ex.passingMarks : false;

                  return (
                    <div className="glass-panel" key={session.id} style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{ex?.title}</h3>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Attempted: {new Date(session.startTime).toLocaleDateString()}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge ${isPass ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                            {isPass ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Score Obtained</p>
                          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{session.finalScore} / {ex?.totalMarks} pts</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Percentage Score</p>
                          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{Math.round(passPercent)}%</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Security Infractions</p>
                          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: session.tabSwitchCount > 1 ? 'var(--color-danger)' : '#fff' }}>
                            {session.tabSwitchCount} Tab Sws
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Grading Evaluation</p>
                          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-info)' }}>
                            {session.isGraded ? 'Graded' : 'Descriptives Pending'}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setViewingResultSession(session)}>
                          Review Correct Answers
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* DETAILED RESULTS REVIEW MODAL (WITH HTML PRINT STYLING) */}
      {viewingResultSession && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '850px', background: '#0c0d13' }}>
            
            {/* Report Header for print */}
            <div id="print-area" style={{ color: '#fff', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '20px', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Candidate Scorecard</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Online Proctored Evaluation Desk</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>EXAMIFY PORTAL</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Issued on: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Student info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '0.85rem', background: '#12131a', padding: '16px', borderRadius: '8px' }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)' }}>Candidate Name: <strong style={{ color: '#fff' }}>{currentUser.profileName}</strong></p>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Registered Email: <strong style={{ color: '#fff' }}>{currentUser.email}</strong></p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-secondary)' }}>Exam Title: <strong style={{ color: '#fff' }}>{db.exams.find(e => e.id === viewingResultSession.examId)?.title}</strong></p>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Verified Score: <strong style={{ color: 'var(--color-success)' }}>{viewingResultSession.finalScore} Points</strong></p>
                </div>
              </div>

              {/* Answers Review */}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Detailed Answer Review</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {viewingResultSession.responses.map((res, index) => {
                  const q = db.questions.find((x) => x.id === res.questionId);
                  if (!q) return null;

                  return (
                    <div key={res.questionId} style={{ background: '#171821', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <span>Question {index + 1} ({q.type})</span>
                        <span>Marks obtained: <strong style={{ color: res.isCorrect ? 'var(--color-success)' : 'var(--color-danger)' }}>{res.marksObtained ?? 0} / {q.maxMarks}</strong></span>
                      </div>

                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{q.text}</p>

                      <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>
                          Your Response:{' '}
                          <strong style={{ color: res.isCorrect ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {q.type === 'matching' 
                              ? JSON.stringify(res.answer)
                              : String(res.answer || '[No Response]')}
                          </strong>
                        </p>
                        
                        {q.type !== 'essay' && (
                          <p style={{ color: 'var(--text-secondary)' }}>
                            Correct Target Reference:{' '}
                            <strong style={{ color: 'var(--color-success)' }}>
                              {q.type === 'matching' && q.matchingPairs
                                ? q.matchingPairs.map(p => `${p.left}➔${p.right}`).join(', ')
                                : q.correctAnswers.join(' | ')}
                            </strong>
                          </p>
                        )}

                        {res.feedback && (
                          <p style={{ color: 'var(--color-info)', background: 'rgba(14,165,233,0.05)', padding: '8px', borderRadius: '4px', marginTop: '6px', border: '1px solid rgba(14,165,233,0.1)' }}>
                            <strong>Examiner Feedback:</strong> {res.feedback}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingResultSession(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={printScorecard}>
                <Download size={16} /> Print Scorecard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
