"use client";
import React, { useState } from 'react';
import { MessageSquare, Plus } from "lucide-react";
import DataTable from "@/components/DataTable";
import Link from 'next/link';

export default function PixelsAppointmentsPage() {
  const mockAppointments = [
    {
      appointmentId: "APT-001",
      patientId: "CLI-101",
      patientName: "Sarah Jenkins",
      doctorId: "DOC-1",
      doctorName: "Emma (Stylist)",
      scheduledAt: "2026-06-16T10:00:00Z",
      durationMinutes: 90,
      status: "confirmed",
      visitType: "Balayage & Cut",
      channel: "clinic",
      bookingSource: "whatsapp_bot",
      billingStatus: "pending"
    },
    {
      appointmentId: "APT-002",
      patientId: "CLI-102",
      patientName: "Jessica Pearson",
      doctorId: "DOC-3",
      doctorName: "Chloe (Esthetician)",
      scheduledAt: "2026-06-16T14:00:00Z",
      durationMinutes: 60,
      status: "scheduled",
      visitType: "HydraFacial",
      channel: "clinic",
      bookingSource: "manual",
      billingStatus: "paid"
    },
    {
      appointmentId: "APT-003",
      patientId: "CLI-103",
      patientName: "Michael Ross",
      doctorId: "DOC-2",
      doctorName: "David (Barber)",
      scheduledAt: "2026-06-16T12:00:00Z",
      durationMinutes: 45,
      status: "checked-in",
      visitType: "Men's Fade",
      channel: "clinic",
      bookingSource: "manual",
      billingStatus: "pending"
    }
  ];

  const statusClassMap: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    confirmed: "bg-cyan-100 text-cyan-700",
    "checked-in": "bg-violet-100 text-violet-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-rose-100 text-rose-700",
    "no-show": "bg-amber-100 text-amber-700",
  }

  const columns = [
    {
      key: "patient",
      label: "Client",
      minWidth: "220px",
      render: (_: any, row: any) => (
        <div>
          <Link href={`/dashboard/pixels/clients/${row.patientId}`} className="font-semibold text-slate-900 hover:text-green-600 hover:underline">
            {row.patientName}
          </Link>
          <p className="text-xs text-slate-500">{row.appointmentId}</p>
        </div>
      )
    },
    {
      key: "doctor",
      label: "Staff",
      minWidth: "180px",
      render: (_: any, row: any) => row.doctorName
    },
    {
      key: "schedule",
      label: "Schedule",
      minWidth: "200px",
      render: (_: any, row: any) => (
        <div>
          <p>{new Date(row.scheduledAt).toLocaleString()}</p>
          <p className="text-xs text-slate-500">{row.durationMinutes} min</p>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      minWidth: "120px",
      render: (_: any, row: any) => {
        const status = String(row.status || "scheduled").toLowerCase()
        const statusClass = statusClassMap[status] || "bg-slate-100 text-slate-700"
        return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusClass}`}>{status}</span>
      }
    },
    {
      key: "source",
      label: "Source",
      minWidth: "130px",
      render: (_: any, row: any) => <span className="capitalize">{row.bookingSource === "whatsapp_bot" ? "WhatsApp bot" : "Manual"}</span>
    },
    {
      key: "visit",
      label: "Service",
      minWidth: "140px",
      render: (_: any, row: any) => <span className="capitalize">{row.visitType}</span>
    },
    {
      key: "billing",
      label: "Billing",
      minWidth: "120px",
      render: (_: any, row: any) => <span className="capitalize">{row.billingStatus || "pending"}</span>
    }
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Appointments List</h2>
            <p className="text-sm text-slate-600">Operational appointment table using the core DataTable component.</p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
              <Plus className="h-4 w-4" /> Book Appointment
            </button>
          </div>
        </div>
        <DataTable
          containerClassName="border border-slate-200 rounded-xl"
          columns={columns}
          data={mockAppointments}
          loading={false}
          wide={true}
          actions={[
            {
              label: "View / Edit",
              onClick: () => {}
            },
            {
              label: "Send WA",
              icon: <MessageSquare className="h-3.5 w-3.5" />,
              onClick: () => {}
            }
          ]}
        />
      </div>
    </div>
  )
}
