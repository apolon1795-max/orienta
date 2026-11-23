import type { CourseState } from '../types';

/** The visible exercise, deliberately independent of answers, save state and media. */
export function courseScreenKey(course: CourseState): string {
  switch (course.activeStage) {
    case 0: return '0:' + course.s1Phase + ':' + (course.s1Phase === 'tinder' ? course.s1CardIndex :
      course.s1Phase === 'jobs' ? course.s1ProfessionIndex : course.s1Phase === 'quiz' ? course.s1QuizIndex : 0);
    case 1: return '1:' + course.s2Phase + ':' + (course.s2Phase === 'gifts' ? course.s2GiftIndex : 0);
    case 2: return '2:' + course.s3Phase + ':' + (course.s3Phase === 'crisis' ? course.s3CrisisIdx : 0);
    case 3: return '3:' + course.s4Phase;
    case 4: return '4:' + course.s5Phase + ':' + (course.s5Phase === 'holland' || course.s5Phase === 'motivation' ? course.s5Index : 0);
    case 5: return 'final';
    default: return 'map';
  }
}
