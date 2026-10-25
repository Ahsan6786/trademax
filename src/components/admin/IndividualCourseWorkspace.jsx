import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Settings,
  Video,
  Calendar,
  Bell,
  FileText,
  Users,
  Send,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Upload,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Eye,
  Clock,
  ShieldCheck,
  UserPlus,
  X,
  Play,
  Copy,
  Check,
  Lock,
  Layers,
  Sparkles,
  Download,
} from 'lucide-react';
import './IndividualCourseWorkspace.css';
import { PdfViewerModal } from '../common/PdfViewerModal';

export const IndividualCourseWorkspace = ({ courseId, onBack, theme = 'dark' }) => {
  // 8 Required Sections (Section 7)
  const [activeSection, setActiveSection] = useState('overview');
  const [workspaceData, setWorkspaceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Video Form & S3 Direct Upload States (Section 8)
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    module_name: 'Module 1: Market Foundations',
    title: '',
    description: '',
    video_url: '',
    batch_name: 'November',
    duration_minutes: 45,
    sort_order: 1,
    release_at: '',
    availability_days: '',
    is_published: true,
  });
  const [videoFile, setVideoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | authorizing | uploading | verifying | done | error
  const [uploadError, setUploadError] = useState(null);
  const uploadXhrRef = useRef(null);
  const activeMultipartRef = useRef(null);
  const isCancelledRef = useRef(false);

  // Maximum allowed video file capacity: 5 GB
  const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '';
    const num = Number(bytes);
    if (num >= 1024 * 1024 * 1024) {
      return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Video Preview Modal
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    title: '',
    playbackUrl: '',
    loading: false,
  });

  // Live Class Form (Section 10)
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [editingLiveClass, setEditingLiveClass] = useState(null);
  const [liveForm, setLiveForm] = useState({
    title: '',
    meeting_link: '',
    scheduled_at: '',
    duration_minutes: 60,
    platform: 'Google Meet',
    description: '',
    instructor: 'Patil Trader',
    instructions: '',
    batch_name: 'November',
    is_published: true,
  });
  const [copiedMeetingId, setCopiedMeetingId] = useState(null);

  // Announcement Form (Section 11)
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    category: 'General',
    batch_name: 'All Batches',
    is_pinned: false,
    is_published: true,
  });

  // Course Materials Form (Section 12)
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [resourceFile, setResourceFile] = useState(null);
  const [isUploadingResource, setIsUploadingResource] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    resource_type: 'pdf',
    resource_url: '',
    batch_name: 'All Batches',
    is_published: true,
  });

  // In-App PDF Viewer State
  const [pdfViewerState, setPdfViewerState] = useState({
    isOpen: false,
    title: '',
    fileName: '',
    fileSize: '',
    viewUrl: '',
    downloadUrl: '',
    loading: false,
    error: null,
    resource: null,
  });

  // Enrolled Student Form (Section 13 & 14)
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    name: '',
    email: '',
    mobile: '',
    batch_name: 'November',
    trading_experience: 'Intermediate',
    notes: 'Authorized admin enrollment',
  });

  // Course Targeted Notification Form (Section 11)
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyForm, setNotifyForm] = useState({
    title: '',
    message: '',
    type: 'general',
    batch_name: 'All Batches',
  });

  // Course Settings Form (Section 15)
  const [courseSettings, setCourseSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Filter in Student List
  const [studentSearch, setStudentSearch] = useState('');

  // Module creation modal
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  // Helper for Auth Headers
  const getAuthHeaders = (isJson = true) => {
    const token = localStorage.getItem('tm_token');
    const headers = {};
    if (isJson) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch full Course Workspace data from PostgreSQL
  const fetchWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/courses/${courseId}/manage`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load course workspace.');
        return;
      }

      setWorkspaceData(data.data);
      const c = data.data.course;
      setCourseSettings({
        title: c.title || '',
        subtitle: c.subtitle || '',
        description: c.description || '',
        slug: c.slug || '',
        thumbnail: c.thumbnail || '/1-c.jpeg',
        price: c.price || 0,
        original_price: c.original_price || 0,
        discount_label: c.discount_label || '',
        duration: c.duration || '1 Month',
        level: c.level || 'Institutional Trading',
        learning_mode: c.learning_mode || 'Live Online',
        batch_name: c.batch_name || 'November',
        seats_available: c.seats_available || 15,
        is_published: Boolean(c.is_published),
      });
    } catch (err) {
      console.error('[Workspace Load Error]:', err);
      setError('Unable to reach server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  // Copy Google Meet link with visual feedback
  const handleCopyMeetingLink = (link, id) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedMeetingId(id);
    setTimeout(() => setCopiedMeetingId(null), 2500);
    showToast('Meeting link copied to clipboard.');
  };

  // =========================================================================
  // SECTION 8: RECORDED VIDEOS — AWS S3 DIRECT UPLOAD & CRUD
  // =========================================================================
  const handleOpenLessonModal = (lesson = null) => {
    setUploadError(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setVideoFile(null);

    if (lesson) {
      setEditingLesson(lesson);
      let releaseVal = '';
      if (lesson.release_at) {
        const d = new Date(lesson.release_at);
        releaseVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
      setLessonForm({
        module_name: lesson.module_name || 'Module 1: Market Foundations',
        title: lesson.title || '',
        description: lesson.description || '',
        video_url: lesson.video_url || '',
        batch_name: lesson.batch_name || workspaceData?.course?.batch_name || 'November',
        duration_minutes: lesson.duration_minutes || 45,
        sort_order: lesson.sort_order || 1,
        release_at: releaseVal,
        availability_days: lesson.availability_days !== null && lesson.availability_days !== undefined ? String(lesson.availability_days) : '',
        is_published: Boolean(lesson.is_published),
      });
    } else {
      setEditingLesson(null);
      const nextSort = (workspaceData?.lessons?.length || 0) + 1;
      setLessonForm({
        module_name: workspaceData?.modules?.[0]?.title || 'Module 1: Market Foundations',
        title: '',
        description: '',
        video_url: '',
        batch_name: workspaceData?.course?.batch_name || 'November',
        duration_minutes: 45,
        sort_order: nextSort,
        release_at: '',
        availability_days: '',
        is_published: true,
      });
    }
    setIsLessonModalOpen(true);
  };

  const handleCancelUpload = async () => {
    isCancelledRef.current = true;
    if (uploadXhrRef.current) {
      try {
        uploadXhrRef.current.abort();
      } catch (e) {
        console.warn('XHR abort error:', e);
      }
      uploadXhrRef.current = null;
    }

    if (activeMultipartRef.current) {
      const { s3Key, uploadId, targetCourseId } = activeMultipartRef.current;
      activeMultipartRef.current = null;
      try {
        await fetch(`/api/admin/courses/${targetCourseId}/videos/abort-upload`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          credentials: 'include',
          body: JSON.stringify({ s3Key, uploadId }),
        });
      } catch (err) {
        console.warn('[S3 Abort Upload Error]:', err);
      }
    }

    setIsUploading(false);
    setUploadStatus('idle');
    setUploadProgress(0);
    showToast('Upload cancelled.', 'error');
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) {
      showToast('Lesson title is required.', 'error');
      return;
    }

    if (!editingLesson && !videoFile && !lessonForm.video_url.trim()) {
      showToast('Please select a video file to upload to AWS S3, or provide a stream URL.', 'error');
      return;
    }

    if (videoFile && videoFile.size > MAX_VIDEO_BYTES) {
      showToast(`Selected file (${formatFileSize(videoFile.size)}) exceeds maximum allowed limit of 5 GB.`, 'error');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      isCancelledRef.current = false;

      // Path A: Direct AWS S3 Video Upload
      if (videoFile) {
        setUploadStatus('authorizing');

        // 1. Request presigned S3 upload authorization from backend
        const initRes = await fetch(`/api/admin/courses/${courseId}/videos/initiate-upload`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          credentials: 'include',
          body: JSON.stringify({
            title: lessonForm.title.trim(),
            filename: videoFile.name,
            contentType: videoFile.type || 'video/mp4',
            fileSize: videoFile.size,
            batch_name: lessonForm.batch_name || workspaceData?.course?.batch_name || 'November',
            module_name: lessonForm.module_name,
          }),
        });

        const initData = await initRes.json();
        if (!initRes.ok || !initData.success) {
          throw new Error(initData.error || 'Failed to initiate AWS S3 upload authorization.');
        }

        const { uploadUrl, s3Key, uploadType, uploadId } = initData;

        // 2. Direct upload to AWS S3
        setUploadStatus('uploading');

        if (uploadType === 'multipart') {
          // Track active multipart upload for cancellation cleanup
          activeMultipartRef.current = { s3Key, uploadId, targetCourseId: courseId };

          const partSize = initData.partSize || (videoFile.size > 2 * 1024 * 1024 * 1024 ? 25 * 1024 * 1024 : 10 * 1024 * 1024);
          const totalParts = Math.ceil(videoFile.size / partSize);
          const completedParts = [];
          let uploadedBytesBeforeCurrent = 0;

          for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
            if (isCancelledRef.current) {
              throw new Error('Upload was cancelled.');
            }

            const start = (partNumber - 1) * partSize;
            const end = Math.min(start + partSize, videoFile.size);
            const chunk = videoFile.slice(start, end);
            const chunkLength = end - start;

            // Step 2a: Request presigned URL for this chunk
            const partUrlRes = await fetch(`/api/admin/courses/${courseId}/videos/multipart-part-url`, {
              method: 'POST',
              headers: getAuthHeaders(true),
              credentials: 'include',
              body: JSON.stringify({
                s3Key,
                uploadId,
                partNumber,
              }),
            });

            const partUrlData = await partUrlRes.json();
            if (!partUrlRes.ok || !partUrlData.success || !partUrlData.partUrl) {
              throw new Error(partUrlData.error || `Failed to authorize upload for part ${partNumber}/${totalParts}.`);
            }

            // Step 2b: Upload chunk via XMLHttpRequest with progress tracking
            const etag = await new Promise((resolvePart, rejectPart) => {
              const xhr = new XMLHttpRequest();
              uploadXhrRef.current = xhr;

              xhr.upload.onprogress = (evt) => {
                if (evt.lengthComputable) {
                  const totalLoaded = uploadedBytesBeforeCurrent + evt.loaded;
                  const pct = Math.min(99, Math.round((totalLoaded / videoFile.size) * 100));
                  setUploadProgress(pct);
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  const rawEtag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag');
                  if (!rawEtag) {
                    rejectPart(new Error(`AWS S3 did not return ETag for part ${partNumber}. Check S3 CORS configuration.`));
                  } else {
                    resolvePart(rawEtag);
                  }
                } else {
                  rejectPart(new Error(`AWS S3 rejected part ${partNumber} (Status ${xhr.status}).`));
                }
              };

              xhr.onerror = () => rejectPart(new Error(`Network error while uploading part ${partNumber}/${totalParts}.`));
              xhr.onabort = () => rejectPart(new Error('Upload was cancelled.'));

              xhr.open('PUT', partUrlData.partUrl, true);
              xhr.send(chunk);
            });

            completedParts.push({
              partNumber,
              etag,
            });
            uploadedBytesBeforeCurrent += chunkLength;
          }

          // Step 3: Complete multipart upload and verify in PostgreSQL
          setUploadStatus('verifying');
          setUploadProgress(100);

          const compRes = await fetch(`/api/admin/courses/${courseId}/videos/complete-upload`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            credentials: 'include',
            body: JSON.stringify({
              uploadType: 'multipart',
              s3Key,
              uploadId,
              parts: completedParts,
              title: lessonForm.title.trim(),
              description: lessonForm.description,
              module_name: lessonForm.module_name,
              batch_name: lessonForm.batch_name,
              duration_minutes: lessonForm.duration_minutes,
              sort_order: lessonForm.sort_order,
              release_at: lessonForm.release_at || null,
              is_published: lessonForm.is_published,
              original_filename: videoFile.name,
              contentType: videoFile.type || 'video/mp4',
              fileSize: videoFile.size,
              lessonId: editingLesson ? editingLesson.id : null,
              availability_days: lessonForm.availability_days ? parseInt(lessonForm.availability_days, 10) : null,
            }),
          });

          const compData = await compRes.json();
          if (!compRes.ok || !compData.success) {
            throw new Error(compData.error || 'Failed to record video in database.');
          }

          activeMultipartRef.current = null;
          showToast('Video successfully uploaded to private AWS S3 and recorded in PostgreSQL.');
        } else {
          // Standard Single PUT Upload (<= 100MB)
          if (!uploadUrl) {
            throw new Error('Backend did not provide a valid S3 upload URL.');
          }

          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            uploadXhrRef.current = xhr;

            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable) {
                const pct = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
                setUploadProgress(pct);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`AWS S3 rejected upload (Status ${xhr.status}).`));
              }
            };

            xhr.onerror = () => reject(new Error('Network error during S3 upload. Check connection.'));
            xhr.onabort = () => reject(new Error('Upload was cancelled.'));

            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', videoFile.type || 'video/mp4');
            xhr.send(videoFile);
          });

          // Confirm with backend to verify HeadObject and persist metadata
          setUploadStatus('verifying');
          setUploadProgress(100);

          const compRes = await fetch(`/api/admin/courses/${courseId}/videos/complete-upload`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            credentials: 'include',
            body: JSON.stringify({
              uploadType: 'put',
              s3Key,
              uploadId,
              title: lessonForm.title.trim(),
              description: lessonForm.description,
              module_name: lessonForm.module_name,
              batch_name: lessonForm.batch_name,
              duration_minutes: lessonForm.duration_minutes,
              sort_order: lessonForm.sort_order,
              release_at: lessonForm.release_at || null,
              is_published: lessonForm.is_published,
              original_filename: videoFile.name,
              contentType: videoFile.type || 'video/mp4',
              fileSize: videoFile.size,
              lessonId: editingLesson ? editingLesson.id : null,
              availability_days: lessonForm.availability_days ? parseInt(lessonForm.availability_days, 10) : null,
            }),
          });

          const compData = await compRes.json();
          if (!compRes.ok || !compData.success) {
            throw new Error(compData.error || 'Failed to record video in database.');
          }

          showToast('Video successfully uploaded to private AWS S3 and recorded in PostgreSQL.');
        }
      } else {
        // Path B: Metadata update or legacy link update
        const url = editingLesson
          ? `/api/admin/courses/${courseId}/lessons/${editingLesson.id}`
          : `/api/admin/courses/${courseId}/lessons`;
        const method = editingLesson ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: getAuthHeaders(true),
          credentials: 'include',
          body: JSON.stringify({
            ...lessonForm,
            availability_days: lessonForm.availability_days ? parseInt(lessonForm.availability_days, 10) : null,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to save lesson.');
        }

        showToast(editingLesson ? 'Lesson updated.' : 'New lesson created.');
      }

      setIsLessonModalOpen(false);
      setVideoFile(null);
      fetchWorkspace();
    } catch (err) {
      console.error('[Lesson Save Error]:', err);
      if (activeMultipartRef.current) {
        const { s3Key, uploadId, targetCourseId } = activeMultipartRef.current;
        activeMultipartRef.current = null;
        fetch(`/api/admin/courses/${targetCourseId}/videos/abort-upload`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          credentials: 'include',
          body: JSON.stringify({ s3Key, uploadId }),
        }).catch(() => {});
      }
      setUploadError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsUploading(false);
      setUploadStatus('idle');
      uploadXhrRef.current = null;
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Are you sure you want to delete this recorded lesson from AWS S3 and PostgreSQL?')) return;
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(true),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Lesson deleted.');
        fetchWorkspace();
      } else {
        showToast(data.error || 'Failed to delete lesson.', 'error');
      }
    } catch (err) {
      showToast('Error deleting lesson.', 'error');
    }
  };

  const handleTogglePublishLesson = async (lesson) => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ is_published: !lesson.is_published }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(lesson.is_published ? 'Lesson unpublished.' : 'Lesson published to students.');
        fetchWorkspace();
      }
    } catch (err) {
      showToast('Failed to update publication status.', 'error');
    }
  };

  const handlePreviewVideo = async (lesson) => {
    try {
      setPreviewModal({
        isOpen: true,
        title: lesson.title,
        playbackUrl: '',
        loading: true,
      });

      const res = await fetch(`/api/admin/courses/${courseId}/videos/${lesson.id}/preview-url`, {
        headers: getAuthHeaders(true),
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to generate secure preview URL.', 'error');
        setPreviewModal({ isOpen: false, title: '', playbackUrl: '', loading: false });
        return;
      }

      setPreviewModal({
        isOpen: true,
        title: lesson.title,
        playbackUrl: data.playbackUrl,
        loading: false,
      });
    } catch (err) {
      showToast('Error requesting preview URL.', 'error');
      setPreviewModal({ isOpen: false, title: '', playbackUrl: '', loading: false });
    }
  };

  // Add Course Module
  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/modules`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({
          title: newModuleTitle.trim(),
          sort_order: (workspaceData?.modules?.length || 0) + 1,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Module created.');
        setNewModuleTitle('');
        setIsModuleModalOpen(false);
        fetchWorkspace();
      } else {
        showToast(data.error || 'Failed to create module.', 'error');
      }
    } catch (err) {
      showToast('Error creating module.', 'error');
    }
  };

  // =========================================================================
  // SECTION 10: LIVE CLASSES & GOOGLE MEET CRUD
  // =========================================================================
  const handleOpenLiveModal = (session = null) => {
    if (session) {
      setEditingLiveClass(session);
      let dateVal = '';
      if (session.scheduled_at) {
        const d = new Date(session.scheduled_at);
        dateVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
      setLiveForm({
        title: session.title || '',
        meeting_link: session.meeting_link || '',
        scheduled_at: dateVal,
        duration_minutes: session.duration_minutes || 60,
        platform: session.platform || 'Google Meet',
        description: session.description || '',
        instructor: session.instructor || 'Patil Trader',
        instructions: session.instructions || '',
        batch_name: session.batch_name || workspaceData?.course?.batch_name || 'November',
        is_published: session.is_published !== false,
      });
    } else {
      setEditingLiveClass(null);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const defaultDate = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setLiveForm({
        title: '',
        meeting_link: '',
        scheduled_at: defaultDate,
        duration_minutes: 60,
        platform: 'Google Meet',
        description: '',
        instructor: 'Patil Trader',
        instructions: 'Please join 5 minutes early with your TradingView charts ready.',
        batch_name: workspaceData?.course?.batch_name || 'November',
        is_published: true,
      });
    }
    setIsLiveModalOpen(true);
  };

  const handleSaveLiveClass = async (e) => {
    e.preventDefault();
    if (!liveForm.title.trim()) {
      showToast('Live class title is required.', 'error');
      return;
    }
    if (!liveForm.scheduled_at) {
      showToast('Scheduled date and time is required.', 'error');
      return;
    }

    try {
      const url = editingLiveClass
        ? `/api/admin/courses/${courseId}/live-classes/${editingLiveClass.id}`
        : `/api/admin/courses/${courseId}/live-classes`;
      const method = editingLiveClass ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(liveForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to save live session.', 'error');
        return;
      }

      showToast(editingLiveClass ? 'Live session updated.' : 'Google Meet session scheduled.');
      setIsLiveModalOpen(false);
      fetchWorkspace();
    } catch (err) {
      showToast('Error saving live class.', 'error');
    }
  };

  const handleDeleteLiveClass = async (sessionId) => {
    if (!window.confirm('Cancel and delete this scheduled live class?')) return;
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/live-classes/${sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(true),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Live session removed.');
        fetchWorkspace();
      } else {
        showToast(data.error || 'Failed to delete live class.', 'error');
      }
    } catch (err) {
      showToast('Error deleting live class.', 'error');
    }
  };

  // =========================================================================
  // SECTION 11: ANNOUNCEMENTS & NOTIFICATIONS
  // =========================================================================
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      showToast('Title and content are required.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/announcements`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(announcementForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to publish announcement.', 'error');
        return;
      }

      showToast('Course announcement published.');
      setIsAnnouncementModalOpen(false);
      setAnnouncementForm({
        title: '',
        content: '',
        category: 'General',
        batch_name: workspaceData?.course?.batch_name || 'All Batches',
        is_pinned: false,
        is_published: true,
      });
      fetchWorkspace();
    } catch (err) {
      showToast('Error publishing announcement.', 'error');
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Delete this course announcement?')) return;
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/announcements/${announcementId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(true),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Announcement deleted.');
        fetchWorkspace();
      } else {
        showToast(data.error || 'Failed to delete announcement.', 'error');
      }
    } catch (err) {
      showToast('Error deleting announcement.', 'error');
    }
  };

  const handleBroadcastNotification = async (e) => {
    e.preventDefault();
    if (!notifyForm.title.trim() || !notifyForm.message.trim()) {
      showToast('Title and message are required.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/notify`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(notifyForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to broadcast notification.', 'error');
        return;
      }

      showToast(`Notification sent to students (${notifyForm.batch_name}).`);
      setIsNotifyModalOpen(false);
      setNotifyForm({
        title: '',
        message: '',
        type: 'general',
        batch_name: workspaceData?.course?.batch_name || 'All Batches',
      });
      fetchWorkspace();
    } catch (err) {
      showToast('Error broadcasting notification.', 'error');
    }
  };

  // =========================================================================
  // SECTION 12: COURSE MATERIALS
  // =========================================================================
  const handleSaveResource = async (e) => {
    e.preventDefault();
    if (!resourceForm.title.trim()) {
      showToast('Resource title is required.', 'error');
      return;
    }

    if (resourceFile && resourceFile.size > 50 * 1024 * 1024) {
      showToast('Selected file exceeds the 50 MB limit. Please compress or choose a smaller file.', 'error');
      return;
    }

    setIsUploadingResource(true);
    try {
      const formData = new FormData();
      formData.append('title', resourceForm.title.trim());
      formData.append('description', resourceForm.description || '');
      formData.append('resource_type', resourceForm.resource_type || 'pdf');
      formData.append('batch_name', resourceForm.batch_name || 'All Batches');
      if (resourceForm.resource_url) formData.append('resource_url', resourceForm.resource_url.trim());
      if (resourceFile) formData.append('file', resourceFile);

      const res = await fetch(`/api/admin/courses/${courseId}/resources`, {
        method: 'POST',
        headers: getAuthHeaders(false),
        credentials: 'include',
        body: formData,
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = { error: `Server returned HTTP ${res.status}. Please check your connection or file size.` };
      }

      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to attach resource.', 'error');
        return;
      }

      showToast('Resource attached and published successfully.');
      setIsResourceModalOpen(false);
      setResourceFile(null);
      setResourceForm({
        title: '',
        description: '',
        resource_type: 'pdf',
        resource_url: '',
        batch_name: workspaceData?.course?.batch_name || 'All Batches',
        is_published: true,
      });
      fetchWorkspace();
    } catch (err) {
      console.error('[Upload Resource Network Error]:', err);
      showToast(err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')
        ? 'Network interrupted or server reset the connection during upload. Please verify file size and retry.'
        : 'Error uploading resource. Please check connection.', 'error');
    } finally {
      setIsUploadingResource(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Delete this course resource?')) return;
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/resources/${resourceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(true),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Resource deleted.');
        fetchWorkspace();
      } else {
        showToast(data.error || 'Failed to delete resource.', 'error');
      }
    } catch (err) {
      showToast('Error deleting resource.', 'error');
    }
  };

  const handleAdminDownloadResource = (item) => {
    if (!item) return;
    if (item.resource_url && /^https?:\/\//i.test(item.resource_url) && !item.s3_key) {
      window.open(item.resource_url, '_blank', 'noopener,noreferrer');
      return;
    }
    const token = localStorage.getItem('tm_token');
    const downloadEndpoint = `/api/admin/courses/${courseId}/resources/${item.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(downloadEndpoint, '_blank');
  };

  const handleOpenResource = async (item) => {
    if (!item) return;

    const isPdf =
      item.resource_type === 'pdf' ||
      item.file_name?.toLowerCase().endsWith('.pdf') ||
      item.content_type === 'application/pdf';

    // For non-PDF documents (Word, PPT, Excel, Zip), retain direct download
    if (!isPdf) {
      handleAdminDownloadResource(item);
      return;
    }

    // External URL fallback if not an S3/internal file
    if (item.resource_url && /^https?:\/\//i.test(item.resource_url) && !item.s3_key) {
      window.open(item.resource_url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Open In-App PDF Viewer Modal
    setPdfViewerState({
      isOpen: true,
      title: item.title,
      fileName: item.file_name || `${item.title}.pdf`,
      fileSize: item.file_size,
      viewUrl: '',
      downloadUrl: '',
      loading: true,
      error: null,
      resource: item,
    });

    try {
      const token = localStorage.getItem('tm_token');
      const viewEndpoint = `/api/admin/courses/${courseId}/resources/${item.id}/download?inline=true&json=true${token ? `&token=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(viewEndpoint, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve secure PDF stream.');
      }

      setPdfViewerState((prev) => ({
        ...prev,
        viewUrl: data.viewUrl || data.url,
        downloadUrl: data.downloadUrl || data.url,
        fileName: data.fileName || prev.fileName,
        fileSize: data.fileSize || prev.fileSize,
        loading: false,
        error: null,
      }));
    } catch (err) {
      console.error('[Open PDF Viewer Error]:', err);
      setPdfViewerState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Could not load PDF document.',
      }));
    }
  };

  // =========================================================================
  // SECTION 13: STUDENTS MANAGEMENT
  // =========================================================================
  const handleManualEnroll = async (e) => {
    e.preventDefault();
    if (!enrollForm.name.trim() || !enrollForm.email.trim()) {
      showToast('Student name and email are required.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(enrollForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to enroll student.', 'error');
        return;
      }

      showToast('Student successfully enrolled and authorized in course.');
      setIsEnrollModalOpen(false);
      setEnrollForm({
        name: '',
        email: '',
        mobile: '',
        batch_name: workspaceData?.course?.batch_name || 'November',
        trading_experience: 'Intermediate',
        notes: 'Authorized admin enrollment',
      });
      fetchWorkspace();
    } catch (err) {
      showToast('Error enrolling student.', 'error');
    }
  };

  const handleRevokeEnrollment = async (enrollmentId) => {
    if (!window.confirm('Revoke and delete this student enrollment?')) return;
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/students/${enrollmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(true),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Enrollment revoked.');
        fetchWorkspace();
      } else {
        showToast(data.error || 'Failed to revoke enrollment.', 'error');
      }
    } catch (err) {
      showToast('Error revoking enrollment.', 'error');
    }
  };

  // =========================================================================
  // SECTION 15: COURSE SETTINGS
  // =========================================================================
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(courseSettings),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to save course settings.', 'error');
        return;
      }

      showToast('Course settings updated successfully.');
      fetchWorkspace();
    } catch (err) {
      showToast('Error saving course settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Filter students
  const filteredStudents = (workspaceData?.students || []).filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.mobile && s.mobile.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`tm-admin-workspace tm-theme-${theme}`}>
      {/* Toast Notification */}
      {toast && (
        <div className={`tm-workspace-toast tm-toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)}>
            &times;
          </button>
        </div>
      )}

      {/* Top Header / Breadcrumbs Bar */}
      <div className="tm-workspace-header">
        <div className="tm-workspace-nav-left">
          <button type="button" className="tm-workspace-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Back to Courses</span>
          </button>
          <span className="tm-workspace-sep">/</span>
          <span className="tm-workspace-course-title">
            {workspaceData?.course?.title || 'Course Workspace'}
          </span>
          {workspaceData?.course && (
            <span
              className={`tm-workspace-pub-badge ${
                workspaceData.course.is_published ? 'pub' : 'draft'
              }`}
            >
              {workspaceData.course.is_published ? 'PUBLISHED' : 'DRAFT'}
            </span>
          )}
          <span className="tm-workspace-batch-tag">
            {workspaceData?.course?.batch_name || 'November'} Batch
          </span>
        </div>

        <div className="tm-workspace-nav-right">
          <button
            type="button"
            className="tm-btn-refresh-ws"
            onClick={fetchWorkspace}
            title="Sync with PostgreSQL"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {loading && !workspaceData ? (
        <div className="tm-workspace-loading">
          <RefreshCw size={24} className="spin" />
          <span>Loading course workspace from PostgreSQL...</span>
        </div>
      ) : error ? (
        <div className="tm-workspace-error">
          <AlertCircle size={28} />
          <p>{error}</p>
          <button type="button" className="tm-btn-primary" onClick={fetchWorkspace}>
            Retry Sync
          </button>
        </div>
      ) : (
        <>
          {/* Quick Metrics Bar */}
          <div className="tm-workspace-metrics-bar">
            <div className="tm-ws-metric">
              <span className="label">Enrolled Students</span>
              <span className="val">{workspaceData?.reports?.totalEnrolled || 0}</span>
            </div>
            <div className="tm-ws-metric">
              <span className="label">Recorded Lessons</span>
              <span className="val">{workspaceData?.reports?.totalLessons || 0}</span>
            </div>
            <div className="tm-ws-metric">
              <span className="label">Live Classes</span>
              <span className="val">{workspaceData?.reports?.upcomingLiveSessions || 0}</span>
            </div>
            <div className="tm-ws-metric">
              <span className="label">Announcements</span>
              <span className="val">{workspaceData?.announcements?.length || 0}</span>
            </div>
            <div className="tm-ws-metric">
              <span className="label">Materials & PDFs</span>
              <span className="val">{workspaceData?.resources?.length || 0}</span>
            </div>
            <div className="tm-ws-metric">
              <span className="label">Average Progress</span>
              <span className="val">{workspaceData?.reports?.averageProgress || 0}%</span>
            </div>
          </div>

          {/* 8 Required Navigation Tabs (Section 7) */}
          <div className="tm-workspace-tabs-bar">
            <button
              type="button"
              className={`tm-ws-tab-btn ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              <Eye size={15} />
              <span>Overview</span>
            </button>

            <button
              type="button"
              className={`tm-ws-tab-btn ${activeSection === 'recorded-videos' ? 'active' : ''}`}
              onClick={() => setActiveSection('recorded-videos')}
            >
              <Video size={15} />
              <span>Recorded Videos ({workspaceData?.lessons?.length || 0})</span>
            </button>

            <button
              type="button"
              className={`tm-ws-tab-btn ${activeSection === 'live-classes' ? 'active' : ''}`}
              onClick={() => setActiveSection('live-classes')}
            >
              <Calendar size={15} />
              <span>Live Classes ({workspaceData?.liveClasses?.length || 0})</span>
            </button>

            <button
              type="button"
              className={`tm-ws-tab-btn ${activeSection === 'announcements' ? 'active' : ''}`}
              onClick={() => setActiveSection('announcements')}
            >
              <Bell size={15} />
              <span>Announcements ({workspaceData?.announcements?.length || 0})</span>
            </button>

            <button
              type="button"
              className={`tm-ws-tab-btn ${activeSection === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveSection('notifications')}
            >
              <Send size={15} />
              <span>Notifications ({workspaceData?.notifications?.length || 0})</span>
            </button>

            <button
              type="button"
              className={`tm-ws-tab-btn ${activeSection === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveSection('materials')}
            >
              <FileText size={15} />
              <span>Course Materials ({workspaceData?.resources?.length || 0})</span>
            </button>

            <button
              type="button"
              className={`tm-ws-tab-btn ${activeSection === 'students' ? 'active' : ''}`}
              onClick={() => setActiveSection('students')}
            >
              <Users size={15} />
              <span>Students ({workspaceData?.students?.length || 0})</span>
            </button>

            <button
              type="button"
              className={`tm-ws-tab-btn ${activeSection === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveSection('settings')}
            >
              <Settings size={15} />
              <span>Course Settings</span>
            </button>
          </div>

          {/* Tab Content Panes */}
          <div className="tm-workspace-content-pane">
            {/* ==============================================================
                SECTION 1: OVERVIEW (Section 6 & 7)
                ============================================================== */}
            {activeSection === 'overview' && (
              <div className="tm-ws-section">
                <div className="tm-ws-overview-card">
                  <div className="tm-ws-overview-media">
                    <img
                      src={workspaceData?.course?.thumbnail || '/1-c.jpeg'}
                      alt={workspaceData?.course?.title}
                      className="tm-ws-overview-thumb"
                      onError={(e) => {
                        e.target.src = '/1-c.jpeg';
                      }}
                    />
                    <div className="tm-ws-media-badge-group">
                      <span
                        className={`tm-workspace-pub-badge ${
                          workspaceData?.course?.is_published ? 'pub' : 'draft'
                        }`}
                      >
                        {workspaceData?.course?.is_published ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                      <span className="tm-ws-pill-dark">
                        {workspaceData?.course?.batch_name} Batch
                      </span>
                    </div>
                  </div>

                  <div className="tm-ws-overview-content">
                    <div className="tm-ws-overview-header-row">
                      <div>
                        <span className="tm-ws-overview-sub">
                          {workspaceData?.course?.learning_mode} · {workspaceData?.course?.level}
                        </span>
                        <h2 className="tm-ws-overview-h2">{workspaceData?.course?.title}</h2>
                      </div>
                      <div className="tm-ws-overview-price-tag">
                        <span className="bold-price">
                          ₹{parseFloat(workspaceData?.course?.price || 0).toLocaleString('en-IN')}
                        </span>
                        {workspaceData?.course?.original_price && (
                          <span className="strike-price">
                            ₹{parseFloat(workspaceData?.course?.original_price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="tm-ws-overview-desc">{workspaceData?.course?.description}</p>

                    <div className="tm-ws-overview-chips-grid">
                      <div className="tm-overview-chip">
                        <span className="chip-label">Duration</span>
                        <span className="chip-val">{workspaceData?.course?.duration}</span>
                      </div>
                      <div className="tm-overview-chip">
                        <span className="chip-label">Available Seats</span>
                        <span className="chip-val">{workspaceData?.course?.seats_available}</span>
                      </div>
                      <div className="tm-overview-chip">
                        <span className="chip-label">Enrolled Students</span>
                        <span className="chip-val">{workspaceData?.reports?.totalEnrolled || 0}</span>
                      </div>
                      <div className="tm-overview-chip">
                        <span className="chip-label">Recorded Modules</span>
                        <span className="chip-val">{workspaceData?.lessons?.length || 0}</span>
                      </div>
                    </div>

                    <div className="tm-ws-overview-actions">
                      <button
                        type="button"
                        className="tm-btn-primary"
                        onClick={() => handleOpenLessonModal()}
                      >
                        <Upload size={14} />
                        <span>Upload Video to S3</span>
                      </button>
                      <button
                        type="button"
                        className="tm-btn-outline-xs"
                        onClick={() => setActiveSection('live-classes')}
                      >
                        <Calendar size={14} />
                        <span>Schedule Live Class</span>
                      </button>
                      <button
                        type="button"
                        className="tm-btn-outline-xs"
                        onClick={() => setActiveSection('settings')}
                      >
                        <Settings size={14} />
                        <span>Edit Course Settings</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Overview */}
                <div className="tm-ws-content-overview-block">
                  <h3 className="tm-ws-subhead">Content & Curriculum Overview</h3>
                  {workspaceData?.course?.topics && (
                    <div className="tm-ws-topics-box">
                      <h4>Core Topics Covered</h4>
                      <div className="tm-ws-topics-pills">
                        {(Array.isArray(workspaceData.course.topics)
                          ? workspaceData.course.topics
                          : []
                        ).map((topic, i) => (
                          <span key={i} className="tm-topic-pill">
                            ✓ {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {workspaceData?.course?.learning_outcomes && (
                    <div className="tm-ws-outcomes-box">
                      <h4>Learning Outcomes</h4>
                      <p>{workspaceData.course.learning_outcomes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==============================================================
                SECTION 2: RECORDED VIDEOS (Direct AWS S3 Upload)
                ============================================================== */}
            {activeSection === 'recorded-videos' && (
              <div className="tm-ws-section">
                <div className="tm-ws-section-head">
                  <div>
                    <h3>Recorded Videos (AWS S3 Storage)</h3>
                    <p>
                      Encrypted S3 video storage with time-limited presigned streaming URLs and batch
                      access controls.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="tm-btn-outline-xs"
                      onClick={() => setIsModuleModalOpen(true)}
                    >
                      <Plus size={14} />
                      <span>New Module</span>
                    </button>
                    <button
                      type="button"
                      className="tm-btn-primary"
                      onClick={() => handleOpenLessonModal()}
                    >
                      <Upload size={14} />
                      <span>Upload Video to S3</span>
                    </button>
                  </div>
                </div>

                {workspaceData?.lessons?.length === 0 ? (
                  <div className="tm-ws-empty-box">
                    <Video size={40} />
                    <h4>No recorded videos in S3 storage</h4>
                    <p>
                      Upload recorded MP4/WebM video lessons directly to your private AWS S3 bucket.
                    </p>
                    <button
                      type="button"
                      className="tm-btn-primary"
                      onClick={() => handleOpenLessonModal()}
                    >
                      Upload First Video
                    </button>
                  </div>
                ) : (
                  <div className="tm-ws-lessons-list">
                    {workspaceData.lessons.map((lesson, idx) => (
                      <div key={lesson.id} className="tm-ws-lesson-row">
                        <div className="tm-ws-lesson-order">#{lesson.sort_order || idx + 1}</div>
                        <div className="tm-ws-lesson-body">
                          <div className="tm-ws-lesson-meta">
                            <span className="tm-badge-module">{lesson.module_name}</span>
                            <span className="tm-ws-duration">⏱ {lesson.duration_minutes || 30} mins</span>
                            <span className="tm-ws-batch-pill">{lesson.batch_name || 'November'}</span>

                            {lesson.s3_key ? (
                              <span className="tm-s3-badge" title={lesson.s3_key}>
                                <ShieldCheck size={12} /> AWS S3 ENCRYPTED
                                {lesson.file_size
                                  ? ` (${formatFileSize(lesson.file_size)})`
                                  : ''}
                              </span>
                            ) : (
                              <span className="tm-badge-dim">External Link</span>
                            )}

                            <span
                              className={`tm-status-pill ${lesson.is_published ? 'active' : 'draft'}`}
                            >
                              {lesson.is_published ? 'PUBLISHED' : 'DRAFT'}
                            </span>

                            {lesson.release_at && (
                              <span className="tm-release-tag">
                                📅 Release: {new Date(lesson.release_at).toLocaleDateString()}
                              </span>
                            )}

                            {lesson.expires_at ? (
                              <span
                                className={`tm-expiry-badge ${new Date(lesson.expires_at) <= new Date() ? 'expired' : 'active'}`}
                                title={`Expires: ${new Date(lesson.expires_at).toLocaleString()}`}
                              >
                                {new Date(lesson.expires_at) <= new Date() ? (
                                  <>⚠️ EXPIRED ({new Date(lesson.expires_at).toLocaleDateString()})</>
                                ) : (
                                  <>⏳ Expires: {new Date(lesson.expires_at).toLocaleDateString()}</>
                                )}
                              </span>
                            ) : (
                              <span className="tm-expiry-badge forever" title="Always Available / Never Expires">
                                ♾️ Never Expires
                              </span>
                            )}
                          </div>

                          <h4 className="tm-ws-lesson-title">{lesson.title}</h4>
                          {lesson.description && (
                            <p className="tm-ws-lesson-desc">{lesson.description}</p>
                          )}
                        </div>

                        <div className="tm-ws-actions">
                          <button
                            type="button"
                            className="tm-btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => handlePreviewVideo(lesson)}
                            title="Preview Video with S3 Presigned URL"
                          >
                            <Play size={13} />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            className="tm-btn-outline-xs"
                            onClick={() => handleTogglePublishLesson(lesson)}
                            title={lesson.is_published ? 'Unpublish' : 'Publish'}
                          >
                            {lesson.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            className="tm-btn-outline-xs"
                            onClick={() => handleOpenLessonModal(lesson)}
                            title="Edit Metadata / Replace File"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            type="button"
                            className="tm-btn-outline-xs danger"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            title="Delete from S3 and Database"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                SECTION 3: LIVE CLASSES (Google Meet)
                ============================================================== */}
            {activeSection === 'live-classes' && (
              <div className="tm-ws-section">
                <div className="tm-ws-section-head">
                  <div>
                    <h3>Google Meet Live Classes</h3>
                    <p>Schedule batch-specific live interactive trading sessions and practical workshops.</p>
                  </div>
                  <button
                    type="button"
                    className="tm-btn-primary"
                    onClick={() => handleOpenLiveModal()}
                  >
                    <Plus size={16} />
                    <span>Schedule Google Meet</span>
                  </button>
                </div>

                {workspaceData?.liveClasses?.length === 0 ? (
                  <div className="tm-ws-empty-box">
                    <Calendar size={40} />
                    <h4>No live classes scheduled</h4>
                    <p>Schedule an interactive Google Meet class for your enrolled batch.</p>
                    <button
                      type="button"
                      className="tm-btn-primary"
                      onClick={() => handleOpenLiveModal()}
                    >
                      Schedule Class
                    </button>
                  </div>
                ) : (
                  <div className="tm-ws-live-grid">
                    {workspaceData.liveClasses.map((session) => (
                      <div key={session.id} className="tm-ws-live-card">
                        <div className="tm-ws-live-card-top">
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="tm-badge-live">[{session.platform.toUpperCase()}]</span>
                            <span className="tm-ws-batch-pill">{session.batch_name} Batch</span>
                          </div>
                          <div className="tm-ws-actions">
                            <button
                              type="button"
                              className="tm-btn-outline-xs"
                              onClick={() => handleOpenLiveModal(session)}
                              title="Edit Session"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              className="tm-btn-outline-xs danger"
                              onClick={() => handleDeleteLiveClass(session.id)}
                              title="Delete Session"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <h4 className="tm-ws-live-title">{session.title}</h4>
                        {session.description && (
                          <p className="tm-ws-live-desc">{session.description}</p>
                        )}

                        <div className="tm-ws-live-details">
                          <div>
                            <span className="label">Date & Time:</span>
                            <span className="val">
                              {new Date(session.scheduled_at).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="label">Instructor:</span>
                            <span className="val">{session.instructor}</span>
                          </div>
                          <div>
                            <span className="label">Duration:</span>
                            <span className="val">{session.duration_minutes} Mins</span>
                          </div>
                          {session.instructions && (
                            <div>
                              <span className="label">Instructions:</span>
                              <span className="val">{session.instructions}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button
                            type="button"
                            className="tm-btn-outline-xs"
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => handleCopyMeetingLink(session.meeting_link, session.id)}
                          >
                            {copiedMeetingId === session.id ? (
                              <>
                                <Check size={13} color="#22c55e" />
                                <span style={{ color: '#22c55e' }}>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                          <a
                            href={session.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tm-btn-primary"
                            style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                          >
                            <ExternalLink size={13} />
                            <span>Join / Test</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                SECTION 4: ANNOUNCEMENTS (Section 11)
                ============================================================== */}
            {activeSection === 'announcements' && (
              <div className="tm-ws-section">
                <div className="tm-ws-section-head">
                  <div>
                    <h3>Course Announcements</h3>
                    <p>Broadcast schedule notices, trading desk updates, and batch alerts.</p>
                  </div>
                  <button
                    type="button"
                    className="tm-btn-primary"
                    onClick={() => setIsAnnouncementModalOpen(true)}
                  >
                    <Plus size={16} />
                    <span>Publish Announcement</span>
                  </button>
                </div>

                {workspaceData?.announcements?.length === 0 ? (
                  <div className="tm-ws-empty-box">
                    <Bell size={40} />
                    <h4>No announcements published</h4>
                    <p>Post updates that appear directly inside the enrolled student classroom.</p>
                  </div>
                ) : (
                  <div className="tm-ws-announcements-list">
                    {workspaceData.announcements.map((item) => (
                      <div key={item.id} className="tm-ws-notice-card">
                        <div className="tm-ws-notice-head">
                          <div className="tm-ws-notice-tags">
                            <span className="tm-badge-category">[{item.category.toUpperCase()}]</span>
                            <span className="tm-ws-batch-pill">{item.batch_name || 'All Batches'}</span>
                            {item.is_pinned && <span className="tm-badge-urgent">📌 PINNED</span>}
                            <span className="tm-ws-notice-date">
                              {new Date(item.created_at).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="tm-btn-outline-xs danger"
                            onClick={() => handleDeleteAnnouncement(item.id)}
                            title="Delete Notice"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <h4 className="tm-ws-notice-title">{item.title}</h4>
                        <p className="tm-ws-notice-content">{item.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                SECTION 5: NOTIFICATIONS (Section 11)
                ============================================================== */}
            {activeSection === 'notifications' && (
              <div className="tm-ws-section">
                <div className="tm-ws-section-head">
                  <div>
                    <h3>In-App Student Notifications</h3>
                    <p>Push instant notifications to eligible students enrolled in this course.</p>
                  </div>
                  <button
                    type="button"
                    className="tm-btn-primary"
                    onClick={() => setIsNotifyModalOpen(true)}
                  >
                    <Send size={15} />
                    <span>Send Notification</span>
                  </button>
                </div>

                {workspaceData?.notifications?.length === 0 ? (
                  <div className="tm-ws-empty-box">
                    <Send size={40} />
                    <h4>No notification logs</h4>
                    <p>System automatically notifies students when new lectures or classes are posted.</p>
                  </div>
                ) : (
                  <div className="tm-ws-notifs-list">
                    {workspaceData.notifications.map((notif) => (
                      <div key={notif.id} className="tm-ws-notif-row">
                        <div className="tm-ws-notif-icon">
                          <Bell size={18} />
                        </div>
                        <div className="tm-ws-notif-body">
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <h4>{notif.title}</h4>
                            <span className="tm-ws-batch-pill">{notif.batch_name || 'All Batches'}</span>
                            <span className="tm-ws-notice-date">
                              {new Date(notif.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p>{notif.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                SECTION 6: COURSE MATERIALS (Section 12)
                ============================================================== */}
            {activeSection === 'materials' && (
              <div className="tm-ws-section">
                <div className="tm-ws-section-head">
                  <div>
                    <h3>Course Materials, Notes & PDFs</h3>
                    <p>Downloadable trading plan templates, risk calculators, assignments, and notes.</p>
                  </div>
                  <button
                    type="button"
                    className="tm-btn-primary"
                    onClick={() => setIsResourceModalOpen(true)}
                  >
                    <Plus size={16} />
                    <span>Attach Material / PDF</span>
                  </button>
                </div>

                {workspaceData?.resources?.length === 0 ? (
                  <div className="tm-ws-empty-box">
                    <FileText size={40} />
                    <h4>No materials uploaded</h4>
                    <p>Attach notes, cheat sheets, or rulebooks for enrolled students.</p>
                  </div>
                ) : (
                  <div className="tm-ws-resources-grid">
                    {workspaceData.resources.map((item) => (
                      <div key={item.id} className="tm-ws-res-card">
                        <div className="tm-ws-res-top">
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="tm-badge-res-type">{item.resource_type.toUpperCase()}</span>
                            <span className="tm-ws-batch-pill">{item.batch_name || 'All Batches'}</span>
                          </div>
                          <button
                            type="button"
                            className="tm-btn-outline-xs danger"
                            onClick={() => handleDeleteResource(item.id)}
                            title="Delete Resource"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <h4 className="tm-ws-res-title">{item.title}</h4>
                        {item.description && <p className="tm-ws-res-desc">{item.description}</p>}

                        <div className="tm-ws-res-footer">
                          <span className="tm-ws-res-meta">
                            {item.file_size ? `${item.file_size} · ` : ''}
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                          {item.resource_type === 'pdf' || item.file_name?.toLowerCase().endsWith('.pdf') ? (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenResource(item)}
                                className="tm-btn-primary-xs"
                                title="View PDF Document In-App"
                              >
                                <Eye size={12} />
                                <span>View PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdminDownloadResource(item)}
                                className="tm-btn-outline-xs"
                                title="Download PDF File"
                              >
                                <Download size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAdminDownloadResource(item)}
                              className="tm-btn-outline-xs"
                              title="Download Material"
                            >
                              <Download size={12} />
                              <span>Download</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                SECTION 7: ENROLLED STUDENTS (Section 13 & 14)
                ============================================================== */}
            {activeSection === 'students' && (
              <div className="tm-ws-section">
                <div className="tm-ws-section-head">
                  <div>
                    <h3>Authorized Enrolled Students</h3>
                    <p>Verified enrolled students authorized for this course in PostgreSQL.</p>
                  </div>
                  <button
                    type="button"
                    className="tm-btn-primary"
                    onClick={() => setIsEnrollModalOpen(true)}
                  >
                    <UserPlus size={16} />
                    <span>Enroll Student Manually</span>
                  </button>
                </div>

                <div className="tm-ws-search-bar">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by student name, email, or mobile..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="tm-ws-empty-box">
                    <Users size={40} />
                    <h4>No enrolled students found</h4>
                    <p>Enrolled students will appear here upon payment or manual enrollment.</p>
                  </div>
                ) : (
                  <div className="tm-ws-table-wrap">
                    <table className="tm-ws-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Batch</th>
                          <th>Payment</th>
                          <th>Progress</th>
                          <th>Enrolled Date</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <div className="tm-student-cell">
                                <span className="s-name">{s.name}</span>
                                <span className="s-email">{s.email}</span>
                                {s.mobile && <span className="s-mobile">{s.mobile}</span>}
                              </div>
                            </td>
                            <td>
                              <span className="tm-ws-batch-pill">{s.batch_name}</span>
                            </td>
                            <td>
                              <span className="tm-status-pill active">
                                {s.payment_status?.toUpperCase() || 'PAID'} (₹{s.amount_paid})
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="tm-mini-progress-bar">
                                  <div
                                    className="bar-fill"
                                    style={{ width: `${s.progress_percentage || 0}%` }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                  {s.progress_percentage || 0}%
                                </span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                {new Date(s.enrolled_at).toLocaleDateString()}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="tm-btn-outline-xs danger"
                                onClick={() => handleRevokeEnrollment(s.id)}
                                title="Revoke Enrollment"
                              >
                                Revoke
                              </button>
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
                SECTION 8: COURSE SETTINGS (Section 15)
                ============================================================== */}
            {activeSection === 'settings' && courseSettings && (
              <div className="tm-ws-section">
                <div className="tm-ws-section-head">
                  <div>
                    <h3>Course Configuration & Batch Parameters</h3>
                    <p>Adjust pricing, seat quotas, batch schedule, and public presentation.</p>
                  </div>
                  <button
                    type="submit"
                    form="course-settings-form"
                    className="tm-btn-primary"
                    disabled={savingSettings}
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

                <form id="course-settings-form" onSubmit={handleSaveSettings} className="tm-ws-form-grid">
                  <div className="tm-ws-form-group col-2">
                    <label>Course Title</label>
                    <input
                      type="text"
                      value={courseSettings.title}
                      onChange={(e) => setCourseSettings({ ...courseSettings, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="tm-ws-form-group col-2">
                    <label>Course Subtitle</label>
                    <input
                      type="text"
                      value={courseSettings.subtitle}
                      onChange={(e) => setCourseSettings({ ...courseSettings, subtitle: e.target.value })}
                    />
                  </div>

                  <div className="tm-ws-form-group col-full">
                    <label>Description</label>
                    <textarea
                      rows={3}
                      value={courseSettings.description}
                      onChange={(e) => setCourseSettings({ ...courseSettings, description: e.target.value })}
                    />
                  </div>

                  <div className="tm-ws-form-group">
                    <label>Price (₹)</label>
                    <input
                      type="number"
                      value={courseSettings.price}
                      onChange={(e) => setCourseSettings({ ...courseSettings, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="tm-ws-form-group">
                    <label>Original Price (₹)</label>
                    <input
                      type="number"
                      value={courseSettings.original_price}
                      onChange={(e) => setCourseSettings({ ...courseSettings, original_price: e.target.value })}
                    />
                  </div>

                  <div className="tm-ws-form-group">
                    <label>Duration</label>
                    <input
                      type="text"
                      value={courseSettings.duration}
                      onChange={(e) => setCourseSettings({ ...courseSettings, duration: e.target.value })}
                    />
                  </div>

                  <div className="tm-ws-form-group">
                    <label>Batch Name</label>
                    <input
                      type="text"
                      value={courseSettings.batch_name}
                      onChange={(e) => setCourseSettings({ ...courseSettings, batch_name: e.target.value })}
                    />
                  </div>

                  <div className="tm-ws-form-group">
                    <label>Seats Available</label>
                    <input
                      type="number"
                      value={courseSettings.seats_available}
                      onChange={(e) => setCourseSettings({ ...courseSettings, seats_available: e.target.value })}
                    />
                  </div>

                  <div className="tm-ws-form-group">
                    <label>Learning Mode</label>
                    <select
                      value={courseSettings.learning_mode}
                      onChange={(e) => setCourseSettings({ ...courseSettings, learning_mode: e.target.value })}
                    >
                      <option value="Live Online">Live Online</option>
                      <option value="Hybrid (Live + Recorded)">Hybrid (Live + Recorded)</option>
                      <option value="Self-Paced Mentorship">Self-Paced Mentorship</option>
                      <option value="In-Person Immersion">In-Person Immersion</option>
                    </select>
                  </div>

                  <div className="tm-ws-form-group col-2">
                    <label>Thumbnail Path</label>
                    <input
                      type="text"
                      value={courseSettings.thumbnail}
                      onChange={(e) => setCourseSettings({ ...courseSettings, thumbnail: e.target.value })}
                    />
                  </div>

                  <div className="tm-ws-form-group col-2">
                    <label>Publish Status</label>
                    <select
                      value={courseSettings.is_published ? 'true' : 'false'}
                      onChange={(e) =>
                        setCourseSettings({ ...courseSettings, is_published: e.target.value === 'true' })
                      }
                    >
                      <option value="true">Published (Visible to Students)</option>
                      <option value="false">Draft (Admin Only)</option>
                    </select>
                  </div>
                </form>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================================================================
          MODAL: DIRECT S3 VIDEO UPLOAD & EDIT (Section 8 & 15)
          =================================================================== */}
      {isLessonModalOpen && (
        <div className="tm-ws-modal-backdrop" onClick={() => !isUploading && setIsLessonModalOpen(false)}>
          <div className="tm-ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-ws-modal-head">
              <h3>{editingLesson ? 'Edit Video Lesson Metadata' : 'Upload Recorded Video to AWS S3'}</h3>
              {!isUploading && (
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setIsLessonModalOpen(false)}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <form onSubmit={handleSaveLesson} className="tm-ws-modal-body">
              {uploadError && (
                <div className="tm-ws-error-banner">
                  <AlertCircle size={18} />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="tm-ws-modal-row">
                <div className="tm-ws-form-group">
                  <label>Curriculum Module</label>
                  <input
                    type="text"
                    value={lessonForm.module_name}
                    onChange={(e) => setLessonForm({ ...lessonForm, module_name: e.target.value })}
                    placeholder="e.g. Module 1: Market Structure"
                    disabled={isUploading}
                    required
                  />
                </div>

                <div className="tm-ws-form-group">
                  <label>Batch Assignment</label>
                  <input
                    type="text"
                    value={lessonForm.batch_name}
                    onChange={(e) => setLessonForm({ ...lessonForm, batch_name: e.target.value })}
                    placeholder="e.g. November or All Batches"
                    disabled={isUploading}
                    required
                  />
                </div>
              </div>

              <div className="tm-ws-form-group">
                <label>Lesson Title</label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="e.g. Institutional Liquidity & Order Flow"
                  disabled={isUploading}
                  required
                />
              </div>

              <div className="tm-ws-form-group">
                <label>Description / Learning Goals</label>
                <textarea
                  rows={2}
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  placeholder="Summary of topics and practical execution takeaways..."
                  disabled={isUploading}
                />
              </div>

              {/* AWS S3 Video File Upload Dropzone */}
              <div className="tm-ws-form-group">
                <label>
                  AWS S3 Video File{' '}
                  <span style={{ color: '#ef4444' }}>* (Direct Browser to S3 Upload)</span>
                </label>
                <div className={`tm-s3-dropzone ${videoFile ? 'has-file' : ''}`}>
                  <input
                    type="file"
                    id="s3-video-file-input"
                    accept="video/mp4,video/webm,video/quicktime,video/mkv,video/x-matroska"
                    style={{ display: 'none' }}
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > MAX_VIDEO_BYTES) {
                          showToast(`Selected file (${formatFileSize(file.size)}) exceeds maximum allowed capacity of 5 GB.`, 'error');
                          e.target.value = '';
                          return;
                        }
                        setVideoFile(file);
                      }
                    }}
                  />
                  <label htmlFor="s3-video-file-input" className="tm-s3-dropzone-label">
                    <Upload size={28} />
                    {videoFile ? (
                      <div>
                        <strong style={{ color: '#f8fafc', display: 'block' }}>
                          {videoFile.name}
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {formatFileSize(videoFile.size)} · {videoFile.type || 'video/mp4'}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span>Drag & drop or click to choose video file (up to 5 GB)</span>
                        <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b' }}>
                          MP4, WebM, MOV, MKV supported · Direct secure upload to private S3 bucket
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Upload Progress & Status Bar */}
              {isUploading && (
                <div className="tm-s3-progress-container">
                  <div className="tm-s3-progress-header">
                    <span className="s3-status-text">
                      {uploadStatus === 'authorizing' && 'Requesting secure AWS S3 authorization...'}
                      {uploadStatus === 'uploading' && `Uploading directly to AWS S3: ${uploadProgress}%`}
                      {uploadStatus === 'verifying' && 'Verifying S3 object integrity via HeadObject...'}
                    </span>
                    <span className="s3-progress-pct">{uploadProgress}%</span>
                  </div>
                  <div className="tm-s3-progress-track">
                    <div className="tm-s3-progress-bar" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <div style={{ marginTop: '8px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="tm-btn-outline-xs danger"
                      onClick={handleCancelUpload}
                    >
                      Cancel Upload
                    </button>
                  </div>
                </div>
              )}

              <div className="tm-ws-modal-row">
                <div className="tm-ws-form-group">
                  <label>Duration (Minutes)</label>
                  <input
                    type="number"
                    value={lessonForm.duration_minutes}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, duration_minutes: parseInt(e.target.value, 10) || 0 })
                    }
                    disabled={isUploading}
                  />
                </div>

                <div className="tm-ws-form-group">
                  <label>Sort Order</label>
                  <input
                    type="number"
                    value={lessonForm.sort_order}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, sort_order: parseInt(e.target.value, 10) || 1 })
                    }
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="tm-ws-modal-row">
                <div className="tm-ws-form-group">
                  <label>Scheduled Release Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={lessonForm.release_at}
                    onChange={(e) => setLessonForm({ ...lessonForm, release_at: e.target.value })}
                    disabled={isUploading}
                  />
                </div>

                <div className="tm-ws-form-group">
                  <label>Publish Status</label>
                  <select
                    value={lessonForm.is_published ? 'true' : 'false'}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, is_published: e.target.value === 'true' })
                    }
                    disabled={isUploading}
                  >
                    <option value="true">Published</option>
                    <option value="false">Draft (Unpublished)</option>
                  </select>
                </div>
              </div>

              {/* Video Visibility Duration (Auto-Expiry) */}
              <div className="tm-ws-form-group">
                <label>
                  Video Availability Duration
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '6px' }}>
                    (Auto-expires and locks for students after this period)
                  </span>
                </label>
                <select
                  value={lessonForm.availability_days || ''}
                  onChange={(e) => setLessonForm({ ...lessonForm, availability_days: e.target.value })}
                  disabled={isUploading}
                >
                  <option value="">Always Available (Forever / Hamesha Ke Liye) — Default</option>
                  <option value="2">2 Days</option>
                  <option value="4">4 Days</option>
                  <option value="5">5 Days</option>
                  <option value="6">6 Days</option>
                  <option value="7">7 Days</option>
                  <option value="10">10 Days</option>
                  <option value="15">15 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
                {lessonForm.availability_days ? (
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#38bdf8', marginTop: '5px' }}>
                    ⏳ Video access will automatically expire {lessonForm.availability_days} days after {lessonForm.release_at ? 'scheduled release' : 'publication/upload'}.
                  </span>
                ) : (
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginTop: '5px' }}>
                    ♾️ Video will remain permanently accessible to enrolled students.
                  </span>
                )}
                {editingLesson?.expires_at && (
                  <span style={{ display: 'block', fontSize: '0.78rem', color: new Date(editingLesson.expires_at) <= new Date() ? '#ef4444' : '#f59e0b', marginTop: '3px' }}>
                    Current Expiry: {new Date(editingLesson.expires_at).toLocaleString()}
                    {new Date(editingLesson.expires_at) <= new Date() ? ' (Expired)' : ''}
                  </span>
                )}
              </div>

              <div className="tm-ws-modal-actions">
                <button
                  type="button"
                  className="tm-btn-outline-xs"
                  onClick={() => setIsLessonModalOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button type="submit" className="tm-btn-primary" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Uploading to S3...</span>
                    </>
                  ) : editingLesson ? (
                    'Save Changes'
                  ) : (
                    'Upload to S3'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: VIDEO PLAYBACK PREVIEW (HTML5 Video Player with S3 Presigned URL)
          =================================================================== */}
      {previewModal.isOpen && (
        <div className="tm-ws-modal-backdrop" onClick={() => setPreviewModal({ isOpen: false, title: '', playbackUrl: '', loading: false })}>
          <div className="tm-ws-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="tm-ws-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#22c55e" />
                <h3>{previewModal.title} — Secure S3 Preview</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setPreviewModal({ isOpen: false, title: '', playbackUrl: '', loading: false })}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tm-ws-modal-body" style={{ padding: '16px' }}>
              {previewModal.loading ? (
                <div className="tm-s3-preview-loading">
                  <RefreshCw size={24} className="spin" />
                  <span>Requesting AWS S3 Presigned Playback Authorization...</span>
                </div>
              ) : previewModal.playbackUrl ? (
                <div className="tm-s3-video-player-wrap">
                  <video
                    src={previewModal.playbackUrl}
                    controls
                    autoPlay
                    playsInline
                    className="tm-s3-preview-video"
                    controlsList="nodownload"
                  />
                  <div className="tm-s3-player-info">
                    <span className="s3-pill">🔒 Private S3 Storage</span>
                    <span className="s3-pill">⏱ Short-Lived URL (15 Min Expiry)</span>
                    <span className="s3-pill">⚡ Byte-Range Seeking Enabled</span>
                  </div>
                </div>
              ) : (
                <div className="tm-ws-empty-box">
                  <AlertCircle size={32} />
                  <p>Could not load video preview.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: SCHEDULE LIVE CLASS (Google Meet)
          =================================================================== */}
      {isLiveModalOpen && (
        <div className="tm-ws-modal-backdrop" onClick={() => setIsLiveModalOpen(false)}>
          <div className="tm-ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-ws-modal-head">
              <h3>{editingLiveClass ? 'Reschedule Live Class' : 'Schedule Google Meet Session'}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsLiveModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLiveClass} className="tm-ws-modal-body">
              <div className="tm-ws-form-group">
                <label>Session Title</label>
                <input
                  type="text"
                  value={liveForm.title}
                  onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })}
                  placeholder="e.g. Live Market Order Flow Execution"
                  required
                />
              </div>

              <div className="tm-ws-modal-row">
                <div className="tm-ws-form-group">
                  <label>Google Meet URL</label>
                  <input
                    type="url"
                    value={liveForm.meeting_link}
                    onChange={(e) => setLiveForm({ ...liveForm, meeting_link: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    required
                  />
                </div>

                <div className="tm-ws-form-group">
                  <label>Batch Assignment</label>
                  <input
                    type="text"
                    value={liveForm.batch_name}
                    onChange={(e) => setLiveForm({ ...liveForm, batch_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="tm-ws-modal-row">
                <div className="tm-ws-form-group">
                  <label>Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    value={liveForm.scheduled_at}
                    onChange={(e) => setLiveForm({ ...liveForm, scheduled_at: e.target.value })}
                    required
                  />
                </div>

                <div className="tm-ws-form-group">
                  <label>Duration (Minutes)</label>
                  <input
                    type="number"
                    value={liveForm.duration_minutes}
                    onChange={(e) =>
                      setLiveForm({ ...liveForm, duration_minutes: parseInt(e.target.value, 10) || 60 })
                    }
                  />
                </div>
              </div>

              <div className="tm-ws-form-group">
                <label>Instructor</label>
                <input
                  type="text"
                  value={liveForm.instructor}
                  onChange={(e) => setLiveForm({ ...liveForm, instructor: e.target.value })}
                />
              </div>

              <div className="tm-ws-form-group">
                <label>Instructions for Students</label>
                <textarea
                  rows={2}
                  value={liveForm.instructions}
                  onChange={(e) => setLiveForm({ ...liveForm, instructions: e.target.value })}
                  placeholder="e.g. Keep your TradingView charts open, mic muted on entry..."
                />
              </div>

              <div className="tm-ws-modal-actions">
                <button
                  type="button"
                  className="tm-btn-outline-xs"
                  onClick={() => setIsLiveModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="tm-btn-primary">
                  {editingLiveClass ? 'Save Changes' : 'Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: ADD ANNOUNCEMENT
          =================================================================== */}
      {isAnnouncementModalOpen && (
        <div className="tm-ws-modal-backdrop" onClick={() => setIsAnnouncementModalOpen(false)}>
          <div className="tm-ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-ws-modal-head">
              <h3>Publish Course Announcement</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsAnnouncementModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="tm-ws-modal-body">
              <div className="tm-ws-form-group">
                <label>Announcement Title</label>
                <input
                  type="text"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  placeholder="e.g. Schedule Update for Live Class #4"
                  required
                />
              </div>

              <div className="tm-ws-modal-row">
                <div className="tm-ws-form-group">
                  <label>Category</label>
                  <select
                    value={announcementForm.category}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, category: e.target.value })
                    }
                  >
                    <option value="General">General</option>
                    <option value="Live Class">Live Class</option>
                    <option value="Curriculum">Curriculum</option>
                    <option value="Homework">Homework</option>
                  </select>
                </div>

                <div className="tm-ws-form-group">
                  <label>Batch Restriction</label>
                  <input
                    type="text"
                    value={announcementForm.batch_name}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, batch_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="tm-ws-form-group">
                <label>Content</label>
                <textarea
                  rows={4}
                  value={announcementForm.content}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, content: e.target.value })
                  }
                  placeholder="Full text of the announcement..."
                  required
                />
              </div>

              <div className="tm-ws-form-group">
                <label className="tm-checkbox-label">
                  <input
                    type="checkbox"
                    checked={announcementForm.is_pinned}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, is_pinned: e.target.checked })
                    }
                  />
                  <span>Pin to top of student classroom</span>
                </label>
              </div>

              <div className="tm-ws-modal-actions">
                <button
                  type="button"
                  className="tm-btn-outline-xs"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="tm-btn-primary">
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: SEND NOTIFICATION
          =================================================================== */}
      {isNotifyModalOpen && (
        <div className="tm-ws-modal-backdrop" onClick={() => setIsNotifyModalOpen(false)}>
          <div className="tm-ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-ws-modal-head">
              <h3>Broadcast In-App Notification</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsNotifyModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBroadcastNotification} className="tm-ws-modal-body">
              <div className="tm-ws-form-group">
                <label>Notification Title</label>
                <input
                  type="text"
                  value={notifyForm.title}
                  onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}
                  placeholder="e.g. Important Desk Reminder"
                  required
                />
              </div>

              <div className="tm-ws-modal-row">
                <div className="tm-ws-form-group">
                  <label>Batch Target</label>
                  <input
                    type="text"
                    value={notifyForm.batch_name}
                    onChange={(e) => setNotifyForm({ ...notifyForm, batch_name: e.target.value })}
                  />
                </div>

                <div className="tm-ws-form-group">
                  <label>Type</label>
                  <select
                    value={notifyForm.type}
                    onChange={(e) => setNotifyForm({ ...notifyForm, type: e.target.value })}
                  >
                    <option value="general">General Alert</option>
                    <option value="lecture">Lecture Update</option>
                    <option value="class">Live Class Alert</option>
                  </select>
                </div>
              </div>

              <div className="tm-ws-form-group">
                <label>Message</label>
                <textarea
                  rows={3}
                  value={notifyForm.message}
                  onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })}
                  placeholder="Enter message text sent to enrolled students..."
                  required
                />
              </div>

              <div className="tm-ws-modal-actions">
                <button
                  type="button"
                  className="tm-btn-outline-xs"
                  onClick={() => setIsNotifyModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="tm-btn-primary">
                  Send Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: ATTACH COURSE MATERIAL (Section 12)
          =================================================================== */}
      {isResourceModalOpen && (
        <div className="tm-ws-modal-backdrop" onClick={() => setIsResourceModalOpen(false)}>
          <div className="tm-ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-ws-modal-head">
              <h3>Attach Course Material / PDF</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsResourceModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="tm-ws-modal-body">
              <div className="tm-ws-form-group">
                <label>Material Title</label>
                <input
                  type="text"
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                  placeholder="e.g. Risk-Management Position Sizing Cheat Sheet"
                  required
                />
              </div>

              <div className="tm-ws-modal-row">
                <div className="tm-ws-form-group">
                  <label>Material Type</label>
                  <select
                    value={resourceForm.resource_type}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, resource_type: e.target.value })
                    }
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="presentation">Presentation (PPT / PPTX)</option>
                    <option value="document">Word Document (DOC / DOCX)</option>
                    <option value="worksheet">Excel / Spreadsheet (XLS / XLSX)</option>
                    <option value="archive">ZIP / Compressed Archive</option>
                    <option value="notes">Lecture Notes / Study Material</option>
                    <option value="assignment">Assignment / Practice Tasks</option>
                  </select>
                </div>

                <div className="tm-ws-form-group">
                  <label>Batch Assignment</label>
                  <input
                    type="text"
                    value={resourceForm.batch_name}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, batch_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="tm-ws-form-group">
                <label>Description</label>
                <textarea
                  rows={2}
                  value={resourceForm.description}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, description: e.target.value })
                  }
                  placeholder="Brief summary of this resource..."
                />
              </div>

              <div className="tm-ws-form-group">
                <label>
                  File Upload (PDF, PPT, PPTX, DOC, DOCX, ZIP, XLS, XLSX)
                  {resourceFile && (
                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#10b981' }}>
                      ({resourceFile.name} — {(resourceFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  )}
                </label>
                <input
                  type="file"
                  disabled={isUploadingResource}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.zip,.rar,.7z"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 50 * 1024 * 1024) {
                        showToast(`File size is ${(f.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed upload is 50 MB.`, 'error');
                        e.target.value = '';
                        setResourceFile(null);
                        return;
                      }
                      setResourceFile(f);
                    }
                  }}
                />
              </div>

              <div className="tm-ws-form-group">
                <label>Or External Document Link</label>
                <input
                  type="url"
                  disabled={isUploadingResource}
                  value={resourceForm.resource_url}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, resource_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="tm-ws-modal-actions">
                <button
                  type="button"
                  className="tm-btn-outline-xs"
                  disabled={isUploadingResource}
                  onClick={() => !isUploadingResource && setIsResourceModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="tm-btn-primary" disabled={isUploadingResource}>
                  {isUploadingResource ? 'Uploading & Processing...' : 'Attach Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: MANUAL STUDENT ENROLLMENT (Section 13)
          =================================================================== */}
      {isEnrollModalOpen && (
        <div className="tm-ws-modal-backdrop" onClick={() => setIsEnrollModalOpen(false)}>
          <div className="tm-ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-ws-modal-head">
              <h3>Authorize Student Enrollment</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsEnrollModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualEnroll} className="tm-ws-modal-body">
              <div className="tm-ws-form-group">
                <label>Student Full Name</label>
                <input
                  type="text"
                  value={enrollForm.name}
                  onChange={(e) => setEnrollForm({ ...enrollForm, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>

              <div className="tm-ws-modal-row">
                <div className="tm-ws-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={enrollForm.email}
                    onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                    placeholder="student@example.com"
                    required
                  />
                </div>

                <div className="tm-ws-form-group">
                  <label>Mobile Number</label>
                  <input
                    type="tel"
                    value={enrollForm.mobile}
                    onChange={(e) => setEnrollForm({ ...enrollForm, mobile: e.target.value })}
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="tm-ws-modal-row">
                <div className="tm-ws-form-group">
                  <label>Batch Assignment</label>
                  <input
                    type="text"
                    value={enrollForm.batch_name}
                    onChange={(e) => setEnrollForm({ ...enrollForm, batch_name: e.target.value })}
                    required
                  />
                </div>

                <div className="tm-ws-form-group">
                  <label>Experience Level</label>
                  <select
                    value={enrollForm.trading_experience}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, trading_experience: e.target.value })
                    }
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="tm-ws-modal-actions">
                <button
                  type="button"
                  className="tm-btn-outline-xs"
                  onClick={() => setIsEnrollModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="tm-btn-primary">
                  Authorize & Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: CREATE CURRICULUM MODULE
          =================================================================== */}
      {isModuleModalOpen && (
        <div className="tm-ws-modal-backdrop" onClick={() => setIsModuleModalOpen(false)}>
          <div className="tm-ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-ws-modal-head">
              <h3>Create New Curriculum Module</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsModuleModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateModule} className="tm-ws-modal-body">
              <div className="tm-ws-form-group">
                <label>Module Title</label>
                <input
                  type="text"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Module 2: Order Flow & Liquidity"
                  required
                  autoFocus
                />
              </div>

              <div className="tm-ws-modal-actions">
                <button
                  type="button"
                  className="tm-btn-outline-xs"
                  onClick={() => setIsModuleModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="tm-btn-primary">
                  Create Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: IN-APP PDF VIEWER (Responsive PDF Modal)
          =================================================================== */}
      <PdfViewerModal
        isOpen={pdfViewerState.isOpen}
        onClose={() => setPdfViewerState((prev) => ({ ...prev, isOpen: false }))}
        title={pdfViewerState.title}
        fileName={pdfViewerState.fileName}
        fileSize={pdfViewerState.fileSize}
        viewUrl={pdfViewerState.viewUrl}
        downloadUrl={pdfViewerState.downloadUrl}
        loading={pdfViewerState.loading}
        error={pdfViewerState.error}
        theme={theme}
        onRetry={() => pdfViewerState.resource && handleOpenResource(pdfViewerState.resource)}
        onDownload={() => pdfViewerState.resource && handleAdminDownloadResource(pdfViewerState.resource)}
      />
    </div>
  );
};
