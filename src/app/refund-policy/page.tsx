export default function RefundPolicy() {
  return (
    <div className="max-w-4xl mx-auto p-xl space-y-lg">
      <h1 className="font-headline-xl">Refund and Cancellation Policy</h1>
      <p className="font-body-md">Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2 className="font-headline-md mt-lg">1. Cancellations</h2>
      <p className="font-body-md">
        You may cancel your subscription at any time from the Dashboard. Cancellation will prevent future automated billing, but you will retain access to your purchased credits until the end of the current billing cycle.
      </p>

      <h2 className="font-headline-md mt-lg">2. Refunds</h2>
      <p className="font-body-md">
        Since our service issues immediate digital credits upon payment success via Cashfree, we do not offer refunds for any subscription plan once the payment has been processed and credits have been added to your account.
      </p>

      <h2 className="font-headline-md mt-lg">3. Failed Transactions</h2>
      <p className="font-body-md">
        If a transaction fails but money is deducted from your bank account, the amount is typically reversed by your bank within 5-7 business days. Please contact support@pvccardpro.com with your transaction ID if you experience issues.
      </p>
    </div>
  );
}
