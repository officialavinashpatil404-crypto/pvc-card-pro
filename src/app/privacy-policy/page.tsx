export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto p-xl space-y-lg">
      <h1 className="font-headline-xl">Privacy Policy</h1>
      <p className="font-body-md">Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2 className="font-headline-md mt-lg">1. Information Collection and Use</h2>
      <p className="font-body-md">
        Rapid PVC operates on a strict zero-retention policy regarding Personal Identifiable Information (PII) extracted from government IDs. Documents uploaded for generation (e.g., Aadhaar, PAN) are processed ephemerally in server memory and are immediately discarded. We do not store PDF files, extracted text, photos, or QR codes on our servers or databases.
      </p>

      <h2 className="font-headline-md mt-lg">2. Account Data</h2>
      <p className="font-body-md">
        We store the information necessary to maintain your account: Full Name, Mobile Number, Email Address, and your current Subscription Plan details. Passwords are cryptographically hashed using Supabase Auth.
      </p>

      <h2 className="font-headline-md mt-lg">3. Payment Information</h2>
      <p className="font-body-md">
        All payments are securely processed by Cashfree. Rapid PVC does not store or process your credit card numbers, UPI IDs, or bank account details.
      </p>

      <h2 className="font-headline-md mt-lg">4. Business Operator & Contact Us</h2>
      <p className="font-body-md">
        Rapid PVC is operated by Avinash Naval Patil (Proprietorship, India). Legal Name: Avinash Naval Patil. If you have any questions about this Privacy Policy, please contact us at support@pvccardpro.com.
      </p>
    </div>
  );
}
