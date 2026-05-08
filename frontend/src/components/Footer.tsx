import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <span>©2026 Snake42</span>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end sm:gap-6">
          <Link to="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:underline">
            Terms of Use
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
