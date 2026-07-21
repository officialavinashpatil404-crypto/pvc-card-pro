export default function TermsConditions() {
  return (
    <div className="max-w-4xl mx-auto p-xl space-y-lg">
      <h1 className="font-headline-xl">Terms and Conditions</h1>
      <p className="font-body-md">Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2 className="font-headline-md mt-lg">1. Acceptance of Terms</h2>
      <p className="font-body-md">
        By accessing and using Rapid PVC, you accept and agree to be bound by the terms and provision of this agreement.
      </p>

      <h2 className="font-headline-md mt-lg">2. Authorized Use</h2>
      <p className="font-body-md">
        You must only use this service for legitimate PVC card printing requests initiated by the document holder. Unauthorized generation or duplication of government IDs is strictly prohibited and is the sole responsibility of the operator.
      </p>

      <h2 className="font-headline-md mt-lg">3. Credits and Subscriptions</h2>
      <p className="font-body-md">
        Credits purchased via subscriptions (Starter, Pro, Business) are valid for 30 days from the date of purchase. Unused credits do not roll over to the next month.
      </p>

      <h2 className="font-headline-md mt-lg">4. Service Availability</h2>
      <p className="font-body-md">
        We strive for 99.9% uptime, but we do not guarantee continuous, uninterrupted access to the Rapid PVC generation engine.
      </p>
    </div>
  );
}
