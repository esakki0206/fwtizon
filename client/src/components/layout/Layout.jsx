import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileNav from './MobileNav';

const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen relative">
      <Navbar />
      <main className="flex-grow pt-16 pb-32 md:pb-0">
        <Outlet />
      </main>
      <div className="mb-32 md:mb-0">
        <Footer />
      </div>
      <MobileNav />
    </div>
  );
};

export default Layout;
