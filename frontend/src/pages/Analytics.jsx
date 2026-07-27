import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function Analytics() {
  const [requests, setRequests] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setDataLoading(true);
      const { data, error } = await supabase
        .from('quotation_requests')
        .select('id, product_type, design, created_at')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setRequests(data);
      }
      setDataLoading(false);
    };
    fetchRequests();
  }, []);

  // Compute analytics
  const analytics = useMemo(() => {
    const designCount = {};
    const projectTypeCount = {};
    let totalQuotations = requests.length;

    requests.forEach(r => {
      if (r.design) designCount[r.design] = (designCount[r.design] || 0) + 1;
      if (r.product_type) projectTypeCount[r.product_type] = (projectTypeCount[r.product_type] || 0) + 1;
    });

    const popularProducts = Object.entries(designCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const projectTypes = Object.entries(projectTypeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalQuotations, popularProducts, projectTypes };
  }, [requests]);

  const COLORS = ['#C5A059', '#D4B87C', '#E2D1A1', '#EFE7C6', '#232B32', '#6B7280'];

  // Quick insights text generation
  let topDesignText = "No data yet";
  let runnerUpDesignText = "";
  let top5Text = "";
  if (analytics.popularProducts.length > 0) {
    topDesignText = `${analytics.popularProducts[0].name} leads with ${analytics.popularProducts[0].count} units sold`;
    if (analytics.popularProducts.length > 1) {
      runnerUpDesignText = `${analytics.popularProducts[1].name} follows closely at ${analytics.popularProducts[1].count} units`;
    }
    const top5Total = analytics.popularProducts.reduce((sum, d) => sum + d.count, 0);
    top5Text = `Top 5 designs account for ${top5Total} total units`;
  }

  const projectInsights = analytics.projectTypes.map(pt => {
    const percent = Math.round((pt.value / analytics.totalQuotations) * 100);
    return `${pt.name} projects account for ${percent}%`;
  });

  return (
    <div className="p-4 md:p-8" style={{ backgroundColor: '#F9F9FB', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <h2 style={{ fontSize: '18px', color: '#6B7280', fontWeight: 600 }}>Product and project insights</h2>

        {/* ── Top Card: Total Quotations ── */}
        <div className="flex">
          <div
            style={{
              backgroundColor: '#ffffff', borderRadius: '14px',
              border: '1px solid #E2E8F0', padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', gap: '16px', minWidth: '250px'
            }}
          >
            <div style={{ padding: '12px', backgroundColor: '#FDF8F0', borderRadius: '12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Total Quotations
              </p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: '#232B32', lineHeight: 1, marginTop: '4px' }}>
                {dataLoading ? '...' : analytics.totalQuotations}
              </p>
            </div>
          </div>
        </div>

        {/* ── Charts Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar Chart: Popular Products */}
          <div
            style={{
              backgroundColor: '#ffffff', borderRadius: '14px',
              border: '1px solid #E2E8F0', padding: '24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#232B32', marginBottom: '24px' }}>
              Popular Products
            </h3>
            <div style={{ width: '100%', height: '300px' }}>
              {dataLoading ? (
                <div className="w-full h-full flex items-center justify-center"><p className="text-sm text-gray-400">Loading chart...</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.popularProducts} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <Tooltip cursor={{ fill: '#F9F9FB' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                    <Bar dataKey="count" fill="#C5A059" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Pie Chart: Project Types */}
          <div
            style={{
              backgroundColor: '#ffffff', borderRadius: '14px',
              border: '1px solid #E2E8F0', padding: '24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#232B32', marginBottom: '24px' }}>
              Project Types
            </h3>
            <div style={{ width: '100%', height: '300px' }}>
              {dataLoading ? (
                <div className="w-full h-full flex items-center justify-center"><p className="text-sm text-gray-400">Loading chart...</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.projectTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {analytics.projectTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick Insights ── */}
        <div
          style={{
            backgroundColor: '#FDF8F0', borderRadius: '14px',
            border: '1px solid #EFE7C6', padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#232B32', marginBottom: '16px' }}>
            Quick Insights
          </h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="flex items-center gap-2" style={{ fontSize: '14px', fontWeight: 600, color: '#232B32', marginBottom: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                  <polyline points="16 7 22 7 22 13"></polyline>
                </svg>
                Popular Product Designs
              </h4>
              <ul className="space-y-2 pl-6">
                <li style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#C5A059', marginRight: '8px', display: 'inline-block' }} />
                  {topDesignText}
                </li>
                {runnerUpDesignText && (
                  <li style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#C5A059', marginRight: '8px', display: 'inline-block' }} />
                    {runnerUpDesignText}
                  </li>
                )}
                {top5Text && (
                  <li style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#C5A059', marginRight: '8px', display: 'inline-block' }} />
                    {top5Text}
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="flex items-center gap-2" style={{ fontSize: '14px', fontWeight: 600, color: '#232B32', marginBottom: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                  <polyline points="16 7 22 7 22 13"></polyline>
                </svg>
                Popular Project Types
              </h4>
              <ul className="space-y-2 pl-6">
                {projectInsights.length === 0 ? (
                  <li style={{ fontSize: '13px', color: '#6B7280' }}>No projects yet</li>
                ) : (
                  projectInsights.map((text, idx) => (
                    <li key={idx} style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#C5A059', marginRight: '8px', display: 'inline-block' }} />
                      {text}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

        </div>
      </div>
      
      {/* Footer */}
      <p className="text-center text-xs mt-10 tracking-wide" style={{ color: '#9CA3AF' }}>
        Six Sigmaphil Corp. &middot; Analytics Portal
      </p>

    </div>
  );
}
