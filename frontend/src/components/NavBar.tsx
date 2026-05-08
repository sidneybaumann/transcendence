import { NavLink, useNavigate } from "react-router-dom";
import Snake from "../assets/Snake.png";
import { useAuth } from "../context/AuthContext";

const NavBar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    const success = await logout();

    if (success) {
      navigate("/");
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center justify-center px-3 py-2 rounded-md text-sm sm:text-base transition-colors duration-200 ${
      isActive ? "bg-black text-white" : "hover:bg-gray-200 text-black"
    }`;

  return (
    <nav className="px-4 py-3 sm:px-6 sm:py-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-center md:justify-start gap-3 min-w-0">
          <NavLink to="/" className="shrink-0">
            <img
              src={Snake}
              alt="Snake"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shadow-gray-200 shadow-lg"
            />
          </NavLink>
          <span className="text-2xl sm:text-3xl md:text-4xl font-semibold truncate">
            Snake42
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-3">
          <NavLink to="/play" className={navLinkClass}>
            Play
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to="/settings" className={navLinkClass}>
                Settings
              </NavLink>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center px-3 py-2 rounded-md text-sm sm:text-base transition-colors duration-200 hover:bg-gray-200"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Log in
              </NavLink>

              <NavLink to="/register" className={navLinkClass}>
                Register
              </NavLink>
            </>
          )}

          <button
            type="button"
            aria-label={
              isAuthenticated
                ? "Authenticated status: logged in"
                : "Authenticated status: logged out"
            }
            className={`relative shrink-0 w-10 h-6 rounded-full transition-colors duration-300 ${
              isAuthenticated ? "bg-green-500" : "bg-red-500"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                isAuthenticated ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
