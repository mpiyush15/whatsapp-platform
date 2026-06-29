'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiDelete } from '@/lib/api-client';
import DataTable from '@/components/DataTable';
import { BatchModal } from '@/components/education/BatchModal';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';

const BatchesPage = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const params = useParams();
  const projectId = params.projectId as string;

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet(`/education/batches?projectId=${projectId}`);
      setBatches(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchBatches();
    }
  }, [fetchBatches, projectId]);

  const handleAddBatch = () => {
    setSelectedBatch(null);
    setIsModalOpen(true);
  };

  const handleEditBatch = (batch: any) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  const handleDeleteBatch = async (batch: any) => {
    if (window.confirm(`Are you sure you want to delete the batch "${batch.name}"?`)) {
      try {
        await apiDelete(`/education/batches/${batch._id}?projectId=${projectId}`);
        fetchBatches();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete batch');
      }
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    {
      key: 'courseId',
      label: 'Course',
      render: (courseId: any) => courseId?.name || 'N/A'
    },
    {
      key: 'startDate',
      label: 'Start Date',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      key: 'endDate',
      label: 'End Date',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'N/A'
    },
    { key: 'timing', label: 'Timing' },
    { key: 'maxStudents', label: 'Max Students' },
  ];

  const actions = [
    {
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEditBatch,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDeleteBatch,
      variant: 'danger' as const,
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Batches</h1>
        <button
          onClick={handleAddBatch}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
        >
          <PlusCircle className="h-5 w-5" />
          Add Batch
        </button>
      </div>

      <DataTable
        columns={columns}
        data={batches}
        loading={loading}
        error={error}
        actions={actions}
        emptyMessage="No batches found. Add a new one to get started."
      />

      <BatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBatchSaved={fetchBatches}
        batch={selectedBatch}
        projectId={projectId}
      />
    </div>
  );
};

export default BatchesPage;
