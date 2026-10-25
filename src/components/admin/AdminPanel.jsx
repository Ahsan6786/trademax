import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  AlertTriangle,
  RotateCcw,
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
  CreditCard,
  QrCode,
  Filter,
  Bell,
  LifeBuoy,
} from 'lucide-react';
import './AdminPanel.css';
import { IndividualCourseWorkspace } from './IndividualCourseWorkspace';
import { AdminPushNotifications } from './AdminPushNotifications';
import { AdminTickets } from './AdminTickets';

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
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingPlatform, setResettingPlatform] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

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
  const [liveClassSearch, setLiveClassSearch] = useState('');
  const [liveClassStatusFilter, setLiveClassStatusFilter] = useState('all');

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    batchName: 'November',
    seatsAvailable: 15,
    showSeatCount: false,
    announcementText: 'November Batch — Limited Seats Available',
    contactPhone: '6352461137',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Admin Profile State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'TradeMax Administrator',
    email: user?.email || 'admin@trademaxclub.in',
    newPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Payment Verification & QR Settings State
  const [paymentSubTab, setPaymentSubTab] = useState('claims'); // 'claims' | 'qr_settings'
  const [paymentClaims, setPaymentClaims] = useState([]);
  const [paymentClaimsLoading, setPaymentClaimsLoading] = useState(false);
  const [paymentStats, setPaymentStats] = useState({ pending: 0, under_review: 0, approved: 0, rejected: 0, total: 0 });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentCourseFilter, setPaymentCourseFilter] = useState('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPagination, setPaymentPagination] = useState({ total: 0, totalPages: 1 });
  const [paymentSort, setPaymentSort] = useState('newest');

  // Selected Claim for Review Modal & Full Screenshot Preview
  const [selectedClaim, setSelectedClaim] = useState(null);

  // Support Tickets State
  const [ticketStats, setTicketStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0, urgent: 0 });
  const [selectedClaimLoading, setSelectedClaimLoading] = useState(false);
  const [previewScreenshotClaim, setPreviewScreenshotClaim] = useState(null);

  // Approve Modal State
  const [claimToApprove, setClaimToApprove] = useState(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [approvingClaim, setApprovingClaim] = useState(false);

  // Reject Modal State
  const [claimToReject, setClaimToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectingClaim, setRejectingClaim] = useState(false);

  // QR & Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState({
    qr_code_url: '/qr.jpg',
    recipient_name: 'PATIL TANISHQ DEEPAK',
    upi_id: '',
    payment_instructions: '',
    is_active: true,
    is_configured: false,
  });
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(false);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [qrUploadFile, setQrUploadFile] = useState(null);
  const [qrUploadPreview, setQrUploadPreview] = useState(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrFileInputRef = useRef(null);

  // Helper for auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('tm_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleTicketStatsUpdate = useCallback((newStats) => {
    if (newStats) setTicketStats(newStats);
  }, []);

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

      // Fetch payment claims stats for the sidebar badge
      try {
        const payRes = await fetch('/api/admin/payment-claims?limit=1', {
          headers: getAuthHeaders(),
        });
        const payData = await payRes.json();
        if (payData.success && payData.stats) {
          setPaymentStats(payData.stats);
        }
      } catch (e) {
        // Silent fail for stats badge
      }

      // Fetch support ticket stats for the sidebar badge
      try {
        const ticketRes = await fetch('/api/tickets/admin/all?limit=1', {
          headers: getAuthHeaders(),
        });
        const ticketData = await ticketRes.json();
        if (ticketData.success && ticketData.stats) {
          setTicketStats(ticketData.stats);
        }
      } catch (e) {
        // Silent fail for ticket stats badge
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
          contactPhone: data.settings.contactPhone || '6352461137',
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
    } else if (activeTab === 'payments') {
      fetchPaymentClaims(1);
      fetchPaymentSettings();
      fetchCourses();
    }
  }, [activeTab]);

  // Debounced search for payment claims
  useEffect(() => {
    if (activeTab === 'payments' && paymentSubTab === 'claims') {
      const timer = setTimeout(() => {
        fetchPaymentClaims(paymentPage);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [paymentSearch, paymentStatusFilter, paymentCourseFilter, paymentSort, paymentPage]);

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

  // Permanently Delete User and Associated Data
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const deletedId = userToDelete.id;
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${deletedId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message || 'User account deleted successfully.');
        setUserToDelete(null);
        if (selectedUser?.user?.id === deletedId) {
          setSelectedUser(null);
        }
        // 1. Immediately remove the user from the UI without requiring a page refresh
        setUsers((prev) => prev.filter((u) => u.id !== deletedId));
        // 2. Automatically update total user count
        setUserPagination((prev) => {
          const newTotal = Math.max(0, (prev?.total || 1) - 1);
          const limit = prev?.limit || 10;
          return {
            ...prev,
            total: newTotal,
            totalPages: Math.max(1, Math.ceil(newTotal / limit)),
          };
        });
        // 3. Immediately update dashboard user statistics
        setStats((prev) => (prev ? {
          ...prev,
          totalUsers: Math.max(0, (prev.totalUsers || 1) - 1),
        } : prev));
        // 4. Background re-fetch to ensure complete synchronization with backend
        fetchUsers();
        fetchDashboardStats();
      } else {
        showNotification(data.error || 'Failed to delete user.', 'error');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      showNotification('Network error while deleting user.', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  // Reset Platform Data (Enrollments, Revenue & Student Users - Preserves Courses, Admin & Settings)
  const handleResetPlatformData = async () => {
    setResettingPlatform(true);
    try {
      const res = await fetch('/api/admin/dashboard/reset-platform-data', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message || 'Platform data reset successfully.');
        setShowResetModal(false);
        setResetConfirmInput('');
        // Immediately reset dashboard stats in UI
        setStats((prev) => ({
          ...prev,
          totalUsers: 0,
          totalEnrollments: 0,
          totalRevenue: 0,
          recentUsers: [],
          recentEnrollments: [],
          trends: [],
          popularCourses: (prev?.popularCourses || []).map((c) => ({
            ...c,
            enrollment_count: 0,
          })),
        }));
        // Immediately clear user list and enrollments
        setUsers([]);
        setUserPagination({ total: 0, totalPages: 1 });
        setEnrollments([]);
        // Re-fetch from server to confirm complete synchronization
        await Promise.all([
          fetchDashboardStats(),
          fetchUsers(),
          fetchEnrollments ? fetchEnrollments() : Promise.resolve(),
        ]);
      } else {
        showNotification(data.error || 'Failed to reset platform data.', 'error');
      }
    } catch (err) {
      console.error('Error resetting platform data:', err);
      showNotification('Network error while resetting platform data.', 'error');
    } finally {
      setResettingPlatform(false);
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

  // ---------------------------------------------------------------------------
  // PAYMENT CLAIMS & VERIFICATION HANDLERS
  // ---------------------------------------------------------------------------
  const fetchPaymentClaims = async (page = paymentPage) => {
    setPaymentClaimsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        status: paymentStatusFilter,
        course_id: paymentCourseFilter,
        search: paymentSearch.trim(),
        sort: paymentSort,
      });
      const res = await fetch(`/api/admin/payment-claims?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentClaims(data.claims || []);
        setPaymentPagination({
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1,
          page: data.pagination?.page || 1,
        });
        if (data.stats) {
          setPaymentStats(data.stats);
        }
      } else {
        showNotification(data.error || 'Failed to load payment claims.', 'error');
      }
    } catch (err) {
      console.error('Error fetching payment claims:', err);
      showNotification('Network error loading payment claims.', 'error');
    } finally {
      setPaymentClaimsLoading(false);
    }
  };

  const fetchPaymentSettings = async () => {
    setPaymentSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/payment-settings', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setPaymentSettings(data.settings);
      }
    } catch (err) {
      console.error('Error fetching payment settings:', err);
    } finally {
      setPaymentSettingsLoading(false);
    }
  };

  const handleOpenClaimDetails = async (claimId) => {
    setSelectedClaimLoading(true);
    try {
      const res = await fetch(`/api/admin/payment-claims/${claimId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.claim) {
        setSelectedClaim(data.claim);
      } else {
        showNotification(data.error || 'Failed to load claim details.', 'error');
      }
    } catch (err) {
      console.error('Error loading claim details:', err);
      showNotification('Network error loading claim details.', 'error');
    } finally {
      setSelectedClaimLoading(false);
    }
  };

  const handleMarkUnderReview = async (claimId) => {
    try {
      const res = await fetch(`/api/admin/payment-claims/${claimId}/under-review`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Claim status marked as UNDER REVIEW.', 'success');
        fetchPaymentClaims(paymentPage);
        if (selectedClaim && (selectedClaim.claim_id === claimId || selectedClaim.id === claimId)) {
          setSelectedClaim(data.claim);
        }
      } else {
        showNotification(data.error || 'Failed to update claim status.', 'error');
      }
    } catch (err) {
      showNotification('Network error updating claim status.', 'error');
    }
  };

  const handleApproveClaim = async () => {
    if (!claimToApprove) return;
    setApprovingClaim(true);
    try {
      const id = claimToApprove.claim_id || claimToApprove.id;
      const res = await fetch(`/api/admin/payment-claims/${id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ admin_notes: approveNotes }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Payment approved! ${claimToApprove.student_name || 'Student'} enrolled successfully.`, 'success');
        setClaimToApprove(null);
        setApproveNotes('');
        setSelectedClaim(null);
        fetchPaymentClaims(paymentPage);
      } else {
        showNotification(data.error || 'Failed to approve payment claim.', 'error');
      }
    } catch (err) {
      showNotification('Network error approving payment claim.', 'error');
    } finally {
      setApprovingClaim(false);
    }
  };

  const handleRejectClaim = async () => {
    if (!claimToReject) return;
    if (!rejectionReason.trim()) {
      showNotification('A rejection reason is mandatory.', 'error');
      return;
    }
    setRejectingClaim(true);
    try {
      const id = claimToReject.claim_id || claimToReject.id;
      const res = await fetch(`/api/admin/payment-claims/${id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          rejection_reason: rejectionReason.trim(),
          admin_notes: rejectNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Payment claim rejected and student notified.', 'info');
        setClaimToReject(null);
        setRejectionReason('');
        setRejectNotes('');
        setSelectedClaim(null);
        fetchPaymentClaims(paymentPage);
      } else {
        showNotification(data.error || 'Failed to reject payment claim.', 'error');
      }
    } catch (err) {
      showNotification('Network error rejecting payment claim.', 'error');
    } finally {
      setRejectingClaim(false);
    }
  };

  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();
    setSavingPaymentSettings(true);
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recipient_name: paymentSettings.recipient_name,
          upi_id: paymentSettings.upi_id,
          payment_instructions: paymentSettings.payment_instructions,
          is_active: paymentSettings.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSettings(data.settings);
        showNotification('Payment configuration saved successfully!', 'success');
      } else {
        showNotification(data.error || 'Failed to save payment settings.', 'error');
      }
    } catch (err) {
      showNotification('Network error saving payment settings.', 'error');
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  const handleQrFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showNotification('Only JPEG, PNG, and WebP images are allowed.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('QR image cannot exceed 5MB.', 'error');
      return;
    }
    setQrUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setQrUploadPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadQr = async () => {
    if (!qrUploadFile) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('qrImage', qrUploadFile);
      const token = localStorage.getItem('tm_token');
      const res = await fetch('/api/admin/payment-settings/upload-qr', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSettings(data.settings);
        setQrUploadFile(null);
        setQrUploadPreview(null);
        if (qrFileInputRef.current) qrFileInputRef.current.value = '';
        showNotification('New official QR Code uploaded and set active!', 'success');
      } else {
        showNotification(data.error || 'Failed to upload QR code image.', 'error');
      }
    } catch (err) {
      showNotification('Network error uploading QR code.', 'error');
    } finally {
      setUploadingQr(false);
    }
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
            className={`tm-admin-nav-item ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('payments');
              setMobileSidebarOpen(false);
            }}
          >
            <CreditCard size={18} />
            <span>Payment Verification</span>
            {paymentStats && paymentStats.pending > 0 && (
              <span className="tm-admin-nav-badge">{paymentStats.pending}</span>
            )}
          </button>

          <button
            type="button"
            className={`tm-admin-nav-item ${activeTab === 'push' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('push');
              setMobileSidebarOpen(false);
            }}
          >
            <Bell size={18} />
            <span>Push Notifications</span>
          </button>

          <button
            type="button"
            className={`tm-admin-nav-item ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('tickets');
              setMobileSidebarOpen(false);
            }}
          >
            <LifeBuoy size={18} />
            <span>Support Tickets</span>
            {ticketStats && ticketStats.open > 0 && (
              <span className="tm-admin-nav-badge">{ticketStats.open}</span>
            )}
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
              <div className="tm-admin-dashboard-header">
                <div className="tm-admin-dashboard-title-box">
                  <h2 className="tm-admin-dashboard-title">Institutional Overview</h2>
                  <p className="tm-admin-dashboard-subtitle">
                    Real-time platform performance, admissions & revenue statistics
                  </p>
                </div>
                <div className="tm-admin-dashboard-actions">
                  <button
                    type="button"
                    className="tm-btn-outline tm-btn-refresh-dash"
                    onClick={() => {
                      fetchDashboardStats();
                      showNotification('Dashboard statistics updated.');
                    }}
                    title="Refresh Dashboard Statistics"
                  >
                    <RefreshCw size={14} className={statsLoading ? 'spin' : ''} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    className="tm-btn-primary tm-btn-danger tm-btn-reset-data"
                    onClick={() => {
                      setResetConfirmInput('');
                      setShowResetModal(true);
                    }}
                    title="Reset Platform Data (Enrollments, Revenue & Students)"
                  >
                    <RotateCcw size={14} />
                    <span>Reset Platform Data</span>
                  </button>
                </div>
              </div>

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
                                {u.role !== 'admin' && (
                                  <button
                                    type="button"
                                    className="tm-btn-outline-xs danger"
                                    onClick={() => setUserToDelete(u)}
                                    title="Delete User Permanently"
                                  >
                                    <Trash2 size={13} /> Delete
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

                        <div className="tm-admin-course-card-actions">
                          <button
                            type="button"
                            className="tm-admin-open-course-btn"
                            onClick={() => setManagingCourseId(course.id)}
                            title="Open dedicated Course Management Workspace"
                          >
                            <ExternalLink size={14} />
                            <span>Open Course</span>
                          </button>
                          <div className="tm-admin-course-card-secondary-actions">
                            <button
                              type="button"
                              className="tm-btn-outline-xs tm-course-btn-students"
                              onClick={() => handleOpenCourseDetails(course.id)}
                              title="View enrolled students list"
                            >
                              <Eye size={13} /> <span>Students</span>
                            </button>
                            <button
                              type="button"
                              className="tm-btn-outline-xs tm-course-btn-edit"
                              onClick={() => {
                                setEditingCourse(course);
                                setIsCourseModalOpen(true);
                              }}
                              title="Edit course details"
                            >
                              <Edit size={13} /> <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="tm-btn-outline-xs tm-course-btn-publish"
                              onClick={() => handleTogglePublishCourse(course)}
                              title={course.is_published ? 'Unpublish course' : 'Publish course'}
                            >
                              <span>{course.is_published ? 'Unpublish' : 'Publish'}</span>
                            </button>
                            <button
                              type="button"
                              className="tm-btn-outline-xs danger tm-course-btn-delete"
                              onClick={() => handleDeleteCourse(course)}
                              title="Delete course"
                            >
                              <Trash2 size={13} />
                              <span className="tm-delete-text-mobile">Delete</span>
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
              {/* Header Title & Action */}
              <div className="tm-admin-page-actions-header">
                <div>
                  <h2 className="tm-section-heading">Scheduled Live Classes &amp; Google Meet</h2>
                </div>
                <button
                  type="button"
                  className="tm-btn-primary tm-btn-schedule-live"
                  onClick={handleOpenCreateLiveClass}
                >
                  <Plus size={16} />
                  <span>Schedule Live Class</span>
                </button>
              </div>

              {/* Quick Live Stats Row */}
              <div className="tm-live-stats-grid">
                <div className="tm-live-stat-card">
                  <div className="tm-live-stat-icon-wrap blue">
                    <Video size={18} />
                  </div>
                  <div className="tm-live-stat-info">
                    <span className="label">Total Sessions</span>
                    <span className="val">{liveClasses.length}</span>
                  </div>
                </div>

                <div className="tm-live-stat-card">
                  <div className="tm-live-stat-icon-wrap amber">
                    <Calendar size={18} />
                  </div>
                  <div className="tm-live-stat-info">
                    <span className="label">Upcoming</span>
                    <span className="val">{liveClasses.filter((c) => c.status === 'upcoming').length}</span>
                  </div>
                </div>

                <div className="tm-live-stat-card">
                  <div className="tm-live-stat-icon-wrap red">
                    <Flame size={18} />
                  </div>
                  <div className="tm-live-stat-info">
                    <span className="label">Live Now</span>
                    <span className="val">{liveClasses.filter((c) => c.status === 'live').length}</span>
                  </div>
                </div>

                <div className="tm-live-stat-card">
                  <div className="tm-live-stat-icon-wrap green">
                    <CheckCircle size={18} />
                  </div>
                  <div className="tm-live-stat-info">
                    <span className="label">Completed</span>
                    <span className="val">{liveClasses.filter((c) => c.status === 'completed').length}</span>
                  </div>
                </div>
              </div>

              {/* Filters Bar: Search & Status Filter */}
              <div className="tm-admin-filters-bar">
                <div className="tm-search-input-wrap">
                  <Search size={16} className="tm-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by class title, instructor, or cohort..."
                    value={liveClassSearch}
                    onChange={(e) => setLiveClassSearch(e.target.value)}
                    className="tm-admin-input search"
                  />
                  {liveClassSearch && (
                    <button
                      type="button"
                      className="tm-clear-btn"
                      onClick={() => setLiveClassSearch('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="tm-filter-select-wrap">
                  <select
                    value={liveClassStatusFilter}
                    onChange={(e) => setLiveClassStatusFilter(e.target.value)}
                    className="tm-admin-select"
                  >
                    <option value="all">All Statuses ({liveClasses.length})</option>
                    <option value="upcoming">Upcoming Sessions</option>
                    <option value="live">Live Now</option>
                    <option value="completed">Completed Sessions</option>
                  </select>
                </div>
              </div>

              {/* Sessions Table Card */}
              <div className="tm-admin-card">
                <div className="tm-admin-table-wrap">
                  {liveClassesLoading ? (
                    <div className="tm-admin-loading-state">
                      <RefreshCw size={22} className="spin" />
                      <span>Loading scheduled sessions...</span>
                    </div>
                  ) : liveClasses.filter((item) => {
                      if (liveClassStatusFilter !== 'all' && item.status !== liveClassStatusFilter) return false;
                      if (liveClassSearch.trim()) {
                        const q = liveClassSearch.toLowerCase();
                        const matchTitle = (item.title || '').toLowerCase().includes(q);
                        const matchInstructor = (item.instructor || '').toLowerCase().includes(q);
                        const matchCourse = (item.course_name || '').toLowerCase().includes(q);
                        const matchBatch = (item.batch_name || '').toLowerCase().includes(q);
                        if (!matchTitle && !matchInstructor && !matchCourse && !matchBatch) return false;
                      }
                      return true;
                    }).length === 0 ? (
                    <div className="tm-admin-empty-state">
                      <Video size={36} className="text-muted" style={{ marginBottom: '10px' }} />
                      <div className="font-semibold">No scheduled live classes found.</div>
                      <p className="text-muted text-xs" style={{ marginTop: '4px' }}>
                        Click &quot;Schedule Live Class&quot; to configure a Google Meet session for enrolled students.
                      </p>
                    </div>
                  ) : (
                    <table className="tm-admin-table tm-live-classes-table">
                      <thead>
                        <tr>
                          <th>Session Details</th>
                          <th>Target Program &amp; Batch</th>
                          <th>Scheduled Date &amp; Time</th>
                          <th>Duration</th>
                          <th>Google Meet Link</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveClasses
                          .filter((item) => {
                            if (liveClassStatusFilter !== 'all' && item.status !== liveClassStatusFilter) return false;
                            if (liveClassSearch.trim()) {
                              const q = liveClassSearch.toLowerCase();
                              const matchTitle = (item.title || '').toLowerCase().includes(q);
                              const matchInstructor = (item.instructor || '').toLowerCase().includes(q);
                              const matchCourse = (item.course_name || '').toLowerCase().includes(q);
                              const matchBatch = (item.batch_name || '').toLowerCase().includes(q);
                              if (!matchTitle && !matchInstructor && !matchCourse && !matchBatch) return false;
                            }
                            return true;
                          })
                          .map((item) => (
                            <tr key={item.id}>
                              <td>
                                <div className="tm-live-title-cell">
                                  <div className="font-semibold tm-live-class-title">{item.title}</div>
                                  <div className="tm-live-instructor-row">
                                    <span className="text-muted text-xs">Instructor:</span>
                                    <span className="tm-instructor-tag">{item.instructor || 'Patil Trader'}</span>
                                  </div>
                                  {item.description && (
                                    <div className="text-muted text-xs tm-class-desc-snippet" title={item.description}>
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="tm-live-cohort-cell">
                                  <span className="tm-course-badge-pill">
                                    {item.course_name || 'All Programs'}
                                  </span>
                                  <span className="tm-batch-sub-badge">
                                    Cohort: {item.batch_name || 'November'}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="tm-live-datetime-cell">
                                  <div className="tm-datetime-primary">
                                    <Calendar size={13} className="text-muted" />
                                    <span>
                                      {new Date(item.scheduled_at).toLocaleDateString(undefined, {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                  <div className="tm-datetime-secondary text-muted text-xs">
                                    <Clock size={12} />
                                    <span>
                                      {new Date(item.scheduled_at).toLocaleTimeString(undefined, {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="tm-duration-pill">
                                  {item.duration_minutes || 75} mins
                                </span>
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
                                      <span className="tm-meet-link-text">
                                        {item.meeting_link.replace(/^https?:\/\//, '')}
                                      </span>
                                      <ExternalLink size={12} />
                                    </a>
                                    <button
                                      type="button"
                                      className="tm-btn-icon-subtle"
                                      title="Copy meeting link"
                                      onClick={() => handleCopyMeetLink(item.meeting_link, item.id)}
                                    >
                                      {copiedMeetId === item.id ? (
                                        <Check size={14} color="#10B981" />
                                      ) : (
                                        <Copy size={14} />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="tm-status-pill pending text-xs">No Link Added</span>
                                )}
                              </td>
                              <td>
                                <span className={`tm-status-pill ${item.status || 'upcoming'}`}>
                                  {item.status === 'live' ? '● LIVE NOW' : item.status || 'upcoming'}
                                </span>
                              </td>
                              <td>
                                <div className="tm-actions-flex" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="tm-btn-outline-xs"
                                    title="Edit Live Class & Link"
                                    onClick={() => handleOpenEditLiveClass(item)}
                                  >
                                    <Edit size={13} /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="tm-btn-outline-xs danger"
                                    title="Delete Scheduled Class"
                                    onClick={() => handleDeleteLiveClass(item.id, item.title)}
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
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
                        placeholder="e.g. 6352461137"
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

          {/* ==============================================================
              TAB 7: PAYMENT VERIFICATION & QR SETTINGS
              ============================================================== */}
          {activeTab === 'payments' && (
            <div className="tm-admin-payments-page">
              {/* Header with Sub-Tabs */}
              <div className="tm-admin-section-header tm-payments-section-header">
                <div className="tm-admin-subtabs">
                  <button
                    type="button"
                    className={`tm-admin-subtab-btn ${paymentSubTab === 'claims' ? 'active' : ''}`}
                    onClick={() => setPaymentSubTab('claims')}
                  >
                    <CreditCard size={15} />
                    <span>Payment Claims</span>
                    {paymentStats && paymentStats.pending > 0 && (
                      <span className="tm-subtab-badge warning">{paymentStats.pending}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`tm-admin-subtab-btn ${paymentSubTab === 'qr_settings' ? 'active' : ''}`}
                    onClick={() => {
                      setPaymentSubTab('qr_settings');
                      fetchPaymentSettings();
                    }}
                  >
                    <QrCode size={15} />
                    <span>QR &amp; Payment Settings</span>
                  </button>
                </div>
              </div>

              {/* SUBTAB 1: CLAIMS VERIFICATION */}
              {paymentSubTab === 'claims' && (
                <>
                  {/* Summary Metric Cards */}
                  <div className="tm-admin-stats-grid">
                    <div
                      className={`tm-stat-card ${paymentStatusFilter === 'PENDING' ? 'active-filter' : ''}`}
                      onClick={() => setPaymentStatusFilter(paymentStatusFilter === 'PENDING' ? 'all' : 'PENDING')}
                      title="Filter by Pending"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="tm-stat-icon-wrap amber">
                        <Clock size={20} />
                      </div>
                      <div className="tm-stat-data">
                        <span className="tm-stat-label">Pending Verification</span>
                        <div className="tm-stat-number">{paymentStats.pending}</div>
                        <span className="tm-stat-hint">Needs administrator review</span>
                      </div>
                    </div>

                    <div
                      className={`tm-stat-card ${paymentStatusFilter === 'UNDER_REVIEW' ? 'active-filter' : ''}`}
                      onClick={() => setPaymentStatusFilter(paymentStatusFilter === 'UNDER_REVIEW' ? 'all' : 'UNDER_REVIEW')}
                      title="Filter by Under Review"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="tm-stat-icon-wrap blue">
                        <AlertCircle size={20} />
                      </div>
                      <div className="tm-stat-data">
                        <span className="tm-stat-label">Under Review</span>
                        <div className="tm-stat-number">{paymentStats.under_review}</div>
                        <span className="tm-stat-hint">In-progress checks</span>
                      </div>
                    </div>

                    <div
                      className={`tm-stat-card ${paymentStatusFilter === 'APPROVED' ? 'active-filter' : ''}`}
                      onClick={() => setPaymentStatusFilter(paymentStatusFilter === 'APPROVED' ? 'all' : 'APPROVED')}
                      title="Filter by Approved"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="tm-stat-icon-wrap green">
                        <CheckCircle size={20} />
                      </div>
                      <div className="tm-stat-data">
                        <span className="tm-stat-label">Approved Payments</span>
                        <div className="tm-stat-number">{paymentStats.approved}</div>
                        <span className="tm-stat-hint">Enrollments granted</span>
                      </div>
                    </div>

                    <div
                      className={`tm-stat-card ${paymentStatusFilter === 'REJECTED' ? 'active-filter' : ''}`}
                      onClick={() => setPaymentStatusFilter(paymentStatusFilter === 'REJECTED' ? 'all' : 'REJECTED')}
                      title="Filter by Rejected"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="tm-stat-icon-wrap red">
                        <XCircle size={20} />
                      </div>
                      <div className="tm-stat-data">
                        <span className="tm-stat-label">Rejected Claims</span>
                        <div className="tm-stat-number">{paymentStats.rejected}</div>
                        <span className="tm-stat-hint">Declined / Resubmission allowed</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="tm-admin-controls-card">
                    <div className="tm-admin-search-wrap">
                      <Search size={16} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search student, email, or UTR / reference..."
                        value={paymentSearch}
                        onChange={(e) => {
                          setPaymentSearch(e.target.value);
                          setPaymentPage(1);
                        }}
                        className="tm-admin-search-input"
                      />
                      {paymentSearch && (
                        <button
                          type="button"
                          className="tm-search-clear"
                          onClick={() => {
                            setPaymentSearch('');
                            setPaymentPage(1);
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="tm-admin-filters-row">
                      <div className="tm-filter-group">
                        <span className="tm-filter-label">Status:</span>
                        <select
                          value={paymentStatusFilter}
                          onChange={(e) => {
                            setPaymentStatusFilter(e.target.value);
                            setPaymentPage(1);
                          }}
                          className="tm-admin-select"
                        >
                          <option value="all">All Statuses ({paymentStats.total})</option>
                          <option value="PENDING">Pending ({paymentStats.pending})</option>
                          <option value="UNDER_REVIEW">Under Review ({paymentStats.under_review})</option>
                          <option value="APPROVED">Approved ({paymentStats.approved})</option>
                          <option value="REJECTED">Rejected ({paymentStats.rejected})</option>
                        </select>
                      </div>

                      <div className="tm-filter-group">
                        <span className="tm-filter-label">Course:</span>
                        <select
                          value={paymentCourseFilter}
                          onChange={(e) => {
                            setPaymentCourseFilter(e.target.value);
                            setPaymentPage(1);
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

                      <div className="tm-filter-group">
                        <span className="tm-filter-label">Sort:</span>
                        <select
                          value={paymentSort}
                          onChange={(e) => {
                            setPaymentSort(e.target.value);
                            setPaymentPage(1);
                          }}
                          className="tm-admin-select"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        className="tm-btn-refresh"
                        onClick={() => fetchPaymentClaims(paymentPage)}
                        title="Refresh payment claims list"
                        disabled={paymentClaimsLoading}
                      >
                        <RefreshCw size={14} className={paymentClaimsLoading ? 'spin' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Payment Claims Table */}
                  <div className="tm-admin-table-card">
                    <div className="tm-admin-table-responsive tm-desktop-claims-table">
                      <table className="tm-admin-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Course</th>
                            <th>Claimed Amount</th>
                            <th>Transaction Ref / UTR</th>
                            <th>Submitted</th>
                            <th>Screenshot</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentClaimsLoading ? (
                            <tr>
                              <td colSpan="8" className="tm-table-loading">
                                <RefreshCw size={20} className="spin" />
                                <span>Loading payment claims...</span>
                              </td>
                            </tr>
                          ) : paymentClaims.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="tm-table-empty">
                                <AlertCircle size={28} />
                                <p>No payment claims found matching your criteria.</p>
                              </td>
                            </tr>
                          ) : (
                            paymentClaims.map((claim) => {
                              const claimId = claim.claim_id || claim.id;
                              const token = localStorage.getItem('tm_token');
                              const screenshotUrl = `/api/admin/payment-claims/${claimId}/screenshot?token=${token}`;

                              return (
                                <tr key={claimId} className={`tm-payment-row ${claim.status?.toLowerCase()}`}>
                                  <td>
                                    <div className="tm-student-cell">
                                      <div className="tm-student-avatar">
                                        {(claim.student_name || 'S').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="tm-student-name">{claim.student_name || 'Student'}</div>
                                        <div className="tm-student-email">{claim.student_email || claim.user_id}</div>
                                        {claim.student_mobile && (
                                          <div className="tm-student-mobile">📞 {claim.student_mobile}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="tm-course-cell">
                                      <span className="tm-course-title-cell">{claim.course_title || `Course #${claim.course_id}`}</span>
                                      {claim.course_tier && (
                                        <span className="tm-course-tier-tag">{claim.course_tier}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <span className="tm-amount-cell">₹{Number(claim.amount || 0).toLocaleString('en-IN')}</span>
                                  </td>
                                  <td>
                                    <div className="tm-utr-cell">
                                      <code className="tm-utr-code">{claim.transaction_ref}</code>
                                      <button
                                        type="button"
                                        className="tm-btn-icon-tiny"
                                        title="Copy UTR"
                                        onClick={() => {
                                          navigator.clipboard.writeText(claim.transaction_ref);
                                          showNotification('UTR copied to clipboard!');
                                        }}
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </div>
                                  </td>
                                  <td>
                                    <span className="tm-date-cell">
                                      {new Date(claim.submitted_at || claim.created_at).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="tm-screenshot-thumbnail-btn"
                                      onClick={() => setPreviewScreenshotClaim(claim)}
                                      title="Click to view full screenshot"
                                    >
                                      <img
                                        src={screenshotUrl}
                                        alt="Proof"
                                        className="tm-screenshot-thumbnail-img"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                      <Eye size={12} className="tm-thumb-eye-icon" />
                                    </button>
                                  </td>
                                  <td>
                                    <span className={`tm-status-pill ${claim.status?.toLowerCase()}`}>
                                      {claim.status === 'UNDER_REVIEW'
                                        ? 'Under Review'
                                        : claim.status === 'PENDING'
                                        ? 'Pending'
                                        : claim.status === 'APPROVED'
                                        ? 'Approved'
                                        : 'Rejected'}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="tm-actions-cell" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                                      {/* View Details */}
                                      <button
                                        type="button"
                                        className="tm-btn-table-action"
                                        onClick={() => handleOpenClaimDetails(claimId)}
                                        title="Review full claim details"
                                      >
                                        <Eye size={14} />
                                      </button>

                                      {/* Mark Under Review (if PENDING) */}
                                      {claim.status === 'PENDING' && (
                                        <button
                                          type="button"
                                          className="tm-btn-table-action"
                                          onClick={() => handleMarkUnderReview(claimId)}
                                          title="Mark Under Review"
                                        >
                                          <Clock size={14} />
                                        </button>
                                      )}

                                      {/* Approve Button */}
                                      {(claim.status === 'PENDING' || claim.status === 'UNDER_REVIEW') && (
                                        <button
                                          type="button"
                                          className="tm-btn-table-action success"
                                          onClick={() => {
                                            setClaimToApprove(claim);
                                            setApproveNotes('');
                                          }}
                                          title="Verify & Approve Payment"
                                        >
                                          <CheckCircle size={14} />
                                        </button>
                                      )}

                                      {/* Reject Button */}
                                      {(claim.status === 'PENDING' || claim.status === 'UNDER_REVIEW') && (
                                        <button
                                          type="button"
                                          className="tm-btn-table-action danger"
                                          onClick={() => {
                                            setClaimToReject(claim);
                                            setRejectionReason('');
                                            setRejectNotes('');
                                          }}
                                          title="Reject Payment Claim"
                                        >
                                          <XCircle size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Claims Cards View */}
                    <div className="tm-mobile-claims-list">
                      {paymentClaimsLoading ? (
                        <div className="tm-table-loading">
                          <RefreshCw size={24} className="spin" />
                          <span>Loading payment claims...</span>
                        </div>
                      ) : paymentClaims.length === 0 ? (
                        <div className="tm-table-empty">
                          <AlertCircle size={28} />
                          <p>No payment claims found matching your criteria.</p>
                        </div>
                      ) : (
                        paymentClaims.map((claim) => {
                          const claimId = claim.claim_id || claim.id;
                          const token = localStorage.getItem('tm_token');
                          const screenshotUrl = `/api/admin/payment-claims/${claimId}/screenshot?token=${token}`;

                          return (
                            <div key={`mob-${claimId}`} className={`tm-mobile-claim-card ${claim.status?.toLowerCase()}`}>
                              {/* Header */}
                              <div className="tm-mobile-claim-header">
                                <div className="tm-mobile-claim-student">
                                  <div className="tm-student-avatar">
                                    {(claim.student_name || 'S').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="tm-mobile-claim-student-info">
                                    <span className="tm-student-name">{claim.student_name || 'Student'}</span>
                                    <span className="tm-student-email">{claim.student_email || claim.user_id}</span>
                                  </div>
                                </div>
                                <span className={`tm-status-pill ${claim.status?.toLowerCase()}`}>
                                  {claim.status === 'UNDER_REVIEW'
                                    ? 'Under Review'
                                    : claim.status === 'PENDING'
                                    ? 'Pending'
                                    : claim.status === 'APPROVED'
                                    ? 'Approved'
                                    : 'Rejected'}
                                </span>
                              </div>

                              {/* Details Grid */}
                              <div className="tm-mobile-claim-info-grid">
                                <div className="tm-mobile-claim-info-item">
                                  <span className="label">Course</span>
                                  <span className="val font-semibold">{claim.course_title || `Course #${claim.course_id}`}</span>
                                </div>
                                <div className="tm-mobile-claim-info-item">
                                  <span className="label">Amount</span>
                                  <span className="val tm-amount-cell">₹{Number(claim.amount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="tm-mobile-claim-info-item">
                                  <span className="label">Submitted</span>
                                  <span className="val text-muted text-xs">
                                    {new Date(claim.submitted_at || claim.created_at).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <div className="tm-mobile-claim-info-item">
                                  <span className="label">Transaction UTR</span>
                                  <div className="tm-utr-cell">
                                    <code className="tm-utr-code">{claim.transaction_ref}</code>
                                    <button
                                      type="button"
                                      className="tm-btn-icon-tiny"
                                      title="Copy UTR"
                                      onClick={() => {
                                        navigator.clipboard.writeText(claim.transaction_ref);
                                        showNotification('UTR copied to clipboard!');
                                      }}
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Screenshot Proof Preview */}
                              <div className="tm-mobile-claim-proof-row">
                                <span className="text-muted text-xs">Payment Screenshot:</span>
                                <button
                                  type="button"
                                  className="tm-btn-table-action"
                                  onClick={() => setPreviewScreenshotClaim(claim)}
                                  title="Click to view full screenshot"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', fontSize: '11.5px' }}
                                >
                                  <img
                                    src={screenshotUrl}
                                    alt="Proof"
                                    style={{ width: '20px', height: '20px', objectFit: 'cover', borderRadius: '3px' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <Eye size={12} />
                                  <span>View Proof</span>
                                </button>
                              </div>

                              {/* Action Buttons */}
                              <div className="tm-mobile-claim-actions">
                                <button
                                  type="button"
                                  className="tm-mobile-btn-action details"
                                  onClick={() => handleOpenClaimDetails(claimId)}
                                >
                                  <Eye size={13} />
                                  <span>Details</span>
                                </button>

                                {claim.status === 'PENDING' && (
                                  <button
                                    type="button"
                                    className="tm-mobile-btn-action review"
                                    onClick={() => handleMarkUnderReview(claimId)}
                                  >
                                    <Clock size={13} />
                                    <span>Review</span>
                                  </button>
                                )}

                                {(claim.status === 'PENDING' || claim.status === 'UNDER_REVIEW') && (
                                  <button
                                    type="button"
                                    className="tm-mobile-btn-action approve"
                                    onClick={() => {
                                      setClaimToApprove(claim);
                                      setApproveNotes('');
                                    }}
                                  >
                                    <CheckCircle size={13} />
                                    <span>Approve</span>
                                  </button>
                                )}

                                {(claim.status === 'PENDING' || claim.status === 'UNDER_REVIEW') && (
                                  <button
                                    type="button"
                                    className="tm-mobile-btn-action reject"
                                    onClick={() => {
                                      setClaimToReject(claim);
                                      setRejectionReason('');
                                      setRejectNotes('');
                                    }}
                                  >
                                    <XCircle size={13} />
                                    <span>Reject</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Pagination */}
                    {paymentPagination.totalPages > 1 && (
                      <div className="tm-admin-pagination">
                        <span className="tm-pagination-info">
                          Showing {paymentClaims.length} of {paymentPagination.total} claims
                        </span>
                        <div className="tm-pagination-btns">
                          <button
                            type="button"
                            className="tm-page-btn"
                            disabled={paymentPage <= 1}
                            onClick={() => {
                              const p = paymentPage - 1;
                              setPaymentPage(p);
                              fetchPaymentClaims(p);
                            }}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="tm-page-current">
                            Page {paymentPage} of {paymentPagination.totalPages}
                          </span>
                          <button
                            type="button"
                            className="tm-page-btn"
                            disabled={paymentPage >= paymentPagination.totalPages}
                            onClick={() => {
                              const p = paymentPage + 1;
                              setPaymentPage(p);
                              fetchPaymentClaims(p);
                            }}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* SUBTAB 2: QR & PAYMENT SETTINGS */}
              {paymentSubTab === 'qr_settings' && (
                <div className="tm-admin-dual-grid">
                  {/* Left Card: Official Payment QR Code */}
                  <div className="tm-admin-card">
                    <div className="tm-admin-card-header">
                      <h2 className="tm-admin-card-title">Official Payment QR Code</h2>
                      <span className="tm-admin-card-sub">Displayed to students during course checkout</span>
                    </div>

                    <div className="tm-qr-display-container">
                      <div className="tm-qr-image-frame">
                        <img
                          src={qrUploadPreview || paymentSettings.qr_code_url || '/qr.jpg'}
                          alt="Official Payment QR"
                          className="tm-official-qr-image"
                        />
                      </div>
                      <div className="tm-qr-info-meta">
                        <div className="tm-qr-meta-item">
                          <span className="label">Current Asset Path:</span>
                          <code>{paymentSettings.qr_code_url || '/qr.jpg'}</code>
                        </div>
                        <div className="tm-qr-meta-item">
                          <span className="label">Recipient Name:</span>
                          <strong>{paymentSettings.recipient_name || 'Not Configured'}</strong>
                        </div>
                        <div className="tm-qr-meta-item">
                          <span className="label">UPI ID:</span>
                          <strong>{paymentSettings.upi_id || 'Not Configured'}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="tm-qr-upload-section">
                      <label className="tm-admin-label">Replace Official QR Code</label>
                      <p className="tm-admin-sub">
                        Upload a crisp, uncropped payment QR code image (JPEG, PNG, WebP up to 5MB).
                      </p>

                      <div className="tm-qr-file-input-row">
                        <input
                          ref={qrFileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleQrFileSelected}
                          className="tm-file-input-hidden"
                          id="qr-upload-input"
                        />
                        <label htmlFor="qr-upload-input" className="tm-btn-outline tm-upload-trigger-btn">
                          <Upload size={14} />
                          <span>{qrUploadFile ? qrUploadFile.name : 'Select New QR Image...'}</span>
                        </label>

                        {qrUploadFile && (
                          <button
                            type="button"
                            className="tm-btn-primary"
                            onClick={handleUploadQr}
                            disabled={uploadingQr}
                          >
                            {uploadingQr ? (
                              <>
                                <RefreshCw size={14} className="spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              'Upload & Replace QR'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Card: UPI & Instruction Configuration */}
                  <div className="tm-admin-card">
                    <div className="tm-admin-card-header">
                      <h2 className="tm-admin-card-title">Payment Account &amp; Instructions</h2>
                      <span className="tm-admin-card-sub">Admin configuration used across student checkout</span>
                    </div>

                    {!paymentSettings.upi_id && (
                      <div className="tm-alert-notice warning">
                        <AlertCircle size={18} />
                        <div>
                          <strong>Configuration Incomplete:</strong> Student checkout is currently disabled because the official UPI ID is not configured. Enter the UPI ID below to enable checkout.
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSavePaymentSettings} className="tm-admin-form">
                      <div className="tm-form-group">
                        <label>Official Recipient Name *</label>
                        <input
                          type="text"
                          value={paymentSettings.recipient_name}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, recipient_name: e.target.value })}
                          className="tm-admin-input"
                          placeholder="e.g., PATIL TANISHQ DEEPAK"
                          required
                        />
                        <span className="tm-input-hint">The account holder name verified by UPI apps upon scanning.</span>
                      </div>

                      <div className="tm-form-group">
                        <label>Official UPI ID / VPA *</label>
                        <input
                          type="text"
                          value={paymentSettings.upi_id}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, upi_id: e.target.value.trim() })}
                          className="tm-admin-input"
                          placeholder="e.g. 6352461137@ybl or trademax@icici"
                          required
                        />
                        <span className="tm-input-hint">Displayed to students for copy-paste and payment validation.</span>
                      </div>

                      <div className="tm-form-group">
                        <label>Payment Instructions for Students</label>
                        <textarea
                          rows="4"
                          value={paymentSettings.payment_instructions}
                          onChange={(e) =>
                            setPaymentSettings({ ...paymentSettings, payment_instructions: e.target.value })
                          }
                          className="tm-admin-input"
                          placeholder="Instructions displayed under the QR code during course checkout..."
                        />
                      </div>

                      <div className="tm-form-checkbox-group">
                        <label className="tm-checkbox-label">
                          <input
                            type="checkbox"
                            checked={paymentSettings.is_active}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, is_active: e.target.checked })}
                          />
                          <span><strong>Enable Manual Payments:</strong> When checked, students can pay via UPI QR code.</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={savingPaymentSettings}
                        className="tm-btn-primary"
                        style={{ marginTop: '12px' }}
                      >
                        {savingPaymentSettings ? 'Saving Configuration...' : 'Save Payment Configuration'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              TAB 8: PUSH NOTIFICATIONS
              ============================================================== */}
          {activeTab === 'push' && (
            <AdminPushNotifications
              courses={courses}
              showNotification={showNotification}
            />
          )}

          {/* ==============================================================
              TAB 9: SUPPORT TICKETS
              ============================================================== */}
          {activeTab === 'tickets' && (
            <AdminTickets
              theme={theme}
              authToken={localStorage.getItem('tm_token')}
              showNotification={showNotification}
              onStatsUpdate={handleTicketStatsUpdate}
            />
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

              {selectedUser.user.role !== 'admin' && (
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="tm-btn-primary tm-btn-danger"
                    onClick={() => {
                      const u = selectedUser.user;
                      setUserToDelete({
                        ...u,
                        enrollments_count: selectedUser.enrollments ? selectedUser.enrollments.length : 0,
                      });
                    }}
                    title="Permanently Delete User Account"
                  >
                    <Trash2 size={14} />
                    <span>Delete User Account</span>
                  </button>
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
          Matches Student Panel Payment Popup (Blue Top Strip, Thick Border,
          Clean Cards, & Green Action Button)
          ------------------------------------------------------------------ */}
      {isLiveClassModalOpen && editingLiveClass && (
        <div className="tm-course-modal-backdrop tm-live-modal-backdrop" onClick={() => setIsLiveClassModalOpen(false)}>
          <div
            className="tm-course-modal-card tm-clean-modal-layout tm-live-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* SOLID BLUE TOP STRIP */}
            <div className="tm-modal-header-blue">
              <div className="tm-modal-header-text">
                <h3 className="tm-modal-header-title">
                  {editingLiveClass.id ? 'Edit Scheduled Live Class' : 'Schedule Live Class'}
                </h3>
                <p className="tm-modal-header-subtitle">
                  Configure Google Meet session, cohort schedule &amp; student instructions
                </p>
              </div>
              <button
                type="button"
                className="tm-modal-header-close"
                onClick={() => setIsLiveClassModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* SCROLLABLE MODAL BODY - CLEAN WHITE CARDS */}
            <form onSubmit={handleSaveLiveClass} className="tm-live-modal-form">
              <div className="tm-modal-body-scroll">
                <div className="tm-clean-cards-stack">
                  {/* Card 1: Session Information */}
                  <div className="tm-clean-card">
                    <label className="tm-input-card-label">
                      Meeting Title <span className="tm-req">*</span>
                    </label>
                    <input
                      type="text"
                      className="tm-clean-text-input"
                      placeholder="e.g. Forex & Crypto Masterclass — Live Session"
                      value={editingLiveClass.title}
                      onChange={(e) => setEditingLiveClass({ ...editingLiveClass, title: e.target.value })}
                      required
                    />
                  </div>

                  {/* Card 2: Course & Cohort Target */}
                  <div className="tm-clean-card">
                    <div className="tm-modal-card-grid-2">
                      <div>
                        <label className="tm-input-card-label">Target Program / Course</label>
                        <select
                          className="tm-clean-text-input"
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

                      <div>
                        <label className="tm-input-card-label">Cohort Batch Name</label>
                        <input
                          type="text"
                          className="tm-clean-text-input"
                          placeholder="November"
                          value={editingLiveClass.batch_name}
                          onChange={(e) => setEditingLiveClass({ ...editingLiveClass, batch_name: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Google Meet & Platform Integration */}
                  <div className="tm-clean-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="tm-input-card-label" style={{ marginBottom: 0 }}>
                        Google Meet / Meeting URL
                      </label>
                      <span className="text-muted text-xs">e.g. https://meet.google.com/xxx-yyyy-zzz</span>
                    </div>
                    <div className="tm-meet-input-wrap">
                      <Video size={16} className="tm-meet-input-icon" />
                      <input
                        type="url"
                        className="tm-clean-text-input tm-input-with-icon"
                        placeholder="https://meet.google.com/..."
                        value={editingLiveClass.meeting_link}
                        onChange={(e) => setEditingLiveClass({ ...editingLiveClass, meeting_link: e.target.value })}
                      />
                    </div>
                    <div className="tm-clean-notice-card" style={{ marginTop: '10px' }}>
                      <CheckCircle size={15} className="tm-notice-shield" />
                      <div>
                        This Google Meet link will appear immediately on enrolled students&apos; portals with a 1-click &quot;Join Meeting&quot; broadcast button.
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Schedule, Duration & Instructor */}
                  <div className="tm-clean-card">
                    <div className="tm-modal-card-grid-2">
                      <div>
                        <label className="tm-input-card-label">
                          Scheduled Date &amp; Time <span className="tm-req">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          className="tm-clean-text-input"
                          value={editingLiveClass.scheduled_at}
                          onChange={(e) => setEditingLiveClass({ ...editingLiveClass, scheduled_at: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="tm-input-card-label">Duration (Minutes)</label>
                        <input
                          type="number"
                          min="15"
                          step="5"
                          className="tm-clean-text-input"
                          value={editingLiveClass.duration_minutes}
                          onChange={(e) => setEditingLiveClass({ ...editingLiveClass, duration_minutes: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="tm-modal-card-grid-3" style={{ marginTop: '12px' }}>
                      <div>
                        <label className="tm-input-card-label">Platform</label>
                        <select
                          className="tm-clean-text-input"
                          value={editingLiveClass.platform}
                          onChange={(e) => setEditingLiveClass({ ...editingLiveClass, platform: e.target.value })}
                        >
                          <option value="Google Meet">Google Meet</option>
                          <option value="Zoom">Zoom</option>
                          <option value="YouTube Live">YouTube Live</option>
                          <option value="Live Stream">Live Stream</option>
                        </select>
                      </div>

                      <div>
                        <label className="tm-input-card-label">Instructor</label>
                        <input
                          type="text"
                          className="tm-clean-text-input"
                          value={editingLiveClass.instructor}
                          onChange={(e) => setEditingLiveClass({ ...editingLiveClass, instructor: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="tm-input-card-label">Session Status</label>
                        <select
                          className="tm-clean-text-input"
                          value={editingLiveClass.status}
                          onChange={(e) => setEditingLiveClass({ ...editingLiveClass, status: e.target.value })}
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="live">Live Now</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Agenda & Description */}
                  <div className="tm-clean-card">
                    <label className="tm-input-card-label">
                      Session Agenda / Description <span className="text-muted text-xs">(Optional)</span>
                    </label>
                    <textarea
                      rows="3"
                      className="tm-clean-text-input"
                      style={{ resize: 'vertical' }}
                      placeholder="Key topics: Risk management, institutional liquidity zones, live market structure..."
                      value={editingLiveClass.description}
                      onChange={(e) => setEditingLiveClass({ ...editingLiveClass, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* FOOTER ACTION BAR WITH PROMINENT GREEN ACTION BUTTON */}
              <div className="tm-modal-footer-clean">
                <button
                  type="button"
                  className="tm-btn-cancel-clean"
                  onClick={() => setIsLiveClassModalOpen(false)}
                  disabled={savingLiveClass}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tm-btn-primary-green"
                  disabled={savingLiveClass}
                >
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

      {/* ------------------------------------------------------------------
          MODAL 4: PAYMENT CLAIM DETAILS REVIEW MODAL
          ------------------------------------------------------------------ */}
      {selectedClaim && (
        <div className="tm-admin-modal-overlay" onClick={() => setSelectedClaim(null)}>
          <div className="tm-admin-modal tm-claim-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-admin-modal-header">
              <div className="tm-claim-modal-title-row">
                <CreditCard size={18} />
                <h3>Manual Payment Claim Details</h3>
              </div>
              <button
                type="button"
                className="tm-admin-modal-close"
                onClick={() => setSelectedClaim(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-admin-modal-body tm-claim-details-body">
              <div className="tm-claim-dual-grid">
                {/* Left Column: Claim Information & Evidence */}
                <div className="tm-claim-info-col">
                  <div className="tm-claim-section-title">Student &amp; Course</div>
                  <div className="tm-claim-meta-list">
                    <div className="tm-claim-meta-row">
                      <span className="label">Student Name:</span>
                      <strong>{selectedClaim.student_name || 'N/A'}</strong>
                    </div>
                    <div className="tm-claim-meta-row">
                      <span className="label">Student Email:</span>
                      <span>{selectedClaim.student_email || selectedClaim.user_id}</span>
                    </div>
                    {selectedClaim.student_mobile && (
                      <div className="tm-claim-meta-row">
                        <span className="label">Phone:</span>
                        <span>{selectedClaim.student_mobile}</span>
                      </div>
                    )}
                    <div className="tm-claim-meta-row">
                      <span className="label">Course:</span>
                      <strong>{selectedClaim.course_title || `Course #${selectedClaim.course_id}`}</strong>
                    </div>
                    <div className="tm-claim-meta-row">
                      <span className="label">Course Fee:</span>
                      <strong className="tm-amount-highlight">₹{Number(selectedClaim.amount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <div className="tm-claim-section-title" style={{ marginTop: '16px' }}>Transaction Evidence</div>
                  <div className="tm-claim-meta-list">
                    <div className="tm-claim-meta-row">
                      <span className="label">Transaction Ref / UTR:</span>
                      <div className="tm-utr-code-wrap">
                        <code className="tm-utr-code-large">{selectedClaim.transaction_ref}</code>
                        <button
                          type="button"
                          className="tm-btn-icon-tiny"
                          title="Copy UTR"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedClaim.transaction_ref);
                            showNotification('UTR copied to clipboard!');
                          }}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="tm-claim-meta-row">
                      <span className="label">Submitted At:</span>
                      <span>
                        {new Date(selectedClaim.submitted_at || selectedClaim.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="tm-claim-meta-row">
                      <span className="label">Status:</span>
                      <span className={`tm-status-pill ${selectedClaim.status?.toLowerCase()}`}>
                        {selectedClaim.status}
                      </span>
                    </div>
                    {selectedClaim.reviewed_at && (
                      <div className="tm-claim-meta-row">
                        <span className="label">Reviewed At:</span>
                        <span>{new Date(selectedClaim.reviewed_at).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {selectedClaim.rejection_reason && (
                      <div className="tm-claim-rejection-box">
                        <span className="label">Rejection Reason:</span>
                        <p>{selectedClaim.rejection_reason}</p>
                      </div>
                    )}
                    {selectedClaim.admin_notes && (
                      <div className="tm-claim-notes-box">
                        <span className="label">Admin Notes:</span>
                        <p>{selectedClaim.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Screenshot Preview */}
                <div className="tm-claim-screenshot-col">
                  <div className="tm-claim-section-title">Payment Screenshot</div>
                  <div
                    className="tm-claim-screenshot-container"
                    onClick={() => setPreviewScreenshotClaim(selectedClaim)}
                    title="Click to view full image"
                  >
                    <img
                      src={`/api/admin/payment-claims/${selectedClaim.claim_id || selectedClaim.id}/screenshot?token=${localStorage.getItem('tm_token')}`}
                      alt="Payment Receipt"
                      className="tm-claim-screenshot-preview-img"
                    />
                    <div className="tm-claim-screenshot-overlay">
                      <Eye size={18} />
                      <span>Click to enlarge screenshot</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="tm-modal-actions-footer">
              <button
                type="button"
                className="tm-btn-outline"
                onClick={() => setSelectedClaim(null)}
              >
                Close
              </button>

              {selectedClaim.status === 'PENDING' && (
                <button
                  type="button"
                  className="tm-btn-secondary"
                  onClick={() => handleMarkUnderReview(selectedClaim.claim_id || selectedClaim.id)}
                >
                  Mark Under Review
                </button>
              )}

              {(selectedClaim.status === 'PENDING' || selectedClaim.status === 'UNDER_REVIEW') && (
                <>
                  <button
                    type="button"
                    className="tm-btn-danger"
                    onClick={() => {
                      setClaimToReject(selectedClaim);
                      setRejectionReason('');
                      setRejectNotes('');
                    }}
                  >
                    Reject Claim...
                  </button>
                  <button
                    type="button"
                    className="tm-btn-primary tm-btn-success"
                    onClick={() => {
                      setClaimToApprove(selectedClaim);
                      setApproveNotes('');
                    }}
                  >
                    Approve Payment &amp; Enroll
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
          MODAL 5: APPROVE PAYMENT CLAIM CONFIRMATION MODAL
          ------------------------------------------------------------------ */}
      {claimToApprove && (
        <div className="tm-admin-modal-overlay" onClick={() => !approvingClaim && setClaimToApprove(null)}>
          <div className="tm-admin-modal tm-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-admin-modal-header">
              <div className="tm-confirm-header-icon success">
                <CheckCircle size={22} />
              </div>
              <div>
                <h3>Confirm Payment Approval</h3>
                <span className="tm-admin-card-sub">Explicit authenticated verification required</span>
              </div>
              <button
                type="button"
                className="tm-admin-modal-close"
                onClick={() => !approvingClaim && setClaimToApprove(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-admin-modal-body">
              <div className="tm-confirm-details-card">
                <div className="tm-confirm-item">
                  <span className="label">Student:</span>
                  <strong>{claimToApprove.student_name}</strong> ({claimToApprove.student_email || claimToApprove.user_id})
                </div>
                <div className="tm-confirm-item">
                  <span className="label">Course:</span>
                  <strong>{claimToApprove.course_title || `Course #${claimToApprove.course_id}`}</strong>
                </div>
                <div className="tm-confirm-item">
                  <span className="label">Verified Amount:</span>
                  <strong className="tm-amount-highlight">₹{Number(claimToApprove.amount || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="tm-confirm-item">
                  <span className="label">Transaction Reference / UTR:</span>
                  <code>{claimToApprove.transaction_ref}</code>
                </div>
              </div>

              <div className="tm-alert-notice info" style={{ margin: '14px 0' }}>
                <CheckCircle size={16} />
                <div>
                  Confirming this payment will atomically transition the claim to <strong>APPROVED</strong>, record your administrator ID and review timestamp, create the student's active enrollment, and unlock the course in their dashboard.
                </div>
              </div>

              <div className="tm-form-group">
                <label>Admin Review Notes (Optional / Internal)</label>
                <input
                  type="text"
                  placeholder="e.g. Verified in ICICI / PhonePe merchant statement"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  className="tm-admin-input"
                />
              </div>
            </div>

            <div className="tm-modal-actions-footer">
              <button
                type="button"
                className="tm-btn-outline"
                onClick={() => setClaimToApprove(null)}
                disabled={approvingClaim}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tm-btn-primary tm-btn-success"
                onClick={handleApproveClaim}
                disabled={approvingClaim}
              >
                {approvingClaim ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Approving &amp; Enrolling...</span>
                  </>
                ) : (
                  'Confirm & Grant Course Access'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
          MODAL 6: REJECT PAYMENT CLAIM MODAL
          ------------------------------------------------------------------ */}
      {claimToReject && (
        <div className="tm-admin-modal-overlay" onClick={() => !rejectingClaim && setClaimToReject(null)}>
          <div className="tm-admin-modal tm-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-admin-modal-header">
              <div className="tm-confirm-header-icon danger">
                <XCircle size={22} />
              </div>
              <div>
                <h3>Reject Payment Claim</h3>
                <span className="tm-admin-card-sub">Mandatory reason will be visible to the student</span>
              </div>
              <button
                type="button"
                className="tm-admin-modal-close"
                onClick={() => !rejectingClaim && setClaimToReject(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-admin-modal-body">
              <div className="tm-confirm-details-card" style={{ marginBottom: '14px' }}>
                <div className="tm-confirm-item">
                  <span className="label">Student:</span>
                  <strong>{claimToReject.student_name}</strong>
                </div>
                <div className="tm-confirm-item">
                  <span className="label">Course:</span>
                  <strong>{claimToReject.course_title || `Course #${claimToReject.course_id}`}</strong>
                </div>
                <div className="tm-confirm-item">
                  <span className="label">UTR:</span>
                  <code>{claimToReject.transaction_ref}</code>
                </div>
              </div>

              <div className="tm-form-group">
                <label>Rejection Reason * (Student will see this in their dashboard)</label>
                <textarea
                  rows="3"
                  className="tm-admin-input"
                  placeholder="e.g. UTR number not found in bank statement, screenshot illegible, or incorrect amount paid."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>

              <div className="tm-form-group">
                <label>Internal Admin Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Checked with bank at 2:30 PM, no credit received."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="tm-admin-input"
                />
              </div>

              <div className="tm-alert-notice warning">
                <AlertCircle size={16} />
                <div>
                  Rejecting will decline course enrollment. The student will be notified and given the option to resubmit valid evidence with a corrected UTR and screenshot.
                </div>
              </div>
            </div>

            <div className="tm-modal-actions-footer">
              <button
                type="button"
                className="tm-btn-outline"
                onClick={() => setClaimToReject(null)}
                disabled={rejectingClaim}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tm-btn-danger"
                onClick={handleRejectClaim}
                disabled={rejectingClaim || !rejectionReason.trim()}
              >
                {rejectingClaim ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Rejecting Claim...</span>
                  </>
                ) : (
                  'Confirm Rejection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
          MODAL 7: FULL-SCREEN PAYMENT SCREENSHOT PREVIEW MODAL
          ------------------------------------------------------------------ */}
      {previewScreenshotClaim && (
        <div className="tm-admin-modal-overlay tm-screenshot-modal-overlay" onClick={() => setPreviewScreenshotClaim(null)}>
          <div className="tm-screenshot-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tm-screenshot-modal-header">
              <div>
                <h4>Payment Screenshot Evidence</h4>
                <span className="text-muted">
                  UTR: <code>{previewScreenshotClaim.transaction_ref}</code> • {previewScreenshotClaim.student_name || 'Student'}
                </span>
              </div>
              <div className="tm-screenshot-modal-header-actions">
                <a
                  href={`/api/admin/payment-claims/${previewScreenshotClaim.claim_id || previewScreenshotClaim.id}/screenshot?token=${localStorage.getItem('tm_token')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="tm-btn-icon-tiny"
                  title="Open full size in new tab"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  type="button"
                  className="tm-admin-modal-close"
                  onClick={() => setPreviewScreenshotClaim(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="tm-screenshot-modal-img-wrap">
              <img
                src={`/api/admin/payment-claims/${previewScreenshotClaim.claim_id || previewScreenshotClaim.id}/screenshot?token=${localStorage.getItem('tm_token')}`}
                alt="Full Payment Screenshot"
                className="tm-screenshot-modal-img"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
          MODAL 8: DELETE USER CONFIRMATION MODAL
          ------------------------------------------------------------------ */}
      {userToDelete && (
        <div className="tm-admin-modal-overlay" onClick={() => !deletingUser && setUserToDelete(null)}>
          <div className="tm-admin-modal tm-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-admin-modal-header">
              <div className="tm-confirm-header-icon danger">
                <Trash2 size={22} />
              </div>
              <div>
                <h3>Delete User Account</h3>
                <span className="tm-admin-card-sub">Permanent and irreversible action</span>
              </div>
              <button
                type="button"
                className="tm-admin-modal-close"
                onClick={() => !deletingUser && setUserToDelete(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-admin-modal-body">
              <div className="tm-confirm-details-card" style={{ marginBottom: '14px' }}>
                <div className="tm-confirm-item">
                  <span className="label">User Name:</span>
                  <strong>{userToDelete.name}</strong>
                </div>
                <div className="tm-confirm-item">
                  <span className="label">Email Address:</span>
                  <code>{userToDelete.email}</code>
                </div>
                {userToDelete.mobile && (
                  <div className="tm-confirm-item">
                    <span className="label">Mobile:</span>
                    <span>{userToDelete.mobile}</span>
                  </div>
                )}
                <div className="tm-confirm-item">
                  <span className="label">Role / Status:</span>
                  <span>{userToDelete.role} • {userToDelete.status || 'active'}</span>
                </div>
                {userToDelete.enrollments_count !== undefined && (
                  <div className="tm-confirm-item">
                    <span className="label">Enrolled Courses:</span>
                    <span>{userToDelete.enrollments_count}</span>
                  </div>
                )}
              </div>

              <div className="tm-alert-notice danger">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Warning:</strong> This will permanently delete <strong>{userToDelete.name}</strong>’s account and all associated data (enrollments, payments, lesson progress, and payment claims) safely from the database. This action cannot be undone.
                </div>
              </div>
            </div>

            <div className="tm-modal-actions-footer">
              <button
                type="button"
                className="tm-btn-outline"
                onClick={() => setUserToDelete(null)}
                disabled={deletingUser}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tm-btn-primary tm-btn-danger"
                onClick={handleDeleteUser}
                disabled={deletingUser}
              >
                {deletingUser ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Permanently Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------
          MODAL 9: RESET PLATFORM DATA CONFIRMATION MODAL
          ------------------------------------------------------------------ */}
      {showResetModal && (
        <div className="tm-admin-modal-overlay" onClick={() => !resettingPlatform && setShowResetModal(false)}>
          <div className="tm-admin-modal tm-confirm-modal tm-reset-platform-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-admin-modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div className="tm-confirm-header-icon danger">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ color: '#DC2626' }}>Reset Platform Data</h3>
                <span className="tm-admin-card-sub">Irreversible institutional data reset</span>
              </div>
              <button
                type="button"
                className="tm-admin-modal-close"
                onClick={() => !resettingPlatform && setShowResetModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-admin-modal-body">
              <div className="tm-alert-notice danger" style={{ marginBottom: '16px' }}>
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Critical Warning:</strong> This operation will permanently wipe all student admission records, course enrollments, and revenue metrics.
                </div>
              </div>

              <div className="tm-reset-scope-grid">
                <div className="tm-reset-scope-card reset-card">
                  <div className="tm-reset-scope-title">
                    <XCircle size={15} />
                    <span>Data to be Reset (Wiped):</span>
                  </div>
                  <ul className="tm-reset-scope-list">
                    <li><strong>Total Users:</strong> All student accounts (excluding Admin)</li>
                    <li><strong>Total Enrollments:</strong> Reset to 0 (all enrollments removed)</li>
                    <li><strong>Total Revenue:</strong> Reset to ₹0 (all payment history wiped)</li>
                    <li><strong>Payment Claims:</strong> All UPI receipts & claims</li>
                    <li><strong>Progress:</strong> All student lesson completion records</li>
                  </ul>
                </div>

                <div className="tm-reset-scope-card preserve-card">
                  <div className="tm-reset-scope-title">
                    <CheckCircle size={15} />
                    <span>Safely Preserved (Untouched):</span>
                  </div>
                  <ul className="tm-reset-scope-list">
                    <li><strong>Courses & Modules:</strong> All course content & videos</li>
                    <li><strong>Admin Accounts:</strong> Administrator access preserved</li>
                    <li><strong>Live Classes:</strong> Scheduled classes & Meet links</li>
                    <li><strong>Platform Settings:</strong> UPI QR code & configurations</li>
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label className="tm-input-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Type <code style={{ color: '#DC2626', background: 'rgba(220, 38, 38, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>RESET</code> below to confirm:
                </label>
                <input
                  type="text"
                  className="tm-admin-input"
                  placeholder="Type RESET here..."
                  value={resetConfirmInput}
                  onChange={(e) => setResetConfirmInput(e.target.value)}
                  disabled={resettingPlatform}
                  style={{ marginTop: '6px' }}
                />
              </div>
            </div>

            <div className="tm-modal-actions-footer">
              <button
                type="button"
                className="tm-btn-outline"
                onClick={() => setShowResetModal(false)}
                disabled={resettingPlatform}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tm-btn-primary tm-btn-danger"
                onClick={handleResetPlatformData}
                disabled={resettingPlatform || resetConfirmInput.trim().toUpperCase() !== 'RESET'}
              >
                {resettingPlatform ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Resetting Platform Data...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Confirm & Reset Platform Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

