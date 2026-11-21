// Minimal inline SVG court illustration for the login/signup left panel
// Replaces the deleted court-illustration.tsx component
export function CourtIllustration({ allowExpandModal: _allowExpandModal }: { allowExpandModal?: boolean }) {
  return (
    <svg
      viewBox="0 0 400 600"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      role="img"
      aria-label="Top-down tennis court illustration"
    >
      {/* Court surround */}
      <rect x="0" y="0" width="400" height="600" fill="currentColor" fillOpacity="0.15" />
      {/* Court surface */}
      <rect x="60" y="80" width="280" height="440" fill="none" stroke="white" strokeWidth="3" strokeOpacity="0.8" />
      {/* Singles sidelines */}
      <line x1="90" y1="80" x2="90" y2="520" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
      <line x1="310" y1="80" x2="310" y2="520" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
      {/* Service boxes - top */}
      <line x1="60" y1="220" x2="340" y2="220" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
      <line x1="200" y1="80" x2="200" y2="220" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
      {/* Net */}
      <line x1="60" y1="300" x2="340" y2="300" stroke="white" strokeWidth="3" strokeOpacity="0.9" strokeDasharray="8 5" />
      {/* Service boxes - bottom */}
      <line x1="60" y1="380" x2="340" y2="380" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
      <line x1="200" y1="380" x2="200" y2="520" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
      {/* Net posts */}
      <circle cx="60" cy="300" r="5" fill="white" fillOpacity="0.8" />
      <circle cx="340" cy="300" r="5" fill="white" fillOpacity="0.8" />
    </svg>
  );
}
