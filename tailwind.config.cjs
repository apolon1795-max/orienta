module.exports = { content: ["./index.html", "./App.tsx", "./components/**/*.{ts,tsx}"], ...{
        theme: {
          extend: {
            fontFamily: {
              serif: ['Cinzel', 'Georgia', 'serif'],
              sans: ['Inter', 'Arial', 'sans-serif'],
            },
            colors: {
              fantasy: {
                dark: '#0f172a',
                purple: '#3b0764',
                gold: '#fbbf24',
                accent: '#8b5cf6'
              }
            },
            animation: {
              'fade-in': 'fadeIn 0.5s ease-out forwards',
              'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
              'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
              fadeIn: {
                '0%': { opacity: '0', transform: 'translateY(10px)' },
                '100%': { opacity: '1', transform: 'translateY(0)' },
              },
              fadeInUp: {
                 '0%': { opacity: '0', transform: 'translateY(20px)' },
                 '100%': { opacity: '1', transform: 'translateY(0)' },
              },
              float: {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-20px)' },
              }
            }
          }
        }
      } };
