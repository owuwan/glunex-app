import React from 'react';
import AppRouter from './routes/AppRouter';
import ResponsiveLayout from './components/layout/ResponsiveLayout';

function App() {
  return (
    /* App.jsx에서는 프레임을 제거하고 레이아웃 스위처만 연결합니다.
       선택 영역 배경색(selection:bg-amber-100)은 유지했습니다. */
    <div className="selection:bg-amber-100">
      <ResponsiveLayout>
        <AppRouter />
      </ResponsiveLayout>
    </div>
  );
}

export default App;