export type UserRole = 'admin' | 'examiner' | 'student';

export interface User {
  id: string;
  username: string;
  passwordHash: string; // Simulated hashed password
  email: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  twoFactorSecret?: string;
  profileName: string;
  registrationDate: string;
  teacherId?: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
}

export interface Subject {
  id: string;
  name: string;
  courseId: string;
  description: string;
  examinerIds: string[]; // Assigned examiners
}

export type QuestionType =
  | 'mcq'
  | 'tf'
  | 'fill_in_the_blank'
  | 'short_answer'
  | 'essay'
  | 'matching'
  | 'numerical';

export interface MatchingPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  subjectId: string;
  type: QuestionType;
  text: string;
  options?: string[]; // Used for MCQ
  correctAnswers: string[]; // For MCQ (indices or text), TF ("true" or "false"), Fill-in-the-blank (possible answers), Numerical (number value), Short Answer (keywords)
  matchingPairs?: MatchingPair[]; // Used for matching question type
  maxMarks: number;
  category: 'Easy' | 'Medium' | 'Hard';
}

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  isEnabled: boolean;
  isPublished: boolean;
  questionIds: string[];
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  negativeMarkingEnabled: boolean;
  negativeMarkRate: number; // e.g. 0.25 (deduct 25% of question marks)
  showOnePerPage: boolean;
  dateScheduled?: string; // ISO String
}

export interface AnswerResponse {
  questionId: string;
  answer: any; // MCQ: string (option), TF: string ("true"/"false"), Fill: string, Short: string, Essay: string, Matching: Record<string, string>, Numerical: number
  isCorrect?: boolean;
  marksObtained?: number;
  gradedBy?: string; // Examiner user ID if manually graded
  feedback?: string;
}

export interface ActivityLog {
  timestamp: string;
  event: string; // "login", "tab_switch", "fullscreen_exit", "copy_paste_attempt", "right_click_attempt", "face_not_detected", "multiple_faces_detected", "cheating_warning"
  details: string;
}

