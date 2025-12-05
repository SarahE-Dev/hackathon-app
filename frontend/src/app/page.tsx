import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-dark-900 text-white">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 opacity-90"></div>
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-neon-blue/20 blur-3xl animate-float"></div>
        <div className="absolute top-[60%] left-[10%] h-[420px] w-[420px] rounded-full bg-neon-purple/20 blur-3xl animate-float" style={{ animationDelay: '0.8s' }}></div>
        <div className="absolute -bottom-40 right-0 h-[540px] w-[540px] rounded-full bg-neon-pink/20 blur-3xl animate-float" style={{ animationDelay: '1.6s' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gradient font-[family-name:var(--font-orbitron)] tracking-wider">CodeArena</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/auth/login" className="text-gray-300 transition-colors hover:text-white">
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="glass rounded-lg border border-neon-blue/60 px-5 py-2 font-medium text-neon-blue transition-all hover:border-neon-blue hover:bg-neon-blue/10"
            >
              Register
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl font-bold leading-tight md:text-7xl font-[family-name:var(--font-orbitron)] tracking-wide">
                <span className="text-gradient">CodeArena</span>
              </h1>
              <h2 className="text-xl md:text-2xl font-medium text-gray-300">
                Justice Through Code Challenge Platform
              </h2>
              <p className="max-w-2xl mx-auto text-lg text-gray-400">
                A collaborative coding platform for hackathons and assessments.
                Work with your team, solve challenges, and showcase your skills.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row justify-center">
              <Link
                href="/auth/register"
                className="flex items-center justify-center rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple px-8 py-4 text-lg font-semibold text-white transition-all hover:opacity-90 glow-blue"
              >
                Get Started
              </Link>
              <Link
                href="/auth/login"
                className="flex items-center justify-center rounded-lg border-2 border-gray-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:border-neon-blue hover:bg-dark-800"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto max-w-5xl px-6 pb-16">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="glass group relative overflow-hidden rounded-2xl border border-white/10 p-6 hover:border-neon-blue/40 transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-neon-blue/20 flex items-center justify-center text-2xl">
                  👥
                </div>
                <h3 className="text-xl font-semibold text-white">Team Live Coding</h3>
                <p className="text-sm text-gray-300">
                  Collaborate in real-time with your teammates. Share code, chat, and solve problems together in synchronized sessions.
                </p>
              </div>
            </div>

            <div className="glass group relative overflow-hidden rounded-2xl border border-white/10 p-6 hover:border-neon-purple/40 transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-neon-purple/20 flex items-center justify-center text-2xl">
                  🛡️
                </div>
                <h3 className="text-xl font-semibold text-white">Proctored Sessions</h3>
                <p className="text-sm text-gray-300">
                  Fair competition with integrity monitoring. Tab detection, copy-paste tracking, and activity logging throughout sessions.
                </p>
              </div>
            </div>

            <div className="glass group relative overflow-hidden rounded-2xl border border-white/10 p-6 hover:border-neon-pink/40 transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-neon-pink/20 flex items-center justify-center text-2xl">
                  ⚖️
                </div>
                <h3 className="text-xl font-semibold text-white">Judge Scoring</h3>
                <p className="text-sm text-gray-300">
                  Expert judges review submissions with detailed rubric scoring. Get feedback on code quality, efficiency, and explanation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mx-auto max-w-5xl px-6 pb-12 text-center">
          <div className="border-t border-white/10 pt-8">
            <p className="text-sm text-gray-400">
              Justice Through Code © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
