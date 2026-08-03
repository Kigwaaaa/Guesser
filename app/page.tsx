import Link from "next/link";
import ExplainerCards from "../components/ExplainerCards";
import HelpButton from "../components/HelpButton";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <ExplainerCards />

      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6 text-[#7C3AED]">Guess the Person</h1>

        <div className="flex gap-4 justify-center mb-6">
          <Link href="/create" className="px-6 py-3 rounded-lg bg-[#7C3AED] text-black font-medium">
            Create Room
          </Link>
          <Link href="/join" className="px-6 py-3 rounded-lg bg-transparent border border-gray-600">
            Join Room
          </Link>
        </div>

        <p className="text-sm text-gray-300">Host or join a hidden-identity party game with friends.</p>
      </div>

      <HelpButton />
    </main>
  );
}
