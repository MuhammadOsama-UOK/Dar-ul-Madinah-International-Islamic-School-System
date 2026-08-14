import { ClassData, ClassName, Subject } from '../types/marksheet';

export const DEFAULT_CLASS_SUBJECTS: Record<ClassName, Subject[]> = {
  'Class IV': [
    { id: 'eng', name: 'English', maxMarks: 25 },
    { id: 'isl', name: 'Islamiyat', maxMarks: 25 },
    { id: 'sin', name: 'Sindhi', maxMarks: 25 },
    { id: 'urd', name: 'Urdu', maxMarks: 25 },
    { id: 'mat', name: 'Mathematics', maxMarks: 25 },
    { id: 'ict', name: 'Computer / ICT', maxMarks: 25 },
    { id: 'sci', name: 'Science', maxMarks: 25 },
    { id: 'sst', name: 'Social Studies', maxMarks: 25 },
  ],
  'Class V': [
    { id: 'ict', name: 'Computer / ICT', maxMarks: 25 },
    { id: 'urd', name: 'Urdu', maxMarks: 25 },
    { id: 'sci', name: 'Science', maxMarks: 25 },
    { id: 'mat', name: 'Mathematics', maxMarks: 25 },
    { id: 'sst', name: 'Social Studies', maxMarks: 25 },
    { id: 'eng', name: 'English', maxMarks: 25 },
    { id: 'isl', name: 'Islamiyat', maxMarks: 25 },
    { id: 'sin', name: 'Sindhi', maxMarks: 25 },
  ],
  'Class VI': [
    { id: 'isl', name: 'Islamiyat', maxMarks: 25 },
    { id: 'urd', name: 'Urdu', maxMarks: 25 },
    { id: 'sst', name: 'Social Studies', maxMarks: 25 },
    { id: 'sin', name: 'Sindhi', maxMarks: 25 },
    { id: 'sci', name: 'Science', maxMarks: 25 },
    { id: 'mat', name: 'Mathematics', maxMarks: 25 },
    { id: 'ict', name: 'Computer / ICT', maxMarks: 25 },
    { id: 'eng', name: 'English', maxMarks: 25 },
  ],
  'Class VII': [
    { id: 'eng', name: 'English', maxMarks: 25 },
    { id: 'sin', name: 'Sindhi', maxMarks: 25 },
    { id: 'sci', name: 'Science', maxMarks: 25 },
    { id: 'urd', name: 'Urdu', maxMarks: 25 },
    { id: 'ict', name: 'Computer / ICT', maxMarks: 25 },
    { id: 'mat', name: 'Mathematics', maxMarks: 25 },
    { id: 'sst', name: 'Social Studies', maxMarks: 25 },
    { id: 'isl', name: 'Islamiyat', maxMarks: 25 },
  ],
  'Class VIII': [
    { id: 'urd', name: 'Urdu', maxMarks: 25 },
    { id: 'isl', name: 'Islamiyat', maxMarks: 25 },
    { id: 'phy', name: 'Physics', maxMarks: 25 },
    { id: 'eng', name: 'English', maxMarks: 25 },
    { id: 'mat', name: 'Mathematics', maxMarks: 25 },
    { id: 'che', name: 'Chemistry', maxMarks: 25 },
    { id: 'com', name: 'Computer', maxMarks: 25 },
  ],
  'Class IX': [
    { id: 'mat', name: 'Mathematics', maxMarks: 25 },
    { id: 'urd', name: 'Urdu', maxMarks: 25 },
    { id: 'phy', name: 'Physics', maxMarks: 25 },
    { id: 'eng', name: 'English', maxMarks: 25 },
    { id: 'isl', name: 'Islamiyat', maxMarks: 25 },
    { id: 'che', name: 'Chemistry', maxMarks: 25 },
    { id: 'com', name: 'Computer', maxMarks: 25 },
  ],
  'Class X': [
    { id: 'isl', name: 'Islamiyat', maxMarks: 25 },
    { id: 'sin', name: 'Sindhi', maxMarks: 25 },
    { id: 'eng', name: 'English', maxMarks: 25 },
    { id: 'pst', name: 'Pak Studies', maxMarks: 25 },
    { id: 'mat', name: 'Mathematics', maxMarks: 25 },
    { id: 'phy', name: 'Physics', maxMarks: 25 },
    { id: 'com', name: 'Computer', maxMarks: 25 },
    { id: 'bio', name: 'Biology', maxMarks: 25 },
    { id: 'che', name: 'Chemistry', maxMarks: 25 },
  ],
  'Hifz Class': [
    { id: 'sub1', name: 'Subject 1', maxMarks: 25 },
    { id: 'sub2', name: 'Subject 2', maxMarks: 25 },
    { id: 'sub3', name: 'Subject 3', maxMarks: 25 },
    { id: 'sub4', name: 'Subject 4', maxMarks: 25 },
    { id: 'sub5', name: 'Subject 5', maxMarks: 25 },
    { id: 'sub6', name: 'Subject 6', maxMarks: 25 },
    { id: 'sub7', name: 'Subject 7', maxMarks: 25 },
  ]
};

export const INITIAL_CLASSES: ClassName[] = [
  'Class IV', 'Class V', 'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X', 'Hifz Class'
];
