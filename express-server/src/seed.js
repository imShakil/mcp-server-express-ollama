const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const today = new Date();

const getJoinDate = (yearsAgo) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsAgo);
  return d.toISOString().split('T')[0];
};

const getNextIncrement = (joinDate) => {
  const d = new Date(joinDate);
  while (d <= today) d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

const getLastIncrement = (joinDate) => {
  const next = new Date(getNextIncrement(joinDate));
  next.setFullYear(next.getFullYear() - 1);
  return next.toISOString().split('T')[0];
};

const employees = [
  { name: 'Nazrul Islam',         email: 'nazrul@company.com',   department: 'Engineering', years: 12, salary: 120000 },
  { name: 'Mahabub Ziko',         email: 'ziko@company.com',     department: 'Engineering', years: 12, salary: 118000 },
  { name: 'Tanvir Hasan Pias',    email: 'pias@company.com',     department: 'Engineering', years: 10, salary: 100000 },
  { name: 'Habibur Rahman',       email: 'habib@company.com',    department: 'Engineering', years: 7,  salary: 80000  },
  { name: 'Sayed Mahamud',        email: 'sayed@company.com',    department: 'Engineering', years: 7,  salary: 78000  },
  { name: 'Mehedi Hasan Tuhin',   email: 'tuhin@company.com',    department: 'Engineering', years: 6,  salary: 70000  },
  { name: 'Saiful Islam Sajon',   email: 'sajon@company.com',    department: 'Engineering', years: 5,  salary: 65000  },
  { name: 'Nue-e-alam Jony',      email: 'jony@company.com',     department: 'Engineering', years: 5,  salary: 63000  },
  { name: 'Asif Rahman',          email: 'asif@company.com',     department: 'Engineering', years: 5,  salary: 63000  },
  { name: 'Abu Masum Didar',      email: 'didar@company.com',    department: 'Engineering', years: 3,  salary: 50000  },
  { name: 'Mohammad Bin Sultan',  email: 'sultan@company.com',   department: 'Engineering', years: 3,  salary: 50000  },
  { name: 'Mirhajul Islam',       email: 'mirhaj@company.com',   department: 'Engineering', years: 2,  salary: 40000  },
  { name: 'Alauddin Ahmed',       email: 'alauddin@company.com', department: 'Engineering', years: 2,  salary: 40000  },
  { name: 'Sabiruzzaman',         email: 'sabir@company.com',    department: 'Engineering', years: 1,  salary: 35000  },
];

// last 30 days এর random attendance generate করো
const generateAttendance = (employeeId, joinDate) => {
  const records = [];
  const start = new Date(Math.max(new Date(joinDate), new Date('2023-01-01')));
  const end = new Date();

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 5 || day === 6) continue; // Friday, Saturday skip

    const rand = Math.random();
    let status, reason = null;

    if (rand < 0.80) {
      status = 'present';
    } else if (rand < 0.90) {
      status = 'leave';
      const reasons = ['Annual leave', 'Medical leave', 'Personal work', 'Family emergency'];
      reason = reasons[Math.floor(Math.random() * reasons.length)];
    } else {
      status = 'absent';
      const reasons = ['Sick', 'No information', 'Personal issue'];
      reason = reasons[Math.floor(Math.random() * reasons.length)];
    }

    records.push({
      employee_id: employeeId,
      date: new Date(d).toISOString().split('T')[0],
      status,
      reason,
    });
  }
  return records;
};

const seed = async () => {
  console.log('🌱 Seeding started...\n');

  // tables ensure করো
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      department TEXT,
      join_date DATE NOT NULL,
      last_increment_date DATE,
      next_increment_date DATE,
      salary NUMERIC,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES employees(id),
      date DATE NOT NULL,
      status TEXT CHECK(status IN ('present','absent','leave')) NOT NULL,
      reason TEXT,
      UNIQUE(employee_id, date)
    )
  `);

  // clear existing data
  await pool.query('DELETE FROM attendance');
  await pool.query('DELETE FROM employees');
  await pool.query('ALTER SEQUENCE employees_id_seq RESTART WITH 1');
  console.log('🗑️  Cleared existing data\n');

  // insert employees
  for (const emp of employees) {
    const joinDate = getJoinDate(emp.years);
    const lastIncrement = getLastIncrement(joinDate);
    const nextIncrement = getNextIncrement(joinDate);

    const result = await pool.query(
      `INSERT INTO employees (name, email, department, join_date, last_increment_date, next_increment_date, salary)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name`,
      [emp.name, emp.email, emp.department, joinDate, lastIncrement, nextIncrement, emp.salary]
    );

    const { id, name } = result.rows[0];
    console.log(`✅ Employee: ${name} (ID: ${id}) | Joined: ${joinDate} | Next Increment: ${nextIncrement}`);

    // attendance insert
    const records = generateAttendance(id, joinDate);
    for (const rec of records) {
      await pool.query(
        `INSERT INTO attendance (employee_id, date, status, reason)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [rec.employee_id, rec.date, rec.status, rec.reason]
      );
    }
    console.log(`   📅 ${records.length} attendance records added`);
  }

  console.log('\n🎉 Seeding complete!');
  await pool.end();
};

seed().catch(err => {
  console.error('❌ Seed error:', err.message);
  process.exit(1);
});