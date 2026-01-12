export interface CsvStudent {
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  id: string;
  semester: number;
  studyDegree: string;
  studyProgram: string;
  skillLevel: string; // introCourseProficiency
  nationality: string;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
}
