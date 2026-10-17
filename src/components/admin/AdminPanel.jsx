import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpenCheck,
  Settings,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  LogOut,
  Sun,
  Moon,
  ExternalLink,
  Shield,
  Calendar,
  Clock,
  Video,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Flame,
  Download,
  Upload,
  Image as ImageIcon,
  Copy,
  Check,
} from 'lucide-react';
import './AdminPanel.css';
import { IndividualCourseWorkspace } from './IndividualCourseWorkspace';

export const AdminPanel = ({
  user,
  onLogout,
  onExitToSite,
  theme,
  onToggleTheme,
  onCourseUpdated,
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [managingCourseId, setManagingCourseId] = useState(null);

  // Dashboard Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDetailsLoading, setSelectedUserDetailsLoading] = useState(false);
  const [exportingUsers, setExportingUsers] = useState(false);

  // Courses State
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);
  const [selectedCourseDetails, setSelectedCourseDetails] = useState(null);
  const [courseDetailsLoading, setCourseDetailsLoading] = useState(false);
  const courseFileInputRef = useRef(null);

  // Enrollments State
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [enrollmentCourseFilter, setEnrollmentCourseFilter] = useState('all');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('all');
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [enrollmentPagination, setEnrollmentPagination] = useState({ total: 0, totalPages: 1 });
  const [exportingEnrollments, setExportingEnrollments] = useState(false);

  // Live Classes State
  const [liveClasses, setLiveClasses] = useState([]);
  const [liveClassesLoading, setLiveClassesLoading] = useState(false);
  const [isLiveClassModalOpen, setIsLiveClassModalOpen] = useState(false);
  const [editingLiveClass, setEditingLiveClass] = useState(null);
  const [savingLiveClass, setSavingLiveClass] = useState(false);
  const [copiedMeetId, setCopiedMeetId] = useState(null);

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    batchName: 'November',
    seatsAvailable: 15,
    showSeatCount: false,
    announcementText: 'November Batch — Limited Seats Available',
    contactPhone: '8799026206',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Admin Profile State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'TradeMax Administrator',
    email: user?.email || 'admin@trademaxclub.in',
    newPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Helper for auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('tm_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard/stats', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        showNotification(data.error || 'Failed to load statistics.', 'error');
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      showNotification('Network error loading dashboard statistics.', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Fetch Users
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        search: userSearch,
        status: userStatusFilter,
        page: userPage,
        limit: 10,
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setUserPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // 3. Fetch Courses
  const fetchCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await fetch('/api/admin/courses', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setCoursesLoading(false);
    }
  };

  // 4. Fetch Enrollments
  const fetchEnrollments = async () => {
    setEnrollmentsLoading(true);
    try {
      const params = new URLSearchParams({
        search: enrollmentSearch,
        courseId: enrollmentCourseFilter,
        status: enrollmentStatusFilter,
        page: enrollmentPage,
        limit: 10,
      });
      const res = await fetch(`/api/admin/enrollments?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setEnrollments(data.enrollments || []);
        setEnrollmentPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  // 5. Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettingsForm({
          batchName: data.settings.batchName || 'November',
          seatsAvailable: data.settings.seatsAvailable || 15,
          showSeatCount: Boolean(data.settings.showSeatCount),
          announcementText: data.settings.announcementText || 'November Batch — Limited Seats Available',
          contactPhone: data.settings.contactPhone || '8799026206',
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  // Load appropriate data on tab change
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'courses') {
      fetchCourses();
    } else if (activeTab === 'live-classes') {
      fetchLiveClasses();
      fetchCourses();
    } else if (activeTab === 'enrollments') {
      fetchEnrollments();
      fetchCourses(); // for course filter dropdown
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab]);

  // Debounced search for users
  useEffect(() => {
    if (activeTab === 'users') {
      const timer = setTimeout(() => {
        fetchUsers();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [userSearch, userStatusFilter, userPage]);

  // Debounced search for enrollments
  useEffect(() => {
    if (activeTab === 'enrollments') {
      const timer = setTimeout(() => {
        fetchEnrollments();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [enrollmentSearch, enrollmentCourseFilter, enrollmentStatusFilter, enrollmentPage]);

  // View User Profile & Enrolled Courses
  const handleOpenUserDetails = async (userId) => {
    setSelectedUserDetailsLoading(true);
    setSelectedUser(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedUser(data);
      } else {
        showNotification(data.error || 'User not found.', 'error');
      }
    } catch {
      showNotification('Failed to load user details.', 'error');
    } finally {
      setSelectedUserDetailsLoading(false);
    }
  };

  // Toggle User Status
  const handleToggleUserStatus = async (userItem) => {
    const nextStatus = userItem.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${userItem.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`User marked as ${nextStatus}.`);
        fetchUsers();
        if (selectedUser?.user?.id === userItem.id) {
          setSelectedUser((prev) => ({
            ...prev,
            user: { ...prev.user, status: nextStatus },
          }));
        }
      } else {
        showNotification(data.error || 'Failed to update status.', 'error');
      }
    } catch {
      showNotification('Error updating user status.', 'error');
    }
  };

  // View Course Details & Enrolled Students
  const handleOpenCourseDetails = async (courseId) => {
    setCourseDetailsLoading(true);
    setSelectedCourseDetails(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCourseDetails(data);
      } else {
        showNotification(data.error || 'Course not found.', 'error');
      }
    } catch {
      showNotification('Failed to load course details.', 'error');
    } finally {
      setCourseDetailsLoading(false);
    }
  };

  // Export Registered Users as formatted CSV/Excel
  const handleExportUsers = async () => {
    try {
      setExportingUsers(true);
      const res = await fetch('/api/admin/users/export', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error('Failed to download user report');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TradeMax_Registered_Users_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('User spreadsheet downloaded successfully.', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showNotification('Failed to download user spreadsheet.', 'error');
    } finally {
      setExportingUsers(false);
    }
  };

  // Export Course Enrollments as formatted CSV/Excel
  const handleExportEnrollments = async () => {
    try {
      setExportingEnrollments(true);
      const res = await fetch('/api/admin/enrollments/export', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error('Failed to download enrollments report');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TradeMax_Enrollments_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('Enrollments spreadsheet downloaded successfully.', 'success');
    } catch (err) {
      console.error('Export enrollments error:', err);
      showNotification('Failed to download enrollments spreadsheet.', 'error');
    } finally {
      setExportingEnrollments(false);
    }
  };

  // Thumbnail File Upload Handler
  const handleThumbnailFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image size exceeds 5MB limit. Please choose a smaller image.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditingCourse((prev) => ({
        ...prev,
        thumbnail: reader.result,
      }));
      showNotification('Image preview updated. Click Save Changes to apply.', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Toggle Course Publish
  const handleTogglePublishCourse = async (courseItem) => {
    try {
      const res = await fetch(`/api/admin/courses/${courseItem.id}/publish`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_published: !courseItem.is_published }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        await fetchCourses();
        if (onCourseUpdated) {
          onCourseUpdated(data.course);
        }
      } else {
        showNotification(data.error || 'Failed to toggle status.', 'error');
      }
    } catch {
      showNotification('Error updating course publish state.', 'error');
    }
  };

  // Delete Course
  const handleDeleteCourse = async (courseItem) => {
    if (!window.confirm(`Are you sure you want to delete course "${courseItem.title}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/courses/${courseItem.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        await fetchCourses();
        if (onCourseUpdated) {
          onCourseUpdated(null);
        }
      } else {
        showNotification(data.error || 'Failed to delete course.', 'error');
      }
    } catch {
      showNotification('Error deleting course.', 'error');
    }
  };

  // Save Course (Create / Edit) with DB synchronization
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse?.title?.trim()) {
      showNotification('Course title is required.', 'error');
      return;
    }
    const priceNum = parseFloat(editingCourse.price);
    if (isNaN(priceNum) || priceNum < 0) {
      showNotification('Please enter a valid offer price.', 'error');
      return;
    }
    const originalPriceNum = parseFloat(editingCourse.original_price);
    if (isNaN(originalPriceNum) || originalPriceNum < 0) {
      showNotification('Please enter a valid original price.', 'error');
      return;
    }

    setSavingCourse(true);
    const isEdit = Boolean(editingCourse?.id);
    const endpoint = isEdit ? `/api/admin/courses/${editingCourse.id}` : '/api/admin/courses';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...editingCourse,
          price: priceNum,
          original_price: originalPriceNum,
          seats_available: parseInt(editingCourse.seats_available, 10) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Course updated successfully.', 'success');
        setIsCourseModalOpen(false);
        setEditingCourse(null);
        await fetchCourses();
        if (onCourseUpdated) {
          onCourseUpdated(data.course);
        }
      } else {
        showNotification(data.error || 'Failed to save course.', 'error');
      }
    } catch (err) {
      console.error('Save course error:', err);
      showNotification('Error saving course changes.', 'error');
    } finally {
      setSavingCourse(false);
    }
  };

  // Update Enrollment Status
  const handleUpdateEnrollmentStatus = async (enrollmentId, field, value) => {
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Enrollment record updated.');
        fetchEnrollments();
      } else {
        showNotification(data.error || 'Failed to update record.', 'error');
      }
    } catch {
      showNotification('Error updating enrollment.', 'error');
    }
  };

  // Delete Enrollment
  const handleDeleteEnrollment = async (enrollmentItem) => {
    if (!window.confirm(`Delete enrollment for ${enrollmentItem.name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentItem.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchEnrollments();
      } else {
        showNotification(data.error || 'Failed to delete enrollment.', 'error');
      }
    } catch {
      showNotification('Error deleting enrollment.', 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Platform & batch settings updated successfully.');
      } else {
        showNotification(data.error || 'Failed to save settings.', 'error');
      }
    } catch {
      showNotification('Error saving settings.', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Save Admin Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Administrator profile updated successfully.');
        setProfileForm((prev) => ({ ...prev, newPassword: '' }));
      } else {
        showNotification(data.error || 'Failed to update profile.', 'error');
      }
    } catch {
      showNotification('Error updating profile.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // 6. Fetch Live Classes (Google Meet Sessions)
  const fetchLiveClasses = async () => {
    setLiveClassesLoading(true);
    try {
      const res = await fetch('/api/admin/live-classes', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setLiveClasses(data.liveClasses || []);
      } else {
        showNotification(data.error || 'Failed to fetch live classes.', 'error');
      }
    } catch (err) {
      console.error('Error fetching live classes:', err);
      showNotification('Network error loading live classes.', 'error');
    } finally {
      setLiveClassesLoading(false);
    }
  };

  // Open modal for new Live Class
  const handleOpenCreateLiveClass = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);

    setEditingLiveClass({
      title: '',
      course_id: courses.length > 0 ? courses[0].id : '',
      batch_name: 'November',
      scheduled_at: localISOTime,
      duration_minutes: 75,
      meeting_link: '',
      platform: 'Google Meet',
      instructor: 'Patil Trader',
      status: 'upcoming',
      description: '',
    });
    setIsLiveClassModalOpen(true);
  };

  // Open modal for editing existing Live Class
  const handleOpenEditLiveClass = (session) => {
    let formattedDate = '';
    if (session.scheduled_at) {
      const d = new Date(session.scheduled_at);
      const tzOffset = d.getTimezoneOffset() * 60000;
      formattedDate = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    }

    setEditingLiveClass({
      id: session.id,
      title: session.title || '',
      course_id: session.course_id || (courses.length > 0 ? courses[0].id : ''),
      batch_name: session.batch_name || 'November',
      scheduled_at: formattedDate,
      duration_minutes: session.duration_minutes || 75,
      meeting_link: session.meeting_link || '',
      platform: session.platform || 'Google Meet',
      instructor: session.instructor || 'Patil Trader',
      status: session.status || 'upcoming',
      description: session.description || '',
    });
    setIsLiveClassModalOpen(true);
  };

  // Save (Create or Update) Live Class
  const handleSaveLiveClass = async (e) => {
    e.preventDefault();
    if (!editingLiveClass.title.trim()) {
      showNotification('Please enter a meeting title.', 'error');
      return;
    }
    if (!editingLiveClass.scheduled_at) {
      showNotification('Please select a scheduled date and time.', 'error');
      return;
    }

    setSavingLiveClass(true);
    try {
      const url = editingLiveClass.id
        ? `/api/admin/live-classes/${editingLiveClass.id}`
        : '/api/admin/live-classes';
      const method = editingLiveClass.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editingLiveClass),
      });

      const data = await res.json();
      if (data.success) {
        showNotification(
          editingLiveClass.id ? 'Live class updated successfully!' : 'Live class scheduled successfully!'
        );
        setIsLiveClassModalOpen(false);
        setEditingLiveClass(null);
        fetchLiveClasses();
      } else {
        showNotification(data.error || 'Failed to save live class.', 'error');
      }
    } catch (err) {
      console.error('Error saving live class:', err);
      showNotification('Network error while saving live class.', 'error');
    } finally {
      setSavingLiveClass(false);
    }
  };

  // Delete Live Class
  const handleDeleteLiveClass = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the scheduled class "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/live-classes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Live class deleted.');
        fetchLiveClasses();
      } else {
        showNotification(data.error || 'Failed to delete live class.', 'error');
      }
    } catch (err) {
      console.error('Error deleting live class:', err);
      showNotification('Network error while deleting live class.', 'error');
    }
  };

  // Copy Meeting Link to clipboard
  const handleCopyMeetLink = (link, id) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedMeetId(id);
    showNotification('Google Meet link copied to clipboard!');
    setTimeout(() => setCopiedMeetId(null), 2500);
  };

  return (
    <div className={`tm-admin-root tm-theme-${theme || 'dark'}`}>
      {/* Toast Notification */}
      {notification && (
        <div className={`tm-admin-toast ${notification.type}`}>
          {notification.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle size={18} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Responsive Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="tm-admin-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ------------------------------------------------------------------
          1. PROFESSIONAL SIDEBAR
          ------------------------------------------------------------------ */}
      <aside className={`tm-admin-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="tm-admin-sidebar-header">
          <div className="tm-admin-brand">
            <span className="tm-admin-logo-text">TRADE<span className="tm-red">MAX</span></span>
            <span className="tm-admin-badge">ADMIN</span>
          </div>
          <button
            type="button"
            className="tm-admin-close-sidebar-btn"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="tm-admin-nav" aria-label="Admin Navigation">
          <button
            type="button"
            className={`tm-admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              setMobileSidebarOpen(false);
            }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`tm-admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users');
              setMobileSidebarOpen(false);
            }}
          >
            <Users size={18} />
            <span>Users Management</span>
          </button>

          <button
            type="button"
            className={`tm-admin-nav-item ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('courses');
              setMobileSidebarOpen(false);
            }}
          >
            <GraduationCap size={18} />
            <span>Courses Management</span>
          </button>

          <button
            type="button"
            className={`tm-admin-nav-item ${activeTab === 'live-classes' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('live-classes');
              setMobileSidebarOpen(false);
            }}
          >
            <Video size={18} />
            <span>Live Classes</span>
          </button>

          <button
            type="button"
            className={`tm-admin-nav-item ${activeTab === 'enrollments' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('enrollments');
              setMobileSidebarOpen(false);
            }}
          >
            <BookOpenCheck size={18} />
            <span>Enrollments</span>
          </button>

          <button
            type="button"
            className={`tm-admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('settings');
              setMobileSidebarOpen(false);
            }}
          >
            <Settings size={18} />
            <span>Platform Settings</span>
          </button>
        </nav>

        <div className="tm-admin-sidebar-footer">
          {/* Day / Night Theme Toggle */}
          <button
            type="button"
            className="tm-admin-theme-btn"
            onClick={onToggleTheme}
            title="Toggle color theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Day Mode' : 'Night Mode'}</span>
          </button>

          {/* Quick Return to Public Site */}
          <button
            type="button"
            className="tm-admin-exit-btn"
            onClick={onExitToSite}
            title="View live website"
          >
            <ExternalLink size={16} />
            <span>View Public Site</span>
          </button>

          {/* Admin User Info & Logout */}
          <div className="tm-admin-user-card">
            <div className="tm-admin-avatar">
              <Shield size={16} />
            </div>
            <div className="tm-admin-user-meta">
              <span className="tm-admin-user-name">{user?.name || 'Administrator'}</span>
              <span className="tm-admin-user-role">Super Admin</span>
            </div>
            <button
              type="button"
              className="tm-admin-logout-btn"
              onClick={onLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------------
          2. MAIN CONTENT AREA
          ------------------------------------------------------------------ */}
      <main className="tm-admin-main">
        {/* Top Navbar Header */}
        <header className="tm-admin-topbar">
          <div className="tm-admin-topbar-left">
            <button
              type="button"
              className="tm-admin-menu-toggle"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
            <span className="tm-admin-topbar-brand">TRADEMAX ADMIN</span>
          </div>

          <div className="tm-admin-topbar-right">
            {onToggleTheme && (
              <button
                type="button"
                className="tm-admin-theme-btn"
                onClick={onToggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Day' : 'Night'} Mode`}
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun size={15} className="tm-admin-theme-icon" />
                    <span className="tm-admin-theme-label">Day Mode</span>
                  </>
                ) : (
                  <>
                    <Moon size={15} className="tm-admin-theme-icon" />
                    <span className="tm-admin-theme-label">Night Mode</span>
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="tm-admin-content-body">
          {/* ==============================================================
              PAGE 1: DASHBOARD
              ============================================================== */}
          {activeTab === 'dashboard' && (
            <div className="tm-admin-dashboard-page">
              {statsLoading ? (
                <div className="tm-admin-loading-state">
                  <RefreshCw size={24} className="spin" />
                  <span>Loading dashboard statistics...</span>
                </div>
              ) : (
                <>
                  {/* Top Stats 4-Card Grid */}
                  <div className="tm-admin-stats-grid">
                    <div className="tm-admin-stat-card">
                      <div className="tm-stat-icon-wrap blue">
                        <Users size={22} />
                      </div>
                      <div className="tm-stat-data">
                        <span className="tm-stat-label">Total Users</span>
                        <span className="tm-stat-value">{stats?.totalUsers || 0}</span>
                        <span className="tm-stat-sub">Registered student accounts</span>
                      </div>
                    </div>

                    <div className="tm-admin-stat-card">
                      <div className="tm-stat-icon-wrap amber">
                        <GraduationCap size={22} />
                      </div>
                      <div className="tm-stat-data">
                        <span className="tm-stat-label">Total Courses</span>
                        <span className="tm-stat-value">{stats?.totalCourses || 0}</span>
                        <span className="tm-stat-sub">Institutional programs</span>
                      </div>
                    </div>

                    <div className="tm-admin-stat-card">
                      <div className="tm-stat-icon-wrap red">
                        <BookOpenCheck size={22} />
                      </div>
                      <div className="tm-stat-data">
                        <span className="tm-stat-label">Total Enrollments</span>
                        <span className="tm-stat-value">{stats?.totalEnrollments || 0}</span>
                        <span className="tm-stat-sub">Confirmed registrations</span>
                      </div>
                    </div>

                    <div className="tm-admin-stat-card">
                      <div className="tm-stat-icon-wrap green">
                        <TrendingUp size={22} />
                      </div>
                      <div className="tm-stat-data">
                        <span className="tm-stat-label">Total Revenue</span>
                        <span className="tm-stat-value">
                          ₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="tm-stat-sub">Completed admissions</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Analytics & Popular Programs */}
                  <div className="tm-admin-dual-grid">
                    {/* Popular Courses */}
                    <div className="tm-admin-card">
                      <div className="tm-admin-card-header">
                        <h2 className="tm-admin-card-title">Popular Programs</h2>
                        <button
                          type="button"
                          className="tm-admin-link-action"
                          onClick={() => setActiveTab('courses')}
                        >
                          Manage Courses &rarr;
                        </button>
                      </div>
                      <div className="tm-admin-table-wrap">
                        {stats?.popularCourses?.length === 0 ? (
                          <div className="tm-admin-empty-state">No courses added yet.</div>
                        ) : (
                          <table className="tm-admin-table">
                            <thead>
                              <tr>
                                <th>Course Title</th>
                                <th>Fee</th>
                                <th>Batch</th>
                                <th>Students Enrolled</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats?.popularCourses?.map((c) => (
                                <tr key={c.id}>
                                  <td className="font-semibold">{c.title}</td>
                                  <td>₹{parseFloat(c.price).toLocaleString('en-IN')}</td>
                                  <td>{c.batch_name}</td>
                                  <td>
                                    <span className="tm-badge-count">{c.enrollment_count} students</span>
                                  </td>
                                  <td>
                                    <span className={`tm-status-pill ${c.is_published ? 'active' : 'inactive'}`}>
                                      {c.is_published ? 'Published' : 'Draft'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Recent Users Card */}
                    <div className="tm-admin-card">
                      <div className="tm-admin-card-header">
                        <h2 className="tm-admin-card-title">Recent Registrations</h2>
                        <button
                          type="button"
                          className="tm-admin-link-action"
                          onClick={() => setActiveTab('users')}
                        >
                          View All Users &rarr;
                        </button>
                      </div>
                      <div className="tm-admin-recent-list">
                        {stats?.recentUsers?.length === 0 ? (
                          <div className="tm-admin-empty-state">No registered users yet.</div>
                        ) : (
                          stats?.recentUsers?.map((u) => (
                            <div key={u.id} className="tm-recent-user-item">
                              <div className="tm-recent-avatar">
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="tm-recent-meta">
                                <span className="tm-recent-name">{u.name}</span>
                                <span className="tm-recent-email">{u.email}</span>
                              </div>
                              <button
                                type="button"
                                className="tm-btn-outline-xs"
                                onClick={() => handleOpenUserDetails(u.id)}
                              >
                                Profile
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Enrollments Table */}
                  <div className="tm-admin-card mt-24">
                    <div className="tm-admin-card-header">
                      <h2 className="tm-admin-card-title">Recent Course Enrollments</h2>
                      <button
                        type="button"
                        className="tm-admin-link-action"
                        onClick={() => setActiveTab('enrollments')}
                      >
                        All Enrollments &rarr;
                      </button>
                    </div>
                    <div className="tm-admin-table-wrap">
                      {stats?.recentEnrollments?.length === 0 ? (
                        <div className="tm-admin-empty-state">No enrollments recorded yet.</div>
                      ) : (
                        <table className="tm-admin-table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Course</th>
                              <th>Mobile</th>
                              <th>Batch</th>
                              <th>Date</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats?.recentEnrollments?.map((en) => (
                              <tr key={en.id}>
                                <td>
                                  <div className="font-semibold">{en.name}</div>
                                  <div className="text-muted text-xs">{en.email}</div>
                                </td>
                                <td>{en.course_name}</td>
                                <td>{en.mobile}</td>
                                <td>{en.batch_name}</td>
                                <td>{new Date(en.created_at).toLocaleDateString()}</td>
                                <td>
                                  <span className={`tm-status-pill ${en.enrollment_status}`}>
                                    {en.enrollment_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ==============================================================
              PAGE 2: USERS MANAGEMENT
              ============================================================== */}
          {activeTab === 'users' && (
            <div className="tm-admin-users-page">
              {/* Controls Bar: Search & Status Filter */}
              <div className="tm-admin-filters-bar">
                <div className="tm-search-input-wrap">
                  <Search size={16} className="tm-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or mobile..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="tm-admin-input search"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      className="tm-clear-btn"
                      onClick={() => setUserSearch('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="tm-filter-select-wrap">
                  <select
                    value={userStatusFilter}
                    onChange={(e) => {
                      setUserStatusFilter(e.target.value);
                      setUserPage(1);
                    }}
                    className="tm-admin-select"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Accounts</option>
                    <option value="suspended">Suspended Accounts</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="tm-admin-btn-export"
                  onClick={handleExportUsers}
                  disabled={exportingUsers}
                  title="Download formatted Excel/CSV spreadsheet of all registered users"
                >
                  {exportingUsers ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
                  <span>{exportingUsers ? 'Exporting...' : 'Download Excel Sheet'}</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="tm-admin-card">
                <div className="tm-admin-table-wrap">
                  {usersLoading ? (
                    <div className="tm-admin-loading-state">
                      <RefreshCw size={22} className="spin" />
                      <span>Loading registered users...</span>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="tm-admin-empty-state">No users match your search criteria.</div>
                  ) : (
                    <table className="tm-admin-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Mobile</th>
                          <th>Role</th>
                          <th>Trading Experience</th>
                          <th>Registered Date</th>
                          <th>Enrollments</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <div className="font-semibold">{u.name}</div>
                              <div className="text-muted text-xs">{u.email}</div>
                            </td>
                            <td>{u.mobile || '—'}</td>
                            <td>
                              <span className={`tm-role-pill ${u.role}`}>{u.role}</span>
                            </td>
                            <td>{u.trading_experience || 'Intermediate'}</td>
                            <td>{new Date(u.created_at).toLocaleDateString()}</td>
                            <td>
                              <span className="tm-badge-count">{u.enrollments_count || 0}</span>
                            </td>
                            <td>
                              <span className={`tm-status-pill ${u.status || 'active'}`}>
                                {u.status || 'active'}
                              </span>
                            </td>
                            <td>
                              <div className="tm-actions-flex">
                                <button
                                  type="button"
                                  className="tm-btn-outline-xs"
                                  onClick={() => handleOpenUserDetails(u.id)}
                                  title="View full profile and enrollments"
                                >
                                  <Eye size={13} /> Details
                                </button>
                                {u.role !== 'admin' && (
                                  <button
                                    type="button"
                                    className={`tm-btn-outline-xs ${u.status === 'active' ? 'danger' : 'success'}`}
                                    onClick={() => handleToggleUserStatus(u)}
                                    title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                                  >
                                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                <div className="tm-admin-pagination">
                  <span className="tm-pagination-meta">
                    Showing {users.length} of {userPagination.total} users
                  </span>
                  <div className="tm-pagination-controls">
                    <button
                      type="button"
                      className="tm-btn-page"
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="tm-page-current">
                      Page {userPage} of {userPagination.totalPages || 1}
                    </span>
                    <button
                      type="button"
                      className="tm-btn-page"
                      disabled={userPage >= userPagination.totalPages}
                      onClick={() => setUserPage((p) => p + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              PAGE 3: COURSES MANAGEMENT
              ============================================================== */}
          {activeTab === 'courses' && (
            managingCourseId ? (
              <IndividualCourseWorkspace
                courseId={managingCourseId}
                onBack={() => {
                  setManagingCourseId(null);
                  fetchCourses();
                }}
                theme={theme}
              />
            ) : (
            <div className="tm-admin-courses-page">
              <div className="tm-admin-page-actions-header">
                <div>
                  <h2 className="tm-section-heading">All Educational Programs</h2>
                </div>
                <button
                  type="button"
                  className="tm-btn-primary"
                  onClick={() => {
                    setEditingCourse({
                      title: '',
                      subtitle: 'Forex & Crypto Trading',
                      description: '',
                      thumbnail: '/1-c.jpeg',
                      price: 19999,
                      original_price: 24999,
                      discount_label: 'Save ₹5,000 (20% OFF)',
                      duration: '1 Month',
                      level: 'Institutional Trading',
                      learning_mode: 'Live Online',
                      batch_name: 'November',
                      seats_available: 15,
                      is_published: true,
                      objectives: '',
                      learning_outcomes: '',
                      syllabus: '',
                      topics: '',
                      instructor_name: 'Patil Trader',
                      instructor_bio: 'Institutional price action specialist with 5+ years of live market experience and over 700+ trained students globally.',
                      instructor_image: '/heroo.png',
                      methodology: '',
                      assignments_info: '',
                      assessment_info: '',
                    });
                    setIsCourseModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Create New Course</span>
                </button>
              </div>

              {coursesLoading ? (
                <div className="tm-admin-loading-state">
                  <RefreshCw size={22} className="spin" />
                  <span>Loading courses...</span>
                </div>
              ) : courses.length === 0 ? (
                <div className="tm-admin-empty-state">No courses found. Click create to add one.</div>
              ) : (
                <div className="tm-admin-courses-grid">
                  {courses.map((course) => (
                    <div key={course.id} className="tm-admin-course-item-card">
                      <div className="tm-admin-course-thumb-wrap">
                        <img
                          src={course.thumbnail || '/1-c.jpeg'}
                          alt={course.title}
                          className="tm-admin-course-thumb"
                        />
                        <span className={`tm-course-pub-badge ${course.is_published ? 'published' : 'draft'}`}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>

                      <div className="tm-admin-course-meta">
                        <span className="tm-admin-course-batch">{course.batch_name} Batch</span>
                        <h3 className="tm-admin-course-title">{course.title}</h3>
                        <p className="tm-admin-course-desc">{course.description}</p>

                        <div className="tm-admin-course-specs">
                          <span>⏱ {course.duration}</span>
                          <span>🌐 {course.learning_mode}</span>
                          <span>📈 {course.level}</span>
                        </div>

                        <div className="tm-admin-course-pricing-row">
                          <div>
                            <span className="tm-admin-price-bold">
                              ₹{parseFloat(course.price).toLocaleString('en-IN')}
                            </span>
                            {course.original_price && (
                              <span className="tm-admin-price-strike">
                                ₹{parseFloat(course.original_price).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          <span className="tm-admin-seats-tag">
                            {course.seats_available} seats
                          </span>
                        </div>

                        <div className="tm-admin-course-enrolled-count">
                          <strong>{course.enrolled_count || 0}</strong> students enrolled
                        </div>

                        <div className="tm-admin-course-card-actions" style={{ flexDirection: 'column' }}>
                          <button
                            type="button"
                            className="tm-btn-primary"
                            style={{ width: '100%', marginBottom: '0.4rem', justifyContent: 'center' }}
                            onClick={() => setManagingCourseId(course.id)}
                            title="Open dedicated Course Management Workspace"
                          >
                            <ExternalLink size={14} />
                            <span>Open Course</span>
                          </button>
                          <div style={{ display: 'flex', gap: '0.35rem', width: '100%' }}>
                            <button
                              type="button"
                              className="tm-btn-outline-xs"
                              style={{ flex: 1, justifyContent: 'center' }}
                              onClick={() => handleOpenCourseDetails(course.id)}
                              title="View enrolled students list"
                            >
                              <Eye size={13} /> Students
                            </button>
                            <button
                              type="button"
                              className="tm-btn-outline-xs"
                              style={{ flex: 1, justifyContent: 'center' }}
                              onClick={() => {
                                setEditingCourse(course);
                                setIsCourseModalOpen(true);
                              }}
                              title="Edit course details"
                            >
                              <Edit size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              className="tm-btn-outline-xs"
                              style={{ flex: 1, justifyContent: 'center' }}
                              onClick={() => handleTogglePublishCourse(course)}
                              title={course.is_published ? 'Unpublish course' : 'Publish course'}
                            >
                              {course.is_published ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              type="button"
                              className="tm-btn-outline-xs danger"
                              onClick={() => handleDeleteCourse(course)}
                              title="Delete course"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )
          )}

          {/* ==============================================================
              PAGE: LIVE CLASSES & MEETINGS MANAGEMENT
              ============================================================== */}
          {activeTab === 'live-classes' && (
            <div className="tm-admin-live-page">
              <div className="tm-admin-page-actions-header">
                <div>
                  <h2 className="tm-section-heading">Scheduled Live Classes & Google Meet</h2>
                </div>
                <button
                  type="button"
                  className="tm-btn-primary"
                  onClick={handleOpenCreateLiveClass}
                >
                  <Plus size={16} />
                  <span>Schedule Live Class</span>
                </button>
              </div>

              {liveClassesLoading ? (
                <div className="tm-admin-loading-state">
                  <RefreshCw size={22} className="spin" />
                  <span>Loading scheduled sessions...</span>
                </div>
              ) : liveClasses.length === 0 ? (
                <div className="tm-admin-empty-card">
                  <Video size={40} className="tm-empty-icon" />
                  <h3>No Scheduled Live Classes Yet</h3>
                  <p>Create a live session and add your Google Meet link so enrolled students can join from their portals.</p>
                  <button
                    type="button"
                    className="tm-btn-primary"
                    style={{ marginTop: '14px' }}
                    onClick={handleOpenCreateLiveClass}
                  >
                    <Plus size={16} />
                    <span>Schedule First Live Class</span>
                  </button>
                </div>
              ) : (
                <div className="tm-admin-table-container">
                  <table className="tm-admin-table">
                    <thead>
                      <tr>
                        <th>Class Details</th>
                        <th>Cohort / Course</th>
                        <th>Scheduled Date & Time</th>
                        <th>Duration</th>
                        <th>Meeting Link (Google Meet)</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveClasses.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="tm-user-info-cell">
                              <span className="font-semibold">{item.title}</span>
                              <span className="text-muted text-xs">Instructor: {item.instructor || 'Patil Trader'}</span>
                              {item.description && (
                                <span className="text-muted text-xs tm-class-desc-snippet">{item.description}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="tm-status-pill enrolled" style={{ whiteSpace: 'nowrap' }}>
                              {item.course_name || 'All Programs'} ({item.batch_name || 'November'})
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="font-semibold">
                                {new Date(item.scheduled_at).toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-muted text-xs">
                                {new Date(item.scheduled_at).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span>{item.duration_minutes || 75} mins</span>
                          </td>
                          <td>
                            {item.meeting_link ? (
                              <div className="tm-meet-link-group">
                                <a
                                  href={item.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="tm-meet-link-badge"
                                  title="Open Google Meet in new tab"
                                >
                                  <Video size={13} />
                                  <span className="tm-meet-link-text">{item.meeting_link.replace(/^https?:\/\//, '')}</span>
                                  <ExternalLink size={12} />
                                </a>
                                <button
                                  type="button"
                                  className="tm-btn-icon-subtle"
                                  title="Copy meeting link"
                                  onClick={() => handleCopyMeetLink(item.meeting_link, item.id)}
                                >
                                  {copiedMeetId === item.id ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                                </button>
                              </div>
                            ) : (
                              <span className="tm-status-pill pending text-xs">No Link Added</span>
                            )}
                          </td>
                          <td>
                            <span className={`tm-status-pill ${item.status || 'upcoming'}`}>
                              {item.status || 'upcoming'}
                            </span>
                          </td>
                          <td>
                            <div className="tm-table-actions" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="tm-btn-icon"
                                title="Edit Live Class & Link"
                                onClick={() => handleOpenEditLiveClass(item)}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                className="tm-btn-icon danger"
                                title="Delete Scheduled Class"
                                onClick={() => handleDeleteLiveClass(item.id, item.title)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              PAGE 4: ENROLLMENTS MANAGEMENT
              ============================================================== */}
          {activeTab === 'enrollments' && (
            <div className="tm-admin-enrollments-page">
              {/* Controls Bar: Search & Status Filters */}
              <div className="tm-admin-filters-bar">
                <div className="tm-search-input-wrap">
                  <Search size={16} className="tm-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by student name, email, mobile..."
                    value={enrollmentSearch}
                    onChange={(e) => {
                      setEnrollmentSearch(e.target.value);
                      setEnrollmentPage(1);
                    }}
                    className="tm-admin-input search"
                  />
                  {enrollmentSearch && (
                    <button
                      type="button"
                      className="tm-clear-btn"
                      onClick={() => setEnrollmentSearch('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="tm-filter-select-wrap">
                  <select
                    value={enrollmentCourseFilter}
                    onChange={(e) => {
                      setEnrollmentCourseFilter(e.target.value);
                      setEnrollmentPage(1);
                    }}
                    className="tm-admin-select"
                  >
                    <option value="all">All Courses</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tm-filter-select-wrap">
                  <select
                    value={enrollmentStatusFilter}
                    onChange={(e) => {
                      setEnrollmentStatusFilter(e.target.value);
                      setEnrollmentPage(1);
                    }}
                    className="tm-admin-select"
                  >
                    <option value="all">All Statuses</option>
                    <option value="enrolled">Enrolled</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="tm-admin-btn-export"
                  onClick={handleExportEnrollments}
                  disabled={exportingEnrollments}
                  title="Download formatted Excel spreadsheet of student enrollments"
                >
                  {exportingEnrollments ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
                  <span>{exportingEnrollments ? 'Exporting...' : 'Download Excel Sheet'}</span>
                </button>
              </div>

              {/* Enrollments Table */}
              <div className="tm-admin-card">
                <div className="tm-admin-table-wrap">
                  {enrollmentsLoading ? (
                    <div className="tm-admin-loading-state">
                      <RefreshCw size={22} className="spin" />
                      <span>Loading enrollments...</span>
                    </div>
                  ) : enrollments.length === 0 ? (
                    <div className="tm-admin-empty-state">No enrollments found matching filters.</div>
                  ) : (
                    <table className="tm-admin-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Course Name</th>
                          <th>Batch</th>
                          <th>Mobile</th>
                          <th>Enrolled Date</th>
                          <th>Enrollment Status</th>
                          <th>Payment Status</th>
                          <th>Amount</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((en) => (
                          <tr key={en.id}>
                            <td>
                              <div className="font-semibold">{en.name}</div>
                              <div className="text-muted text-xs">{en.email}</div>
                            </td>
                            <td>{en.course_name}</td>
                            <td>{en.batch_name}</td>
                            <td>{en.mobile}</td>
                            <td>{new Date(en.created_at).toLocaleDateString()}</td>
                            <td>
                              <select
                                value={en.enrollment_status}
                                onChange={(e) =>
                                  handleUpdateEnrollmentStatus(en.id, 'enrollment_status', e.target.value)
                                }
                                className={`tm-status-select ${en.enrollment_status}`}
                              >
                                <option value="enrolled">Enrolled</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td>
                              <select
                                value={en.payment_status}
                                onChange={(e) =>
                                  handleUpdateEnrollmentStatus(en.id, 'payment_status', e.target.value)
                                }
                                className={`tm-status-select ${en.payment_status}`}
                              >
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="waived">Waived</option>
                                <option value="refunded">Refunded</option>
                              </select>
                            </td>
                            <td>₹{parseFloat(en.amount_paid || 19999).toLocaleString('en-IN')}</td>
                            <td>
                              <button
                                type="button"
                                className="tm-btn-outline-xs danger"
                                onClick={() => handleDeleteEnrollment(en)}
                                title="Delete enrollment record"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                <div className="tm-admin-pagination">
                  <span className="tm-pagination-meta">
                    Showing {enrollments.length} of {enrollmentPagination.total} enrollments
                  </span>
                  <div className="tm-pagination-controls">
                    <button
                      type="button"
                      className="tm-btn-page"
                      disabled={enrollmentPage <= 1}
                      onClick={() => setEnrollmentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="tm-page-current">
                      Page {enrollmentPage} of {enrollmentPagination.totalPages || 1}
                    </span>
                    <button
                      type="button"
                      className="tm-btn-page"
                      disabled={enrollmentPage >= enrollmentPagination.totalPages}
                      onClick={() => setEnrollmentPage((p) => p + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              PAGE 5: SETTINGS
              ============================================================== */}
          {activeTab === 'settings' && (
            <div className="tm-admin-settings-page">
              <div className="tm-admin-dual-grid">
                {/* Platform & Batch Settings */}
                <div className="tm-admin-card">
                  <div className="tm-admin-card-header">
                    <h2 className="tm-admin-card-title">Batch &amp; Admission Settings</h2>
                    <span className="tm-admin-card-sub">Synchronized live with homepage cards</span>
                  </div>

                  <form onSubmit={handleSaveSettings} className="tm-admin-form">
                    <div className="tm-form-group">
                      <label>Active Batch Name</label>
                      <input
                        type="text"
                        value={settingsForm.batchName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, batchName: e.target.value })}
                        className="tm-admin-input"
                        placeholder="e.g., November"
                        required
                      />
                    </div>

                    <div className="tm-form-group">
                      <label>Seats Available</label>
                      <input
                        type="number"
                        min="0"
                        value={settingsForm.seatsAvailable}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, seatsAvailable: parseInt(e.target.value, 10) || 0 })
                        }
                        className="tm-admin-input"
                        required
                      />
                    </div>

                    <div className="tm-form-checkbox-group">
                      <label className="tm-checkbox-label">
                        <input
                          type="checkbox"
                          checked={settingsForm.showSeatCount}
                          onChange={(e) => setSettingsForm({ ...settingsForm, showSeatCount: e.target.checked })}
                        />
                        <span>Display "Seats Remaining" badge on public course cards</span>
                      </label>
                    </div>

                    <div className="tm-form-group">
                      <label>Announcement Banner Text</label>
                      <input
                        type="text"
                        value={settingsForm.announcementText}
                        onChange={(e) => setSettingsForm({ ...settingsForm, announcementText: e.target.value })}
                        className="tm-admin-input"
                        placeholder="e.g. November Batch — Limited Seats Available"
                        required
                      />
                    </div>

                    <div className="tm-form-group">
                      <label>Admissions Contact Phone</label>
                      <input
                        type="text"
                        value={settingsForm.contactPhone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                        className="tm-admin-input"
                        placeholder="e.g. 8799026206"
                        required
                      />
                    </div>

                    <button type="submit" disabled={settingsSaving} className="tm-btn-primary">
                      {settingsSaving ? 'Saving Settings...' : 'Save Admission Settings'}
                    </button>
                  </form>
                </div>

                {/* Administrator Profile Settings */}
                <div className="tm-admin-card">
                  <div className="tm-admin-card-header">
                    <h2 className="tm-admin-card-title">Administrator Profile</h2>
                    <span className="tm-admin-card-sub">Secure credentials and account details</span>
                  </div>

                  <form onSubmit={handleSaveProfile} className="tm-admin-form">
                    <div className="tm-form-group">
                      <label>Administrator Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="tm-admin-input"
                        required
                      />
                    </div>

                    <div className="tm-form-group">
                      <label>Administrator Email</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="tm-admin-input"
                        required
                      />
                    </div>

                    <div className="tm-form-group">
                      <label>New Password (Leave blank to keep unchanged)</label>
                      <input
                        type="password"
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                        className="tm-admin-input"
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>

                    <button type="submit" disabled={profileSaving} className="tm-btn-primary">
                      {profileSaving ? 'Updating Profile...' : 'Update Admin Profile'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ------------------------------------------------------------------
          MODAL 1: USER DETAILS & ENROLLED COURSES MODAL
          ------------------------------------------------------------------ */}
      {selectedUser && (
        <div className="tm-admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="tm-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-admin-modal-header">
              <h3>Student Profile &amp; Enrollments</h3>
              <button
                type="button"
                className="tm-admin-modal-close"
                onClick={() => setSelectedUser(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-admin-modal-body">
              <div className="tm-user-profile-header">
                <div className="tm-profile-avatar-large">
                  {selectedUser.user.name ? selectedUser.user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4>{selectedUser.user.name}</h4>
                  <p className="text-muted">{selectedUser.user.email}</p>
                  <div className="tm-profile-badges-row">
                    <span className="tm-profile-meta-tag">📞 {selectedUser.user.mobile || 'No phone'}</span>
                    <span className="tm-profile-meta-tag">Role: {selectedUser.user.role}</span>
                    <span className={`tm-status-pill ${selectedUser.user.status || 'active'}`}>
                      {selectedUser.user.status || 'active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="tm-user-details-grid">
                <div>
                  <span className="label">Trading Experience:</span>
                  <span className="val">{selectedUser.user.trading_experience || 'Intermediate'}</span>
                </div>
                <div>
                  <span className="label">Account Created:</span>
                  <span className="val">{new Date(selectedUser.user.created_at).toLocaleString()}</span>
                </div>
              </div>

              <h4 className="mt-20 mb-10 font-bold text-sm">Courses Registered by this User:</h4>
              {selectedUser.enrollments.length === 0 ? (
                <div className="tm-admin-empty-state">This user has not enrolled in any courses yet.</div>
              ) : (
                <div className="tm-admin-table-wrap">
                  <table className="tm-admin-table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Batch</th>
                        <th>Enrolled Date</th>
                        <th>Status</th>
                        <th>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.enrollments.map((en) => (
                        <tr key={en.id}>
                          <td className="font-semibold">{en.course_name}</td>
                          <td>{en.batch_name}</td>
                          <td>{new Date(en.created_at).toLocaleDateString()}</td>
                          <td>
                            <span className={`tm-status-pill ${en.enrollment_status}`}>
                              {en.enrollment_status}
                            </span>
                          </td>
                          <td>
                            <span className={`tm-status-pill ${en.payment_status}`}>
                              {en.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
          MODAL 2: COURSE DETAILS & ENROLLED STUDENTS LIST
          ------------------------------------------------------------------ */}
      {selectedCourseDetails && (
        <div className="tm-admin-modal-overlay" onClick={() => setSelectedCourseDetails(null)}>
          <div className="tm-admin-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="tm-admin-modal-header">
              <h3>{selectedCourseDetails.course.title} — Enrolled Students</h3>
              <button
                type="button"
                className="tm-admin-modal-close"
                onClick={() => setSelectedCourseDetails(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-admin-modal-body">
              <div className="tm-course-details-summary">
                <img
                  src={selectedCourseDetails.course.thumbnail || '/1-c.jpeg'}
                  alt={selectedCourseDetails.course.title}
                  className="tm-course-thumb-preview"
                />
                <div>
                  <h4>{selectedCourseDetails.course.title}</h4>
                  <p className="text-muted text-sm">{selectedCourseDetails.course.subtitle}</p>
                  <div className="tm-course-summary-stats">
                    <span>Total Students: <strong>{selectedCourseDetails.totalEnrolled}</strong></span>
                    <span>Fee: <strong>₹{parseFloat(selectedCourseDetails.course.price).toLocaleString('en-IN')}</strong></span>
                    <span>Batch: <strong>{selectedCourseDetails.course.batch_name}</strong></span>
                  </div>
                </div>
              </div>

              <h4 className="mt-20 mb-10 font-bold text-sm">Enrolled Students List:</h4>
              {selectedCourseDetails.enrolledStudents.length === 0 ? (
                <div className="tm-admin-empty-state">No students have enrolled in this course yet.</div>
              ) : (
                <div className="tm-admin-table-wrap">
                  <table className="tm-admin-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Experience</th>
                        <th>Enrollment Date</th>
                        <th>Status</th>
                        <th>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCourseDetails.enrolledStudents.map((st) => (
                        <tr key={st.id}>
                          <td className="font-semibold">{st.name}</td>
                          <td>{st.email}</td>
                          <td>{st.mobile}</td>
                          <td>{st.trading_experience}</td>
                          <td>{new Date(st.created_at).toLocaleDateString()}</td>
                          <td>
                            <span className={`tm-status-pill ${st.enrollment_status}`}>
                              {st.enrollment_status}
                            </span>
                          </td>
                          <td>
                            <span className={`tm-status-pill ${st.payment_status}`}>
                              {st.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
          MODAL 3: CREATE / EDIT COURSE MODAL
          ------------------------------------------------------------------ */}
      {isCourseModalOpen && editingCourse && (
        <div className="tm-admin-modal-overlay" onClick={() => setIsCourseModalOpen(false)}>
          <div className="tm-admin-modal tm-admin-modal-course" onClick={(e) => e.stopPropagation()}>
            <div className="tm-admin-modal-header">
              <h3>{editingCourse.id ? 'Edit Course' : 'Create New Course'}</h3>
              <button
                type="button"
                className="tm-admin-modal-close"
                onClick={() => setIsCourseModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="tm-admin-modal-body">
              {/* Course Thumbnail / Banner Image Management */}
              <div className="tm-form-group">
                <label>Course Thumbnail / Banner</label>
                <div className="tm-modal-thumb-preview-wrap">
                  <div className="tm-modal-thumb-box">
                    <img
                      src={editingCourse.thumbnail || '/1-c.jpeg'}
                      alt="Course Banner Preview"
                      className="tm-modal-thumb-preview"
                      onError={(e) => {
                        e.target.src = '/1-c.jpeg';
                      }}
                    />
                  </div>
                  <div className="tm-modal-thumb-actions">
                    <input
                      type="file"
                      ref={courseFileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleThumbnailFileUpload}
                    />
                    <button
                      type="button"
                      className="tm-btn-outline-xs"
                      onClick={() => courseFileInputRef.current?.click()}
                      title="Upload new image from your device"
                    >
                      <Upload size={13} />
                      <span>Upload New Image</span>
                    </button>
                    <button
                      type="button"
                      className="tm-btn-outline-xs"
                      onClick={() =>
                        setEditingCourse({ ...editingCourse, thumbnail: '/1-c.jpeg' })
                      }
                      title="Reset to default banner"
                    >
                      Reset Default
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Or enter image URL / asset path (e.g. /1-c.jpeg)"
                  value={editingCourse.thumbnail || ''}
                  onChange={(e) =>
                    setEditingCourse({ ...editingCourse, thumbnail: e.target.value })
                  }
                  className="tm-admin-input"
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div className="tm-form-group">
                <label>Course Title *</label>
                <input
                  type="text"
                  value={editingCourse.title || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  className="tm-admin-input"
                  required
                />
              </div>

              <div className="tm-form-group">
                <label>Subtitle / Tagline</label>
                <input
                  type="text"
                  value={editingCourse.subtitle || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, subtitle: e.target.value })}
                  className="tm-admin-input"
                  placeholder="e.g. Forex & Crypto Trading"
                />
              </div>

              <div className="tm-form-group">
                <label>Description</label>
                <textarea
                  value={editingCourse.description || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  className="tm-admin-textarea"
                  rows={3}
                  placeholder="Describe curriculum, target audience, and program structure..."
                />
              </div>

              <div className="tm-form-row-2">
                <div className="tm-form-group">
                  <label>Offer Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingCourse.price ?? ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, price: e.target.value })}
                    className="tm-admin-input"
                    required
                  />
                </div>
                <div className="tm-form-group">
                  <label>Original Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingCourse.original_price ?? ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, original_price: e.target.value })}
                    className="tm-admin-input"
                  />
                </div>
              </div>

              <div className="tm-form-group">
                <label>Discount / Savings Badge Text</label>
                <input
                  type="text"
                  value={editingCourse.discount_label || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, discount_label: e.target.value })}
                  className="tm-admin-input"
                  placeholder="e.g. Save ₹5,000 (20% OFF)"
                />
              </div>

              <div className="tm-form-row-2">
                <div className="tm-form-group">
                  <label>Duration</label>
                  <input
                    type="text"
                    value={editingCourse.duration || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, duration: e.target.value })}
                    className="tm-admin-input"
                    placeholder="e.g. 1 Month"
                  />
                </div>
                <div className="tm-form-group">
                  <label>Learning Mode</label>
                  <input
                    type="text"
                    value={editingCourse.learning_mode || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, learning_mode: e.target.value })}
                    className="tm-admin-input"
                    placeholder="e.g. Live Online"
                  />
                </div>
              </div>

              <div className="tm-form-row-2">
                <div className="tm-form-group">
                  <label>Course Level</label>
                  <input
                    type="text"
                    value={editingCourse.level || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, level: e.target.value })}
                    className="tm-admin-input"
                    placeholder="e.g. Institutional Trading"
                  />
                </div>
                <div className="tm-form-group">
                  <label>Batch Name</label>
                  <input
                    type="text"
                    value={editingCourse.batch_name || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, batch_name: e.target.value })}
                    className="tm-admin-input"
                    placeholder="e.g. November"
                  />
                </div>
              </div>

              <div className="tm-form-group">
                <label>Seats Available</label>
                <input
                  type="number"
                  min="0"
                  value={editingCourse.seats_available ?? ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, seats_available: e.target.value })}
                  className="tm-admin-input"
                  placeholder="15"
                />
              </div>

              {/* Course Objectives */}
              <div className="tm-form-group">
                <label>Course Objectives</label>
                <textarea
                  value={editingCourse.objectives || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, objectives: e.target.value })}
                  className="tm-admin-textarea"
                  rows={2}
                  placeholder="Core goals and what the student will master in this course..."
                />
              </div>

              {/* Learning Outcomes */}
              <div className="tm-form-group">
                <label>Learning Outcomes</label>
                <textarea
                  value={editingCourse.learning_outcomes || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, learning_outcomes: e.target.value })}
                  className="tm-admin-textarea"
                  rows={2}
                  placeholder="Key competencies, execution ability, and practical skills acquired upon completion..."
                />
              </div>

              {/* Complete Syllabus */}
              <div className="tm-form-group">
                <label>Complete Syllabus</label>
                <textarea
                  value={editingCourse.syllabus || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, syllabus: e.target.value })}
                  className="tm-admin-textarea"
                  rows={3}
                  placeholder="Detailed syllabus modules and breakdown (e.g. Module 1: Market Structure, Module 2: Order Flow...)"
                />
              </div>

              {/* Curriculum Topics Covered */}
              <div className="tm-form-group">
                <label>Curriculum Topics (Comma or newline separated)</label>
                <textarea
                  value={
                    Array.isArray(editingCourse.topics)
                      ? editingCourse.topics.join(', ')
                      : (editingCourse.topics || '')
                  }
                  onChange={(e) => setEditingCourse({ ...editingCourse, topics: e.target.value })}
                  className="tm-admin-textarea"
                  rows={2}
                  placeholder="e.g. Market Structure, Support & Resistance, Supply & Demand Zones, Liquidity"
                />
              </div>

              {/* Instructor Information */}
              <div className="tm-form-row-2">
                <div className="tm-form-group">
                  <label>Instructor Name</label>
                  <input
                    type="text"
                    value={editingCourse.instructor_name || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, instructor_name: e.target.value })}
                    className="tm-admin-input"
                    placeholder="Patil Trader"
                  />
                </div>
                <div className="tm-form-group">
                  <label>Instructor Avatar / Image URL</label>
                  <input
                    type="text"
                    value={editingCourse.instructor_image || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, instructor_image: e.target.value })}
                    className="tm-admin-input"
                    placeholder="/heroo.png"
                  />
                </div>
              </div>

              <div className="tm-form-group">
                <label>Instructor Bio</label>
                <textarea
                  value={editingCourse.instructor_bio || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, instructor_bio: e.target.value })}
                  className="tm-admin-textarea"
                  rows={2}
                  placeholder="Instructor credentials, trading background, and expertise..."
                />
              </div>

              {/* Learning Methodology */}
              <div className="tm-form-group">
                <label>Learning Methodology</label>
                <textarea
                  value={editingCourse.methodology || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, methodology: e.target.value })}
                  className="tm-admin-textarea"
                  rows={2}
                  placeholder="Teaching approach: Live chart breakdowns, rule testing, trade reviews..."
                />
              </div>

              {/* Assignments & Case Studies */}
              <div className="tm-form-group">
                <label>Assignments & Practical Work Details</label>
                <textarea
                  value={editingCourse.assignments_info || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, assignments_info: e.target.value })}
                  className="tm-admin-textarea"
                  rows={2}
                  placeholder="Details regarding chart homework, trade logbook exercises, and case studies..."
                />
              </div>

              {/* Assessment & Evaluation */}
              <div className="tm-form-group">
                <label>Assessment & Evaluation Details</label>
                <textarea
                  value={editingCourse.assessment_info || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, assessment_info: e.target.value })}
                  className="tm-admin-textarea"
                  rows={2}
                  placeholder="Final risk-management evaluation and practical rule verification criteria..."
                />
              </div>

              <div className="tm-form-checkbox-group">
                <label className="tm-checkbox-label">
                  <input
                    type="checkbox"
                    checked={Boolean(editingCourse.is_published)}
                    onChange={(e) => setEditingCourse({ ...editingCourse, is_published: e.target.checked })}
                  />
                  <span>Publish course immediately (visible on public website)</span>
                </label>
              </div>

              <div className="tm-modal-actions-footer">
                <button
                  type="button"
                  className="tm-btn-outline"
                  onClick={() => setIsCourseModalOpen(false)}
                  disabled={savingCourse}
                >
                  Cancel
                </button>
                <button type="submit" className="tm-btn-primary" disabled={savingCourse}>
                  {savingCourse ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : editingCourse.id ? (
                    'Save Changes'
                  ) : (
                    'Create Course'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
          MODAL: SCHEDULE / EDIT LIVE CLASS & GOOGLE MEET
          ------------------------------------------------------------------ */}
      {isLiveClassModalOpen && editingLiveClass && (
        <div className="tm-admin-modal-overlay" onClick={() => setIsLiveClassModalOpen(false)}>
          <div className="tm-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-admin-modal-header">
              <h3>{editingLiveClass.id ? 'Edit Scheduled Live Class' : 'Schedule New Live Class'}</h3>
              <button
                type="button"
                className="tm-admin-modal-close"
                onClick={() => setIsLiveClassModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLiveClass} className="tm-admin-modal-body">
              <div className="tm-form-group">
                <label>Meeting Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Forex & Crypto Masterclass — Live Session"
                  value={editingLiveClass.title}
                  onChange={(e) => setEditingLiveClass({ ...editingLiveClass, title: e.target.value })}
                  required
                />
              </div>

              <div className="tm-form-group">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Google Meet / Meeting Link</span>
                  <span className="text-muted text-xs">e.g. https://meet.google.com/xxx-yyyy-zzz</span>
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={editingLiveClass.meeting_link}
                  onChange={(e) => setEditingLiveClass({ ...editingLiveClass, meeting_link: e.target.value })}
                />
                <small className="tm-form-hint">
                  This Google Meet link will appear immediately on enrolled students&apos; dashboards with a one-click &quot;Join Meeting&quot; button.
                </small>
              </div>

              <div className="tm-form-row">
                <div className="tm-form-group">
                  <label>Associated Course</label>
                  <select
                    value={editingLiveClass.course_id || ''}
                    onChange={(e) => setEditingLiveClass({ ...editingLiveClass, course_id: e.target.value || null })}
                  >
                    <option value="">All Programs / General Cohort</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tm-form-group">
                  <label>Cohort Batch Name</label>
                  <input
                    type="text"
                    placeholder="November"
                    value={editingLiveClass.batch_name}
                    onChange={(e) => setEditingLiveClass({ ...editingLiveClass, batch_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="tm-form-row">
                <div className="tm-form-group">
                  <label>Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={editingLiveClass.scheduled_at}
                    onChange={(e) => setEditingLiveClass({ ...editingLiveClass, scheduled_at: e.target.value })}
                    required
                  />
                </div>

                <div className="tm-form-group">
                  <label>Duration (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    step="5"
                    value={editingLiveClass.duration_minutes}
                    onChange={(e) => setEditingLiveClass({ ...editingLiveClass, duration_minutes: e.target.value })}
                  />
                </div>
              </div>

              <div className="tm-form-row">
                <div className="tm-form-group">
                  <label>Platform</label>
                  <select
                    value={editingLiveClass.platform}
                    onChange={(e) => setEditingLiveClass({ ...editingLiveClass, platform: e.target.value })}
                  >
                    <option value="Google Meet">Google Meet</option>
                    <option value="Zoom">Zoom</option>
                    <option value="YouTube Live">YouTube Live</option>
                    <option value="Live Stream">Live Stream</option>
                  </select>
                </div>

                <div className="tm-form-group">
                  <label>Instructor</label>
                  <input
                    type="text"
                    value={editingLiveClass.instructor}
                    onChange={(e) => setEditingLiveClass({ ...editingLiveClass, instructor: e.target.value })}
                  />
                </div>

                <div className="tm-form-group">
                  <label>Status</label>
                  <select
                    value={editingLiveClass.status}
                    onChange={(e) => setEditingLiveClass({ ...editingLiveClass, status: e.target.value })}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live Now</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="tm-form-group">
                <label>Session Agenda / Description (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="Key topics covered: Risk management, institutional liquidity zones, live charting..."
                  value={editingLiveClass.description}
                  onChange={(e) => setEditingLiveClass({ ...editingLiveClass, description: e.target.value })}
                />
              </div>

              <div className="tm-modal-actions-footer">
                <button
                  type="button"
                  className="tm-btn-outline"
                  onClick={() => setIsLiveClassModalOpen(false)}
                  disabled={savingLiveClass}
                >
                  Cancel
                </button>
                <button type="submit" className="tm-btn-primary" disabled={savingLiveClass}>
                  {savingLiveClass ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Saving Class...</span>
                    </>
                  ) : editingLiveClass.id ? (
                    'Save Changes'
                  ) : (
                    'Schedule Class & Post Link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
