import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { apiBase } from './services/apiBase';
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  if (env.VITE_PROGRESS_API_URL && !apiBase(env.VITE_PROGRESS_API_URL)) throw new Error('VITE_PROGRESS_API_URL must be an HTTPS API URL, without credentials, query or fragment. Local development may use http://127.0.0.1.');
  return ({
  plugins: [react(), { name: 'public-curriculum-boundary', generateBundle(_options, bundle) {
    const privateModules = ['/App.tsx', '/components/CourseView.tsx', '/components/FinalStages.tsx', '/components/ProfileView.tsx', '/components/ProfilePdfActions.tsx', '/services/profilePdf.ts', '/components/LessonMedia.tsx', '/data/course.ts', '/data/assessments.ts', '/services/progress.ts', '/services/profile.ts', '/services/assessments.ts'];
    for (const output of Object.values(bundle)) if (output.type === 'chunk') for (const id of Object.keys(output.modules)) if (privateModules.some(path => id.endsWith(path))) this.error('Paid curriculum reached public bundle: ' + id);
  } } as Plugin],
  base: env.VITE_BASE_PATH || './',
  build: { outDir: 'dist' },
});
});
