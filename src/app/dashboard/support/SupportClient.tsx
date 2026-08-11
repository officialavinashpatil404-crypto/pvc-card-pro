'use client';

import { useState } from 'react';
import { submitTicket } from './actions';

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

interface SupportClientProps {
  initialTickets: SupportTicket[];
}

export default function SupportClient({ initialTickets }: SupportClientProps) {
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('Technical Support');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('department', department);
    formData.append('message', message);

    try {
      const res = await submitTicket(formData);
      setIsSubmitting(false);
      if (res.success) {
        setSuccessMsg('Your support ticket has been submitted successfully!');
        setSubject('');
        setMessage('');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg(res.error || 'Failed to submit ticket. Please try again.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    }
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Helper to color ticket status badge
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container">
            Resolved
          </span>
        );
      case 'PENDING':
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            In Progress
          </span>
        );
      default: // OPEN
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-container text-on-primary-container">
            Open
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-xl animate-fade-in pb-xl">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div className="space-y-xs">
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Help &amp; Support</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            We're here to ensure your PVC card generation process is seamless. Reach out to us for any technical or billing assistance.
          </p>
        </div>
        <div className="flex items-center gap-xs text-secondary font-label-md text-label-md bg-secondary-container/30 px-md py-sm rounded-full w-fit">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          Support Agents Online
        </div>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Ticket Form Section */}
        <div className="lg:col-span-7">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-xl shadow-sm h-full flex flex-col justify-between">
            <div className="space-y-lg">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-[32px]">confirmation_number</span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Submit a Ticket</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-md">
                {successMsg && (
                  <div className="p-sm rounded-lg bg-green-50 text-green-700 border border-green-200 text-sm font-label-md flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {successMsg}
                  </div>
                )}
                {errorMsg && (
                  <div className="p-sm rounded-lg bg-error/10 text-error border border-error/20 text-sm font-label-md flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant">Subject</label>
                  <input 
                    className="w-full bg-surface-container-low border border-outline-variant/50 focus:border-primary focus:bg-white rounded-lg px-md py-sm focus:ring-2 focus:ring-primary/20 transition-all text-body-md font-body-md outline-none" 
                    placeholder="e.g., Issue with Aadhaar Card formatting" 
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant">Department</label>
                  <select 
                    className="w-full bg-surface-container-low border border-outline-variant/50 focus:border-primary focus:bg-white rounded-lg px-md py-sm focus:ring-2 focus:ring-primary/20 transition-all text-body-md font-body-md outline-none"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing & Payments">Billing &amp; Payments</option>
                    <option value="Card Quality/Print Issues">Card Quality/Print Issues</option>
                    <option value="General Inquiry">General Inquiry</option>
                  </select>
                </div>
                
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant">Message</label>
                  <textarea 
                    className="w-full bg-surface-container-low border border-outline-variant/50 focus:border-primary focus:bg-white rounded-lg px-md py-sm focus:ring-2 focus:ring-primary/20 transition-all text-body-md font-body-md resize-none outline-none" 
                    placeholder="Describe your issue in detail..." 
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  ></textarea>
                </div>
                
                <div className="pt-sm">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full md:w-auto bg-primary text-on-primary font-label-md text-label-md px-xl py-md rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-sm group"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        Submitting…
                      </>
                    ) : (
                      <>
                        Send Ticket
                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Contact & Working Hours Sidebar Section */}
        <div className="lg:col-span-5 space-y-lg">
          {/* Contact Details Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-lg shadow-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-lg font-bold">Direct Contact</h3>
            <div className="space-y-md">
              <a 
                className="flex items-center gap-md p-md rounded-xl hover:bg-surface-container-high/50 transition-all border border-transparent hover:border-outline-variant/30 group" 
                href="mailto:support@pvccardpro.com"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
                </div>
                <div className="flex-grow">
                  <p className="font-label-md text-label-md text-on-surface">Email Support</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">support@pvccardpro.in</p>
                </div>
                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">content_copy</span>
              </a>
            </div>
          </div>

          {/* Working Hours Card */}
          <div className="bg-primary/5 rounded-2xl p-lg border border-primary/10 overflow-hidden relative shadow-sm">
            <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-[120px]">schedule</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-primary mb-md font-bold">Support Hours</h3>
            <div className="space-y-sm relative z-10 text-on-surface">
              <div className="flex justify-between items-center py-xs border-b border-outline-variant/20">
                <span className="font-body-md text-body-md">Monday - Friday</span>
                <span className="font-label-md text-label-md text-primary">9:00 AM - 8:00 PM</span>
              </div>
              <div className="flex justify-between items-center py-xs border-b border-outline-variant/20">
                <span className="font-body-md text-body-md">Saturday</span>
                <span className="font-label-md text-label-md text-primary">10:00 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between items-center py-xs">
                <span className="font-body-md text-body-md">Sunday</span>
                <span className="font-label-md text-label-md text-outline">Closed</span>
              </div>
            </div>
            <p className="mt-md font-body-sm text-body-sm text-on-surface-variant italic relative z-10">All times are in IST (Indian Standard Time)</p>
          </div>

          {/* FAQ Promo Card */}
          <div className="bg-gradient-to-br from-tertiary-container to-tertiary p-lg rounded-2xl text-on-tertiary shadow-md">
            <div className="flex flex-col gap-sm">
              <h4 className="font-headline-md text-headline-md font-bold">Quick Solutions?</h4>
              <p className="font-body-sm text-body-sm opacity-90 leading-relaxed">
                Browse our documentation for instant answers to frequently asked questions about card printing and API integration.
              </p>
              <button 
                onClick={() => window.open('https://docs.pvccardpro.in', '_blank')}
                className="mt-sm bg-white text-tertiary font-label-md text-label-md py-sm rounded-lg hover:bg-opacity-90 transition-all active:scale-95 text-center w-full"
              >
                Visit Knowledge Base
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tickets Table Section */}
      <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-lg py-md border-b border-outline-variant/20 bg-surface-container-low/50 flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Recent Support Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high/30">
              <tr className="border-b border-outline-variant/20">
                <th className="px-lg py-sm font-label-md text-label-md text-on-surface-variant">Ticket Ref</th>
                <th className="px-lg py-sm font-label-md text-label-md text-on-surface-variant">Subject &amp; Category</th>
                <th className="px-lg py-sm font-label-md text-label-md text-on-surface-variant">Status</th>
                <th className="px-lg py-sm font-label-md text-label-md text-on-surface-variant">Date Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-on-surface">
              {initialTickets.length > 0 ? (
                initialTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-lg py-md font-body-sm text-body-sm font-bold">
                      #{ticket.id.split('-')[0]?.toUpperCase()}
                    </td>
                    <td className="px-lg py-md font-body-md text-body-md">
                      {ticket.subject}
                    </td>
                    <td className="px-lg py-md">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-lg py-md font-body-sm text-body-sm text-on-surface-variant">
                      {formatDate(ticket.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-lg py-8 text-center text-on-surface-variant font-body-md">
                    <div className="flex flex-col items-center gap-xs">
                      <span className="material-symbols-outlined text-[36px] text-outline">support_agent</span>
                      <p>No active support tickets found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