export interface ExamSession {
  id: string;
  examId: string;
  studentId: string;
  startTime: string;
  submitTime?: string;
  responses: AnswerResponse[];
  isSubmitted: boolean;
  isGraded: boolean;
  finalScore: number;
  tabSwitchCount: number;
  fullscreenExitCount: number;
  ipAddress: string;
  activityLogs: ActivityLog[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'exam_reminder' | 'result' | 'system';
}

export interface MockDB {
  users: User[];
  courses: Course[];
  subjects: Subject[];
  questions: Question[];
  exams: Exam[];
  sessions: ExamSession[];
  notifications: Notification[];
}

const STORAGE_KEY = 'online_exam_portal_db_v30m';

const initialDB: MockDB = {
  users: [
    {
      id: 'admin-1',
      username: 'admin',
      passwordHash: 'admin123', // simulated
      email: 'admin@examportal.com',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      isTwoFactorEnabled: false,
      profileName: 'Administrator Account',
      registrationDate: '2026-01-01'
    },
    {
      id: 'exam-1',
      username: 'examiner',
      passwordHash: 'examiner123',
      email: 'examiner@examportal.com',
      role: 'examiner',
      isActive: true,
      isEmailVerified: true,
      isTwoFactorEnabled: false,
      profileName: 'Dr. Jane Smith',
      registrationDate: '2026-02-15',
      teacherId: 'T-101'
    },
    {
      id: 'stud-1',
      username: 'student',
      passwordHash: 'student123',
      email: 'student@examportal.com',
      role: 'student',
      isActive: true,
      isEmailVerified: true,
      isTwoFactorEnabled: false,
      profileName: 'Alex Rivera',
      registrationDate: '2026-03-10'
    }
  ],
  courses: [
    { id: 'course-1', name: 'Computer Science', description: 'Core Computing and Systems Engineering degree.' },
    { id: 'course-2', name: 'Electrical Engineering', description: 'Power systems, electronics, and digital designs.' }
  ],
  subjects: [
    {
      id: 'subject-1',
      name: 'Data Structures',
      courseId: 'course-1',
      description: 'Arrays, Linked Lists, Trees, Graphs, and Hash Tables.',
      examinerIds: ['exam-1']
    },
    {
      id: 'subject-2',
      name: 'Algorithms',
      courseId: 'course-1',
      description: 'Sorting, Searching, Dynamic Programming, and Divide & Conquer.',
      examinerIds: ['exam-1']
    },
    {
      id: 'subject-3',
      name: 'Electric Circuits',
      courseId: 'course-2',
      description: 'DC/AC analysis, network theorems, resonance, and filters.',
      examinerIds: ['exam-1']
    }
  ],
  questions: [
    {
      id: 'q-1',
      subjectId: 'subject-1',
      type: 'mcq',
      text: 'Which data structure follows the Last In First Out (LIFO) principle?',
      options: ['Queue', 'Stack', 'Linked List', 'Tree'],
      correctAnswers: ['Stack'],
      maxMarks: 2,
      category: 'Easy'
    },
    {
      id: 'q-2',
      subjectId: 'subject-1',
      type: 'mcq',
      text: 'Does a binary search tree always have a height of O(log n), regardless of insertion order?',
      options: ['Yes, always', 'No, it can degenerate to O(N)', 'Only if it has even nodes', 'Only if root is depth 0'],
      correctAnswers: ['No, it can degenerate to O(N)'],
      maxMarks: 2,
      category: 'Medium'
    },
    {
      id: 'q-3',
      subjectId: 'subject-1',
      type: 'mcq',
      text: 'What is the worst-case time complexity of searching in a Hash Table with chaining?',
      options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'],
      correctAnswers: ['O(N)'],
      maxMarks: 3,
      category: 'Medium'
    },
    {
      id: 'q-4',
      subjectId: 'subject-1',
      type: 'mcq',
      text: 'What is the maximum number of nodes in a binary tree of depth 4 (assuming root is at depth 0)?',
      options: ['15', '31', '63', '16'],
      correctAnswers: ['31'],
      maxMarks: 3,
      category: 'Medium'
    },
    {
      id: 'q-5',
      subjectId: 'subject-1',
      type: 'mcq',
      text: 'Which data structure offers O(1) time complexity for both Push and Pop operations?',
      options: ['Stack', 'Array', 'Binary Search Tree', 'Graph'],
      correctAnswers: ['Stack'],
      maxMarks: 4,
      category: 'Hard'
    },
    {
      id: 'q-6',
      subjectId: 'subject-1',
      type: 'mcq',
      text: 'What is the primary difference in access order between a Queue and a Stack?',
      options: ['Queue is FIFO, Stack is LIFO', 'Queue is LIFO, Stack is FIFO', 'Both are LIFO', 'Both are Random Access'],
      correctAnswers: ['Queue is FIFO, Stack is LIFO'],
      maxMarks: 5,
      category: 'Easy'
    },
    {
      id: 'q-7',
      subjectId: 'subject-1',
      type: 'mcq',
      text: 'Which tree structure guarantees O(log n) height using red and black node colorings?',
      options: ['B-Tree', 'Red-Black Tree', 'Binary Heap', 'Trie'],
      correctAnswers: ['Red-Black Tree'],
      maxMarks: 10,
      category: 'Hard'
    },
    {
      id: 'q-alg-1',
      subjectId: 'subject-2',
      type: 'mcq',
      text: 'What is the worst-case time complexity of Merge Sort?',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(n^2)'],
      correctAnswers: ['O(n log n)'],
      maxMarks: 2,
      category: 'Easy'
    },
    {
      id: 'q-alg-2',
      subjectId: 'subject-2',
      type: 'mcq',
      text: 'Which of the following is a stable sorting algorithm with O(n log n) worst-case time complexity?',
      options: ['Quick Sort', 'Heap Sort', 'Merge Sort', 'Selection Sort'],
      correctAnswers: ['Merge Sort'],
      maxMarks: 3,
      category: 'Medium'
    },
    {
      id: 'q-alg-3',
      subjectId: 'subject-2',
      type: 'mcq',
      text: 'Dynamic Programming is best suited for problems exhibiting which two key properties?',
      options: ['Optimal Substructure & Overlapping Subproblems', 'Greedy Choice & Constant Time', 'LIFO Order & FIFO Order', 'Random Access & Hashing'],
      correctAnswers: ['Optimal Substructure & Overlapping Subproblems'],
      maxMarks: 10,
      category: 'Hard'
    },
    {
      id: 'q-alg-4',
      subjectId: 'subject-2',
      type: 'mcq',
      text: 'In a binary search of 1024 sorted items, what is the maximum number of comparison steps needed in the worst case?',
      options: ['5', '10', '100', '512'],
      correctAnswers: ['10'],
      maxMarks: 5,
      category: 'Medium'
    }
  ],
  exams: [
    {
      id: 'exam-c1',
      subjectId: 'subject-1',
      title: 'Data Structures Midterm 2026',
      description: 'Comprehensive MCQ test covering stacks, queues, hash tables, and tree structures.',
      durationMinutes: 30,
      totalMarks: 29,
      passingMarks: 15,
      isEnabled: true,
      isPublished: true,
      questionIds: ['q-1', 'q-2', 'q-3', 'q-4', 'q-5', 'q-6', 'q-7'],
      randomizeQuestions: true,
      randomizeOptions: true,
      negativeMarkingEnabled: true,
      negativeMarkRate: 0.25,
      showOnePerPage: true,
      dateScheduled: new Date(Date.now() + 2 * 60 * 1000).toISOString()
    },
    {
      id: 'exam-c2',
      subjectId: 'subject-2',
      title: 'Algorithms Final Exam 2026',
      description: 'Comprehensive evaluation covering search strategies, sorting algorithms, and dynamic programming.',
      durationMinutes: 30,
      totalMarks: 20,
      passingMarks: 10,
      isEnabled: true,
      isPublished: true,
      questionIds: ['q-alg-1', 'q-alg-2', 'q-alg-3', 'q-alg-4'],
      randomizeQuestions: true,
      randomizeOptions: true,
      negativeMarkingEnabled: false,
      negativeMarkRate: 0.25,
      showOnePerPage: true,
      dateScheduled: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  sessions: [
    {
      id: 'sess-1',
      examId: 'exam-c1',
      studentId: 'stud-1',
      startTime: '2026-07-30T10:00:00Z',
      submitTime: '2026-07-30T10:35:00Z',
      responses: [
        { questionId: 'q-1', answer: 'Stack', isCorrect: true, marksObtained: 2 },
        { questionId: 'q-2', answer: 'No, it can degenerate to O(N)', isCorrect: true, marksObtained: 2 },
        { questionId: 'q-3', answer: 'O(N)', isCorrect: true, marksObtained: 3 },
        { questionId: 'q-4', answer: '31', isCorrect: true, marksObtained: 3 },
        { questionId: 'q-5', answer: 'Stack', isCorrect: true, marksObtained: 4 },
        { questionId: 'q-6', answer: 'Queue is FIFO, Stack is LIFO', isCorrect: true, marksObtained: 5 },
        { questionId: 'q-7', answer: 'Red-Black Tree', isCorrect: true, marksObtained: 10 }
      ],
      isSubmitted: true,
      isGraded: true,
      finalScore: 29,
      tabSwitchCount: 0,
      fullscreenExitCount: 0,
      ipAddress: '192.168.1.10',
      activityLogs: [
        { timestamp: '2026-07-30T10:00:05Z', event: 'login', details: 'Student logged in from Chrome Browser' },
        { timestamp: '2026-07-30T10:00:10Z', event: 'fullscreen_enter', details: 'Full screen proctoring initiated' }
      ]
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      userId: 'stud-1',
      title: 'Upcoming Midterm Exam',
      message: 'Your Data Structures Midterm 2026 is scheduled for today.',
      date: '2026-08-01T08:00:00Z',
      isRead: false,
      type: 'exam_reminder'
    }
  ]
};

// Database Access helpers
export const loadDB = (): MockDB => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    saveDB(initialDB);
    return initialDB;
  }
  try {
    const db = JSON.parse(data) as MockDB;
    if (!db || !Array.isArray(db.users)) {
      saveDB(initialDB);
      return initialDB;
    }
    // Guarantee default accounts exist if missing
    initialDB.users.forEach((initU) => {
      if (!db.users.some((u) => u.id === initU.id || u.username.toLowerCase() === initU.username.toLowerCase())) {
        db.users.push(initU);
      }
    });
    if (Array.isArray(db.exams)) {
      db.exams.forEach((ex) => {
        ex.durationMinutes = 30;
        ex.randomizeQuestions = true;
      });
    }
    return db;
  } catch (e) {
    saveDB(initialDB);
    return initialDB;
  }
};

export const saveDB = (db: MockDB): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const updateDB = (updater: (db: MockDB) => void): MockDB => {
  const db = loadDB();
  updater(db);
  saveDB(db);
  return db;
};
