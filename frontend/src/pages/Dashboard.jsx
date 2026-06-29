function Dashboard() {
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 md:py-10" style={{ backgroundColor: "#F9F9FB" }}>

      {/* Top Header Bar */}
      <div
        className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center sm:justify-between gap-4 mb-6 md:mb-10 px-4 sm:px-6 py-4 rounded-2xl shadow-sm text-center sm:text-left"
        style={{ backgroundColor: "#232B32", border: "1px solid #E2E8F0" }}
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-light tracking-widest uppercase" style={{ color: "#F9F9FB" }}>
            Six Sigmaphil
          </h1>
          <p className="text-xs sm:text-sm tracking-wide mt-1" style={{ color: "#C5A059" }}>Admin Dashboard</p>
        </div>

        <button
          onClick={handleLogout}
          className="font-semibold text-xs tracking-widest uppercase py-2.5 px-6 rounded-lg transition-all duration-200 cursor-pointer"
          style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#b08d47")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#C5A059")}
        >
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Popular Designs Table ── */}
        <div
          className="rounded-2xl shadow-sm overflow-hidden"
          style={{ backgroundColor: "#ffffff", border: "1px solid #E2E8F0" }}
        >
          {/* Table Header */}
          <div
            className="px-6 py-5 flex items-center gap-3"
            style={{ borderBottom: "1px solid #E2E8F0" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#232B32" }}
            >
              <svg className="w-4 h-4" style={{ color: "#C5A059" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#232B32" }}>
                Popular Designs
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>Top performing stone designs by views</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <th className="text-left text-xs font-medium tracking-widest uppercase px-6 py-3" style={{ color: "#6B7280" }}>#</th>
                  <th className="text-left text-xs font-medium tracking-widest uppercase px-6 py-3" style={{ color: "#6B7280" }}>Design Name</th>
                  <th className="text-left text-xs font-medium tracking-widest uppercase px-6 py-3" style={{ color: "#6B7280" }}>Category</th>
                  <th className="text-right text-xs font-medium tracking-widest uppercase px-6 py-3" style={{ color: "#6B7280" }}>Views</th>
                  <th className="text-center text-xs font-medium tracking-widest uppercase px-6 py-3" style={{ color: "#6B7280" }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm tracking-wide" style={{ color: "#9CA3AF" }}>
                    No data yet. Orders will appear here once placed.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Popular Projects Table ── */}
        <div
          className="rounded-2xl shadow-sm overflow-hidden"
          style={{ backgroundColor: "#ffffff", border: "1px solid #E2E8F0" }}
        >
          {/* Table Header */}
          <div
            className="px-6 py-5 flex items-center gap-3"
            style={{ borderBottom: "1px solid #E2E8F0" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#232B32" }}
            >
              <svg className="w-4 h-4" style={{ color: "#C5A059" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#232B32" }}>
                Popular Projects
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>Top client projects by engagement</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <th className="text-left text-xs font-medium tracking-widest uppercase px-6 py-3" style={{ color: "#6B7280" }}>#</th>
                  <th className="text-left text-xs font-medium tracking-widest uppercase px-6 py-3" style={{ color: "#6B7280" }}>Project Name</th>
                  <th className="text-left text-xs font-medium tracking-widest uppercase px-6 py-3" style={{ color: "#6B7280" }}>Client</th>
                  <th className="text-center text-xs font-medium tracking-widest uppercase px-6 py-3" style={{ color: "#6B7280" }}>Status</th>
                  <th className="text-right text-xs font-medium tracking-widest uppercase px-6 py-3" style={{ color: "#6B7280" }}>Year</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm tracking-wide" style={{ color: "#9CA3AF" }}>
                    No data yet. Orders will appear here once placed.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Footer */}
      <p className="text-center text-xs mt-10 tracking-wide" style={{ color: "#9CA3AF" }}>
        Six Sigmaphil Corp. · Admin Portal
      </p>
    </div>
  );
}

export default Dashboard;
