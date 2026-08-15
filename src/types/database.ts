export type UserRole = 'student' | 'instructor' | 'admin'
export type CourseLevel = 'iniciante' | 'intermediario' | 'avancado'
export type InstructorApplicationStatus = 'pending' | 'approved' | 'rejected'
export type CourseReviewStatus = 'draft' | 'pending_review' | 'approved' | 'rejected'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: UserRole
  created_at: string
}

export interface InstructorApplication {
  id: string
  user_id: string
  expertise: string
  bio: string
  portfolio_url: string | null
  status: InstructorApplicationStatus
  admin_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Course {
  id: string
  instructor_id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  price: number
  level: CourseLevel
  published: boolean
  review_status?: CourseReviewStatus
  review_note?: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
  lessons?: Lesson[] | { id: string }[]
  lesson_count?: number
}

export type LessonContentType = 'lesson' | 'quiz' | 'simulado'

export interface Lesson {
  id: string
  course_id: string
  title: string
  description: string | null
  video_url: string | null
  duration_minutes: number
  sort_order: number
  is_preview: boolean
  content_type?: LessonContentType
  xp_reward?: number
  created_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  completed: boolean
  completed_at: string | null
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Profile>
      }
      courses: {
        Row: Course
        Insert: {
          instructor_id: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          price?: number
          level?: CourseLevel
          published?: boolean
        }
        Update: Partial<Course>
      }
      lessons: {
        Row: Lesson
        Insert: {
          course_id: string
          title: string
          description?: string | null
          video_url?: string | null
          duration_minutes?: number
          sort_order?: number
          is_preview?: boolean
          content_type?: LessonContentType
          xp_reward?: number
        }
        Update: Partial<Lesson>
      }
      enrollments: {
        Row: Enrollment
        Insert: { user_id: string; course_id: string }
        Update: Partial<Enrollment>
      }
      lesson_progress: {
        Row: LessonProgress
        Insert: {
          user_id: string
          lesson_id: string
          completed?: boolean
          completed_at?: string | null
        }
        Update: Partial<LessonProgress>
      }
    }
  }
}
