'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiDelete, apiPut } from '@/lib/api-client';
import DataTable from '@/components/DataTable';
import { CourseModal } from '@/components/education/CourseModal';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const params = useParams();
  const projectId = params.projectId as string;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet(`/education/courses?projectId=${projectId}`);
      setCourses(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchCourses();
    }
  }, [fetchCourses, projectId]);

  const handleAddCourse = () => {
    setSelectedCourse(null);
    setIsModalOpen(true);
  };

  const handleEditCourse = (course: any) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleDeleteCourse = async (course: any) => {
    if (window.confirm(`Are you sure you want to delete the course "${course.name}"?`)) {
      try {
        await apiDelete(`/education/courses/${course._id}?projectId=${projectId}`);
        fetchCourses();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete course');
      }
    }
  };

  const handleToggleCourse = async (course: any) => {
    try {
      await apiPut(`/education/courses/${course._id}`, {
        projectId,
        name: course.name,
        description: course.description,
        duration: course.duration,
        fees: course.fees,
        isActive: course.isActive === false,
      });
      fetchCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update course status');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'duration', label: 'Duration' },
    { key: 'fees', label: 'Fees', render: (fees: number) => `₹${Number(fees || 0).toLocaleString('en-IN')}` },
    {
      key: 'isActive',
      label: 'Chatbot',
      render: (_value: boolean, row: any) => (
        <button
          onClick={() => handleToggleCourse(row)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${row.isActive === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}
        >
          {row.isActive === false ? 'Inactive' : 'Active'}
        </button>
      )
    },
  ];

  const actions = [
    {
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEditCourse,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDeleteCourse,
      variant: 'danger' as const,
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Courses</h1>
        <button
          onClick={handleAddCourse}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
        >
          <PlusCircle className="h-5 w-5" />
          Add Course
        </button>
      </div>

      <DataTable
        columns={columns}
        data={courses}
        loading={loading}
        error={error}
        actions={actions}
        emptyMessage="No courses found. Add a new one to get started."
      />

      <CourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCourseSaved={fetchCourses}
        course={selectedCourse}
        projectId={projectId}
      />
    </div>
  );
};

export default CoursesPage;
