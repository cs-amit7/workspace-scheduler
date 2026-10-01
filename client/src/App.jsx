import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Smart Workspace Scheduler
      </h1>
      <p className="mt-3 text-base text-slate-600 max-w-md">
        Browse and book rooms and desks seamlessly. Foundation ready.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
