import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmployees } from '../api/hr';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getEmployees()
      .then(res => setEmployees(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>👥 Employees</h2>
        <button onClick={() => navigate('/chat')} className="btn-secondary">
          ← Chat
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Department</th>
                <th>Join Date</th>
                <th>Next Increment</th>
                <th>Salary</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr key={emp.id}>
                  <td>{i + 1}</td>
                  <td>{emp.name}</td>
                  <td><span className="badge">{emp.department}</span></td>
                  <td>{emp.join_date?.split('T')[0]}</td>
                  <td className={isUpcoming(emp.next_increment_date) ? 'highlight' : ''}>
                    {emp.next_increment_date?.split('T')[0]}
                  </td>
                  <td>৳ {Number(emp.salary).toLocaleString()}</td>
                  <td>
                    <button
                      className="icon-btn"
                      title="View Attendance"
                      onClick={() => navigate(`/attendance/${emp.id}?name=${emp.name}`)}
                    >
                      📅
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const isUpcoming = (date) => {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 90;
};