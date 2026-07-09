import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getAttendanceSummary } from '../api/hr';

export default function Attendance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const name = new URLSearchParams(location.search).get('name');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getAttendanceSummary(id, month, year)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year]);

  const getRow = (status) => data.find(d => d.status === status);
  const present = getRow('present');
  const absent = getRow('absent');
  const leave = getRow('leave');

  const allDetails = data.flatMap(d =>
    (d.details || []).map(x => ({ ...x, status: d.status }))
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  const statusColor = { present: '#4ade80', absent: '#f87171', leave: '#facc15' };

  return (
    <div className="page">
      <div className="page-header">
        <h2>📅 {name} — Attendance</h2>
        <button onClick={() => navigate('/employees')} className="btn-secondary">
          ← Employees
        </button>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <select value={month} onChange={e => setMonth(e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)}>
          {[2023, 2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="stat-cards">
        <div className="stat-card" style={{ borderColor: '#4ade80' }}>
          <span className="stat-num">{present?.count || 0}</span>
          <span className="stat-label">Present</span>
        </div>
        <div className="stat-card" style={{ borderColor: '#f87171' }}>
          <span className="stat-num">{absent?.count || 0}</span>
          <span className="stat-label">Absent</span>
        </div>
        <div className="stat-card" style={{ borderColor: '#facc15' }}>
          <span className="stat-num">{leave?.count || 0}</span>
          <span className="stat-label">Leave</span>
        </div>
      </div>

      {/* Detail Table */}
      {loading ? <p className="muted">Loading...</p> : (
        allDetails.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', marginTop: '2rem' }}>
            No records found for this period.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {allDetails.map((d, i) => (
                  <tr key={i}>
                    <td>{d.date}</td>
                    <td>
                      <span className="status-badge" style={{ background: statusColor[d.status] }}>
                        {d.status}
                      </span>
                    </td>
                    <td className="muted">{d.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}