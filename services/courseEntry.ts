export interface CourseSession {
 token: string;
 learnerId: string;
 expiresAt: number;
}
export interface CourseEntry {
 session?: CourseSession | null;
 back: () => void;
}
