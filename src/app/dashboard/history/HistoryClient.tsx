'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface HistoryRecord {
  id: string;
  document_type: string;
  status: string;
  download_url?: string;
  created_at: string;
}

interface UserProfile {
  plan?: string;
  remaining_cards?: number;
}

interface HistoryClientProps {
  initialHistory: HistoryRecord[];
  userProfile: UserProfile | null;
}

export default function HistoryClient({ initialHistory, userProfile }: HistoryClientProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Masking helpers for realistic card numbers
  const getMaskedNumber = (type: string, id: string) => {
    const hash = id.split('-')[0] || '1234';
    const numPart = parseInt(hash, 16) % 10000;
    const padded = numPart.toString().padStart(4, '0');
    
    switch (type.toUpperCase()) {
      case 'AADHAAR':
        return `XXXX-XXXX-${padded}`;
      case 'PAN':
        return `ABCDE${padded}F`;
      case 'AYUSHMAN':
        return `P${padded}8921A`;
      case 'ESHRAM':
        return `UAN-${padded}-7821`;
      case 'VOTER':
        return `EPIC-${padded}-VT`;
      case 'ABHA':
        return `ABHA-${padded}-77`;
      default:
        return `ID-${padded}`;
    }
  };

  // Human readable title helper
  const getDocTypeTitle = (type: string) => {
    switch (type.toUpperCase()) {
      case 'AADHAAR':
        return 'Aadhaar Card';
      case 'PAN':
        return 'PAN Card';
      case 'AYUSHMAN':
        return 'Ayushman Card';
      case 'ESHRAM':
        return 'e-Shram Card';
      case 'VOTER':
        return 'Voting Card';
      case 'ABHA':
        return 'ABHA Card';
      default:
        return type;
    }
  };

  // Get doc icon helper
  const getDocIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'AADHAAR':
        return 'fingerprint';
      case 'PAN':
        return 'credit_card';
      case 'AYUSHMAN':
        return 'health_and_safety';
      case 'ESHRAM':
        return 'engineering';
      case 'VOTER':
        return 'how_to_vote';
      case 'ABHA':
        return 'medical_services';
      default:
        return 'description';
    }
  };

  // Date formatter
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const datePart = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const timePart = `${hours}:${minutes} ${ampm}`;
      return { date: datePart, time: timePart };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  // Filter history
  const filteredHistory = useMemo(() => {
    return initialHistory.filter(item => {
      const matchesType = typeFilter === 'All' || item.document_type.toUpperCase() === typeFilter.toUpperCase();
      
      let matchesSearch = true;
      if (search.trim()) {
        const query = search.toLowerCase();
        const docTitle = getDocTypeTitle(item.document_type).toLowerCase();
        const maskedNum = getMaskedNumber(item.document_type, item.id).toLowerCase();
        matchesSearch = docTitle.includes(query) || maskedNum.includes(query) || item.id.toLowerCase().includes(query);
      }

      let matchesDate = true;
      if (dateFilter) {
        const itemDate = new Date(item.created_at).toISOString().split('T')[0];
        matchesDate = itemDate === dateFilter;
      }

      return matchesType && matchesSearch && matchesDate;
    });
  }, [initialHistory, search, typeFilter, dateFilter]);

  const totalItems = filteredHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage, itemsPerPage]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-8">
      {/* Header & Controls Bar */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Generation History & Log</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Track all generated PVC cards, download past PDFs, and view print analytics.</p>
          </div>
          <Link
            href="/dashboard/generate"
            className="px-4 py-2.5 bg-primary hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Generate New Card
          </Link>
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Search Box */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
            <input 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl transition-all outline-none text-xs font-medium text-slate-800" 
              placeholder="Search by ID or card number..." 
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Document Type Dropdown */}
          <select 
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl transition-all outline-none text-xs font-bold text-slate-800 cursor-pointer"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="All">All Card Types</option>
            <option value="AADHAAR">Aadhaar PVC</option>
            <option value="PAN">PAN Card</option>
            <option value="AYUSHMAN">Ayushman Card</option>
            <option value="ESHRAM">e-Shram Card</option>
            <option value="VOTER">Voting Card</option>
            <option value="ABHA">ABHA Health Card</option>
          </select>

          {/* Date Picker */}
          <div className="flex gap-2">
            <input 
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl transition-all outline-none text-xs font-medium text-slate-800 cursor-pointer" 
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
            />
            {(search || typeFilter !== 'All' || dateFilter) && (
              <button 
                onClick={() => { setSearch(''); setTypeFilter('All'); setDateFilter(''); setCurrentPage(1); }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
                title="Clear Filters"
              >
                <span className="material-symbols-outlined text-[18px]">filter_list_off</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* History Table Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Document Type</th>
                <th className="px-6 py-4">Card Number / Reference</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((record) => {
                  const formatted = formatDate(record.created_at);
                  const isSuccess = record.status === 'SUCCESS';
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{formatted.date}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{formatted.time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-[16px]">{getDocIcon(record.document_type)}</span>
                          </div>
                          <span className="font-bold text-slate-800">{getDocTypeTitle(record.document_type)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 font-semibold">
                        {getMaskedNumber(record.document_type, record.id)}
                      </td>
                      <td className="px-6 py-4">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isSuccess ? (
                          <Link 
                            href="/dashboard/generate" 
                            className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-xl transition-all active:scale-95 font-bold text-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">print</span>
                            Print Again
                          </Link>
                        ) : (
                          <Link 
                            href={`/dashboard/generate?type=${record.document_type.toLowerCase()}`}
                            className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all active:scale-95 font-bold text-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">refresh</span>
                            Retry
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[48px] text-slate-300">history</span>
                      <p className="font-semibold text-slate-700 text-sm">No card generations found matching your filters.</p>
                      <Link href="/dashboard/generate" className="mt-1 text-primary font-bold hover:underline text-xs">
                        Click here to generate a new card
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 flex items-center justify-between bg-slate-50 border-t border-slate-200 text-xs">
            <p className="text-slate-500 font-medium">
              Showing {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(totalItems, currentPage * itemsPerPage)} of {totalItems} entries
            </p>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                Previous
              </button>
              <div className="flex items-center gap-1 px-2">
                <span className="font-black text-slate-900">{currentPage}</span>
                <span className="text-slate-400">/</span>
                <span className="font-semibold text-slate-500">{totalPages}</span>
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
