import GameScreen from "../assets/Snake42.jpeg";
import { NavLink } from "react-router-dom";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <img
        src={GameScreen}
        alt="Snake game preview"
        className="mb-6 w-full max-w-sm rounded-lg shadow"
      />  

      <div className="w-full max-w-2xl space-y-6 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Welcome to Snake42</h1>

        <p className="text-lg text-gray-600">A modern take on the classic Snake game.</p>

        <p className="text-gray-700">
          This project was developed as part of our final curriculum at 42Lausanne. It combines
          gameplay, authentication, and security features such as OAuth, Two-Factor Authentication,
          and GDPR-compliant user management. Metrics and log management were also implemented
          through ELK and Grafana/Prometheus.
        </p>
        <p className="text-gray-700">Hope you enjoy the game!</p>

        <div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row sm:gap-4">
          <NavLink
            to="/login"
            className="rounded-lg bg-black px-6 py-3 text-white transition hover:bg-gray-800"
          >
            Login
          </NavLink>

          <NavLink
            to="/register"
            className="rounded-lg border border-gray-300 px-6 py-3 transition hover:bg-gray-100"
          >
            Sign up
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Home;
