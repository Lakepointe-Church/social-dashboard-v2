export default function Header() {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600
                          flex items-center justify-center text-lg shadow-lg">⛪</div>
          <div>
            <div className="font-bold text-white leading-tight text-base">Lakepointe</div>
            <div className="text-slate-400 text-xs leading-tight">Social Analytics Dashboard</div>
          </div>
        </div>
      </div>
    </header>
  );
}
