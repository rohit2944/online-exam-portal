import React, { useState } from 'react';
import { 
  BookOpen, Plus, Edit, Trash2, CheckCircle2, FileSpreadsheet, 
  HelpCircle, CheckSquare, Award, ArrowRight
} from 'lucide-react';
import { 
  loadDB, updateDB, type User, type Question, type QuestionType, type Exam, type ExamSession 
} from '../../utils/mockDb';

interface ExaminerModuleProps {
  currentUser: User;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ExaminerModule: React.FC<ExaminerModuleProps> = ({ currentUser, addToast }) => {
  const [db, setDb] = useState(loadDB());
  const [activeSubTab, setActiveSubTab] = useState<'questions' | 'exams' | 'grading' | 'reports'>('questions');

  // Reload local state from MockDB
  const reloadState = () => {
    setDb(loadDB());
  };

  // Find subjects managed by this examiner
  const mySubjects = db.subjects.filter((s) => s.examinerIds.includes(currentUser.id));
  const mySubjectIds = mySubjects.map((s) => s.id);

  // --- QUESTION BANK STATES ---
  const [qModalOpen, setQModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [qText, setQText] = useState('');
  const [qSubjectId, setQSubjectId] = useState(mySubjectIds[0] || '');
  const [qType, setQType] = useState<QuestionType>('mcq');
  const [qCategory, setQCategory] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [qMaxMarks, setQMaxMarks] = useState(2);
  
  // MCQ Options
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', '']);
  const [mcqCorrectIdx, setMcqCorrectIdx] = useState(0);

  // True / False
  const [tfCorrect, setTfCorrect] = useState<'true' | 'false'>('true');

  // Fill in the Blank / Short Answer / Numerical
  const [textCorrectAnswer, setTextCorrectAnswer] = useState('');

  // Matching Pairs
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([
    { left: '', right: '' },
    { left: '', right: '' }
  ]);

  // Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJSON, setImportJSON] = useState('');

  // --- EXAM COMPILER STATES ---
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examQIds, setExamQIds] = useState<string[]>([]);

  // --- GRADING STATES ---
  const [gradingSession, setGradingSession] = useState<ExamSession | null>(null);
  const [gradeFeedbacks, setGradeFeedbacks] = useState<Record<string, { marks: number; feedback: string }>>({});

  // ==========================================
  // QUESTION HANDLERS
  // ==========================================
  const handleOpenQModal = (q: Question | null = null) => {
    if (q) {
      setEditingQuestion(q);
      setQText(q.text);
      setQSubjectId(q.subjectId);
      setQType(q.type);
      setQCategory(q.category);
      setQMaxMarks(q.maxMarks);

      if (q.type === 'mcq' && q.options) {
        setMcqOptions(q.options);
        const idx = q.options.indexOf(q.correctAnswers[0]);
        setMcqCorrectIdx(idx >= 0 ? idx : 0);
      }
      if (q.type === 'tf') {
        setTfCorrect(q.correctAnswers[0] as any);
      }
      if (['fill_in_the_blank', 'short_answer', 'numerical'].includes(q.type)) {
        setTextCorrectAnswer(q.correctAnswers[0] || '');
      }
      if (q.type === 'matching' && q.matchingPairs) {
        setMatchingPairs(q.matchingPairs);
      }
    } else {
      setEditingQuestion(null);
      setQText('');
      setQSubjectId(mySubjectIds[0] || '');
      setQType('mcq');
      setQCategory('Easy');
      setQMaxMarks(2);
      setMcqOptions(['', '', '', '']);
      setMcqCorrectIdx(0);
      setTfCorrect('true');
      setTextCorrectAnswer('');
      setMatchingPairs([
        { left: '', right: '' },
        { left: '', right: '' }
      ]);
    }
    setQModalOpen(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText || !qSubjectId) {
      addToast('Please enter question text.', 'error');
      return;
    }

    let correctAnswers: string[] = [];
    let processedPairs: { left: string; right: string }[] | undefined = undefined;
    let options: string[] | undefined = undefined;

    if (qType === 'mcq') {
      if (mcqOptions.some((o) => !o.trim())) {
        addToast('All MCQ options are required.', 'error');
        return;
      }
      options = mcqOptions.map((o) => o.trim());
      correctAnswers = [options[mcqCorrectIdx]];
    } else if (qType === 'tf') {
      correctAnswers = [tfCorrect];
    } else if (['fill_in_the_blank', 'short_answer', 'numerical'].includes(qType)) {
      if (!textCorrectAnswer.trim()) {
        addToast('Correct answer target is required.', 'error');
        return;
      }
      correctAnswers = [textCorrectAnswer.trim()];
    } else if (qType === 'matching') {
      if (matchingPairs.some((p) => !p.left.trim() || !p.right.trim())) {
        addToast('All matching pairs must be filled.', 'error');
        return;
      }
      processedPairs = matchingPairs.map((p) => ({ left: p.left.trim(), right: p.right.trim() }));
    }

    updateDB((currentDb) => {
      if (editingQuestion) {
        const q = currentDb.questions.find((x) => x.id === editingQuestion.id);
        if (q) {
          q.text = qText;
          q.subjectId = qSubjectId;
          q.type = qType;
          q.category = qCategory;
          q.maxMarks = Number(qMaxMarks);
          q.options = options;
          q.correctAnswers = correctAnswers;
          q.matchingPairs = processedPairs;
        }
        addToast('Question updated in bank!', 'success');
      } else {
        const newQ: Question = {
          id: `q-${Date.now()}`,
          subjectId: qSubjectId,
          type: qType,
          text: qText,
          options,
          correctAnswers,
          matchingPairs: processedPairs,
          maxMarks: Number(qMaxMarks),
          category: qCategory
        };
        currentDb.questions.push(newQ);
        addToast('New question added to bank!', 'success');
      }
    });

    setQModalOpen(false);
    reloadState();
  };

  const handleDeleteQuestion = (qId: string) => {
    if (window.confirm('Delete this question from bank?')) {
      updateDB((currentDb) => {
        currentDb.questions = currentDb.questions.filter((x) => x.id !== qId);
        // Remove from exams
        currentDb.exams.forEach((ex) => {
          ex.questionIds = ex.questionIds.filter((id) => id !== qId);
        });
      });
      addToast('Question deleted.', 'success');
      reloadState();
    }
  };

  const handleImportQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(importJSON);
      if (!Array.isArray(parsed)) {
        addToast('Import must be a JSON Array of questions.', 'error');
        return;
      }

      updateDB((currentDb) => {
        parsed.forEach((q: any) => {
          const newQ: Question = {
            id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            subjectId: q.subjectId || qSubjectId || mySubjectIds[0],
            type: q.type || 'mcq',
            text: q.text || 'Imported Question',
            options: q.options,
            correctAnswers: q.correctAnswers || [''],
            matchingPairs: q.matchingPairs,
            maxMarks: q.maxMarks || 2,
            category: q.category || 'Easy'
          };
          currentDb.questions.push(newQ);
        });
      });

      addToast(`Successfully imported ${parsed.length} questions!`, 'success');
      setImportModalOpen(false);
      setImportJSON('');
      reloadState();
    } catch (err) {
      addToast('Invalid JSON syntax.', 'error');
    }
  };

  // Add MCQs Option Row
  const handleMcqOptionChange = (idx: number, val: string) => {
    const next = [...mcqOptions];
    next[idx] = val;
    setMcqOptions(next);
  };

  // Matching pair handler
  const handlePairChange = (idx: number, side: 'left' | 'right', val: string) => {
    const next = [...matchingPairs];
    next[idx][side] = val;
    setMatchingPairs(next);
  };

  const addMatchingRow = () => {
    setMatchingPairs([...matchingPairs, { left: '', right: '' }]);
  };

  // ==========================================
  // EXAM COMPILER HANDLERS
  // ==========================================
  const handleOpenBuilder = (exam: Exam) => {
    setSelectedExam(exam);
    setExamQIds(exam.questionIds);
    setBuilderModalOpen(true);
  };

  const handleToggleQuestionInExam = (qId: string) => {
    setExamQIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const handleSaveExamQuestions = () => {
    if (!selectedExam) return;
    updateDB((currentDb) => {
      const ex = currentDb.exams.find((x) => x.id === selectedExam.id);
      if (ex) {
        ex.questionIds = examQIds;
      }
    });
    addToast('Exam compiled successfully!', 'success');
    setBuilderModalOpen(false);
    setSelectedExam(null);
    reloadState();
  };

  const togglePublishExam = (examId: string) => {
    updateDB((currentDb) => {
      const ex = currentDb.exams.find((x) => x.id === examId);
      if (ex) {
        if (ex.questionIds.length === 0) {
          addToast('Cannot publish an exam with 0 questions.', 'error');
          return;
        }
        ex.isPublished = !ex.isPublished;
      }
    });
    addToast('Exam publication updated.', 'success');
    reloadState();
  };

  // ==========================================
  // GRADING HANDLERS
  // ==========================================
  const startGrading = (session: ExamSession) => {
    setGradingSession(session);
    const initialGradingMap: typeof gradeFeedbacks = {};
    session.responses.forEach((res) => {
      const q = db.questions.find((x) => x.id === res.questionId);
      if (q && (q.type === 'essay' || q.type === 'short_answer')) {
        initialGradingMap[res.questionId] = {
          marks: res.marksObtained ?? 0,
          feedback: res.feedback ?? ''
        };
      }
    });
    setGradeFeedbacks(initialGradingMap);
  };

  const handleGradeChange = (qId: string, field: 'marks' | 'feedback', val: any) => {
    setGradeFeedbacks((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        [field]: val
      }
    }));
  };

  const submitGrading = () => {
    if (!gradingSession) return;

    updateDB((currentDb) => {
      const session = currentDb.sessions.find((x) => x.id === gradingSession.id);
      if (session) {
        session.responses.forEach((res) => {
          const grade = gradeFeedbacks[res.questionId];
          if (grade !== undefined) {
            res.marksObtained = Number(grade.marks);
            res.feedback = grade.feedback;
            res.isCorrect = Number(grade.marks) > 0;
            res.gradedBy = currentUser.id;
          }
        });

        // Recalculate overall score
        const totalScore = session.responses.reduce((acc, curr) => acc + (curr.marksObtained || 0), 0);
        session.finalScore = Math.max(0, totalScore);
        session.isGraded = true;
      }
    });

    addToast('Grading submitted successfully!', 'success');
    setGradingSession(null);
    reloadState();
  };

  // Filter lists
  const questionsOfMySubjects = db.questions.filter((q) => mySubjectIds.includes(q.subjectId));
  const examsOfMySubjects = db.exams.filter((e) => mySubjectIds.includes(e.subjectId));
  
  // Ungraded sessions of my subjects
  const ungradedSessions = db.sessions.filter((s) => {
    const ex = db.exams.find((e) => e.id === s.examId);
    return ex && mySubjectIds.includes(ex.subjectId) && s.isSubmitted && !s.isGraded;
  });

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <BookOpen size={24} style={{ color: 'var(--accent-secondary)' }} />
          <span>Examiner</span>
        </div>

        <ul className="sidebar-menu">
          <li 
            className={`sidebar-item ${activeSubTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('questions')}
          >
            <HelpCircle size={18} />
            Question Bank
          </li>
          <li 
            className={`sidebar-item ${activeSubTab === 'exams' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('exams')}
          >
            <CheckSquare size={18} />
            Exam Compiler
          </li>
          <li 
            className={`sidebar-item ${activeSubTab === 'grading' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('grading')}
          >
            <Award size={18} />
            Manual Grading
            {ungradedSessions.length > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: 'auto', padding: '2px 6px', fontSize: '0.65rem' }}>
                {ungradedSessions.length}
              </span>
            )}
          </li>
          <li 
            className={`sidebar-item ${activeSubTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('reports')}
          >
            <FileSpreadsheet size={18} />
            Results & Reports
          </li>
        </ul>

        <div className="user-profile-section">
          <div className="avatar-circle">
            {currentUser.profileName[0]}
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>{currentUser.profileName}</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Examiner / Faculty</p>
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="main-content">
        
        {/* QUESTIONS SUBTAB */}
        {activeSubTab === 'questions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Question Bank Editor</h1>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setImportModalOpen(true)}>
                  <FileSpreadsheet size={16} /> Import JSON
                </button>
                <button className="btn btn-primary" onClick={() => handleOpenQModal()}>
                  <Plus size={16} /> Add Question
                </button>
              </div>
            </div>

            <div className="table-container glass-panel">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Question Detail</th>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Complexity</th>
                    <th>Max Marks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questionsOfMySubjects.map((q) => {
                    const sub = db.subjects.find((s) => s.id === q.subjectId);
                    return (
                      <tr key={q.id}>
                        <td style={{ maxWidth: '360px' }}>
                          <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{q.text}</strong>
                          {q.type === 'mcq' && q.options && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              Options: {q.options.join(' | ')}
                            </div>
                          )}
                          {q.type === 'matching' && q.matchingPairs && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              Pairs: {q.matchingPairs.map(p => `${p.left} ➔ ${p.right}`).join(', ')}
                            </div>
                          )}
                        </td>
                        <td>{sub?.name || 'Unknown'}</td>
                        <td>
                          <span className="badge badge-info">{q.type}</span>
                        </td>
                        <td>
                          <span className={`badge ${q.category === 'Easy' ? 'badge-success' : q.category === 'Medium' ? 'badge-warning' : 'badge-danger'}`}>
                            {q.category}
                          </span>
                        </td>
                        <td><strong>{q.maxMarks} pts</strong></td>
                        <td>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => handleOpenQModal(q)}>
                              <Edit size={16} />
                            </button>
                            <button style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }} onClick={() => handleDeleteQuestion(q.id)}>
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

        {/* EXAM COMPILER SUBTAB */}
        {activeSubTab === 'exams' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px' }}>Exam Compiler Dashboard</h1>

            <div className="table-container glass-panel">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Exam Title</th>
                    <th>Subject</th>
                    <th>Questions Linked</th>
                    <th>Config Parameters</th>
                    <th>Status</th>
                    <th>Compile Builder</th>
                  </tr>
                </thead>
                <tbody>
                  {examsOfMySubjects.map((ex) => {
                    const sub = db.subjects.find((s) => s.id === ex.subjectId);
                    return (
                      <tr key={ex.id}>
                        <td><strong>{ex.title}</strong></td>
                        <td>{sub?.name || 'Unknown'}</td>
                        <td>
                          <span className="badge badge-info">{ex.questionIds.length} Questions</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Time: {ex.durationMinutes}m | Total: {ex.totalMarks}pts | Neg: {ex.negativeMarkingEnabled ? 'Yes' : 'No'}
                          </div>
                        </td>
                        <td>
                          <button 
                            className={`badge ${ex.isPublished ? 'badge-success' : 'badge-warning'}`}
                            onClick={() => togglePublishExam(ex.id)}
                            style={{ border: 'none', cursor: 'pointer' }}
                          >
                            {ex.isPublished ? 'Published' : 'Draft'}
                          </button>
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleOpenBuilder(ex)}>
                            <Edit size={14} /> Link Questions
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GRADING SUBTAB */}
        {activeSubTab === 'grading' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px' }}>Manual Grading Queue</h1>

            {ungradedSessions.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                <CheckCircle2 size={48} style={{ color: 'var(--color-success)', marginBottom: '16px' }} />
                <h3>Grading queue is empty!</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>All submitted descriptive answers are graded.</p>
              </div>
            ) : (
              <div className="table-container glass-panel">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Exam</th>
                      <th>Time Submitted</th>
                      <th>Activity Flags</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ungradedSessions.map((session) => {
                      const student = db.users.find((u) => u.id === session.studentId);
                      const ex = db.exams.find((e) => e.id === session.examId);
                      return (
                        <tr key={session.id}>
                          <td><strong>{student?.profileName}</strong> (@{student?.username})</td>
                          <td>{ex?.title}</td>
                          <td>{session.submitTime ? new Date(session.submitTime).toLocaleString() : 'N/A'}</td>
                          <td>
                            {session.tabSwitchCount > 0 && (
                              <span className="badge badge-warning" style={{ marginRight: '6px' }}>{session.tabSwitchCount} Tab Switches</span>
                            )}
                            {session.fullscreenExitCount > 0 && (
                              <span className="badge badge-danger">{session.fullscreenExitCount} FS Exits</span>
                            )}
                            {session.tabSwitchCount === 0 && session.fullscreenExitCount === 0 && (
                              <span className="badge badge-success">Clean Session</span>
                            )}
                          </td>
                          <td>
                            <button className="btn btn-primary" onClick={() => startGrading(session)}>
                              Grade Now <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REPORTS SUBTAB */}
        {activeSubTab === 'reports' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px' }}>Results & Candidate Reports</h1>
            
            {(() => {
              const completedSessions = db.sessions.filter((s) => {
                const ex = db.exams.find((e) => e.id === s.examId);
                return ex && mySubjectIds.includes(ex.subjectId) && s.isSubmitted;
              });

              if (completedSessions.length === 0) {
                return (
                  <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                    <h3>No reports found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Students haven't taken or completed any exams in your subjects yet.</p>
                  </div>
                );
              }

              return (
                <div className="table-container glass-panel">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Exam Title</th>
                        <th>Obtained Score</th>
                        <th>Percentage</th>
                        <th>Evaluation Status</th>
                        <th>Security Alerts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSessions.map((session) => {
                        const student = db.users.find((u) => u.id === session.studentId);
                        const ex = db.exams.find((e) => e.id === session.examId);
                        const scorePct = ex ? Math.round((session.finalScore / ex.totalMarks) * 100) : 0;
                        const isPass = ex ? session.finalScore >= ex.passingMarks : false;

                        return (
                          <tr key={session.id}>
                            <td>
                              <strong>{student?.profileName}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{student?.username}</div>
                            </td>
                            <td>
                              <strong>{ex?.title}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Scheduled Time: {ex?.dateScheduled ? new Date(ex.dateScheduled).toLocaleString() : 'N/A'}</div>
                            </td>
                            <td>
                              <strong style={{ fontSize: '1rem', color: isPass ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {session.finalScore} / {ex?.totalMarks} pts
                              </strong>
                            </td>
                            <td>
                              <strong>{scorePct}%</strong>
                            </td>
                            <td>
                              <span className={`badge ${session.isGraded ? 'badge-success' : 'badge-warning'}`}>
                                {session.isGraded ? 'Graded' : 'Descriptive Pending'}
                              </span>
                            </td>
                            <td>
                              {session.tabSwitchCount > 0 || session.fullscreenExitCount > 0 ? (
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                                  {session.tabSwitchCount > 0 && <div>{session.tabSwitchCount} Tab Switches</div>}
                                  {session.fullscreenExitCount > 0 && <div>{session.fullscreenExitCount} Fullscreen Exits</div>}
                                </div>
                              ) : (
                                <span className="badge badge-success">Clean Session</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

      </div>

      {/* QUESTION MODAL */}
      {qModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '650px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px' }}>
              {editingQuestion ? 'Edit Question Bank Node' : 'Compose Bank Question'}
            </h3>
            <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Subject Mapping</label>
                  <select 
                    className="form-input" 
                    value={qSubjectId}
                    onChange={(e) => setQSubjectId(e.target.value)}
                  >
                    {mySubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Complexity Category</label>
                  <select 
                    className="form-input"
                    value={qCategory}
                    onChange={(e) => setQCategory(e.target.value as any)}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Question Type</label>
                  <select 
                    className="form-input"
                    value={qType}
                    onChange={(e) => setQType(e.target.value as QuestionType)}
                  >
                    <option value="mcq">Multiple Choice Question (MCQ)</option>
                    <option value="tf">True / False</option>
                    <option value="fill_in_the_blank">Fill in the Blank</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="essay">Essay / Long Answer</option>
                    <option value="matching">Matching Pairs</option>
                    <option value="numerical">Numerical Response</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Weightage Marks</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={qMaxMarks}
                    onChange={(e) => setQMaxMarks(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Question Text Statement</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Type the conceptual statement..."
                />
              </div>

              {/* MCQ CONFIG PANEL */}
              {qType === 'mcq' && (
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '12px' }}>MCQ Options Setup</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {mcqOptions.map((opt, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                          type="radio" 
                          name="correctMcq" 
                          checked={mcqCorrectIdx === idx}
                          onChange={() => setMcqCorrectIdx(idx)}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{String.fromCharCode(65 + idx)})</span>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={opt}
                          onChange={(e) => handleMcqOptionChange(idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TRUE / FALSE CONFIG PANEL */}
              {qType === 'tf' && (
                <div>
                  <label className="form-label">Select Correct Answer</label>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="tfAnswer" 
                        checked={tfCorrect === 'true'} 
                        onChange={() => setTfCorrect('true')} 
                      />
                      True
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="tfAnswer" 
                        checked={tfCorrect === 'false'} 
                        onChange={() => setTfCorrect('false')} 
                      />
                      False
                    </label>
                  </div>
                </div>
              )}

              {/* TEXT FIELD / FILL IN BLANKS / NUMERICAL */}
              {['fill_in_the_blank', 'short_answer', 'numerical'].includes(qType) && (
                <div>
                  <label className="form-label">
                    {qType === 'fill_in_the_blank' && 'Correct Blank Text'}
                    {qType === 'short_answer' && 'Target Grading Key-Phrases (comma-separated keywords)'}
                    {qType === 'numerical' && 'Expected Numeric Value'}
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={textCorrectAnswer}
                    onChange={(e) => setTextCorrectAnswer(e.target.value)}
                    placeholder={qType === 'numerical' ? 'e.g. 24.5' : 'Key text string'}
                  />
                </div>
              )}

              {/* MATCHING PAIRS CONFIG PANEL */}
              {qType === 'matching' && (
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Matching Term Alignments</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addMatchingRow}>+ Add Pair</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {matchingPairs.map((pair, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={pair.left} 
                          onChange={(e) => handlePairChange(idx, 'left', e.target.value)}
                          placeholder="Term Left" 
                        />
                        <input 
                          type="text" 
                          className="form-input" 
                          value={pair.right} 
                          onChange={(e) => handlePairChange(idx, 'right', e.target.value)}
                          placeholder="Term Right" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {qType === 'essay' && (
                <div style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Note: Essay / descriptive questions cannot be automatically evaluated. They will automatically be routed to your <strong>Manual Grading</strong> tab upon submission.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setQModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Question Node</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT JSON MODAL */}
      {importModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>Import Questions Block</h3>
            <form onSubmit={handleImportQuestions}>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Paste Questions JSON Array</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                  value={importJSON}
                  onChange={(e) => setImportJSON(e.target.value)}
                  placeholder={`[\n  {\n    "text": "Identify which of the following is linear...",\n    "type": "mcq",\n    "options": ["Array", "Graph", "Tree", "Set"],\n    "correctAnswers": ["Array"],\n    "maxMarks": 2,\n    "category": "Easy"\n  }\n]`}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setImportModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Import Now</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXAM QUESTIONS LINKING MODAL */}
      {builderModalOpen && selectedExam && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Compile Exam Structure</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Linking questions to: <strong>{selectedExam.title}</strong></p>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {examQIds.length} questions linked
              </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {db.questions.filter((q) => q.subjectId === selectedExam.subjectId).map((q) => {
                const linked = examQIds.includes(q.id);
                return (
                  <div 
                    key={q.id} 
                    onClick={() => handleToggleQuestionInExam(q.id)}
                    className="option-card" 
                    style={{ margin: 0, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderColor: linked ? 'var(--accent-primary)' : 'var(--border-color)', background: linked ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-tertiary)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
                      <input 
                        type="checkbox" 
                        checked={linked} 
                        readOnly
                      />
                      <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{q.text}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type: {q.type} | Marks: {q.maxMarks} | Grade: {q.category}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setBuilderModalOpen(false); setSelectedExam(null); }}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveExamQuestions}>Save Link Configurations</button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL GRADING WORKSPACE MODAL */}
      {gradingSession && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '800px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>Descriptive Answers Evaluation Desk</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '550px', overflowY: 'auto', paddingRight: '8px' }}>
              {gradingSession.responses.map((res) => {
                const q = db.questions.find((x) => x.id === res.questionId);
                if (!q || !['essay', 'short_answer'].includes(q.type)) return null;

                const grad = gradeFeedbacks[res.questionId] || { marks: 0, feedback: '' };

                return (
                  <div key={res.questionId} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="badge badge-info">{q.type}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Marks: <strong>{q.maxMarks} pts</strong></span>
                    </div>

                    <p style={{ fontWeight: 700, color: '#fff', marginBottom: '12px', fontSize: '0.9rem' }}>{q.text}</p>
                    
                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Candidate Answer:</p>
                      <p style={{ fontSize: '0.9rem', color: '#fff', whiteSpace: 'pre-wrap' }}>{res.answer || '[No Answer Submitted]'}</p>
                    </div>

                    {/* Grading Fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px' }}>
                      <div>
                        <label className="form-label">Award Score</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          max={q.maxMarks}
                          min={0}
                          step={0.5}
                          value={grad.marks}
                          onChange={(e) => handleGradeChange(res.questionId, 'marks', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label">Examiner Feedback Comments</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Provide constructive feedback notes..."
                          value={grad.feedback}
                          onChange={(e) => handleGradeChange(res.questionId, 'feedback', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setGradingSession(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={submitGrading}>Publish Evaluation Grade</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
