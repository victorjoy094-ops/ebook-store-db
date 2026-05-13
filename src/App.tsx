/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { Home } from "./pages/Home";
import { BookDetails } from "./pages/BookDetails";
import { Store } from "./pages/Store";
import { Subscriptions } from "./pages/Subscriptions";
import { PurchaseSuccess } from "./pages/PurchaseSuccess";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { PublisherPortal } from "./pages/PublisherPortal";
import AuthorProfile from "./pages/AuthorProfile";
import About from "./pages/About";
import Contact from "./pages/Contact";
import { TermsAndPrivacy } from "./pages/TermsAndPrivacy";
import Journals from "./pages/Journals";
import JournalDetail from "./pages/JournalDetail";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import { OnboardingModal } from "./components/auth/OnboardingModal";

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <OnboardingModal />
          <Toaster position="bottom-right" />
          <div className="min-h-screen bg-[#F5F5F0] font-sans text-[#141414] selection:bg-orange-200">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/store" element={<Store />} />
                <Route path="/book/:id" element={<BookDetails />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/payment-success" element={<PurchaseSuccess />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/publish" element={<PublisherPortal />} />
                <Route path="/author/:id" element={<AuthorProfile />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms-privacy" element={<TermsAndPrivacy />} />
                <Route path="/journals" element={<Journals />} />
                <Route path="/journal/:id" element={<JournalDetail />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

