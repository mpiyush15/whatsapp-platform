import '@/styles/healthcare-clinic.css'

export default function HealthcareLayout({ children }: { children: React.ReactNode }) {
  return <div className="hc-patient-page min-h-full">{children}</div>
}
