import Link from "next/link";
import ExplainerCards from "../components/ExplainerCards";
import HelpButton from "../components/HelpButton";

export default function HomePage() {
  return (
    <main className="masquerade-shell bg-transparent text-foreground p-6">
      <ExplainerCards />

      <div className="max-w-xl w-full text-center">
        <h1 className="display-title mb-6">Guess the Person</h1>

        <div className="flex gap-4 justify-center mb-6">
          <Link href="/create" className="gold-button text-base">
            Create Room
          </Link>
          <Link href="/join" className="ivory-button text-base">
            Join Room
          </Link>
        </div>

        <p className="text-sm muted-copy">Host or join a hidden-identity party game with friends.</p>
      </div>

      <HelpButton />
    </main>
  );
}
