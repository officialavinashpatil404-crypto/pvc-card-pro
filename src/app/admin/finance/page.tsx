import React from 'react'

export default function FinancePage() {
  return (
    <div className="space-y-xl animate-fade-in">
      <div className="flex flex-col gap-sm">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Revenue & Finance</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          Manage subscriptions, track revenue, and view transaction history.
        </p>
      </div>

      <div className="bg-surface-container p-xl rounded-2xl text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-md">account_balance</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Finance Dashboard Coming Soon</h3>
        <p className="font-body-md text-body-md text-on-surface-variant mt-sm">This module is under development and will be available in the next release.</p>
      </div>
    </div>
  )
}
