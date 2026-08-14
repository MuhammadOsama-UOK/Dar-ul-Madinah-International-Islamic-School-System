export type ClassName = 'Class IV' | 'Class V' | 'Class VI' | 'Class VII' | 'Class VIII' | 'Class IX' | 'Class X' | 'Hifz Class';

export interface Subject {
  id: string;
  name: string;
  maxMarks: number;
}

export interface Student {
  id: string;
  sNo: number;
  grNo: string;
  name: string;
  fatherName: string;
  marks: Record<string, number>; // subjectId -> mark
}

export interface ClassData {
  className: ClassName;
  subjects: Subject[];
  students: Student[];
}
