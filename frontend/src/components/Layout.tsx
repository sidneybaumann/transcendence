import type { ReactNode } from "react";
import Navbar from "./NavBar";
import Footer from "./Footer";

type Props = {
  children: ReactNode;
};

const Layout = ({ children }: Props) => {
  return (
    <div className="min-h-screen flex flex-col p-6 font-sans">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full p-4">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
