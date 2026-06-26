import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold mb-4">CCDS Biomarker Tool</h1>
        <p className="text-gray-600 mb-2">
          Research and visualization tool for canine aging biomarkers (CXCL10, NOX4, RBP4, CCDR).
        </p>
        <p className="text-xs text-gray-400 border border-gray-200 rounded p-3 mt-4">
          For research/visualization only. Not a veterinary diagnosis. Consult a licensed veterinarian.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
