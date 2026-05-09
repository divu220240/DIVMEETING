import { Link } from 'react-router-dom';

export default function Credits() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-5xl items-center justify-center px-2 py-8">
      <section className="w-full overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-cyan-950/70 p-8 sm:p-10">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-full bg-cyan-400/10 p-2 ring-1 ring-cyan-300/20">
                <div className="h-40 w-40 overflow-hidden rounded-full border-4 border-slate-900 shadow-xl shadow-slate-950/50">
                  <img
                    src="/ceo.jpg"
                    alt="Divyansh Rana"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              </div>

              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Founder & CEO
              </p>
              <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Divyansh Rana</h1>
              <p className="mt-2 text-slate-300">Founder & CEO</p>

              <a
                href="mailto:divyanshrana699@gmail.com"
                className="mt-5 break-all rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15"
              >
                divyanshrana699@gmail.com
              </a>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
                Credits
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                About The Founder
              </h2>
            </div>

            <div className="space-y-5 text-sm leading-7 text-slate-300 sm:text-base">
              <p>
                Aspiring Software Engineer with a strong foundation in Data Structures & Algorithms and hands-on
                experience in full-stack development. Proficient in C++ and Java, with strong problem-solving skills
                demonstrated through 300+ coding challenges across platforms like LeetCode, GeeksforGeeks, and
                CodeChef.
              </p>
              <p>
                He has developed multiple real-world applications including a Help Desk Ticketing System, Job Portal Web
                Application, and Weather Forecast System. He was selected as a core team member for Smart India
                Hackathon (SIH) 2023, where he worked on cybersecurity solutions focused on phishing detection and
                prevention.
              </p>
              <p>
                He is passionate about building scalable systems, writing clean and efficient code, and continuously
                learning new technologies to solve real-world problems.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800"
              >
                Return to Home
              </Link>
              <a
                href="https://github.com/divu220240"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700"
              >
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/divyansh-rana-"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                LinkedIn
              </a>
              <a
                href="https://www.instagram.com/_divu_390?igsh=NG41MjV6Y2MwMGg5"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white hover:bg-pink-400"
              >
                Instagram
              </a>
            </div>

            <footer className="mt-10 border-t border-slate-800 pt-5 text-sm text-slate-500">
              &copy; 2026 All Rights Reserved
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}
