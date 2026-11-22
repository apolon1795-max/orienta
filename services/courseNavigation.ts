import type { CourseState } from '../types';

type CourseNavigationState = Pick<CourseState, 'activeStage' | 'completedStages' | 'lessons' | 's1Phase' | 's1CardIndex'>;
export const allCourseStagesCompleted = (course: CourseNavigationState | null | undefined) =>
 !!course && Array.isArray(course.completedStages) && [0,1,2,3,4].every(index => course.completedStages.includes(index));
export const nextCourseStage = (course: Pick<CourseState, 'completedStages'>) => {
 const firstIncomplete = [0,1,2,3,4].find(index => !course.completedStages.includes(index));
 return firstIncomplete ?? 5;
};
export const resumeCourseStage = (course: CourseNavigationState) => {
 const saved = course.activeStage;
 return typeof saved === 'number' && Number.isInteger(saved) && saved >= 0 && saved <= nextCourseStage(course) ? saved : nextCourseStage(course);
};
export const courseHasProgress = (course: CourseNavigationState | null | undefined) =>
 !!course && (typeof course.activeStage === 'number' || (course.completedStages?.length ?? 0) > 0 || Object.keys(course.lessons ?? {}).length > 0 || Boolean(course.s1Phase && course.s1Phase !== 'intro') || course.s1CardIndex > 0);
