import React from 'react';
import AppRouter from './routes/AppRouter';

function App() {
  return (
    <div className="bg-gray-100 min-h-screen flex justify-center items-center font-sans selection:bg-amber-100">
      <div className="w-full max-w-md h-[100dvh] bg-white relative overflow-hidden shadow-2xl flex flex-col sm:rounded-[2rem] sm:h-[90dvh] sm:border-8 sm:border-slate-900 ring-4 ring-slate-900/10">
        <AppRouter />
      </div>
    </div>
  );
}

export default App;