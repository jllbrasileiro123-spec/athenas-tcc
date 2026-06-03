import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { InstructorRoute } from './components/InstructorRoute'
import { Login } from './pages/Login'

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const CourseDetail = lazy(() => import('./pages/CourseDetail').then((m) => ({ default: m.CourseDetail })))
const MyCourses = lazy(() => import('./pages/MyCourses').then((m) => ({ default: m.MyCourses })))
const InstructorDashboard = lazy(() =>
  import('./pages/InstructorDashboard').then((m) => ({ default: m.InstructorDashboard }))
)
const CreateCourse = lazy(() => import('./pages/CreateCourse').then((m) => ({ default: m.CreateCourse })))
const LessonPlayer = lazy(() => import('./pages/LessonPlayer').then((m) => ({ default: m.LessonPlayer })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })))
const ChangePassword = lazy(() => import('./pages/ChangePassword').then((m) => ({ default: m.ChangePassword })))

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="h-8 w-8 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
    </div>
  )
}

function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Login openSignup />} />
        <Route path="/esqueci-senha" element={<ForgotPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route element={<AuthenticatedLayout />}>
          <Route path="explorar" element={<Home />} />
          <Route path="curso/:id" element={<CourseDetail />} />
          <Route path="meus-cursos" element={<MyCourses />} />
          <Route path="alterar-senha" element={<ChangePassword />} />
          <Route
            path="instrutor"
            element={
              <InstructorRoute>
                <InstructorDashboard />
              </InstructorRoute>
            }
          />
          <Route
            path="instrutor/novo-curso"
            element={
              <InstructorRoute>
                <CreateCourse />
              </InstructorRoute>
            }
          />
          <Route path="assistir/:courseId/:lessonId" element={<LessonPlayer />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
