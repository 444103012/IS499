/**
 * ProtectedRoute.jsx - Route Guard for Authenticated Store Owners
 * ---------------------------------------------------------------
 * EN: IS498 SO-002 Login: after login, owner is redirected to dashboard. This component ensures
 *     only logged-in store owners can see /dashboard. It checks localStorage for the token
 *     (saved by Login/Register). No token → redirect to /login. Has token → render children (dashboard).
 * AR: IS498 تسجيل الدخول: بعد الدخول يُحوّل التاجر للوحة التحكم. هذا المكوّن يضمن أن فقط التاجر
 *     المسجل يدخل لوحة التحكم. يتحقق من وجود الرمز في localStorage (يحفظه تسجيل الدخول/التسجيل).
 *     لا رمز → تحويل إلى /login. وجود رمز → عرض المحتوى (لوحة التحكم).
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// EN: Key used in localStorage where we store the JWT after login/register (same as backend expects in Authorization header).
// AR: المفتاح في localStorage الذي نخزن فيه JWT بعد تسجيل الدخول/التسجيل (نفس ما يتوقعه الخادم في رأس Authorization).
const TOKEN_KEY = 'token';

/**
 * EN: If no token, redirect to /login and pass current location in state (so we could redirect back after login).
 *     If token exists, render the protected content (e.g. StoreOwnerDashboardLayout).
 * AR: إن لم يوجد رمز، تحويل إلى /login مع حفظ الموقع في state (لإمكانية العودة بعد تسجيل الدخول).
 *     إن وُجد الرمز، عرض المحتوى المحمي (مثل لوحة تحكم التاجر).
 */
const ProtectedRoute = ({ children }) => {
  // EN: useLocation() gives us the current URL (e.g. /dashboard) so we can save it in Navigate state.
  // AR: useLocation() يعطينا الرابط الحالي (مثل /dashboard) لحفظه في state عند التحويل.
  const location = useLocation();
  // EN: Read the token that was stored when the user logged in or registered (Login/Register pages set it).
  // AR: قراءة الرمز المخزن عند تسجيل الدخول أو التسجيل (صفحات تسجيل الدخول والتسجيل تحفظانه).
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    // EN: Replace current history entry with /login so back button doesn't return to dashboard.
    // AR: استبدال السجل الحالي في السجل بـ /login حتى زر الرجوع لا يعيد للوحة التحكم.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // EN: User has a token (we don't verify it here; backend will on API calls). Show the protected page.
  // AR: المستخدم لديه رمز (لا نتحقق منه هنا؛ الخادم يتحقق عند استدعاءات API). عرض الصفحة المحمية.
  return children;
};

export default ProtectedRoute;
