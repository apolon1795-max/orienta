export interface CourseSession {
 token: string;
 learnerId: string;
 expiresAt: number;
}
export interface CourseEntry {
 session?: CourseSession | null;
 mode?: 'continue' | 'map' | 'profile-card';
 back: () => void;
}
