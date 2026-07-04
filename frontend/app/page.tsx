import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 px-4">
      <div className="max-w-3xl w-full text-center space-y-8 animate-fade-in">
        <div className="mb-4 flex items-center justify-center">
          <span className="text-4xl font-extrabold tracking-tight text-[#060807]">
            Replysys
          </span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900">
          We are under <span className="text-[#115B4C] drop-shadow-sm">development</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Something amazing is in the works. We are preparing the best experience for you.
        </p>

        <div className="py-10">
          <div className="inline-flex flex-col items-center p-8 bg-gray-50 rounded-3xl border border-gray-100 shadow-sm transition-transform hover:scale-105 duration-300">
            <span className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">Expected Launch</span>
            <span className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">August 15th</span>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login" className="px-8 py-4 rounded-xl font-semibold bg-[#115B4C] text-white hover:bg-[#115B4C]/90 transition-colors shadow-sm text-lg">
            Login to Dashboard (Beta)
          </Link>
          <a href="mailto:hello@domain.com" className="px-8 py-4 rounded-xl font-semibold border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 text-lg">
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}
