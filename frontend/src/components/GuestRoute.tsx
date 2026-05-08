import { Navigate, Outlet } from "react-router-dom";

type Props = {
  isAuthenticated: boolean;
};

const GuestRoute = ({ isAuthenticated }: Props) => {
  if (isAuthenticated) {
    return <Navigate to="/play" replace />;
  }

  return <Outlet />;
};

export default GuestRoute;