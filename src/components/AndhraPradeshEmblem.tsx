import React from 'react';

export function AndhraPradeshEmblem({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Andhra Pradesh State Institutional Emblem Motif"
    >
      {/* Outer Radiant Sun Ring */}
      <circle cx="50" cy="50" r="46" fill="#0F2547" stroke="#EA580C" strokeWidth="3" />
      <circle cx="50" cy="50" r="39" stroke="#E6C775" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Poorna Ghatam (Sacred Vase) Stylized Silhouette */}
      <path
        d="M36 44C32 49 31 58 36 65C40 70 60 70 64 65C69 58 68 49 64 44H36Z"
        fill="#EA580C"
      />
      <rect x="41" y="37" width="18" height="6" rx="2" fill="#E6C775" />
      <path d="M38 71H62L59 76H41L38 71Z" fill="#E6C775" />

      {/* Lotus / Sacred Leaves Crown */}
      <path d="M50 21L45 35H55L50 21Z" fill="#10B981" />
      <path d="M37 26L42 36L47 34L37 26Z" fill="#34D399" />
      <path d="M63 26L58 36L53 34L63 26Z" fill="#34D399" />

      {/* Dharma Chakra Center */}
      <circle cx="50" cy="54" r="7" fill="#0F2547" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="50" cy="54" r="2" fill="#E6C775" />
    </svg>
  );
}
