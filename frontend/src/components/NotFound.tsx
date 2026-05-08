import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center gap-6">

      <p className="text-4xl text-gray-500 font-mono">Oopsy doopsy...</p>

      <h1 className="text-6xl font-bold">404</h1>

      <p className="text-lg text-gray-500">Page not found</p>

      <button
        onClick={() => navigate("/")}
        className="px-6 py-2 rounded-2xl bg-black text-white hover:bg-gray-800 transition"
      >
        Go Home
      </button>
    </div>
  );
}
