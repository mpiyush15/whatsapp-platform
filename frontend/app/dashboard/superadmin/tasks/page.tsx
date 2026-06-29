'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  Clock, 
  Plus, 
  MoreVertical, 
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  ListTodo
} from 'lucide-react';
import { fetchPlatformLeads } from '@/lib/superadminApi';

interface Lead {
  _id: string;
  name: string;
  company?: string;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  date: string; // YYYY-MM-DD
  notes: string;
  leadId?: string;
  leadName?: string;
}

const mockInitialTasks: Task[] = [
  {
    id: '1',
    title: 'Call Demo Leads',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    notes: 'Follow up on the 5 demos scheduled for today.',
  },
  {
    id: '2',
    title: 'Review System Health',
    status: 'completed',
    date: new Date().toISOString().split('T')[0],
    notes: 'Checked AWS load balancers.',
  }
];

export default function SuperadminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>(mockInitialTasks);
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // New Task Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    leadId: ''
  });

  useEffect(() => {
    // Fetch real leads for the dropdown
    const loadLeads = async () => {
      try {
        const result = await fetchPlatformLeads({ limit: 100 });
        if (result && result.leads) {
          setLeads(result.leads as Lead[]);
        }
      } catch (err) {
        console.error("Failed to load leads for task manager", err);
      }
    };
    loadLeads();
  }, []);

  const handleCreateTask = () => {
    if (!newTask.title) return;
    
    const lead = leads.find(l => l._id === newTask.leadId);
    
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title!,
      status: newTask.status as Task['status'],
      date: newTask.date!,
      notes: newTask.notes || '',
      leadId: newTask.leadId,
      leadName: lead?.name
    };

    setTasks([task, ...tasks]);
    setIsFormOpen(false);
    setNewTask({
      title: '',
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      leadId: ''
    });
  };

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const updateTaskNotes = (taskId: string, newNotes: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, notes: newNotes } : t));
  };

  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <CalendarIcon className="text-blue-600" /> Tasks & Calendar
            </h1>
            <p className="mt-2 text-slate-600">
              Manage your daily operations, follow-ups, and directly link CRM leads to your workflow.
            </p>
          </div>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={18} /> New Task
          </button>
        </div>

        {/* New Task Form Inline */}
        {isFormOpen && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 animate-in slide-in-from-top-4 fade-in">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ListTodo size={18} className="text-blue-500" /> Create New Task
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Task Title</label>
                <input 
                  type="text" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Follow up on API integration"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                <input 
                  type="date" 
                  value={newTask.date}
                  onChange={e => setNewTask({...newTask, date: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                <select 
                  value={newTask.status}
                  onChange={e => setNewTask({...newTask, status: e.target.value as any})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Brief Notes</label>
                <input 
                  type="text" 
                  value={newTask.notes}
                  onChange={e => setNewTask({...newTask, notes: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Any immediate notes..."
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Attach CRM Lead</label>
                <select 
                  value={newTask.leadId}
                  onChange={e => setNewTask({...newTask, leadId: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- No Lead Attached --</option>
                  {leads.map(lead => (
                    <option key={lead._id} value={lead._id}>{lead.name} {lead.company ? `(${lead.company})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button 
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateTask}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                Save Task
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Calendar Widget */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-lg">{monthNames[month]} {year}</h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 rounded-lg" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayStr = String(i + 1).padStart(2, '0');
                  const monthStr = String(month + 1).padStart(2, '0');
                  const dateStr = `${year}-${monthStr}-${dayStr}`;
                  const dayTasks = tasks.filter(t => t.date === dateStr);
                  
                  const isToday = dateStr === new Date().toISOString().split('T')[0];

                  return (
                    <div 
                      key={i} 
                      className={`h-10 rounded-lg flex flex-col items-center justify-center relative cursor-pointer hover:bg-blue-50 transition-colors ${
                        isToday ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-700 font-medium'
                      }`}
                      onClick={() => {
                        setNewTask({ ...newTask, date: dateStr });
                        setIsFormOpen(true);
                      }}
                    >
                      <span>{i + 1}</span>
                      {dayTasks.length > 0 && !isToday && (
                        <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                      {dayTasks.length > 0 && isToday && (
                        <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-lg">Active Tasks</h2>
            </div>
            
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-slate-500 flex flex-col items-center">
                  <CheckCircle size={48} className="text-slate-200 mb-4" />
                  <p>All caught up! No active tasks.</p>
                </div>
              ) : (
                tasks.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(task => (
                  <div key={task.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow group bg-white">
                    <div className="flex justify-between items-start gap-4">
                      
                      {/* Left: Status Toggle */}
                      <button 
                        onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                        className={`mt-1 flex-shrink-0 transition-colors ${
                          task.status === 'completed' ? 'text-green-500' : 'text-slate-300 hover:text-blue-500'
                        }`}
                      >
                        <CheckCircle size={22} className={task.status === 'completed' ? 'fill-green-50' : ''} />
                      </button>

                      {/* Middle: Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className={`font-bold text-base truncate ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {task.title}
                          </h3>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            task.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' :
                            task.status === 'in_progress' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        {/* Interactive Notes Input */}
                        <div className="mb-3">
                           <input 
                              type="text"
                              value={task.notes}
                              onChange={(e) => updateTaskNotes(task.id, e.target.value)}
                              placeholder="Add brief notes..."
                              className={`w-full text-sm outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-500 transition-colors py-1 ${
                                task.status === 'completed' ? 'text-slate-400' : 'text-slate-600'
                              }`}
                           />
                        </div>

                        {/* Metadata Footer */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                          <div className={`flex items-center gap-1.5 ${
                            new Date(task.date) < new Date() && task.status !== 'completed' 
                              ? 'text-red-600 font-bold' 
                              : 'text-slate-500'
                          }`}>
                            <Clock size={14} />
                            {new Date(task.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>

                          {task.leadName && (
                            <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                              <LinkIcon size={12} />
                              Attached to: {task.leadName}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                          <MoreVertical size={16} />
                        </button>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
