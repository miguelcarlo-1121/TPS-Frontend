import { Routes, Route, Outlet } from "react-router-dom";
import Home from "./Client/ClientDashboard";
import SignIn from "./SignIn/SignIn";
import Services from "./Services/Services";
import BookSession from "./BookSession/BookSession";
import DateTime from "./BookSession/DateTime";
import UserInfo from "./BookSession/UserInfo";
import ReviewAndPay from "./BookSession/ReviewAndPay";
import Approval from "./BookSession/Approval";
import Consent from "./BookSession/Consent";
import Confirmation from "./BookSession/Confirmation";
import { BookingProvider } from "./BookSession/bookingContext";
import MyAppointments from "./MyAppointments/MyAppointments";
import Contact from "./Contact/Contact";
import RequireAuth from "./components/RequireAuth";
import AdminDashboard from "./admin/admindashboard";
import AdminAppointment from "./admin/adminappointment";
import AdminPayment from "./admin/adminpay";
import AdminBackup from "./admin/adminbackup";
import AdminPaymentMethod from "./admin/adminpaymentmethod";
import AdminSchedule from "./admin/adminschedule";
import AdminAccounts from "./admin/adminaccounts";
import AdminServices from "./admin/adminservices";
import AdminClient from "./admin/adminclient";
import AdminHome from "./admin/adminhome";
import AdminActivityLogs from "./admin/adminactivitylogs";
import AffiliateDashboard from "./affiliate/affiliatedashboard";
import AffiliateAppointment from "./affiliate/affiliateappointment";
import AffiliateSchedule from "./affiliate/affiliateschedule";
import AffiliatePayment from "./affiliate/affiliatepayment";
import Profile from "./pages/Profile";
import HoldExpiryModal from "./BookSession/HoldExpiryModal";
import AdminMessages from "./admin/adminmessages";
import About from "./About/About";
import Paybalance from "./Paybalance/Paybalance";
const ClientArea = ({ children }) => (
  <RequireAuth roles={["CLIENT", "ADMIN"]}>{children}</RequireAuth>
);
const AdminOnly = ({ children }) => (
  <RequireAuth roles={["ADMIN"]}>{children}</RequireAuth>
);
const AffiliateOnly = ({ children }) => (
  <RequireAuth roles={["AFFILIATE", "ADMIN"]}>{children}</RequireAuth>
);

// Iisang BookingProvider para sa lahat ng /book/* steps (shared ang state)
function BookingLayout() {
  return (
    <ClientArea>
      <BookingProvider>
        <Outlet />
        <HoldExpiryModal />
      </BookingProvider>
    </ClientArea>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<Services />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/about" element={<About />} />
      <Route path="/appointments/balance" element={<ClientArea><Paybalance /></ClientArea>} />
      <Route path="/appointments/balance/:id" element={<ClientArea><Paybalance /></ClientArea>} />
      {/* Booking flow (CLIENT, or ADMIN for preview) — naka-wrap sa BookingProvider */}
      <Route element={<BookingLayout />}>
        <Route path="/book" element={<BookSession />} />
        <Route path="/book/date-time" element={<DateTime />} />
        <Route path="/book/info" element={<UserInfo />} />
        <Route path="/book/review" element={<ReviewAndPay />} />
        <Route path="/book/approval" element={<Approval />} />
        <Route path="/book/consent" element={<Consent />} />
        <Route path="/book/confirmation" element={<Confirmation />} />
      </Route>

      {/* My appointments (CLIENT, or ADMIN for preview) */}
      <Route path="/appointments" element={<ClientArea><MyAppointments /></ClientArea>} />

      {/* Contact page (signed-in users only). Path is case-insensitive in v6. */}
      <Route
        path="/contact"
        element={
          <RequireAuth>
            <Contact />
          </RequireAuth>
        }
      />

      {/* Profile — all signed-in roles (CLIENT, AFFILIATE, ADMIN) */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />

      {/* ADMIN */}
      <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
      <Route path="/admin/appointment" element={<AdminOnly><AdminAppointment /></AdminOnly>} />
      <Route path="/admin/payment" element={<AdminOnly><AdminPayment /></AdminOnly>} />
      <Route path="/admin/backup" element={<AdminOnly><AdminBackup /></AdminOnly>} />
      <Route path="/admin/payment-method" element={<AdminOnly><AdminPaymentMethod /></AdminOnly>} />
      <Route path="/admin/schedule" element={<AdminOnly><AdminSchedule /></AdminOnly>} />
      <Route path="/admin/accounts" element={<AdminOnly><AdminAccounts /></AdminOnly>} />
      <Route path="/admin/services" element={<AdminOnly><AdminServices /></AdminOnly>} />
      <Route path="/admin/client" element={<AdminOnly><AdminClient /></AdminOnly>} />
      <Route path="/admin/home" element={<AdminOnly><AdminHome /></AdminOnly>} />
      <Route path="/admin/messages" element={<AdminOnly><AdminMessages /></AdminOnly>} />
      <Route path="/admin/activity-logs" element={<AdminOnly><AdminActivityLogs /></AdminOnly>} />
      <Route path="/admin/activitylogs" element={<AdminOnly><AdminActivityLogs /></AdminOnly>} />
      {/* AFFILIATE */}
      <Route path="/affiliate" element={<AffiliateOnly><AffiliateDashboard /></AffiliateOnly>} />
      <Route path="/affiliate/appointment" element={<AffiliateOnly><AffiliateAppointment /></AffiliateOnly>} />
      <Route path="/affiliate/schedules" element={<AffiliateOnly><AffiliateSchedule /></AffiliateOnly>} />
      <Route path="/affiliate/payment" element={<AffiliateOnly><AffiliatePayment /></AffiliateOnly>} />
    </Routes>
  );
}