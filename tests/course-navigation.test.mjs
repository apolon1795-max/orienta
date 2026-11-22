import test from 'node:test';
import assert from 'node:assert/strict';
import { createCourseState } from '../services/progress.ts';
import { allCourseStagesCompleted, courseHasProgress, nextCourseStage, resumeCourseStage } from '../services/courseNavigation.ts';

test('primary action resumes the actual active step, or the first next step for legacy map users', () => {
 const fresh=createCourseState();
 assert.equal(courseHasProgress(fresh),false);
 assert.equal(resumeCourseStage(fresh),0);
 const saved={...fresh,completedStages:[0,1,2],activeStage:3,s4Phase:'place'};
 assert.equal(courseHasProgress(saved),true);
 assert.equal(resumeCourseStage(saved),3);
 assert.equal(resumeCourseStage({...saved,activeStage:null}),3);
 assert.equal(resumeCourseStage({...saved,activeStage:5}),3,'cannot skip locked stages');
 assert.equal(nextCourseStage({...saved,completedStages:[0,1,2,3]}),4);
 assert.equal(allCourseStagesCompleted({...saved,completedStages:[0,1,2,4,4]}),false);
 assert.equal(allCourseStagesCompleted({...saved,completedStages:[0,1,2,3,4]}),true);
 assert.equal(allCourseStagesCompleted({}),false,'older partial profile records are tolerated');
});
